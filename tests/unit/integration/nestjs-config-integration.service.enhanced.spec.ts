import { Test, TestingModule } from '@nestjs/testing';
import { NestJSConfigIntegrationService } from '../../../src/integration/services/nestjs-config-integration.service';
import { FactoryRegistrationService } from '../../../src/integration/services/factory-registration.service';
import { IntegrationStateService } from '../../../src/integration/services/integration-state.service';
import { ErrorHandlerService } from '../../../src/integration/services/error-handler.service';
import { IntegrationOptions } from '../../../src/integration/interfaces/integration-options.interface';
import { NESTJS_CONFIG_AWS_INTEGRATION_OPTIONS } from '../../../src/integration/nestjs-config-integration.module';
import { ConfigFactory } from '@nestjs/config';

describe('NestJSConfigIntegrationService - Enhanced Tests', () => {
  let service: NestJSConfigIntegrationService;
  let factoryRegistrationService: jest.Mocked<FactoryRegistrationService>;
  let integrationStateService: jest.Mocked<IntegrationStateService>;
  let errorHandlerService: jest.Mocked<ErrorHandlerService>;

  const mockIntegrationOptions: IntegrationOptions = {
    enableLogging: false,
    failOnAwsError: false,
    fallbackToLocal: true,
    precedence: 'aws-first',
    namespaces: ['database', 'api'],
    registerGlobally: true,
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

    const mockIntegrationStateService = {
      getState: jest.fn(),
      markInitializationStarted: jest.fn(),
      markInitializationCompleted: jest.fn(),
      setAwsAvailability: jest.fn(),
      addLoadedSource: jest.fn(),
      registerFactory: jest.fn(),
      addError: jest.fn(),
      isInitialized: jest.fn(),
      isAwsAvailable: jest.fn(),
      hasErrors: jest.fn(),
      reset: jest.fn(),
      createSnapshot: jest.fn(),
      restoreFromSnapshot: jest.fn(),
    };

    const mockErrorHandlerService = {
      handleAwsError: jest.fn(),
      handleConfigurationError: jest.fn(),
      isRetryableError: jest.fn(),
      getRetryDelay: jest.fn(),
      shouldFailFast: jest.fn(),
      createErrorContext: jest.fn(),
      formatErrorMessage: jest.fn(),
      getRecoveryStrategy: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NestJSConfigIntegrationService,
        {
          provide: FactoryRegistrationService,
          useValue: mockFactoryRegistrationService,
        },
        {
          provide: IntegrationStateService,
          useValue: mockIntegrationStateService,
        },
        {
          provide: ErrorHandlerService,
          useValue: mockErrorHandlerService,
        },
        {
          provide: NESTJS_CONFIG_AWS_INTEGRATION_OPTIONS,
          useValue: mockIntegrationOptions,
        },
      ],
    }).compile();

    service = module.get<NestJSConfigIntegrationService>(NestJSConfigIntegrationService);
    factoryRegistrationService = module.get(FactoryRegistrationService);
    integrationStateService = module.get(IntegrationStateService);
    errorHandlerService = module.get(ErrorHandlerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize successfully with valid configuration', async () => {
      // Arrange
      const mockFactories: ConfigFactory[] = [
        jest.fn(() => ({ database: { host: 'localhost' } })) as any,
        jest.fn(() => ({ api: { port: 3000 } })) as any,
      ];

      factoryRegistrationService.registerFactories.mockResolvedValue(mockFactories);
      integrationStateService.isInitialized.mockReturnValue(false);

      // Act
      const result = await service.initialize();

      // Assert
      expect(result.success).toBe(true);
      expect(result.factories).toEqual(mockFactories);
      expect(integrationStateService.markInitializationStarted).toHaveBeenCalled();
      expect(integrationStateService.markInitializationCompleted).toHaveBeenCalled();
      expect(factoryRegistrationService.registerFactories).toHaveBeenCalled();
    });

    it('should skip initialization if already initialized', async () => {
      // Arrange
      integrationStateService.isInitialized.mockReturnValue(true);
      factoryRegistrationService.getRegisteredFactories.mockReturnValue(new Map([
        ['database', jest.fn() as any],
        ['api', jest.fn() as any],
      ]));

      // Act
      const result = await service.initialize();

      // Assert
      expect(result.success).toBe(true);
      expect(result.skipped).toBe(true);
      expect(integrationStateService.markInitializationStarted).not.toHaveBeenCalled();
      expect(factoryRegistrationService.registerFactories).not.toHaveBeenCalled();
    });

    it('should handle initialization errors gracefully', async () => {
      // Arrange
      const error = new Error('Initialization failed');
      factoryRegistrationService.registerFactories.mockRejectedValue(error);
      integrationStateService.isInitialized.mockReturnValue(false);
      errorHandlerService.shouldFailFast.mockReturnValue(false);
      errorHandlerService.formatErrorMessage.mockReturnValue('Formatted error message');

      // Act
      const result = await service.initialize();

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe(error);
      expect(integrationStateService.addError).toHaveBeenCalled();
      expect(errorHandlerService.handleAwsError).toHaveBeenCalledWith(error, 'initialization');
    });

    it('should fail fast when configured to do so', async () => {
      // Arrange
      const error = new Error('Critical initialization error');
      factoryRegistrationService.registerFactories.mockRejectedValue(error);
      integrationStateService.isInitialized.mockReturnValue(false);
      errorHandlerService.shouldFailFast.mockReturnValue(true);

      // Act & Assert
      await expect(service.initialize()).rejects.toThrow('Critical initialization error');
      expect(integrationStateService.addError).toHaveBeenCalled();
    });
  });

  describe('async initialization', () => {
    it('should initialize asynchronously with dependency injection', async () => {
      // Arrange
      const mockFactories: ConfigFactory[] = [
        jest.fn(() => ({ database: { host: 'localhost' } })) as any,
      ];

      factoryRegistrationService.registerFactoriesAsync.mockResolvedValue(mockFactories);
      integrationStateService.isInitialized.mockReturnValue(false);

      // Act
      const result = await service.initializeAsync();

      // Assert
      expect(result.success).toBe(true);
      expect(result.factories).toEqual(mockFactories);
      expect(factoryRegistrationService.registerFactoriesAsync).toHaveBeenCalled();
    });

    it('should handle async initialization errors', async () => {
      // Arrange
      const error = new Error('Async initialization failed');
      factoryRegistrationService.registerFactoriesAsync.mockRejectedValue(error);
      integrationStateService.isInitialized.mockReturnValue(false);
      errorHandlerService.shouldFailFast.mockReturnValue(false);

      // Act
      const result = await service.initializeAsync();

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe(error);
    });
  });

  describe('factory management', () => {
    it('should create configuration factories for specific namespaces', async () => {
      // Arrange
      const namespaces = ['database', 'cache'];
      const mockFactories: ConfigFactory[] = [
        jest.fn(() => ({ host: 'localhost' })) as any,
        jest.fn(() => ({ redis: 'redis://localhost' })) as any,
      ];

      factoryRegistrationService.registerNamespacedFactories.mockResolvedValue(mockFactories);

      // Act
      const result = await service.createConfigurationFactories(namespaces);

      // Assert
      expect(result).toEqual(mockFactories);
      expect(factoryRegistrationService.registerNamespacedFactories).toHaveBeenCalledWith(namespaces);
    });

    it('should get registered factory by name', () => {
      // Arrange
      const mockFactory = jest.fn(() => ({ host: 'localhost' })) as any;
      factoryRegistrationService.getFactory.mockReturnValue(mockFactory);

      // Act
      const result = service.getConfigurationFactory('database');

      // Assert
      expect(result).toBe(mockFactory);
      expect(factoryRegistrationService.getFactory).toHaveBeenCalledWith('database');
    });

    it('should return undefined for non-existent factory', () => {
      // Arrange
      factoryRegistrationService.getFactory.mockReturnValue(undefined);

      // Act
      const result = service.getConfigurationFactory('nonexistent');

      // Assert
      expect(result).toBeUndefined();
    });

    it('should get all registered factories', () => {
      // Arrange
      const mockFactories = new Map([
        ['database', jest.fn() as any],
        ['api', jest.fn() as any],
      ]);
      factoryRegistrationService.getRegisteredFactories.mockReturnValue(mockFactories);

      // Act
      const result = service.getAllConfigurationFactories();

      // Assert
      expect(result).toBe(mockFactories);
    });
  });

  describe('state management', () => {
    it('should get current integration state', () => {
      // Arrange
      const mockState = {
        isInitialized: true,
        awsAvailable: true,
        loadedSources: [],
        registeredFactories: ['database', 'api'],
        errors: [],
        lastUpdated: new Date(),
      };
      integrationStateService.getState.mockReturnValue(mockState);

      // Act
      const result = service.getIntegrationState();

      // Assert
      expect(result).toBe(mockState);
    });

    it('should check if integration is ready', () => {
      // Arrange
      integrationStateService.isInitialized.mockReturnValue(true);
      factoryRegistrationService.isFactoriesInitialized.mockReturnValue(true);
      integrationStateService.hasErrors.mockReturnValue(false);

      // Act
      const result = service.isReady();

      // Assert
      expect(result).toBe(true);
    });

    it('should return false if not initialized', () => {
      // Arrange
      integrationStateService.isInitialized.mockReturnValue(false);
      factoryRegistrationService.isFactoriesInitialized.mockReturnValue(true);
      integrationStateService.hasErrors.mockReturnValue(false);

      // Act
      const result = service.isReady();

      // Assert
      expect(result).toBe(false);
    });

    it('should return false if has errors', () => {
      // Arrange
      integrationStateService.isInitialized.mockReturnValue(true);
      factoryRegistrationService.isFactoriesInitialized.mockReturnValue(true);
      integrationStateService.hasErrors.mockReturnValue(true);

      // Act
      const result = service.isReady();

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('health checks', () => {
    it('should perform health check successfully', async () => {
      // Arrange
      integrationStateService.isInitialized.mockReturnValue(true);
      integrationStateService.isAwsAvailable.mockReturnValue(true);
      integrationStateService.hasErrors.mockReturnValue(false);
      factoryRegistrationService.isFactoriesInitialized.mockReturnValue(true);

      // Act
      const result = await service.healthCheck();

      // Assert
      expect(result.healthy).toBe(true);
      expect(result.status).toBe('ok');
      expect(result.checks.initialization).toBe(true);
      expect(result.checks.awsAvailability).toBe(true);
      expect(result.checks.factoriesRegistered).toBe(true);
      expect(result.checks.noErrors).toBe(true);
    });

    it('should report unhealthy status when not initialized', async () => {
      // Arrange
      integrationStateService.isInitialized.mockReturnValue(false);
      integrationStateService.isAwsAvailable.mockReturnValue(true);
      integrationStateService.hasErrors.mockReturnValue(false);
      factoryRegistrationService.isFactoriesInitialized.mockReturnValue(false);

      // Act
      const result = await service.healthCheck();

      // Assert
      expect(result.healthy).toBe(false);
      expect(result.status).toBe('error');
      expect(result.checks.initialization).toBe(false);
    });

    it('should report degraded status when AWS is unavailable but fallback works', async () => {
      // Arrange
      integrationStateService.isInitialized.mockReturnValue(true);
      integrationStateService.isAwsAvailable.mockReturnValue(false);
      integrationStateService.hasErrors.mockReturnValue(false);
      factoryRegistrationService.isFactoriesInitialized.mockReturnValue(true);

      // Act
      const result = await service.healthCheck();

      // Assert
      expect(result.healthy).toBe(true);
      expect(result.status).toBe('degraded');
      expect(result.checks.awsAvailability).toBe(false);
    });

    it('should include error details in health check', async () => {
      // Arrange
      const mockState = {
        isInitialized: true,
        awsAvailable: false,
        loadedSources: [],
        registeredFactories: ['database'],
        errors: ['AWS connection failed', 'Configuration validation error'],
        lastUpdated: new Date(),
      };

      integrationStateService.isInitialized.mockReturnValue(true);
      integrationStateService.isAwsAvailable.mockReturnValue(false);
      integrationStateService.hasErrors.mockReturnValue(true);
      integrationStateService.getState.mockReturnValue(mockState);
      factoryRegistrationService.isFactoriesInitialized.mockReturnValue(true);

      // Act
      const result = await service.healthCheck();

      // Assert
      expect(result.healthy).toBe(false);
      expect(result.status).toBe('error');
      expect(result.errors).toEqual(['AWS connection failed', 'Configuration validation error']);
    });
  });

  describe('configuration refresh', () => {
    it('should refresh configuration successfully', async () => {
      // Arrange
      const mockFactories: ConfigFactory[] = [
        jest.fn(() => ({ database: { host: 'new-host' } })) as any,
      ];

      factoryRegistrationService.reset.mockImplementation(() => {});
      factoryRegistrationService.registerFactories.mockResolvedValue(mockFactories);
      integrationStateService.reset.mockImplementation(() => {});

      // Act
      const result = await service.refreshConfiguration();

      // Assert
      expect(result.success).toBe(true);
      expect(result.factories).toEqual(mockFactories);
      expect(factoryRegistrationService.reset).toHaveBeenCalled();
      expect(integrationStateService.reset).toHaveBeenCalled();
    });

    it('should handle refresh errors', async () => {
      // Arrange
      const error = new Error('Refresh failed');
      factoryRegistrationService.reset.mockImplementation(() => {});
      factoryRegistrationService.registerFactories.mockRejectedValue(error);
      integrationStateService.reset.mockImplementation(() => {});
      errorHandlerService.shouldFailFast.mockReturnValue(false);

      // Act
      const result = await service.refreshConfiguration();

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe(error);
    });
  });

  describe('error handling and recovery', () => {
    it('should handle configuration errors with retry', async () => {
      // Arrange
      const error = new Error('Temporary failure');
      factoryRegistrationService.registerFactories
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce([jest.fn() as any]);

      integrationStateService.isInitialized.mockReturnValue(false);
      errorHandlerService.shouldFailFast.mockReturnValue(false);
      errorHandlerService.isRetryableError.mockReturnValue(true);
      errorHandlerService.getRetryDelay.mockReturnValue(100);

      // Act
      const result = await service.initializeWithRetry(2);

      // Assert
      expect(result.success).toBe(true);
      expect(factoryRegistrationService.registerFactories).toHaveBeenCalledTimes(2);
    });

    it('should fail after max retries', async () => {
      // Arrange
      const error = new Error('Persistent failure');
      factoryRegistrationService.registerFactories.mockRejectedValue(error);
      integrationStateService.isInitialized.mockReturnValue(false);
      errorHandlerService.shouldFailFast.mockReturnValue(false);
      errorHandlerService.isRetryableError.mockReturnValue(true);
      errorHandlerService.getRetryDelay.mockReturnValue(10);

      // Act
      const result = await service.initializeWithRetry(2);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe(error);
      expect(factoryRegistrationService.registerFactories).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    it('should not retry non-retryable errors', async () => {
      // Arrange
      const error = new Error('Non-retryable error');
      factoryRegistrationService.registerFactories.mockRejectedValue(error);
      integrationStateService.isInitialized.mockReturnValue(false);
      errorHandlerService.shouldFailFast.mockReturnValue(false);
      errorHandlerService.isRetryableError.mockReturnValue(false);

      // Act
      const result = await service.initializeWithRetry(2);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe(error);
      expect(factoryRegistrationService.registerFactories).toHaveBeenCalledTimes(1); // No retries
    });
  });

  describe('integration diagnostics', () => {
    it('should provide comprehensive diagnostics', () => {
      // Arrange
      const mockState = {
        isInitialized: true,
        awsAvailable: true,
        loadedSources: [
          {
            name: 'secrets-manager',
            type: 'secrets-manager' as const,
            priority: 1,
            data: { key: 'value' },
            loadedAt: new Date(),
          },
        ],
        registeredFactories: ['database', 'api'],
        errors: [],
        lastUpdated: new Date(),
        initializationStarted: new Date(Date.now() - 1000),
        initializationCompleted: new Date(),
      };

      integrationStateService.getState.mockReturnValue(mockState);
      factoryRegistrationService.getRegisteredFactories.mockReturnValue(new Map([
        ['database', jest.fn() as any],
        ['api', jest.fn() as any],
      ]));

      // Act
      const diagnostics = service.getDiagnostics();

      // Assert
      expect(diagnostics).toMatchObject({
        state: mockState,
        factoryCount: 2,
        sourceCount: 1,
        hasErrors: false,
        isReady: expect.any(Boolean),
      });
    });

    it('should include performance metrics in diagnostics', () => {
      // Arrange
      const mockState = {
        isInitialized: true,
        awsAvailable: true,
        loadedSources: [],
        registeredFactories: [],
        errors: [],
        lastUpdated: new Date(),
        initializationStarted: new Date(Date.now() - 500),
        initializationCompleted: new Date(),
      };

      integrationStateService.getState.mockReturnValue(mockState);
      factoryRegistrationService.getRegisteredFactories.mockReturnValue(new Map());

      // Act
      const diagnostics = service.getDiagnostics();

      // Assert
      expect(diagnostics.performance).toBeDefined();
      expect(diagnostics.performance.initializationDuration).toBeGreaterThan(0);
    });
  });

  describe('cleanup and shutdown', () => {
    it('should cleanup resources properly', async () => {
      // Act
      await service.cleanup();

      // Assert
      expect(factoryRegistrationService.reset).toHaveBeenCalled();
      expect(integrationStateService.reset).toHaveBeenCalled();
    });

    it('should handle cleanup errors gracefully', async () => {
      // Arrange
      factoryRegistrationService.reset.mockImplementation(() => {
        throw new Error('Cleanup error');
      });

      // Act & Assert
      await expect(service.cleanup()).resolves.not.toThrow();
      expect(integrationStateService.addError).toHaveBeenCalled();
    });
  });
});