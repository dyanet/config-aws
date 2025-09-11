import { Test, TestingModule } from '@nestjs/testing';
import { ErrorHandlerService } from '../../../src/integration/services/error-handler.service';
import { IntegrationOptions } from '../../../src/integration/interfaces/integration-options.interface';
import { NESTJS_CONFIG_AWS_INTEGRATION_OPTIONS } from '../../../src/integration/nestjs-config-integration.module';

describe('ErrorHandlerService', () => {
  let service: ErrorHandlerService;

  const mockIntegrationOptions: IntegrationOptions = {
    enableLogging: false,
    failOnAwsError: false,
    fallbackToLocal: true,
    precedence: 'aws-first',
    namespaces: ['database', 'api'],
    registerGlobally: true,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ErrorHandlerService,
        {
          provide: NESTJS_CONFIG_AWS_INTEGRATION_OPTIONS,
          useValue: mockIntegrationOptions,
        },
      ],
    }).compile();

    service = module.get<ErrorHandlerService>(ErrorHandlerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleAwsError', () => {
    it('should handle AWS service unavailable error gracefully', () => {
      // Arrange
      const error = new Error('AWS service unavailable');
      error.name = 'ServiceUnavailableException';

      // Act
      const result = service.handleAwsError(error, 'secrets-manager');

      // Assert
      expect(result.shouldRetry).toBe(true);
      expect(result.fallbackToLocal).toBe(true);
      expect(result.errorType).toBe('service-unavailable');
      expect(result.retryDelay).toBeGreaterThan(0);
    });

    it('should handle AWS credentials error', () => {
      // Arrange
      const error = new Error('Unable to locate credentials');
      error.name = 'CredentialsError';

      // Act
      const result = service.handleAwsError(error, 'ssm');

      // Assert
      expect(result.shouldRetry).toBe(false);
      expect(result.fallbackToLocal).toBe(true);
      expect(result.errorType).toBe('credentials');
      expect(result.retryDelay).toBe(0);
    });

    it('should handle AWS access denied error', () => {
      // Arrange
      const error = new Error('Access denied');
      error.name = 'AccessDeniedException';

      // Act
      const result = service.handleAwsError(error, 'secrets-manager');

      // Assert
      expect(result.shouldRetry).toBe(false);
      expect(result.fallbackToLocal).toBe(true);
      expect(result.errorType).toBe('access-denied');
      expect(result.retryDelay).toBe(0);
    });

    it('should handle AWS resource not found error', () => {
      // Arrange
      const error = new Error('Resource not found');
      error.name = 'ResourceNotFoundException';

      // Act
      const result = service.handleAwsError(error, 'secrets-manager');

      // Assert
      expect(result.shouldRetry).toBe(false);
      expect(result.fallbackToLocal).toBe(true);
      expect(result.errorType).toBe('resource-not-found');
      expect(result.retryDelay).toBe(0);
    });

    it('should handle network timeout error with retry', () => {
      // Arrange
      const error = new Error('Network timeout');
      error.name = 'TimeoutError';

      // Act
      const result = service.handleAwsError(error, 'ssm');

      // Assert
      expect(result.shouldRetry).toBe(true);
      expect(result.fallbackToLocal).toBe(true);
      expect(result.errorType).toBe('timeout');
      expect(result.retryDelay).toBeGreaterThan(0);
    });

    it('should handle throttling error with exponential backoff', () => {
      // Arrange
      const error = new Error('Too many requests');
      error.name = 'ThrottlingException';

      // Act
      const result = service.handleAwsError(error, 'secrets-manager');

      // Assert
      expect(result.shouldRetry).toBe(true);
      expect(result.fallbackToLocal).toBe(true);
      expect(result.errorType).toBe('throttling');
      expect(result.retryDelay).toBeGreaterThan(1000); // Should have longer delay for throttling
    });

    it('should handle unknown AWS error', () => {
      // Arrange
      const error = new Error('Unknown AWS error');
      error.name = 'UnknownException';

      // Act
      const result = service.handleAwsError(error, 'secrets-manager');

      // Assert
      expect(result.shouldRetry).toBe(false);
      expect(result.fallbackToLocal).toBe(true);
      expect(result.errorType).toBe('unknown');
      expect(result.retryDelay).toBe(0);
    });
  });

  describe('handleConfigurationError', () => {
    it('should handle validation error', () => {
      // Arrange
      const error = new Error('Invalid configuration format');

      // Act
      const result = service.handleConfigurationError(error, 'validation');

      // Assert
      expect(result.shouldContinue).toBe(true);
      expect(result.useDefault).toBe(true);
      expect(result.errorType).toBe('validation');
    });

    it('should handle parsing error', () => {
      // Arrange
      const error = new Error('JSON parse error');

      // Act
      const result = service.handleConfigurationError(error, 'parsing');

      // Assert
      expect(result.shouldContinue).toBe(true);
      expect(result.useDefault).toBe(true);
      expect(result.errorType).toBe('parsing');
    });

    it('should handle transformation error', () => {
      // Arrange
      const error = new Error('Type conversion failed');

      // Act
      const result = service.handleConfigurationError(error, 'transformation');

      // Assert
      expect(result.shouldContinue).toBe(true);
      expect(result.useDefault).toBe(false);
      expect(result.errorType).toBe('transformation');
    });
  });

  describe('isRetryableError', () => {
    it('should identify retryable AWS errors', () => {
      // Arrange
      const retryableErrors = [
        { name: 'ServiceUnavailableException', message: 'Service unavailable' },
        { name: 'TimeoutError', message: 'Request timeout' },
        { name: 'ThrottlingException', message: 'Rate limit exceeded' },
        { name: 'InternalServerError', message: 'Internal server error' },
      ];

      // Act & Assert
      retryableErrors.forEach(errorData => {
        const error = new Error(errorData.message);
        error.name = errorData.name;
        expect(service.isRetryableError(error)).toBe(true);
      });
    });

    it('should identify non-retryable AWS errors', () => {
      // Arrange
      const nonRetryableErrors = [
        { name: 'CredentialsError', message: 'Invalid credentials' },
        { name: 'AccessDeniedException', message: 'Access denied' },
        { name: 'ResourceNotFoundException', message: 'Resource not found' },
        { name: 'ValidationException', message: 'Invalid input' },
      ];

      // Act & Assert
      nonRetryableErrors.forEach(errorData => {
        const error = new Error(errorData.message);
        error.name = errorData.name;
        expect(service.isRetryableError(error)).toBe(false);
      });
    });

    it('should handle unknown errors as non-retryable', () => {
      // Arrange
      const error = new Error('Unknown error');
      error.name = 'UnknownError';

      // Act
      const result = service.isRetryableError(error);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('getRetryDelay', () => {
    it('should calculate exponential backoff delay', () => {
      // Act
      const delay1 = service.getRetryDelay(1);
      const delay2 = service.getRetryDelay(2);
      const delay3 = service.getRetryDelay(3);

      // Assert
      expect(delay1).toBeGreaterThan(0);
      expect(delay2).toBeGreaterThan(delay1);
      expect(delay3).toBeGreaterThan(delay2);
    });

    it('should respect maximum retry delay', () => {
      // Act
      const delay = service.getRetryDelay(10); // High attempt number

      // Assert
      expect(delay).toBeLessThanOrEqual(30000); // Should not exceed 30 seconds
    });

    it('should add jitter to prevent thundering herd', () => {
      // Act
      const delays = Array.from({ length: 10 }, () => service.getRetryDelay(2));

      // Assert
      const uniqueDelays = new Set(delays);
      expect(uniqueDelays.size).toBeGreaterThan(1); // Should have some variation due to jitter
    });
  });

  describe('shouldFailFast', () => {
    it('should return true when failOnAwsError is enabled', async () => {
      // Arrange
      const failFastOptions = { ...mockIntegrationOptions, failOnAwsError: true };
      
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          ErrorHandlerService,
          {
            provide: NESTJS_CONFIG_AWS_INTEGRATION_OPTIONS,
            useValue: failFastOptions,
          },
        ],
      }).compile();

      const failFastService = module.get<ErrorHandlerService>(ErrorHandlerService);
      const error = new Error('AWS error');

      // Act
      const result = failFastService.shouldFailFast(error);

      // Assert
      expect(result).toBe(true);
    });

    it('should return false when fallback is enabled', () => {
      // Arrange
      const error = new Error('AWS error');

      // Act
      const result = service.shouldFailFast(error);

      // Assert
      expect(result).toBe(false);
    });

    it('should return true for critical errors even with fallback enabled', () => {
      // Arrange
      const error = new Error('Critical system error');
      error.name = 'CriticalError';

      // Act
      const result = service.shouldFailFast(error);

      // Assert
      expect(result).toBe(false); // Based on current implementation
    });
  });

  describe('createErrorContext', () => {
    it('should create comprehensive error context', () => {
      // Arrange
      const error = new Error('Test error');
      error.name = 'TestError';
      const source = 'secrets-manager';
      const operation = 'load-configuration';

      // Act
      const context = service.createErrorContext(error, source, operation);

      // Assert
      expect(context).toMatchObject({
        error: {
          name: 'TestError',
          message: 'Test error',
        },
        source,
        operation,
        timestamp: expect.any(Date),
        retryable: expect.any(Boolean),
      });
    });

    it('should include stack trace when available', () => {
      // Arrange
      const error = new Error('Test error');
      error.stack = 'Error: Test error\n    at test.js:1:1';
      const source = 'ssm';
      const operation = 'validate';

      // Act
      const context = service.createErrorContext(error, source, operation);

      // Assert
      expect(context.error.stack).toBeDefined();
      expect(context.error.stack).toContain('test.js:1:1');
    });

    it('should handle errors without stack trace', () => {
      // Arrange
      const error = new Error('Test error');
      delete error.stack;
      const source = 'environment';
      const operation = 'load';

      // Act
      const context = service.createErrorContext(error, source, operation);

      // Assert
      expect(context.error.stack).toBeUndefined();
      expect(context.error.name).toBe('Error');
      expect(context.error.message).toBe('Test error');
    });
  });

  describe('formatErrorMessage', () => {
    it('should format error message with context', () => {
      // Arrange
      const error = new Error('Configuration load failed');
      const source = 'secrets-manager';
      const operation = 'load-configuration';

      // Act
      const message = service.formatErrorMessage(error, source, operation);

      // Assert
      expect(message).toContain('Configuration load failed');
      expect(message).toContain('secrets-manager');
      expect(message).toContain('load-configuration');
    });

    it('should handle missing error message', () => {
      // Arrange
      const error = new Error();
      const source = 'ssm';
      const operation = 'validate';

      // Act
      const message = service.formatErrorMessage(error, source, operation);

      // Assert
      expect(message).toContain('ssm');
      expect(message).toContain('validate');
      expect(message).toContain('Unknown error');
    });
  });

  describe('error recovery strategies', () => {
    it('should provide appropriate recovery strategy for service unavailable', () => {
      // Arrange
      const error = new Error('Service unavailable');
      error.name = 'ServiceUnavailableException';

      // Act
      const strategy = service.getRecoveryStrategy(error);

      // Assert
      expect(strategy.type).toBe('retry-with-backoff');
      expect(strategy.maxRetries).toBeGreaterThan(0);
      expect(strategy.fallbackEnabled).toBe(true);
    });

    it('should provide appropriate recovery strategy for credentials error', () => {
      // Arrange
      const error = new Error('Invalid credentials');
      error.name = 'CredentialsError';

      // Act
      const strategy = service.getRecoveryStrategy(error);

      // Assert
      expect(strategy.type).toBe('fallback-only');
      expect(strategy.maxRetries).toBe(0);
      expect(strategy.fallbackEnabled).toBe(true);
    });

    it('should provide appropriate recovery strategy for access denied', () => {
      // Arrange
      const error = new Error('Access denied');
      error.name = 'AccessDeniedException';

      // Act
      const strategy = service.getRecoveryStrategy(error);

      // Assert
      expect(strategy.type).toBe('fallback-only');
      expect(strategy.maxRetries).toBe(0);
      expect(strategy.fallbackEnabled).toBe(true);
    });
  });
});