import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NestConfigAwsIntegrationModule } from '../../src/integration/nestjs-config-integration.module';
import { SecretsManagerLoader } from '../../src/loaders/secrets-manager.loader';
import { SSMParameterStoreLoader } from '../../src/loaders/ssm-parameter-store.loader';
import { EnvironmentLoader } from '../../src/loaders/environment.loader';
import { IntegrationOptions } from '../../src/integration/interfaces/integration-options.interface';

describe('NestJS Config Integration - End-to-End', () => {
  let module: TestingModule;
  let configService: ConfigService;

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

  describe('synchronous module setup', () => {
    it('should integrate with @nestjs/config using forRoot', async () => {
      // Arrange
      const integrationOptions: IntegrationOptions = {
        enableLogging: false,
        failOnAwsError: false,
        fallbackToLocal: true,
        precedence: 'aws-first',
        namespaces: ['database', 'api'],
        registerGlobally: true,
        secretsManagerConfig: {
          enabled: true,
          region: 'us-east-1',
          paths: {
            database: '/myapp/database',
            api: '/myapp/api'
          }
        }
      };

      const mockAwsConfig = {
        database: { password: 'secret-password', ssl: true },
        api: { timeout: 5000 }
      };

      const mockEnvConfig = {
        NODE_ENV: 'test',
        database: { host: 'localhost', port: 5432 },
        api: { version: 'v1' }
      };

      mockSecretsManagerLoader.isAvailable.mockResolvedValue(true);
      mockSecretsManagerLoader.load.mockResolvedValue(mockAwsConfig);
      mockSecretsManagerLoader.validateConfiguration.mockReturnValue({ valid: true, errors: [] });
      
      mockSSMLoader.isAvailable.mockResolvedValue(false);
      
      mockEnvironmentLoader.isAvailable.mockResolvedValue(true);
      mockEnvironmentLoader.load.mockResolvedValue(mockEnvConfig);
      mockEnvironmentLoader.validateConfiguration.mockReturnValue({ valid: true, errors: [] });

      // Act
      module = await Test.createTestingModule({
        imports: [
          NestJSConfigIntegrationModule.forRoot(integrationOptions),
          ConfigModule.forRoot({
            isGlobal: true,
            cache: true,
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

      // Assert
      expect(configService).toBeDefined();
      
      // Test AWS-first precedence: AWS values should override local values
      expect(configService.get('database.password')).toBe('secret-password');
      expect(configService.get('database.ssl')).toBe(true);
      expect(configService.get('database.host')).toBe('localhost'); // From env
      expect(configService.get('database.port')).toBe(5432); // From env
      
      expect(configService.get('api.timeout')).toBe(5000); // From AWS
      expect(configService.get('api.version')).toBe('v1'); // From env
      
      expect(configService.get('NODE_ENV')).toBe('test');
    });

    it('should handle AWS unavailability with fallback', async () => {
      // Arrange
      const integrationOptions: IntegrationOptions = {
        enableLogging: false,
        failOnAwsError: false,
        fallbackToLocal: true,
        precedence: 'aws-first',
        namespaces: ['database'],
        registerGlobally: true,
      };

      const mockEnvConfig = {
        database: { host: 'localhost', port: 5432 },
        NODE_ENV: 'test'
      };

      mockSecretsManagerLoader.isAvailable.mockResolvedValue(false);
      mockSSMLoader.isAvailable.mockResolvedValue(false);
      mockEnvironmentLoader.isAvailable.mockResolvedValue(true);
      mockEnvironmentLoader.load.mockResolvedValue(mockEnvConfig);
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

      // Assert
      expect(configService.get('database.host')).toBe('localhost');
      expect(configService.get('database.port')).toBe(5432);
      expect(configService.get('NODE_ENV')).toBe('test');
    });

    it('should respect local-first precedence', async () => {
      // Arrange
      const integrationOptions: IntegrationOptions = {
        enableLogging: false,
        failOnAwsError: false,
        fallbackToLocal: true,
        precedence: 'local-first',
        namespaces: ['database'],
        registerGlobally: true,
      };

      const mockAwsConfig = {
        database: { host: 'aws-host', password: 'aws-password' }
      };

      const mockEnvConfig = {
        database: { host: 'local-host', port: 5432 }
      };

      mockSecretsManagerLoader.isAvailable.mockResolvedValue(true);
      mockSecretsManagerLoader.load.mockResolvedValue(mockAwsConfig);
      mockSecretsManagerLoader.validateConfiguration.mockReturnValue({ valid: true, errors: [] });
      
      mockSSMLoader.isAvailable.mockResolvedValue(false);
      
      mockEnvironmentLoader.isAvailable.mockResolvedValue(true);
      mockEnvironmentLoader.load.mockResolvedValue(mockEnvConfig);
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

      // Assert
      // Local values should take precedence
      expect(configService.get('database.host')).toBe('local-host');
      expect(configService.get('database.port')).toBe(5432);
      // AWS-only values should still be available
      expect(configService.get('database.password')).toBe('aws-password');
    });
  });

  describe('asynchronous module setup', () => {
    it('should integrate with @nestjs/config using forRootAsync', async () => {
      // Arrange
      const mockAwsConfig = {
        database: { password: 'async-secret' },
        api: { key: 'async-api-key' }
      };

      const mockEnvConfig = {
        database: { host: 'async-host' },
        NODE_ENV: 'test'
      };

      mockSecretsManagerLoader.isAvailable.mockResolvedValue(true);
      mockSecretsManagerLoader.load.mockResolvedValue(mockAwsConfig);
      mockSecretsManagerLoader.validateConfiguration.mockReturnValue({ valid: true, errors: [] });
      
      mockSSMLoader.isAvailable.mockResolvedValue(false);
      
      mockEnvironmentLoader.isAvailable.mockResolvedValue(true);
      mockEnvironmentLoader.load.mockResolvedValue(mockEnvConfig);
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
              namespaces: ['database', 'api'],
              registerGlobally: true,
              secretsManagerConfig: {
                enabled: true,
                region: 'us-east-1',
                paths: {
                  database: '/async/database',
                  api: '/async/api'
                }
              }
            }),
          }),
          ConfigModule.forRootAsync({
            useFactory: async (configService: ConfigService) => ({
              isGlobal: true,
              cache: true,
            }),
            inject: [ConfigService],
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

      // Assert
      expect(configService).toBeDefined();
      expect(configService.get('database.password')).toBe('async-secret');
      expect(configService.get('database.host')).toBe('async-host');
      expect(configService.get('api.key')).toBe('async-api-key');
    });

    it('should handle async initialization errors', async () => {
      // Arrange
      mockSecretsManagerLoader.isAvailable.mockRejectedValue(new Error('Async AWS error'));
      mockSSMLoader.isAvailable.mockResolvedValue(false);
      mockEnvironmentLoader.isAvailable.mockResolvedValue(true);
      mockEnvironmentLoader.load.mockResolvedValue({ NODE_ENV: 'test' });
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

      // Assert
      expect(configService).toBeDefined();
      expect(configService.get('NODE_ENV')).toBe('test');
    });
  });

  describe('namespace and validation integration', () => {
    it('should work with namespaced configuration', async () => {
      // Arrange
      const integrationOptions: IntegrationOptions = {
        enableLogging: false,
        failOnAwsError: false,
        fallbackToLocal: true,
        precedence: 'aws-first',
        namespaces: ['database', 'api'],
        registerGlobally: true,
      };

      const mockAwsConfig = {
        database: { password: 'secret' },
        api: { key: 'api-key' }
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

      // Assert
      // Test namespaced access
      expect(configService.get('database')).toEqual({ password: 'secret' });
      expect(configService.get('api')).toEqual({ key: 'api-key' });
      
      // Test dot notation access
      expect(configService.get('database.password')).toBe('secret');
      expect(configService.get('api.key')).toBe('api-key');
    });

    it('should work with custom validation', async () => {
      // Arrange
      const integrationOptions: IntegrationOptions = {
        enableLogging: false,
        failOnAwsError: false,
        fallbackToLocal: true,
        precedence: 'aws-first',
        namespaces: ['database'],
        registerGlobally: true,
      };

      const mockAwsConfig = {
        database: { host: 'localhost', port: '5432' } // Port as string
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
            validate: (config) => {
              // Custom validation that converts string port to number
              if (config.database && typeof config.database.port === 'string') {
                config.database.port = parseInt(config.database.port, 10);
              }
              return config;
            },
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

      // Assert
      expect(configService.get('database.host')).toBe('localhost');
      expect(configService.get('database.port')).toBe(5432); // Should be converted to number
      expect(typeof configService.get('database.port')).toBe('number');
    });
  });

  describe('configuration value accessibility', () => {
    it('should make AWS-sourced values accessible through standard ConfigService methods', async () => {
      // Arrange
      const integrationOptions: IntegrationOptions = {
        enableLogging: false,
        failOnAwsError: false,
        fallbackToLocal: true,
        precedence: 'aws-first',
        namespaces: ['app'],
        registerGlobally: true,
      };

      const mockAwsConfig = {
        app: {
          name: 'test-app',
          version: '1.0.0',
          features: ['auth', 'logging'],
          database: {
            host: 'aws-db-host',
            port: 5432,
            ssl: true
          }
        }
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

      // Assert - Test various ConfigService methods
      
      // Test get() method
      expect(configService.get('app.name')).toBe('test-app');
      expect(configService.get('app.version')).toBe('1.0.0');
      expect(configService.get('app.features')).toEqual(['auth', 'logging']);
      
      // Test nested object access
      expect(configService.get('app.database.host')).toBe('aws-db-host');
      expect(configService.get('app.database.port')).toBe(5432);
      expect(configService.get('app.database.ssl')).toBe(true);
      
      // Test get() with default values
      expect(configService.get('app.nonexistent', 'default-value')).toBe('default-value');
      expect(configService.get('app.timeout', 30000)).toBe(30000);
      
      // Test getOrThrow() method
      expect(configService.getOrThrow('app.name')).toBe('test-app');
      expect(() => configService.getOrThrow('app.nonexistent')).toThrow();
      
      // Test object retrieval
      expect(configService.get('app')).toEqual(mockAwsConfig.app);
      expect(configService.get('app.database')).toEqual(mockAwsConfig.app.database);
    });

    it('should support typed configuration access', async () => {
      // Arrange
      interface DatabaseConfig {
        host: string;
        port: number;
        ssl: boolean;
        credentials?: {
          username: string;
          password: string;
        };
      }

      const integrationOptions: IntegrationOptions = {
        enableLogging: false,
        failOnAwsError: false,
        fallbackToLocal: true,
        precedence: 'aws-first',
        namespaces: ['database'],
        registerGlobally: true,
      };

      const mockAwsConfig = {
        database: {
          host: 'aws-host',
          port: 5432,
          ssl: true,
          credentials: {
            username: 'aws-user',
            password: 'aws-pass'
          }
        }
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

      // Assert - Test typed access
      const databaseConfig = configService.get<DatabaseConfig>('database');
      expect(databaseConfig).toBeDefined();
      expect(databaseConfig?.host).toBe('aws-host');
      expect(databaseConfig?.port).toBe(5432);
      expect(databaseConfig?.ssl).toBe(true);
      expect(databaseConfig?.credentials?.username).toBe('aws-user');
      expect(databaseConfig?.credentials?.password).toBe('aws-pass');
      
      // Test typed getOrThrow
      const typedConfig = configService.getOrThrow<DatabaseConfig>('database');
      expect(typedConfig.host).toBe('aws-host');
      expect(typedConfig.port).toBe(5432);
    });
  });

  describe('error scenarios and edge cases', () => {
    it('should handle partial AWS failures gracefully', async () => {
      // Arrange
      const integrationOptions: IntegrationOptions = {
        enableLogging: false,
        failOnAwsError: false,
        fallbackToLocal: true,
        precedence: 'aws-first',
        namespaces: ['database', 'api'],
        registerGlobally: true,
      };

      const mockEnvConfig = {
        database: { host: 'fallback-host' },
        api: { version: 'v1' },
        NODE_ENV: 'test'
      };

      // Secrets Manager fails, but environment works
      mockSecretsManagerLoader.isAvailable.mockRejectedValue(new Error('AWS connection failed'));
      mockSSMLoader.isAvailable.mockResolvedValue(false);
      mockEnvironmentLoader.isAvailable.mockResolvedValue(true);
      mockEnvironmentLoader.load.mockResolvedValue(mockEnvConfig);
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

      // Assert
      expect(configService).toBeDefined();
      expect(configService.get('database.host')).toBe('fallback-host');
      expect(configService.get('api.version')).toBe('v1');
      expect(configService.get('NODE_ENV')).toBe('test');
    });

    it('should handle empty configuration gracefully', async () => {
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
      mockSecretsManagerLoader.load.mockResolvedValue({});
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

      // Assert
      expect(configService).toBeDefined();
      expect(configService.get('database')).toBeUndefined();
      expect(configService.get('database.host', 'default')).toBe('default');
    });
  });
});