import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModuleOptions } from '@nestjs/config';
import { NestjsConfigIntegrationService } from '../nestjs-config-integration.service';
import { FactoryRegistrationService } from '../factory-registration.service';
import { IntegrationOptions } from '../../interfaces/integration-options.interface';
import { NESTJS_CONFIG_AWS_INTEGRATION_OPTIONS } from '../../nestjs-config-integration.module';

describe('NestjsConfigIntegrationService', () => {
  let service: NestjsConfigIntegrationService;
  let factoryRegistrationService: jest.Mocked<FactoryRegistrationService>;

  const mockIntegrationOptions: IntegrationOptions = {
    enableLogging: false,
    failOnAwsError: false,
    fallbackToLocal: true,
    precedence: 'aws-first',
    registerGlobally: true,
    factoryOptions: {
      cache: true,
      expandVariables: true,
    },
  };

  beforeEach(async () => {
    const mockFactoryRegistrationService = {
      registerFactories: jest.fn(),
      registerFactoriesAsync: jest.fn(),
      createSyncFactory: jest.fn(),
      registerNamespacedFactories: jest.fn(),
      getRegisteredFactories: jest.fn(),
      getFactory: jest.fn(),
      isFactoriesInitialized: jest.fn(),
      reset: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NestjsConfigIntegrationService,
        {
          provide: FactoryRegistrationService,
          useValue: mockFactoryRegistrationService,
        },
        {
          provide: NESTJS_CONFIG_AWS_INTEGRATION_OPTIONS,
          useValue: mockIntegrationOptions,
        },
      ],
    }).compile();

    service = module.get<NestjsConfigIntegrationService>(NestjsConfigIntegrationService);
    factoryRegistrationService = module.get(FactoryRegistrationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createConfigModuleOptions', () => {
    it('should create enhanced ConfigModule options with AWS factories', async () => {
      // Arrange
      const baseOptions: ConfigModuleOptions = {
        isGlobal: false,
        cache: false,
        load: [() => ({ existing: 'config' })],
      };

      const mockAwsFactories = [
        jest.fn(() => ({ aws: 'config' })),
        jest.fn(() => ({ database: { host: 'localhost' } })),
      ];

      factoryRegistrationService.registerFactories.mockResolvedValue(mockAwsFactories);

      // Act
      const enhancedOptions = await service.createConfigModuleOptions(baseOptions);

      // Assert
      expect(enhancedOptions.load).toHaveLength(3); // 1 existing + 2 AWS factories
      expect(enhancedOptions.isGlobal).toBe(true); // From integration options
      expect(enhancedOptions.cache).toBe(true); // From integration options
      expect(enhancedOptions.expandVariables).toBe(true); // From integration options
      expect(factoryRegistrationService.registerFactories).toHaveBeenCalled();
    });

    it('should use base options when no integration options provided', async () => {
      // Arrange
      const baseOptions: ConfigModuleOptions = {
        isGlobal: false,
        cache: false,
        expandVariables: false,
      };

      const mockAwsFactories = [jest.fn(() => ({ aws: 'config' }))];
      factoryRegistrationService.registerFactories.mockResolvedValue(mockAwsFactories);

      // Act
      const enhancedOptions = await service.createConfigModuleOptions(baseOptions);

      // Assert
      expect(enhancedOptions.isGlobal).toBe(true); // Default from integration options
      expect(enhancedOptions.cache).toBe(true); // Default from integration options
      expect(enhancedOptions.expandVariables).toBe(true); // Default from integration options
    });

    it('should handle AWS factory registration failure with fallback', async () => {
      // Arrange
      const baseOptions: ConfigModuleOptions = {
        load: [() => ({ existing: 'config' })],
      };

      const error = new Error('AWS registration failed');
      factoryRegistrationService.registerFactories.mockRejectedValue(error);

      // Act
      const enhancedOptions = await service.createConfigModuleOptions(baseOptions);

      // Assert
      expect(enhancedOptions).toEqual({
        ...baseOptions,
        isGlobal: true,
        cache: true,
        expandVariables: true,
      });
    });

    it('should throw error when failOnAwsError is true', async () => {
      // Arrange
      const failOnErrorOptions = { ...mockIntegrationOptions, failOnAwsError: true, fallbackToLocal: false };
      
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          NestjsConfigIntegrationService,
          {
            provide: FactoryRegistrationService,
            useValue: factoryRegistrationService,
          },
          {
            provide: NESTJS_CONFIG_AWS_INTEGRATION_OPTIONS,
            useValue: failOnErrorOptions,
          },
        ],
      }).compile();

      const failService = module.get<NestjsConfigIntegrationService>(NestjsConfigIntegrationService);
      const error = new Error('AWS registration failed');
      factoryRegistrationService.registerFactories.mockRejectedValue(error);

      // Act & Assert
      await expect(failService.createConfigModuleOptions()).rejects.toThrow('AWS registration failed');
    });
  });

  describe('createAsyncConfigModuleOptions', () => {
    it('should create enhanced async ConfigModule options', async () => {
      // Arrange
      const baseAsyncOptions = {
        useFactory: jest.fn().mockResolvedValue({ isGlobal: false }),
        inject: ['SomeService'],
      };

      const mockAwsFactories = [jest.fn(() => ({ aws: 'config' }))];
      factoryRegistrationService.registerFactories.mockResolvedValue(mockAwsFactories);

      // Act
      const enhancedAsyncOptions = await service.createAsyncConfigModuleOptions(baseAsyncOptions);

      // Assert
      expect(enhancedAsyncOptions.useFactory).toBeDefined();
      expect(enhancedAsyncOptions.inject).toContain('SomeService');
      expect(enhancedAsyncOptions.inject).toContain(FactoryRegistrationService);
    });

    it('should work without base factory function', async () => {
      // Arrange
      const baseAsyncOptions = {
        inject: ['SomeService'],
      };

      const mockAwsFactories = [jest.fn(() => ({ aws: 'config' }))];
      factoryRegistrationService.registerFactories.mockResolvedValue(mockAwsFactories);

      // Act
      const enhancedAsyncOptions = await service.createAsyncConfigModuleOptions(baseAsyncOptions);

      // Assert
      expect(enhancedAsyncOptions.useFactory).toBeDefined();
      expect(enhancedAsyncOptions.inject).toContain(FactoryRegistrationService);
    });

    it('should handle async enhancement failure with fallback', async () => {
      // Arrange
      const baseAsyncOptions = {
        useFactory: jest.fn().mockResolvedValue({ isGlobal: false }),
      };

      const error = new Error('Async enhancement failed');
      factoryRegistrationService.registerFactories.mockRejectedValue(error);

      // Act
      const enhancedAsyncOptions = await service.createAsyncConfigModuleOptions(baseAsyncOptions);

      // Assert
      expect(enhancedAsyncOptions).toEqual({
        ...baseAsyncOptions,
        inject: [FactoryRegistrationService],
      });
    });
  });

  describe('createIntegratedConfigModule', () => {
    it('should create a DynamicModule with AWS integration', async () => {
      // Arrange
      const baseOptions: ConfigModuleOptions = {
        isGlobal: false,
      };

      const mockAwsFactories = [jest.fn(() => ({ aws: 'config' }))];
      factoryRegistrationService.registerFactories.mockResolvedValue(mockAwsFactories);

      // Act
      const configModule = await service.createIntegratedConfigModule(baseOptions);

      // Assert
      expect(configModule).toBeDefined();
      expect(configModule.module).toBeDefined();
      expect(configModule.providers).toBeDefined();
    });

    it('should fallback to basic ConfigModule on error', async () => {
      // Arrange
      const baseOptions: ConfigModuleOptions = {
        isGlobal: false,
      };

      const error = new Error('Integration failed');
      factoryRegistrationService.registerFactories.mockRejectedValue(error);

      // Act
      const configModule = await service.createIntegratedConfigModule(baseOptions);

      // Assert
      expect(configModule).toBeDefined();
      expect(configModule.module).toBeDefined();
    });
  });

  describe('createAsyncIntegratedConfigModule', () => {
    it('should create an async DynamicModule with AWS integration', async () => {
      // Arrange
      const baseAsyncOptions: ConfigModuleOptions = {
        isGlobal: false,
      };

      const mockAwsFactories = [jest.fn(() => ({ aws: 'config' }))];
      factoryRegistrationService.registerFactories.mockResolvedValue(mockAwsFactories);

      // Act
      const asyncConfigModule = await service.createAsyncIntegratedConfigModule(baseAsyncOptions);

      // Assert
      expect(asyncConfigModule).toBeDefined();
      expect(asyncConfigModule.module).toBeDefined();
      expect(asyncConfigModule.providers).toBeDefined();
    });

    it('should fallback to basic async ConfigModule on error', async () => {
      // Arrange
      const baseAsyncOptions: ConfigModuleOptions = {
        isGlobal: false,
      };

      const error = new Error('Factory failed');
      factoryRegistrationService.registerFactories.mockRejectedValue(error);

      // Act
      const asyncConfigModule = await service.createAsyncIntegratedConfigModule(baseAsyncOptions);

      // Assert
      expect(asyncConfigModule).toBeDefined();
      expect(asyncConfigModule.module).toBeDefined();
    });
  });

  describe('getConfigurationFactories', () => {
    it('should return AWS configuration factories', async () => {
      // Arrange
      const mockFactories = [
        jest.fn(() => ({ database: { host: 'localhost' } })),
        jest.fn(() => ({ api: { port: 3000 } })),
      ];

      factoryRegistrationService.registerFactories.mockResolvedValue(mockFactories);

      // Act
      const factories = await service.getConfigurationFactories();

      // Assert
      expect(factories).toEqual(mockFactories);
      expect(factoryRegistrationService.registerFactories).toHaveBeenCalled();
    });

    it('should return empty array on error with fallback', async () => {
      // Arrange
      const error = new Error('Factory retrieval failed');
      factoryRegistrationService.registerFactories.mockRejectedValue(error);

      // Act
      const factories = await service.getConfigurationFactories();

      // Assert
      expect(factories).toEqual([]);
    });

    it('should throw error when failOnAwsError is true', async () => {
      // Arrange
      const failOnErrorOptions = { ...mockIntegrationOptions, failOnAwsError: true, fallbackToLocal: false };
      
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          NestjsConfigIntegrationService,
          {
            provide: FactoryRegistrationService,
            useValue: factoryRegistrationService,
          },
          {
            provide: NESTJS_CONFIG_AWS_INTEGRATION_OPTIONS,
            useValue: failOnErrorOptions,
          },
        ],
      }).compile();

      const failService = module.get<NestjsConfigIntegrationService>(NestjsConfigIntegrationService);
      const error = new Error('Factory retrieval failed');
      factoryRegistrationService.registerFactories.mockRejectedValue(error);

      // Act & Assert
      await expect(failService.getConfigurationFactories()).rejects.toThrow('Factory retrieval failed');
    });
  });

  describe('getNamespacedFactories', () => {
    it('should return namespaced configuration factories', async () => {
      // Arrange
      const namespaces = ['database', 'api'];
      const mockFactories = [
        jest.fn(() => ({ host: 'localhost' })),
        jest.fn(() => ({ port: 3000 })),
      ];

      factoryRegistrationService.registerNamespacedFactories.mockResolvedValue(mockFactories);

      // Act
      const factories = await service.getNamespacedFactories(namespaces);

      // Assert
      expect(factories).toEqual(mockFactories);
      expect(factoryRegistrationService.registerNamespacedFactories).toHaveBeenCalledWith(namespaces);
    });

    it('should return empty array on error with fallback', async () => {
      // Arrange
      const namespaces = ['database'];
      const error = new Error('Namespaced factory retrieval failed');
      factoryRegistrationService.registerNamespacedFactories.mockRejectedValue(error);

      // Act
      const factories = await service.getNamespacedFactories(namespaces);

      // Assert
      expect(factories).toEqual([]);
    });
  });

  describe('createImmediateFactory', () => {
    it('should create an immediate factory', () => {
      // Arrange
      const namespace = 'database';
      const config = { host: 'localhost' };
      const mockFactory = jest.fn(() => config);

      factoryRegistrationService.createSyncFactory.mockReturnValue(mockFactory);

      // Act
      const factory = service.createImmediateFactory(namespace, config);

      // Assert
      expect(factory).toBe(mockFactory);
      expect(factoryRegistrationService.createSyncFactory).toHaveBeenCalledWith(namespace, config);
    });

    it('should return empty factory on error with fallback', () => {
      // Arrange
      const namespace = 'database';
      const config = { host: 'localhost' };
      const error = new Error('Immediate factory creation failed');

      factoryRegistrationService.createSyncFactory.mockImplementation(() => {
        throw error;
      });

      // Act
      const factory = service.createImmediateFactory(namespace, config);

      // Assert
      expect(typeof factory).toBe('function');
      expect(factory()).toEqual(config);
    });
  });

  describe('checkIntegrationStatus', () => {
    it('should return status when factories are initialized', async () => {
      // Arrange
      const mockFactories = new Map([
        ['database', jest.fn()],
        ['api', jest.fn()],
      ]);

      factoryRegistrationService.isFactoriesInitialized.mockReturnValue(true);
      factoryRegistrationService.getRegisteredFactories.mockReturnValue(mockFactories);

      // Act
      const status = await service.checkIntegrationStatus();

      // Assert
      expect(status.isAvailable).toBe(true);
      expect(status.factoriesRegistered).toBe(2);
      expect(status.errors).toEqual([]);
    });

    it('should register factories when not initialized', async () => {
      // Arrange
      const mockFactories = [jest.fn(), jest.fn()];

      factoryRegistrationService.isFactoriesInitialized.mockReturnValue(false);
      factoryRegistrationService.registerFactories.mockResolvedValue(mockFactories);

      // Act
      const status = await service.checkIntegrationStatus();

      // Assert
      expect(status.isAvailable).toBe(true);
      expect(status.factoriesRegistered).toBe(2);
      expect(status.errors).toEqual([]);
      expect(factoryRegistrationService.registerFactories).toHaveBeenCalled();
    });

    it('should handle status check errors', async () => {
      // Arrange
      const error = new Error('Status check failed');
      factoryRegistrationService.isFactoriesInitialized.mockReturnValue(false);
      factoryRegistrationService.registerFactories.mockRejectedValue(error);

      // Act
      const status = await service.checkIntegrationStatus();

      // Assert
      expect(status.isAvailable).toBe(false);
      expect(status.factoriesRegistered).toBe(0);
      expect(status.errors).toContain('Status check failed');
    });
  });

  describe('resetIntegration', () => {
    it('should reset the integration state', () => {
      // Act
      service.resetIntegration();

      // Assert
      expect(factoryRegistrationService.reset).toHaveBeenCalled();
    });
  });
});