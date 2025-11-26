import { Injectable, Logger } from '@nestjs/common';
import { ConfigurationError } from '@dyanet/config-aws';
import { IntegrationOptions, ErrorHandlingStrategy } from '../interfaces/integration-options.interface';

/**
 * Service for handling errors and implementing graceful degradation strategies
 * in the AWS configuration integration.
 */
@Injectable()
export class ErrorHandlerService {
  private readonly logger = new Logger(ErrorHandlerService.name);
  private readonly errorHandling: ErrorHandlingStrategy;

  constructor(private readonly options: IntegrationOptions) {
    // Set default error handling strategy
    this.errorHandling = {
      onAwsUnavailable: 'warn',
      onConfigurationError: 'warn',
      onValidationError: 'fail',
      enableDetailedLogging: true,
      ...options.errorHandling,
    };
  }

  /**
   * Handle AWS service unavailability.
   * @param serviceName - Name of the AWS service that's unavailable
   * @param error - The error that occurred
   * @returns Whether to continue processing
   */
  handleAwsUnavailable(serviceName: string, error?: Error): boolean {
    const message = `AWS service '${serviceName}' is unavailable${error ? `: ${error.message}` : ''}`;

    switch (this.errorHandling.onAwsUnavailable) {
      case 'fail':
        this.logger.error(message);
        throw new ConfigurationError(`AWS service unavailable: ${serviceName}`, error);
      
      case 'warn':
        this.logger.warn(message);
        this.logger.warn('Continuing with available configuration sources');
        return true;
      
      case 'silent':
        if (this.errorHandling.enableDetailedLogging) {
          this.logger.debug(message);
        }
        return true;
      
      default:
        this.logger.warn(message);
        return true;
    }
  }

  /**
   * Handle configuration loading errors.
   * @param source - Name of the configuration source
   * @param error - The error that occurred
   * @returns Whether to continue processing
   */
  handleConfigurationError(source: string, error: Error): boolean {
    const message = `Configuration error from '${source}': ${error.message}`;

    switch (this.errorHandling.onConfigurationError) {
      case 'fail':
        this.logger.error(message);
        throw new ConfigurationError(`Configuration loading failed: ${source}`, error);
      
      case 'warn':
        this.logger.warn(message);
        this.logger.warn('Continuing with other configuration sources');
        return true;
      
      case 'use-default':
        this.logger.warn(message);
        this.logger.warn('Using default configuration values');
        return true;
      
      default:
        this.logger.warn(message);
        return true;
    }
  }

  /**
   * Handle validation errors.
   * @param field - The field that failed validation
   * @param error - The validation error
   * @returns Whether to continue processing
   */
  handleValidationError(field: string, error: Error): boolean {
    const message = `Validation error for field '${field}': ${error.message}`;

    switch (this.errorHandling.onValidationError) {
      case 'fail':
        this.logger.error(message);
        throw new ConfigurationError(`Validation failed: ${field}`, error);
      
      case 'warn':
        this.logger.warn(message);
        this.logger.warn('Continuing with invalid configuration value');
        return true;
      
      case 'skip-invalid':
        this.logger.warn(message);
        this.logger.warn('Skipping invalid configuration value');
        return false;
      
      default:
        this.logger.error(message);
        throw new ConfigurationError(`Validation failed: ${field}`, error);
    }
  }

  /**
   * Handle network connectivity issues.
   * @param service - The service experiencing connectivity issues
   * @param error - The network error
   * @returns Whether to retry or continue
   */
  handleNetworkError(service: string, error: Error): { shouldRetry: boolean; shouldContinue: boolean } {
    const message = `Network error connecting to '${service}': ${error.message}`;

    if (this.errorHandling.enableDetailedLogging) {
      this.logger.error(message);
      this.logger.error('Stack trace:', error.stack);
    } else {
      this.logger.error(message);
    }

    // For network errors, we generally don't retry immediately but continue with other sources
    return {
      shouldRetry: false,
      shouldContinue: true,
    };
  }

  /**
   * Handle permission denied errors.
   * @param service - The service that denied access
   * @param resource - The resource that was accessed
   * @param error - The permission error
   * @returns Whether to continue processing
   */
  handlePermissionError(service: string, resource: string, error: Error): boolean {
    const message = `Permission denied accessing '${resource}' in '${service}': ${error.message}`;
    
    this.logger.error(message);
    this.logger.error('Please check AWS credentials and IAM permissions');

    if (this.errorHandling.enableDetailedLogging) {
      this.logger.error('Stack trace:', error.stack);
    }

    // Permission errors are usually configuration issues, so we continue with other sources
    return this.handleConfigurationError(service, error);
  }

  /**
   * Handle resource not found errors.
   * @param service - The service where the resource was not found
   * @param resource - The resource that was not found
   * @param error - The not found error
   * @returns Whether to continue processing
   */
  handleResourceNotFound(service: string, resource: string, error?: Error): boolean {
    const message = `Resource '${resource}' not found in '${service}'${error ? `: ${error.message}` : ''}`;
    
    if (this.errorHandling.enableDetailedLogging) {
      this.logger.debug(message);
      this.logger.debug('This may be expected if the resource is not configured for this environment');
    }

    // Resource not found is often expected in different environments
    return true;
  }

  /**
   * Log detailed error information for troubleshooting.
   * @param context - The context where the error occurred
   * @param error - The error to log
   * @param additionalInfo - Additional information to include
   */
  logDetailedError(context: string, error: Error, additionalInfo?: Record<string, any>): void {
    if (!this.errorHandling.enableDetailedLogging) {
      return;
    }

    this.logger.error(`Detailed error in ${context}:`);
    this.logger.error(`Error name: ${error.name}`);
    this.logger.error(`Error message: ${error.message}`);
    
    if (error.stack) {
      this.logger.error(`Stack trace: ${error.stack}`);
    }

    if (additionalInfo) {
      this.logger.error(`Additional info: ${JSON.stringify(additionalInfo, null, 2)}`);
    }

    // Log environment information that might be relevant
    this.logger.error('Environment context:');
    this.logger.error(`NODE_ENV: ${process.env['NODE_ENV'] || 'undefined'}`);
    this.logger.error(`APP_ENV: ${process.env['APP_ENV'] || 'undefined'}`);
    this.logger.error(`AWS_REGION: ${process.env['AWS_REGION'] || 'undefined'}`);
    this.logger.error(`AWS_PROFILE: ${process.env['AWS_PROFILE'] || 'undefined'}`);
  }

  /**
   * Create a fallback configuration when AWS sources fail.
   * @param namespace - Optional namespace for the fallback config
   * @returns Fallback configuration object
   */
  createFallbackConfiguration(namespace?: string): Record<string, any> {
    const fallbackConfig: Record<string, any> = {};

    if (this.options.fallbackToLocal) {
      this.logger.warn('Creating fallback configuration from environment variables');
      
      // Extract environment variables that might be configuration
      for (const [key, value] of Object.entries(process.env)) {
        if (value !== undefined) {
          // If namespace is specified, only include keys that match
          if (namespace) {
            const upperNamespace = namespace.toUpperCase();
            if (key.toUpperCase().startsWith(upperNamespace)) {
              const namespacedKey = key.substring(namespace.length);
              const cleanKey = namespacedKey.startsWith('_') ? namespacedKey.substring(1) : namespacedKey;
              if (cleanKey) {
                fallbackConfig[cleanKey] = value;
              }
            }
          } else {
            fallbackConfig[key] = value;
          }
        }
      }
    }

    return fallbackConfig;
  }

  /**
   * Check if an error is retryable.
   * @param error - The error to check
   * @returns Whether the error is retryable
   */
  isRetryableError(error: Error): boolean {
    // Network errors are generally retryable
    if (error.name === 'NetworkingError' || error.name === 'TimeoutError') {
      return true;
    }

    // Throttling errors are retryable
    if (error.name === 'ThrottlingException' || error.name === 'TooManyRequestsException') {
      return true;
    }

    // Service unavailable errors are retryable
    if (error.name === 'ServiceUnavailableException') {
      return true;
    }

    // Permission and resource not found errors are not retryable
    if (error.name === 'AccessDeniedException' || error.name === 'ResourceNotFoundException') {
      return false;
    }

    // Default to not retryable for unknown errors
    return false;
  }

  /**
   * Get retry delay for retryable errors.
   * @param attemptNumber - The current attempt number (1-based)
   * @returns Delay in milliseconds
   */
  getRetryDelay(attemptNumber: number): number {
    // Exponential backoff with jitter
    const baseDelay = 1000; // 1 second
    const maxDelay = 30000; // 30 seconds
    
    const delay = Math.min(baseDelay * Math.pow(2, attemptNumber - 1), maxDelay);
    
    // Add jitter (±25%)
    const jitter = delay * 0.25 * (Math.random() - 0.5);
    
    return Math.max(100, delay + jitter); // Minimum 100ms delay
  }
}