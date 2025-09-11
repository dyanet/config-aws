import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NestConfigAwsIntegrationModule } from '../../src/integration/nestjs-config-integration.module';
import { NestjsConfigIntegrationService } from '../../src/integration/services/nestjs-config-integration.service';
import { IntegrationStateService } from '../../src/integration/services/integration-state.service';
import { SecretsManagerLoader } from '../../src/loaders/secrets-manager.loader';
import { SSMParameterStoreLoader } from '../../src/loaders/ssm-parameter-store.loader';
import { EnvironmentLoader } from '../../src/loaders/environment.loader';
import { IntegrationOptions } from '../../src/integration/interfaces/integration-options.interface';

describe('Module Lifecycle Integration Tests', () => {
  let module: TestingModule;
  let configService: ConfigService;
  let integrationService: NestjsConfigIntegrationService;
  let stateService: IntegrationStateService;

  const mockSecretsManagerLoader = {
    load: jest.fn(),
    isAvailable: jest.fn(),
    getRegion: jest.fn(),
    validateConfiguration: jest.fn(),
  };

  const mockSSMLoader = {
    load: jest.fn(),
    isAvailable: jest.fn(),
    getRegion: jest.fn(),
    validateConfiguration: jest.fn(),
  };

  const mockEnvironmentLoader = {
    load: jest.fn(),
    isAvailable: jest.fn(),
    validateConfiguration: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(async () => {
    if (module) {
      await module.close();
    }
  });

  describe('module initialization lifecycle', () => {
    it('should initialize integration before ConfigModule', async () => {
      // Arrange
      const integrationOptions: IntegrationOptions = {
        enableLogging: true,
        failOnAwsError: false,
        fallbackToLocal: true,
        precedence: 'aws-first',
        namespaces: ['database'],
        registerGlobally: true,
      };

      const mockAwsConfig = {
        database: { host: 'aws-host', password: 'secret' }
      };

      mockSecretsManagerLoader.isAvailable.mockResolvedValue(true);
      mockSecretsManagerLoader.load.mockResolvedValue(mockAwsConfig);
      mockSecretsManagerLoader.validateConfiguration.mockReturnValue({ valid: true, errors: [] });
      
      mockSSMLoader.isAvailable.mockResolvedValue(false);
      mockEnvironmentLoader.isAvailable.mockResolvedValue(true);
      mockEnvironmentLoader.load.mockResolvedValue({});
      mockEnvironmentLoader.validateConfiguration.mockReturnValue({ valid: true, errors: [] });

      // Act
      module = await Test.createTestingModule({
        imports: [
          NestJSConfigIntegrationModule.forRoot(integrationOptions),
          ConfigModule.forRoot({
            isGlobal: true,
          }),
        ],
        providers: [
          {
            provide: SecretsManagerLoader,
            useValue: mockSecretsManagerLoader,
          },
          {
            provide: SSMParameterStoreLoader,
            useValue: mockSSMLoader,
          },
          {
            provide: EnvironmentLoader,
            useValue: mockEnvironmentLoader,
          },
        ],
      }).compile();

      configService = module.get<ConfigService>(ConfigService);
      integrationService = module.get<NestJSConfigIntegrationService>(NestJSConfigIntegrationService);
      stateService = module.get<IntegrationStateService>(IntegrationStateService);

      // Assert
      expect(configService).toBeDefined();
      expect(integrationService).toBeDefined();
      expect(stateService).toBeDefined();
      
      // Verify integration state
      expect(stateService.isInitialized()).toBe(true);
      expect(integrationService.isReady()).toBe(true);
      
      // Verify configuration is available
      expect(configService.get('database.host')).toBe('aws-host');
      expect(configService.get('database.password')).toBe('secret');
    });

    it('should handle initialization order with async configuration', async () => {
      // Arrange
      const mockAwsConfig = {
        database: { host: 'async-aws-host' }
      };

      mockSecretsManagerLoader.isAvailable.mockResolvedValue(true);
      mockSecretsManagerLoader.load.mockResolvedValue(mockAwsConfig);
      mockSecretsManagerLoader.validateConfiguration.mockReturnValue({ valid: true, errors: [] });
      
      mockSSMLoader.isAvailable.mockResolvedValue(false);
      mockEnvironmentLoader.isAvailable.mockResolvedValue(true);
      mockEnvironmentLoader.load.mockResolvedValue({});
      mockEnvironmentLoader.validateConfiguration.mockReturnValue({ valid: true, errors: [] });

      // Act
      module = await Test.createTestingModule({
        imports: [
          NestJSConfigIntegrationModule.forRootAsync({
            useFactory: async () => ({
              enableLogging: false,
              failOnAwsError: false,
              fallbackToLocal: true,
              precedence: 'aws-first',
              namespaces: ['database'],
              registerGlobally: true,
            }),
          }),
          ConfigModule.forRootAsync({
            useFactory: async () => ({
              isGlobal: true,
            }),
          }),
        ],
        providers: [
          {
            provide: SecretsManagerLoader,
            useValue: mockSecretsManagerLoader,
          },
          {
            provide: SSMParameterStoreLoader,
            useValue: mockSSMLoader,
          },
          {
            provide: EnvironmentLoader,
            useValue: mockEnvironmentLoader,
          },
        ],
      }).compile();

      configService = module.get<ConfigService>(ConfigService);
      integrationService = module.get<NestJSConfigIntegrationService>(NestJSConfigIntegrationService);

      // Assert
      expect(integrationService.isReady()).toBe(true);
      expect(configService.get('database.host')).toBe('async-aws-host');
    });
  });

  describe('configuration refresh and hot reload', () => {
    it('should support configuration refresh', async () => {
      // Arrange
      const integrationOptions: IntegrationOptions = {
        enableLogging: false,
        failOnAwsError: false,
        fallbackToLocal: true,
        precedence: 'aws-first',
        namespaces: ['database'],
        registerGlobally: true,
      };

      const initialConfig = {
        database: { host: 'initial-host', port: 5432 }
      };

      const updatedConfig = {
        database: { host: 'updated-host', port: 5433 }
      };

      mockSecretsManagerLoader.isAvailable.mockResolvedValue(true);
      mockSecretsManagerLoader.load.mockResolvedValueOnce(initialConfig);
      mockSecretsManagerLoader.validateConfiguration.mockReturnValue({ valid: true, errors: [] });
      
      mockSSMLoader.isAvailable.mockResolvedValue(false);
      mockEnvironmentLoader.isAvailable.mockResolvedValue(true);
      mockEnvironmentLoader.load.mockResolvedValue({});
      mockEnvironmentLoader.validateConfiguration.mockReturnValue({ valid: true, errors: [] });

      // Act - Initial setup
      module = await Test.createTestingModule({
        imports: [
          NestJSConfigIntegrationModule.forRoot(integrationOptions),
          ConfigModule.forRoot({
            isGlobal: true,
          }),
        ],
        providers: [
          {
            provide: SecretsManagerLoader,
            useValue: mockSecretsManagerLoader,
          },
          {
            provide: SSMParameterStoreLoader,
            useValue: mockSSMLoader,
          },
          {
            provide: EnvironmentLoader,
            useValue: mockEnvironmentLoader,
          },
        ],
      }).compile();

      configService = module.get<ConfigService>(ConfigService);
      integrationService = module.get<NestJSConfigIntegrationService>(NestJSConfigIntegrationService);

      // Verify initial configuration
      expect(configService.get('database.host')).toBe('initial-host');
      expect(configService.get('database.port')).toBe(5432);

      // Act - Refresh configuration
      mockSecretsManagerLoader.load.mockResolvedValueOnce(updatedConfig);
      const refreshResult = await integrationService.refreshConfiguration();

      // Assert
      expect(refreshResult.success).toBe(true);
      // Note: In a real implementation, you might need to recreate the ConfigService
      // or implement a mechanism to update the configuration cache
    });

    it('should handle refresh errors gracefully', async () => {
      // Arrange
      const integrationOptions: IntegrationOptions = {
        enableLogging: false,
        failOnAwsError: false,
        fallbackToLocal: true,
        precedence: 'aws-first',
        namespaces: ['database'],
        registerGlobally: true,
      };

      const initialConfig = {
        database: { host: 'initial-host' }
      };

      mockSecretsManagerLoader.isAvailable.mockResolvedValue(true);
      mockSecretsManagerLoader.load.mockResolvedValueOnce(initialConfig);
      mockSecretsManagerLoader.validateConfiguration.mockReturnValue({ valid: true, errors: [] });
      
      mockSSMLoader.isAvailable.mockResolvedValue(false);
      mockEnvironmentLoader.isAvailable.mockResolvedValue(true);
      mockEnvironmentLoader.load.mockResolvedValue({});
      mockEnvironmentLoader.validateConfiguration.mockReturnValue({ valid: true, errors: [] });

      module = await Test.createTestingModule({
        imports: [
          NestJSConfigIntegrationModule.forRoot(integrationOptions),
          ConfigModule.forRoot({
            isGlobal: true,
          }),
        ],
        providers: [
          {
            provide: SecretsManagerLoader,
            useValue: mockSecretsManagerLoader,
          },
          {
            provide: SSMParameterStoreLoader,
            useValue: mockSSMLoader,
          },
          {
            provide: EnvironmentLoader,
            useValue: mockEnvironmentLoader,
          },
        ],
      }).compile();

      integrationService = module.get<NestJSConfigIntegrationService>(NestJSConfigIntegrationService);

      // Act - Simulate refresh error
      mockSecretsManagerLoader.load.mockRejectedValueOnce(new Error('Refresh failed'));
      const refreshResult = await integrationService.refreshConfiguration();

      // Assert
      expect(refreshResult.success).toBe(false);
      expect(refreshResult.error).toBeDefined();
    });
  });

  describe('health monitoring and diagnostics', () => {
    it('should provide health check information', async () => {
      // Arrange
      const integrationOptions: IntegrationOptions = {
        enableLogging: false,
        failOnAwsError: false,
        fallbackToLocal: true,
        precedence: 'aws-first',
        namespaces: ['database'],
        registerGlobally: true,
      };

      const mockConfig = {
        database: { host: 'test-host' }
      };

      mockSecretsManagerLoader.isAvailable.mockResolvedValue(true);
      mockSecretsManagerLoader.load.mockResolvedValue(mockConfig);
      mockSecretsManagerLoader.validateConfiguration.mockReturnValue({ valid: true, errors: [] });
      
      mockSSMLoader.isAvailable.mockResolvedValue(false);
      mockEnvironmentLoader.isAvailable.mockResolvedValue(true);
      mockEnvironmentLoader.load.mockResolvedValue({});
      mockEnvironmentLoader.validateConfiguration.mockReturnValue({ valid: true, errors: [] });

      module = await Test.createTestingModule({
        imports: [
          NestJSConfigIntegrationModule.forRoot(integrationOptions),
          ConfigModule.forRoot({
            isGlobal: true,
          }),
        ],
        providers: [
          {
            provide: SecretsManagerLoader,
            useValue: mockSecretsManagerLoader,
          },
          {
            provide: SSMParameterStoreLoader,
            useValue: mockSSMLoader,
          },
          {
            provide: EnvironmentLoader,
            useValue: mockEnvironmentLoader,
          },
        ],
      }).compile();

      integrationService = module.get<NestJSConfigIntegrationService>(NestJSConfigIntegrationService);

      // Act
      const healthCheck = await integrationService.healthCheck();

      // Assert
      expect(healthCheck.healthy).toBe(true);
      expect(healthCheck.status).toBe('ok');
      expect(healthCheck.checks).toMatchObject({
        initialization: true,
        factoriesRegistered: true,
        noErrors: true,
      });
    });

    it('should provide diagnostic information', async () => {
      // Arrange
      const integrationOptions: IntegrationOptions = {
        enableLogging: false,
        failOnAwsError: false,
        fallbackToLocal: true,
        precedence: 'aws-first',
        namespaces: ['database', 'api'],
        registerGlobally: true,
      };

      const mockConfig = {
        database: { host: 'test-host' },
        api: { version: 'v1' }
      };

      mockSecretsManagerLoader.isAvailable.mockResolvedValue(true);
      mockSecretsManagerLoader.load.mockResolvedValue(mockConfig);
      mockSecretsManagerLoader.validateConfiguration.mockReturnValue({ valid: true, errors: [] });
      
      mockSSMLoader.isAvailable.mockResolvedValue(false);
      mockEnvironmentLoader.isAvailable.mockResolvedValue(true);
      mockEnvironmentLoader.load.mockResolvedValue({});
      mockEnvironmentLoader.validateConfiguration.mockReturnValue({ valid: true, errors: [] });

      module = await Test.createTestingModule({
        imports: [
          NestJSConfigIntegrationModule.forRoot(integrationOptions),
          ConfigModule.forRoot({
            isGlobal: true,
          }),
        ],
        providers: [
          {
            provide: SecretsManagerLoader,
            useValue: mockSecretsManagerLoader,
          },
          {
            provide: SSMParameterStoreLoader,
            useValue: mockSSMLoader,
          },
          {
            provide: EnvironmentLoader,
            useValue: mockEnvironmentLoader,
          },
        ],
      }).compile();

      integrationService = module.get<NestJSConfigIntegrationService>(NestJSConfigIntegrationService);

      // Act
      const diagnostics = integrationService.getDiagnostics();

      // Assert
      expect(diagnostics).toMatchObject({
        factoryCount: expect.any(Number),
        sourceCount: expect.any(Number),
        hasErrors: false,
        isReady: true,
      });
      expect(diagnostics.state).toBeDefined();
      expect(diagnostics.performance).toBeDefined();
    });
  });

  describe('module cleanup and shutdown', () => {
    it('should cleanup resources on module destroy', async () => {
      // Arrange
      const integrationOptions: IntegrationOptions = {
        enableLogging: false,
        failOnAwsError: false,
        fallbackToLocal: true,
        precedence: 'aws-first',
        namespaces: ['database'],
        registerGlobally: true,
      };

      mockSecretsManagerLoader.isAvailable.mockResolvedValue(true);
      mockSecretsManagerLoader.load.mockResolvedValue({ database: { host: 'test' } });
      mockSecretsManagerLoader.validateConfiguration.mockReturnValue({ valid: true, errors: [] });
      
      mockSSMLoader.isAvailable.mockResolvedValue(false);
      mockEnvironmentLoader.isAvailable.mockResolvedValue(true);
      mockEnvironmentLoader.load.mockResolvedValue({});
      mockEnvironmentLoader.validateConfiguration.mockReturnValue({ valid: true, errors: [] });

      module = await Test.createTestingModule({
        imports: [
          NestJSConfigIntegrationModule.forRoot(integrationOptions),
          ConfigModule.forRoot({
            isGlobal: true,
          }),
        ],
        providers: [
          {
            provide: SecretsManagerLoader,
            useValue: mockSecretsManagerLoader,
          },
          {
            provide: SSMParameterStoreLoader,
            useValue: mockSSMLoader,
          },
          {
            provide: EnvironmentLoader,
            useValue: mockEnvironmentLoader,
          },
        ],
      }).compile();

      integrationService = module.get<NestJSConfigIntegrationService>(NestJSConfigIntegrationService);
      stateService = module.get<IntegrationStateService>(IntegrationStateService);

      // Verify initial state
      expect(integrationService.isReady()).toBe(true);
      expect(stateService.isInitialized()).toBe(true);

      // Act
      await integrationService.cleanup();

      // Assert
      expect(stateService.isInitialized()).toBe(false);
    });

    it('should handle cleanup errors gracefully', async () => {
      // Arrange
      const integrationOptions: IntegrationOptions = {
        enableLogging: false,
        failOnAwsError: false,
        fallbackToLocal: true,
        precedence: 'aws-first',
        namespaces: ['database'],
        registerGlobally: true,
      };

      mockSecretsManagerLoader.isAvailable.mockResolvedValue(true);
      mockSecretsManagerLoader.load.mockResolvedValue({ database: { host: 'test' } });
      mockSecretsManagerLoader.validateConfiguration.mockReturnValue({ valid: true, errors: [] });
      
      mockSSMLoader.isAvailable.mockResolvedValue(false);
      mockEnvironmentLoader.isAvailable.mockResolvedValue(true);
      mockEnvironmentLoader.load.mockResolvedValue({});
      mockEnvironmentLoader.validateConfiguration.mockReturnValue({ valid: true, errors: [] });

      module = await Test.createTestingModule({
        imports: [
          NestJSConfigIntegrationModule.forRoot(integrationOptions),
          ConfigModule.forRoot({
            isGlobal: true,
          }),
        ],
        providers: [
          {
            provide: SecretsManagerLoader,
            useValue: mockSecretsManagerLoader,
          },
          {
            provide: SSMParameterStoreLoader,
            useValue: mockSSMLoader,
          },
          {
            provide: EnvironmentLoader,
            useValue: mockEnvironmentLoader,
          },
        ],
      }).compile();

      integrationService = module.get<NestJSConfigIntegrationService>(NestJSConfigIntegrationService);

      // Act & Assert - Should not throw
      await expect(integrationService.cleanup()).resolves.not.toThrow();
    });
  });

  describe('concurrent access and thread safety', () => {
    it('should handle concurrent configuration access', async () => {
      // Arrange
      const integrationOptions: IntegrationOptions = {
        enableLogging: false,
        failOnAwsError: false,
        fallbackToLocal: true,
        precedence: 'aws-first',
        namespaces: ['database'],
        registerGlobally: true,
      };

      const mockConfig = {
        database: { host: 'concurrent-host', port: 5432 }
      };

      mockSecretsManagerLoader.isAvailable.mockResolvedValue(true);
      mockSecretsManagerLoader.load.mockResolvedValue(mockConfig);
      mockSecretsManagerLoader.validateConfiguration.mockReturnValue({ valid: true, errors: [] });
      
      mockSSMLoader.isAvailable.mockResolvedValue(false);
      mockEnvironmentLoader.isAvailable.mockResolvedValue(true);
      mockEnvironmentLoader.load.mockResolvedValue({});
      mockEnvironmentLoader.validateConfiguration.mockReturnValue({ valid: true, errors: [] });

      module = await Test.createTestingModule({
        imports: [
          NestJSConfigIntegrationModule.forRoot(integrationOptions),
          ConfigModule.forRoot({
            isGlobal: true,
          }),
        ],
        providers: [
          {
            provide: SecretsManagerLoader,
            useValue: mockSecretsManagerLoader,
          },
          {
            provide: SSMParameterStoreLoader,
            useValue: mockSSMLoader,
          },
          {
            provide: EnvironmentLoader,
            useValue: mockEnvironmentLoader,
          },
        ],
      }).compile();

      configService = module.get<ConfigService>(ConfigService);

      // Act - Simulate concurrent access
      const concurrentPromises = Array.from({ length: 10 }, (_, i) => 
        Promise.resolve().then(() => ({
          host: configService.get('database.host'),
          port: configService.get('database.port'),
          iteration: i,
        }))
      );

      const results = await Promise.all(concurrentPromises);

      // Assert
      results.forEach((result, index) => {
        expect(result.host).toBe('concurrent-host');
        expect(result.port).toBe(5432);
        expect(result.iteration).toBe(index);
      });
    });
  });
});