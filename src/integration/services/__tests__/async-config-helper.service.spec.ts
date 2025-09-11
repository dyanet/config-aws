import { Test, TestingModule } from '@nestjs/testing';
import { AsyncConfigHelperService } from '../async-config-helper.service';
import { FactoryRegistrationService } from '../factory-registration.service';
import { IntegrationOptions } from '../../interfaces/integration-options.interface';
import { NESTJS_CONFIG_AWS_INTEGRATION_OPTIONS } from '../../nestjs-config-integration.module';

describe('AsyncConfigHelperService', () => {
  let service: AsyncConfigHelperService;
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
      registerNamespacedFactories: jest.fn(),
      createSyncFactory: jest.fn(),
      getRegisteredFactories: jest.fn(),
      getFactory: jest.fn(),
      isFactoriesInitialized: jest.fn(),
      reset: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AsyncConfigHelperService,
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

    service = module.get<AsyncConfigHelperService>(AsyncConfigHelperService);
    factoryRegistrationService = module.get(FactoryRegistrationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createAsyncConfigFactory', () => {
    it('should create async configuration factory with AWS factories', async () => {
      // Arrange
      const mockFactories = [
        jest.fn(() => ({ database: { host: 'localhost' } })),
        jest.fn(() => ({ api: { port: 3000 } })),
      ];

      factoryRegistrationService.registerFactories.mockResolvedValue(mockFactories);

      // Act
      const asyncFactory = await service.createAsyncConfigFactory();

      // Assert
      expect(asyncFactory).toBeDefined();
      expect(typeof asyncFactory).toBe('function');
      
      const config = asyncFactory();
      expect(config).toEqual({
        database: { host: 'localhost' },
        api: { port: 3000 },
      });
      expect(factoryRegistrationService.registerFactories).toHaveBeenCalled();
    });

    it('should return empty factory when no AWS factories available', async () => {
      // Arrange
      factoryRegistrationService.registerFactories.mockResolvedValue([]);

      // Act
      const asyncFactory = await service.createAsyncConfigFactory();

      // Assert
      expect(asyncFactory).toBeDefined();
      expect(typeof asyncFactory).toBe('function');
      
      const config = asyncFactory();
      expect(config).toEqual({});
    });

    it('should handle factory registration failure with fallback', async () => {
      // Arrange
      const error = new Error('Factory registration failed');
      factoryRegistrationService.registerFactories.mockRejectedValue(error);

      // Act
      const asyncFactory = await service.createAsyncConfigFactory();

      // Assert
      expect(asyncFactory).toBeDefined();
      expect(typeof asyncFactory).toBe('function');
      
      const config = asyncFactory();
      expect(config).toEqual({});
    });

    it('should throw error when failOnAwsError is true', async () => {
      // Arrange
      const failOnErrorOptions = { ...mockIntegrationOptions, failOnAwsError: true, fallbackToLocal: false };
      
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          AsyncConfigHelperService,
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

      const failService = module.get<AsyncConfigHelperService>(AsyncConfigHelperService);
      const error = new Error('Factory registration failed');
      factoryRegistrationService.registerFactories.mockRejectedValue(error);

      // Act & Assert
      await expect(failService.createAsyncConfigFactory()).rejects.toThrow('Factory registration failed');
    });
  });

  describe('createAsyncNamespacedFactories', () => {
    it('should create async namespaced factories', async () => {
      // Arrange
      const namespaces = ['database', 'api'];
      const mockFactories = [
        jest.fn(() => ({ host: 'localhost' })),
        jest.fn(() => ({ port: 3000 })),
      ];

      factoryRegistrationService.registerNamespacedFactories.mockResolvedValue(mockFactories);

      // Act
      const namespacedFactories = await service.createAsyncNamespacedFactories(namespaces);

      // Assert
      expect(namespacedFactories).toHaveLength(2);
      expect(factoryRegistrationService.registerNamespacedFactories).toHaveBeenCalledWith(namespaces);
    });

    it('should return empty factories when no namespaced factories available', async () => {
      // Arrange
      const namespaces = ['database', 'api'];
      factoryRegistrationService.registerNamespacedFactories.mockResolvedValue([]);

      // Act
      const namespacedFactories = await service.createAsyncNamespacedFactories(namespaces);

      // Assert
      expect(namespacedFactories).toHaveLength(2);
      namespacedFactories.forEach(factory => {
        expect(factory()).toEqual({});
      });
    });

    it('should handle namespaced factory registration failure with fallback', async () => {
      // Arrange
      const namespaces = ['database'];
      const error = new Error('Namespaced factory registration failed');
      factoryRegistrationService.registerNamespacedFactories.mockRejectedValue(error);

      // Act
      const namespacedFactories = await service.createAsyncNamespacedFactories(namespaces);

      // Assert
      expect(namespacedFactories).toHaveLength(1);
      expect(namespacedFactories[0]?.()).toEqual({});
    });
  });

  describe('createAsyncFactoryWithDependencies', () => {
    it('should create async factory with dependency injection support', async () => {
      // Arrange
      const dependencies = ['SomeService', 'AnotherService'];
      const mockFactories = [jest.fn(() => ({ config: 'value' }))];

      factoryRegistrationService.registerFactories.mockResolvedValue(mockFactories);

      // Act
      const asyncFactoryWithDeps = service.createAsyncFactoryWithDependencies(dependencies);

      // Assert
      expect(asyncFactoryWithDeps).toBeDefined();
      expect(typeof asyncFactoryWithDeps).toBe('function');

      const configOptions = await asyncFactoryWithDeps('serviceInstance1', 'serviceInstance2');
      expect(configOptions).toBeDefined();
      expect(configOptions.load).toHaveLength(1);
      expect(configOptions.isGlobal).toBe(true);
      expect(configOptions.cache).toBe(true);
      expect(configOptions.expandVariables).toBe(true);
    });

    it('should handle dependency injection failure with fallback', async () => {
      // Arrange
      const dependencies = ['SomeService'];
      const error = new Error('Dependency injection failed');
      factoryRegistrationService.registerFactories.mockRejectedValue(error);

      // Act
      const asyncFactoryWithDeps = service.createAsyncFactoryWithDependencies(dependencies);
      const configOptions = await asyncFactoryWithDeps('serviceInstance');

      // Assert
      expect(configOptions).toBeDefined();
      expect(configOptions.load).toEqual([]);
      expect(configOptions.isGlobal).toBe(true);
    });
  });

  describe('createMergedAsyncFactory', () => {
    it('should create merged factory with AWS-first precedence', async () => {
      // Arrange
      const existingFactory = jest.fn(() => ({ existing: 'value', shared: 'existing' }));
      const mockFactories = [jest.fn(() => ({ aws: 'value', shared: 'aws' }))];

      factoryRegistrationService.registerFactories.mockResolvedValue(mockFactories);

      // Act
      const mergedFactory = await service.createMergedAsyncFactory(existingFactory);

      // Assert
      expect(mergedFactory).toBeDefined();
      expect(typeof mergedFactory).toBe('function');
      
      const config = mergedFactory();
      expect(config).toEqual({
        existing: 'value',
        aws: 'value',
        shared: 'aws', // AWS value should override existing
      });
    });

    it('should create merged factory with local-first precedence', async () => {
      // Arrange
      const localFirstOptions = { ...mockIntegrationOptions, precedence: 'local-first' as const };
      
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          AsyncConfigHelperService,
          {
            provide: FactoryRegistrationService,
            useValue: factoryRegistrationService,
          },
          {
            provide: NESTJS_CONFIG_AWS_INTEGRATION_OPTIONS,
            useValue: localFirstOptions,
          },
        ],
      }).compile();

      const localFirstService = module.get<AsyncConfigHelperService>(AsyncConfigHelperService);
      const existingFactory = jest.fn(() => ({ existing: 'value', shared: 'existing' }));
      const mockFactories = [jest.fn(() => ({ aws: 'value', shared: 'aws' }))];

      factoryRegistrationService.registerFactories.mockResolvedValue(mockFactories);

      // Act
      const mergedFactory = await localFirstService.createMergedAsyncFactory(existingFactory);

      // Assert
      const config = mergedFactory();
      expect(config).toEqual({
        aws: 'value',
        existing: 'value',
        shared: 'existing', // Existing value should override AWS
      });
    });

    it('should return AWS factory when no existing factory provided', async () => {
      // Arrange
      const mockFactories = [jest.fn(() => ({ aws: 'value' }))];
      factoryRegistrationService.registerFactories.mockResolvedValue(mockFactories);

      // Act
      const mergedFactory = await service.createMergedAsyncFactory();

      // Assert
      expect(mergedFactory).toBeDefined();
      const config = mergedFactory();
      expect(config).toEqual({ aws: 'value' });
    });

    it('should handle merge failure with fallback to existing factory', async () => {
      // Arrange
      const existingFactory = jest.fn(() => ({ existing: 'value' }));
      const error = new Error('Merge failed');
      factoryRegistrationService.registerFactories.mockRejectedValue(error);

      // Act
      const mergedFactory = await service.createMergedAsyncFactory(existingFactory);

      // Assert
      expect(mergedFactory).toBe(existingFactory);
    });
  });

  describe('createAsyncConfigOptions', () => {
    it('should create async configuration options', async () => {
      // Arrange
      const baseOptions = {
        isGlobal: false,
        cache: false,
        load: [jest.fn(() => ({ existing: 'config' }))],
      };

      const mockFactories = [jest.fn(() => ({ aws: 'config' }))];
      factoryRegistrationService.registerFactories.mockResolvedValue(mockFactories);

      // Act
      const asyncOptions = await service.createAsyncConfigOptions(baseOptions);

      // Assert
      expect(asyncOptions.load).toHaveLength(2); // 1 existing + 1 AWS factory
      expect(asyncOptions.isGlobal).toBe(false); // Base option should take precedence
      expect(asyncOptions.cache).toBe(false); // Base option should take precedence
      expect(asyncOptions.expandVariables).toBe(true); // Integration option default
    });

    it('should use integration defaults when base options not provided', async () => {
      // Arrange
      const mockFactories = [jest.fn(() => ({ aws: 'config' }))];
      factoryRegistrationService.registerFactories.mockResolvedValue(mockFactories);

      // Act
      const asyncOptions = await service.createAsyncConfigOptions();

      // Assert
      expect(asyncOptions.load).toHaveLength(1);
      expect(asyncOptions.isGlobal).toBe(true); // Integration default
      expect(asyncOptions.cache).toBe(true); // Integration default
      expect(asyncOptions.expandVariables).toBe(true); // Integration default
    });

    it('should handle async options creation failure with fallback', async () => {
      // Arrange
      const baseOptions = { isGlobal: false };
      const error = new Error('Async options creation failed');
      factoryRegistrationService.registerFactories.mockRejectedValue(error);

      // Act
      const asyncOptions = await service.createAsyncConfigOptions(baseOptions);

      // Assert
      expect(asyncOptions).toEqual(baseOptions);
    });
  });

  describe('checkAsyncAvailability', () => {
    it('should return availability status when factories are available', async () => {
      // Arrange
      const mockFactories = [jest.fn(), jest.fn()];
      factoryRegistrationService.registerFactories.mockResolvedValue(mockFactories);

      // Act
      const status = await service.checkAsyncAvailability();

      // Assert
      expect(status.isAvailable).toBe(true);
      expect(status.factoriesCount).toBe(2);
      expect(status.errors).toEqual([]);
    });

    it('should return unavailable status when no factories available', async () => {
      // Arrange
      factoryRegistrationService.registerFactories.mockResolvedValue([]);

      // Act
      const status = await service.checkAsyncAvailability();

      // Assert
      expect(status.isAvailable).toBe(false);
      expect(status.factoriesCount).toBe(0);
      expect(status.errors).toEqual([]);
    });

    it('should handle availability check failure', async () => {
      // Arrange
      const error = new Error('Availability check failed');
      factoryRegistrationService.registerFactories.mockRejectedValue(error);

      // Act
      const status = await service.checkAsyncAvailability();

      // Assert
      expect(status.isAvailable).toBe(false);
      expect(status.factoriesCount).toBe(0);
      expect(status.errors).toContain('Availability check failed');
    });
  });

  describe('createLazyAsyncFactory', () => {
    it('should create lazy factory that returns empty config initially', () => {
      // Act
      const lazyFactory = service.createLazyAsyncFactory();

      // Assert
      expect(lazyFactory).toBeDefined();
      expect(typeof lazyFactory).toBe('function');
      
      const config = lazyFactory();
      expect(config).toEqual({});
    });

    it('should return cached config on subsequent calls', () => {
      // Arrange
      const lazyFactory = service.createLazyAsyncFactory();

      // Act
      const config1 = lazyFactory();
      const config2 = lazyFactory();

      // Assert
      expect(config1).toEqual({});
      expect(config2).toEqual({});
      expect(config1).toBe(config2); // Should be the same reference for empty object
    });
  });
});