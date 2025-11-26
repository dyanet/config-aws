import { Test, TestingModule } from '@nestjs/testing';
import { FactoryRegistrationService } from '../factory-registration.service';
import { ConfigurationFactoryProviderImpl } from '../../providers/configuration-factory.provider';
import { AwsConfigurationLoaderService } from '../../providers/aws-configuration-loader.service';
import { IntegrationOptions } from '../../interfaces/integration-options.interface';
import { NESTJS_CONFIG_AWS_INTEGRATION_OPTIONS } from '../../nestjs-config-integration.module';
import { NamespaceHandlerService } from '../namespace-handler.service';
import { ValidationIntegrationService } from '../validation-integration.service';

describe('FactoryRegistrationService', () => {
  let service: FactoryRegistrationService;
  let configurationFactoryProvider: jest.Mocked<ConfigurationFactoryProviderImpl>;
  let awsConfigurationLoader: jest.Mocked<AwsConfigurationLoaderService>;

  const mockIntegrationOptions: IntegrationOptions = {
    enableLogging: false,
    failOnAwsError: false,
    fallbackToLocal: true,
    precedence: 'aws-first',
    namespaces: ['database', 'api'],
    registerGlobally: true,
  };

  beforeEach(async () => {
    const mockConfigurationFactoryProvider = {
      createFactory: jest.fn(),
      createNamespacedFactories: jest.fn(),
      createAwsConfigurationFactory: jest.fn(),
      mergeWithExisting: jest.fn(),
      createFactoriesFromSources: jest.fn(),
      createFactoriesWithPrecedence: jest.fn(),
      mergeWithPrecedence: jest.fn(),
    };

    const mockAwsConfigurationLoader = {
      loadConfiguration: jest.fn(),
      loadNamespacedConfiguration: jest.fn(),
      isAvailable: jest.fn(),
      getAvailableSources: jest.fn(),
    };

    const mockNamespaceHandler = {
      organizeConfigByNamespaces: jest.fn(),
      createMultipleNamespaceFactories: jest.fn(),
      validateNamespaceAccess: jest.fn(),
    };

    const mockValidationService = {
      createValidatedFactory: jest.fn(),
      getValidationRecommendations: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FactoryRegistrationService,
        {
          provide: ConfigurationFactoryProviderImpl,
          useValue: mockConfigurationFactoryProvider,
        },
        {
          provide: AwsConfigurationLoaderService,
          useValue: mockAwsConfigurationLoader,
        },
        {
          provide: NamespaceHandlerService,
          useValue: mockNamespaceHandler,
        },
        {
          provide: ValidationIntegrationService,
          useValue: mockValidationService,
        },
        {
          provide: NESTJS_CONFIG_AWS_INTEGRATION_OPTIONS,
          useValue: mockIntegrationOptions,
        },
      ],
    }).compile();

    service = module.get<FactoryRegistrationService>(FactoryRegistrationService);
    configurationFactoryProvider = module.get(ConfigurationFactoryProviderImpl);
    awsConfigurationLoader = module.get(AwsConfigurationLoaderService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    service.reset();
  });

  describe('registerFactories', () => {
    it('should register configuration factories successfully', async () => {
      // Arrange
      const mockConfig = { database: { host: 'localhost' }, api: { port: 3000 } };
      const mockSources = [
        {
          name: 'secrets-manager',
          type: 'secrets-manager' as const,
          priority: 100,
          data: mockConfig,
          loadedAt: new Date(),
        },
      ];
      const mockFactory = jest.fn(() => mockConfig);

      awsConfigurationLoader.loadNamespacedConfiguration.mockResolvedValue(mockConfig);
      awsConfigurationLoader.getAvailableSources.mockResolvedValue(mockSources);
      configurationFactoryProvider.createAwsConfigurationFactory.mockReturnValue(mockFactory as any);

      // Act
      const factories = await service.registerFactories();

      // Assert
      expect(factories).toHaveLength(2); // database and api namespaces
      expect(awsConfigurationLoader.loadNamespacedConfiguration).toHaveBeenCalledWith(['database', 'api']);
      expect(configurationFactoryProvider.createAwsConfigurationFactory).toHaveBeenCalledTimes(2);
      expect(service.isFactoriesInitialized()).toBe(true);
    });

    it('should handle AWS configuration loading failure with fallback', async () => {
      // Arrange
      const error = new Error('AWS service unavailable');
      awsConfigurationLoader.loadNamespacedConfiguration.mockRejectedValue(error);

      // Act
      const factories = await service.registerFactories();

      // Assert
      expect(factories).toEqual([]);
      expect(service.isFactoriesInitialized()).toBe(true);
    });

    it('should throw error when failOnAwsError is true', async () => {
      // Arrange
      const error = new Error('AWS service unavailable');
      const failOnErrorOptions = { ...mockIntegrationOptions, failOnAwsError: true, fallbackToLocal: false };
      
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          FactoryRegistrationService,
          {
            provide: ConfigurationFactoryProviderImpl,
            useValue: configurationFactoryProvider,
          },
          {
            provide: AwsConfigurationLoaderService,
            useValue: awsConfigurationLoader,
          },
          {
            provide: NamespaceHandlerService,
            useValue: { organizeConfigByNamespaces: jest.fn(), createMultipleNamespaceFactories: jest.fn(), validateNamespaceAccess: jest.fn() },
          },
          {
            provide: ValidationIntegrationService,
            useValue: { createValidatedFactory: jest.fn(), getValidationRecommendations: jest.fn() },
          },
          {
            provide: NESTJS_CONFIG_AWS_INTEGRATION_OPTIONS,
            useValue: failOnErrorOptions,
          },
        ],
      }).compile();

      const failService = module.get<FactoryRegistrationService>(FactoryRegistrationService);
      awsConfigurationLoader.loadNamespacedConfiguration.mockRejectedValue(error);

      // Act & Assert
      await expect(failService.registerFactories()).rejects.toThrow('AWS service unavailable');
    });

    it('should return cached factories on subsequent calls', async () => {
      // Arrange
      const mockConfig = { database: { host: 'localhost' } };
      const mockSources = [
        {
          name: 'secrets-manager',
          type: 'secrets-manager' as const,
          priority: 100,
          data: mockConfig,
          loadedAt: new Date(),
        },
      ];
      const mockFactory = jest.fn(() => mockConfig);

      awsConfigurationLoader.loadNamespacedConfiguration.mockResolvedValue(mockConfig);
      awsConfigurationLoader.getAvailableSources.mockResolvedValue(mockSources);
      configurationFactoryProvider.createAwsConfigurationFactory.mockReturnValue(mockFactory as any);

      // Act
      const factories1 = await service.registerFactories();
      const factories2 = await service.registerFactories();

      // Assert
      expect(factories1).toEqual(factories2);
      expect(awsConfigurationLoader.loadNamespacedConfiguration).toHaveBeenCalledTimes(1);
    });
  });

  describe('registerFactoriesAsync', () => {
    it('should register factories asynchronously', async () => {
      // Arrange
      const mockConfig = { api: { port: 3000 } };
      const mockSources = [
        {
          name: 'ssm',
          type: 'ssm' as const,
          priority: 90,
          data: mockConfig,
          loadedAt: new Date(),
        },
      ];
      const mockFactory = jest.fn(() => mockConfig);

      awsConfigurationLoader.isAvailable.mockResolvedValue(true);
      awsConfigurationLoader.loadNamespacedConfiguration.mockResolvedValue(mockConfig);
      awsConfigurationLoader.getAvailableSources.mockResolvedValue(mockSources);
      configurationFactoryProvider.createAwsConfigurationFactory.mockReturnValue(mockFactory as any);

      // Act
      const factories = await service.registerFactoriesAsync();

      // Assert
      expect(factories).toHaveLength(1);
      expect(awsConfigurationLoader.isAvailable).toHaveBeenCalled();
    });

    it('should return empty factories when AWS is unavailable', async () => {
      // Arrange
      awsConfigurationLoader.isAvailable.mockResolvedValue(false);

      // Act
      const factories = await service.registerFactoriesAsync();

      // Assert
      expect(factories).toEqual([]);
      expect(awsConfigurationLoader.loadNamespacedConfiguration).not.toHaveBeenCalled();
    });

    it('should throw error when AWS unavailable and failOnAwsError is true', async () => {
      // Arrange
      const failOnErrorOptions = { ...mockIntegrationOptions, failOnAwsError: true, fallbackToLocal: false };
      
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          FactoryRegistrationService,
          {
            provide: ConfigurationFactoryProviderImpl,
            useValue: configurationFactoryProvider,
          },
          {
            provide: AwsConfigurationLoaderService,
            useValue: awsConfigurationLoader,
          },
          {
            provide: NamespaceHandlerService,
            useValue: { organizeConfigByNamespaces: jest.fn(), createMultipleNamespaceFactories: jest.fn(), validateNamespaceAccess: jest.fn() },
          },
          {
            provide: ValidationIntegrationService,
            useValue: { createValidatedFactory: jest.fn(), getValidationRecommendations: jest.fn() },
          },
          {
            provide: NESTJS_CONFIG_AWS_INTEGRATION_OPTIONS,
            useValue: failOnErrorOptions,
          },
        ],
      }).compile();

      const failService = module.get<FactoryRegistrationService>(FactoryRegistrationService);
      awsConfigurationLoader.isAvailable.mockResolvedValue(false);

      // Act & Assert
      await expect(failService.registerFactoriesAsync()).rejects.toThrow('AWS services are not available and failOnAwsError is enabled');
    });
  });

  describe('createSyncFactory', () => {
    it('should create a synchronous factory', () => {
      // Arrange
      const namespace = 'database';
      const config = { host: 'localhost', port: 5432 };
      const mockFactory = jest.fn(() => config);

      configurationFactoryProvider.createFactory.mockReturnValue(mockFactory);

      // Act
      const factory = service.createSyncFactory(namespace, config);

      // Assert
      expect(factory).toBe(mockFactory);
      expect(configurationFactoryProvider.createFactory).toHaveBeenCalledWith(namespace, config);
      expect(service.getFactory(namespace)).toBe(mockFactory);
    });

    it('should create factory with empty config when none provided', () => {
      // Arrange
      const namespace = 'api';
      const mockFactory = jest.fn(() => ({}));

      configurationFactoryProvider.createFactory.mockReturnValue(mockFactory);

      // Act
      const factory = service.createSyncFactory(namespace);

      // Assert
      expect(factory).toBe(mockFactory);
      expect(configurationFactoryProvider.createFactory).toHaveBeenCalledWith(namespace, {});
    });
  });

  describe('registerNamespacedFactories', () => {
    it('should register factories for specific namespaces', async () => {
      // Arrange
      const namespaces = ['database', 'cache'];
      const mockConfig = {
        database: { host: 'localhost' },
        cache: { redis: 'redis://localhost' },
      };
      const mockFactory = jest.fn();

      awsConfigurationLoader.loadNamespacedConfiguration.mockResolvedValue(mockConfig);
      configurationFactoryProvider.createFactory.mockReturnValue(mockFactory);

      // Act
      const factories = await service.registerNamespacedFactories(namespaces);

      // Assert
      expect(factories).toHaveLength(2);
      expect(awsConfigurationLoader.loadNamespacedConfiguration).toHaveBeenCalledWith(namespaces);
      expect(configurationFactoryProvider.createFactory).toHaveBeenCalledTimes(2);
    });

    it('should skip namespaces with no configuration', async () => {
      // Arrange
      const namespaces = ['database', 'empty'];
      const mockConfig = {
        database: { host: 'localhost' },
        empty: {},
      };
      const mockFactory = jest.fn();

      awsConfigurationLoader.loadNamespacedConfiguration.mockResolvedValue(mockConfig);
      configurationFactoryProvider.createFactory.mockReturnValue(mockFactory);

      // Act
      const factories = await service.registerNamespacedFactories(namespaces);

      // Assert
      expect(factories).toHaveLength(1);
      expect(configurationFactoryProvider.createFactory).toHaveBeenCalledTimes(1);
      expect(configurationFactoryProvider.createFactory).toHaveBeenCalledWith('database', { host: 'localhost' });
    });
  });

  describe('getRegisteredFactories', () => {
    it('should return all registered factories', async () => {
      // Arrange
      const mockConfig = { api: { port: 3000 } };
      const mockSources = [
        {
          name: 'environment',
          type: 'environment' as const,
          priority: 50,
          data: mockConfig,
          loadedAt: new Date(),
        },
      ];
      const mockFactory = Object.assign(jest.fn(() => mockConfig), { namespace: 'api' });

      awsConfigurationLoader.loadNamespacedConfiguration.mockResolvedValue(mockConfig);
      awsConfigurationLoader.getAvailableSources.mockResolvedValue(mockSources);
      configurationFactoryProvider.createAwsConfigurationFactory.mockReturnValue(mockFactory as any);

      // Act
      await service.registerFactories();
      const factories = service.getRegisteredFactories();

      // Assert
      expect(factories.size).toBeGreaterThan(0);
      expect(factories.has('api')).toBe(true);
    });

    it('should return empty map when no factories registered', () => {
      // Act
      const factories = service.getRegisteredFactories();

      // Assert
      expect(factories.size).toBe(0);
    });
  });

  describe('getFactory', () => {
    it('should return specific factory by name', () => {
      // Arrange
      const namespace = 'test';
      const config = { value: 'test' };
      const mockFactory = jest.fn(() => config);

      configurationFactoryProvider.createFactory.mockReturnValue(mockFactory);

      // Act
      service.createSyncFactory(namespace, config);
      const factory = service.getFactory(namespace);

      // Assert
      expect(factory).toBe(mockFactory);
    });

    it('should return undefined for non-existent factory', () => {
      // Act
      const factory = service.getFactory('non-existent');

      // Assert
      expect(factory).toBeUndefined();
    });
  });

  describe('isFactoriesInitialized', () => {
    it('should return false initially', () => {
      // Act
      const isInitialized = service.isFactoriesInitialized();

      // Assert
      expect(isInitialized).toBe(false);
    });

    it('should return true after factories are registered', async () => {
      // Arrange
      const mockConfig = { test: { value: 'test' } };
      const mockSources = [
        {
          name: 'test',
          type: 'environment' as const,
          priority: 50,
          data: mockConfig,
          loadedAt: new Date(),
        },
      ];

      awsConfigurationLoader.loadNamespacedConfiguration.mockResolvedValue(mockConfig);
      awsConfigurationLoader.getAvailableSources.mockResolvedValue(mockSources);
      configurationFactoryProvider.createAwsConfigurationFactory.mockReturnValue(jest.fn() as any);

      // Act
      await service.registerFactories();
      const isInitialized = service.isFactoriesInitialized();

      // Assert
      expect(isInitialized).toBe(true);
    });
  });

  describe('reset', () => {
    it('should reset factory registration state', async () => {
      // Arrange
      const mockConfig = { test: { value: 'test' } };
      const mockSources = [
        {
          name: 'test',
          type: 'environment' as const,
          priority: 50,
          data: mockConfig,
          loadedAt: new Date(),
        },
      ];

      awsConfigurationLoader.loadNamespacedConfiguration.mockResolvedValue(mockConfig);
      awsConfigurationLoader.getAvailableSources.mockResolvedValue(mockSources);
      configurationFactoryProvider.createAwsConfigurationFactory.mockReturnValue(jest.fn() as any);

      await service.registerFactories();
      expect(service.isFactoriesInitialized()).toBe(true);
      expect(service.getRegisteredFactories().size).toBeGreaterThan(0);

      // Act
      service.reset();

      // Assert
      expect(service.isFactoriesInitialized()).toBe(false);
      expect(service.getRegisteredFactories().size).toBe(0);
    });
  });
});