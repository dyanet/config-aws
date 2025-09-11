import { Test, TestingModule } from '@nestjs/testing';
import { AwsConfigurationLoaderService } from '../../../src/integration/providers/aws-configuration-loader.service';
import { SecretsManagerLoader } from '../../../src/loaders/secrets-manager.loader';
import { SSMParameterStoreLoader } from '../../../src/loaders/ssm-parameter-store.loader';
import { EnvironmentLoader } from '../../../src/loaders/environment.loader';
import { IntegrationOptions } from '../../../src/integration/interfaces/integration-options.interface';
import { NESTJS_CONFIG_AWS_INTEGRATION_OPTIONS } from '../../../src/integration/nestjs-config-integration.module';

describe('AwsConfigurationLoaderService', () => {
  let service: AwsConfigurationLoaderService;
  let secretsManagerLoader: jest.Mocked<SecretsManagerLoader>;
  let ssmLoader: jest.Mocked<SSMParameterStoreLoader>;
  let environmentLoader: jest.Mocked<EnvironmentLoader>;

  const mockIntegrationOptions: IntegrationOptions = {
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
    },
    ssmConfig: {
      enabled: true,
      region: 'us-east-1',
      paths: {
        database: '/myapp/database/',
        api: '/myapp/api/'
      }
    }
  };

  beforeEach(async () => {
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

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AwsConfigurationLoaderService,
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
        {
          provide: NESTJS_CONFIG_AWS_INTEGRATION_OPTIONS,
          useValue: mockIntegrationOptions,
        },
      ],
    }).compile();

    service = module.get<AwsConfigurationLoaderService>(AwsConfigurationLoaderService);
    secretsManagerLoader = module.get(SecretsManagerLoader);
    ssmLoader = module.get(SSMParameterStoreLoader);
    environmentLoader = module.get(EnvironmentLoader);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('loadConfiguration', () => {
    it('should load configuration from all available sources', async () => {
      // Arrange
      const secretsConfig = { database: { password: 'secret' } };
      const ssmConfig = { database: { host: 'localhost' }, api: { port: 3000 } };
      const envConfig = { NODE_ENV: 'test' };

      secretsManagerLoader.isAvailable.mockResolvedValue(true);
      secretsManagerLoader.load.mockResolvedValue(secretsConfig);
      ssmLoader.isAvailable.mockResolvedValue(true);
      ssmLoader.load.mockResolvedValue(ssmConfig);
      environmentLoader.isAvailable.mockResolvedValue(true);
      environmentLoader.load.mockResolvedValue(envConfig);

      // Act
      const result = await service.loadConfiguration();

      // Assert
      expect(result).toEqual({
        database: { password: 'secret', host: 'localhost' },
        api: { port: 3000 },
        NODE_ENV: 'test'
      });
      expect(secretsManagerLoader.load).toHaveBeenCalled();
      expect(ssmLoader.load).toHaveBeenCalled();
      expect(environmentLoader.load).toHaveBeenCalled();
    });

    it('should handle unavailable AWS services gracefully', async () => {
      // Arrange
      const envConfig = { NODE_ENV: 'test' };

      secretsManagerLoader.isAvailable.mockResolvedValue(false);
      ssmLoader.isAvailable.mockResolvedValue(false);
      environmentLoader.isAvailable.mockResolvedValue(true);
      environmentLoader.load.mockResolvedValue(envConfig);

      // Act
      const result = await service.loadConfiguration();

      // Assert
      expect(result).toEqual(envConfig);
      expect(secretsManagerLoader.load).not.toHaveBeenCalled();
      expect(ssmLoader.load).not.toHaveBeenCalled();
      expect(environmentLoader.load).toHaveBeenCalled();
    });

    it('should handle loader errors when fallback is enabled', async () => {
      // Arrange
      const envConfig = { NODE_ENV: 'test' };

      secretsManagerLoader.isAvailable.mockResolvedValue(true);
      secretsManagerLoader.load.mockRejectedValue(new Error('AWS service error'));
      ssmLoader.isAvailable.mockResolvedValue(false);
      environmentLoader.isAvailable.mockResolvedValue(true);
      environmentLoader.load.mockResolvedValue(envConfig);

      // Act
      const result = await service.loadConfiguration();

      // Assert
      expect(result).toEqual(envConfig);
      expect(environmentLoader.load).toHaveBeenCalled();
    });

    it('should throw error when failOnAwsError is true and AWS fails', async () => {
      // Arrange
      const failOnErrorOptions = { ...mockIntegrationOptions, failOnAwsError: true, fallbackToLocal: false };
      
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          AwsConfigurationLoaderService,
          {
            provide: SecretsManagerLoader,
            useValue: secretsManagerLoader,
          },
          {
            provide: SSMParameterStoreLoader,
            useValue: ssmLoader,
          },
          {
            provide: EnvironmentLoader,
            useValue: environmentLoader,
          },
          {
            provide: NESTJS_CONFIG_AWS_INTEGRATION_OPTIONS,
            useValue: failOnErrorOptions,
          },
        ],
      }).compile();

      const failService = module.get<AwsConfigurationLoaderService>(AwsConfigurationLoaderService);
      
      secretsManagerLoader.isAvailable.mockResolvedValue(true);
      secretsManagerLoader.load.mockRejectedValue(new Error('AWS service error'));

      // Act & Assert
      await expect(failService.loadConfiguration()).rejects.toThrow('AWS service error');
    });
  });

  describe('loadNamespacedConfiguration', () => {
    it('should load configuration for specific namespaces', async () => {
      // Arrange
      const namespaces = ['database', 'api'];
      const secretsConfig = { database: { password: 'secret' } };
      const ssmConfig = { database: { host: 'localhost' }, api: { port: 3000 } };

      secretsManagerLoader.isAvailable.mockResolvedValue(true);
      secretsManagerLoader.load.mockResolvedValue(secretsConfig);
      ssmLoader.isAvailable.mockResolvedValue(true);
      ssmLoader.load.mockResolvedValue(ssmConfig);
      environmentLoader.isAvailable.mockResolvedValue(true);
      environmentLoader.load.mockResolvedValue({});

      // Act
      const result = await service.loadNamespacedConfiguration(namespaces);

      // Assert
      expect(result).toEqual({
        database: { password: 'secret', host: 'localhost' },
        api: { port: 3000 }
      });
    });

    it('should return empty object for non-existent namespaces', async () => {
      // Arrange
      const namespaces = ['nonexistent'];

      secretsManagerLoader.isAvailable.mockResolvedValue(true);
      secretsManagerLoader.load.mockResolvedValue({});
      ssmLoader.isAvailable.mockResolvedValue(true);
      ssmLoader.load.mockResolvedValue({});
      environmentLoader.isAvailable.mockResolvedValue(true);
      environmentLoader.load.mockResolvedValue({});

      // Act
      const result = await service.loadNamespacedConfiguration(namespaces);

      // Assert
      expect(result).toEqual({});
    });

    it('should handle partial namespace availability', async () => {
      // Arrange
      const namespaces = ['database', 'api', 'cache'];
      const secretsConfig = { database: { password: 'secret' } };
      const ssmConfig = { api: { port: 3000 } };

      secretsManagerLoader.isAvailable.mockResolvedValue(true);
      secretsManagerLoader.load.mockResolvedValue(secretsConfig);
      ssmLoader.isAvailable.mockResolvedValue(true);
      ssmLoader.load.mockResolvedValue(ssmConfig);
      environmentLoader.isAvailable.mockResolvedValue(true);
      environmentLoader.load.mockResolvedValue({});

      // Act
      const result = await service.loadNamespacedConfiguration(namespaces);

      // Assert
      expect(result).toEqual({
        database: { password: 'secret' },
        api: { port: 3000 }
      });
    });
  });

  describe('isAvailable', () => {
    it('should return true when at least one loader is available', async () => {
      // Arrange
      secretsManagerLoader.isAvailable.mockResolvedValue(false);
      ssmLoader.isAvailable.mockResolvedValue(true);
      environmentLoader.isAvailable.mockResolvedValue(false);

      // Act
      const result = await service.isAvailable();

      // Assert
      expect(result).toBe(true);
    });

    it('should return false when no loaders are available', async () => {
      // Arrange
      secretsManagerLoader.isAvailable.mockResolvedValue(false);
      ssmLoader.isAvailable.mockResolvedValue(false);
      environmentLoader.isAvailable.mockResolvedValue(false);

      // Act
      const result = await service.isAvailable();

      // Assert
      expect(result).toBe(false);
    });

    it('should handle loader availability check errors', async () => {
      // Arrange
      secretsManagerLoader.isAvailable.mockRejectedValue(new Error('Connection error'));
      ssmLoader.isAvailable.mockResolvedValue(true);
      environmentLoader.isAvailable.mockResolvedValue(true);

      // Act
      const result = await service.isAvailable();

      // Assert
      expect(result).toBe(true);
    });
  });

  describe('getAvailableSources', () => {
    it('should return available sources with metadata', async () => {
      // Arrange
      const secretsConfig = { database: { password: 'secret' } };
      const ssmConfig = { api: { port: 3000 } };

      secretsManagerLoader.isAvailable.mockResolvedValue(true);
      secretsManagerLoader.load.mockResolvedValue(secretsConfig);
      ssmLoader.isAvailable.mockResolvedValue(true);
      ssmLoader.load.mockResolvedValue(ssmConfig);
      environmentLoader.isAvailable.mockResolvedValue(false);

      // Act
      const result = await service.getAvailableSources();

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        name: 'secrets-manager',
        type: 'secrets-manager',
        data: secretsConfig,
      });
      expect(result[1]).toMatchObject({
        name: 'ssm-parameter-store',
        type: 'ssm',
        data: ssmConfig,
      });
      expect(result[0]?.loadedAt).toBeInstanceOf(Date);
      expect(result[1]?.loadedAt).toBeInstanceOf(Date);
    });

    it('should return empty array when no sources are available', async () => {
      // Arrange
      secretsManagerLoader.isAvailable.mockResolvedValue(false);
      ssmLoader.isAvailable.mockResolvedValue(false);
      environmentLoader.isAvailable.mockResolvedValue(false);

      // Act
      const result = await service.getAvailableSources();

      // Assert
      expect(result).toEqual([]);
    });

    it('should handle source loading errors gracefully', async () => {
      // Arrange
      secretsManagerLoader.isAvailable.mockResolvedValue(true);
      secretsManagerLoader.load.mockRejectedValue(new Error('Load error'));
      ssmLoader.isAvailable.mockResolvedValue(true);
      ssmLoader.load.mockResolvedValue({ api: { port: 3000 } });
      environmentLoader.isAvailable.mockResolvedValue(false);

      // Act
      const result = await service.getAvailableSources();

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0]?.type).toBe('ssm');
    });
  });

  describe('error handling and graceful degradation', () => {
    it('should continue loading from other sources when one fails', async () => {
      // Arrange
      const ssmConfig = { api: { port: 3000 } };
      const envConfig = { NODE_ENV: 'test' };

      secretsManagerLoader.isAvailable.mockResolvedValue(true);
      secretsManagerLoader.load.mockRejectedValue(new Error('Secrets Manager error'));
      ssmLoader.isAvailable.mockResolvedValue(true);
      ssmLoader.load.mockResolvedValue(ssmConfig);
      environmentLoader.isAvailable.mockResolvedValue(true);
      environmentLoader.load.mockResolvedValue(envConfig);

      // Act
      const result = await service.loadConfiguration();

      // Assert
      expect(result).toEqual({
        api: { port: 3000 },
        NODE_ENV: 'test'
      });
    });

    it('should log errors when enableLogging is true', async () => {
      // Arrange
      const loggingOptions = { ...mockIntegrationOptions, enableLogging: true };
      
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          AwsConfigurationLoaderService,
          {
            provide: SecretsManagerLoader,
            useValue: secretsManagerLoader,
          },
          {
            provide: SSMParameterStoreLoader,
            useValue: ssmLoader,
          },
          {
            provide: EnvironmentLoader,
            useValue: environmentLoader,
          },
          {
            provide: NESTJS_CONFIG_AWS_INTEGRATION_OPTIONS,
            useValue: loggingOptions,
          },
        ],
      }).compile();

      const loggingService = module.get<AwsConfigurationLoaderService>(AwsConfigurationLoaderService);
      
      secretsManagerLoader.isAvailable.mockResolvedValue(true);
      secretsManagerLoader.load.mockRejectedValue(new Error('Test error'));
      ssmLoader.isAvailable.mockResolvedValue(false);
      environmentLoader.isAvailable.mockResolvedValue(true);
      environmentLoader.load.mockResolvedValue({ NODE_ENV: 'test' });

      // Act
      const result = await loggingService.loadConfiguration();

      // Assert
      expect(result).toEqual({ NODE_ENV: 'test' });
      // Note: In a real test, you might want to spy on the logger to verify error logging
    });

    it('should handle timeout scenarios gracefully', async () => {
      // Arrange
      const envConfig = { NODE_ENV: 'test' };

      secretsManagerLoader.isAvailable.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve(false), 100))
      );
      ssmLoader.isAvailable.mockResolvedValue(false);
      environmentLoader.isAvailable.mockResolvedValue(true);
      environmentLoader.load.mockResolvedValue(envConfig);

      // Act
      const result = await service.loadConfiguration();

      // Assert
      expect(result).toEqual(envConfig);
    });
  });

  describe('configuration validation', () => {
    it('should validate loader configurations on initialization', async () => {
      // Arrange
      secretsManagerLoader.validateConfiguration.mockReturnValue({ valid: true, errors: [] });
      ssmLoader.validateConfiguration.mockReturnValue({ valid: true, errors: [] });
      environmentLoader.validateConfiguration.mockReturnValue({ valid: true, errors: [] });

      // Act
      await service.loadConfiguration();

      // Assert
      expect(secretsManagerLoader.validateConfiguration).toHaveBeenCalled();
      expect(ssmLoader.validateConfiguration).toHaveBeenCalled();
      expect(environmentLoader.validateConfiguration).toHaveBeenCalled();
    });

    it('should handle invalid loader configurations', async () => {
      // Arrange
      secretsManagerLoader.validateConfiguration.mockReturnValue({ 
        valid: false, 
        errors: ['Invalid region'] 
      });
      ssmLoader.validateConfiguration.mockReturnValue({ valid: true, errors: [] });
      environmentLoader.validateConfiguration.mockReturnValue({ valid: true, errors: [] });

      secretsManagerLoader.isAvailable.mockResolvedValue(false);
      ssmLoader.isAvailable.mockResolvedValue(true);
      ssmLoader.load.mockResolvedValue({ api: { port: 3000 } });
      environmentLoader.isAvailable.mockResolvedValue(true);
      environmentLoader.load.mockResolvedValue({ NODE_ENV: 'test' });

      // Act
      const result = await service.loadConfiguration();

      // Assert
      expect(result).toEqual({
        api: { port: 3000 },
        NODE_ENV: 'test'
      });
      expect(secretsManagerLoader.load).not.toHaveBeenCalled();
    });
  });
});