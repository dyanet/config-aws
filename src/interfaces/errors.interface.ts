/**
 * Base error class for all configuration-related errors.
 */
export class ConfigurationError extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = 'ConfigurationError';
    
    // Maintain proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ConfigurationError);
    }
  }
}

/**
 * Error thrown when configuration validation fails.
 */
export class ValidationError extends ConfigurationError {
  constructor(
    message: string, 
    public readonly validationErrors: any,
    public readonly invalidKeys?: string[]
  ) {
    super(message);
    this.name = 'ValidationError';
    
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ValidationError);
    }
  }
}

/**
 * Error thrown when AWS service operations fail.
 */
export class AWSServiceError extends ConfigurationError {
  constructor(
    message: string,
    public readonly service: 'SecretsManager' | 'SSM',
    public readonly operation: string,
    cause?: Error
  ) {
    super(message, cause);
    this.name = 'AWSServiceError';
    
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AWSServiceError);
    }
  }
}

/**
 * Error thrown when required configuration is missing.
 */
export class MissingConfigurationError extends ConfigurationError {
  constructor(
    public readonly missingKeys: string[],
    message?: string
  ) {
    super(message || `Missing required configuration: ${missingKeys.join(', ')}`);
    this.name = 'MissingConfigurationError';
    
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, MissingConfigurationError);
    }
  }
}

/**
 * Error thrown when configuration loading fails.
 */
export class ConfigurationLoadError extends ConfigurationError {
  constructor(
    message: string,
    public readonly loader: string,
    cause?: Error
  ) {
    super(message, cause);
    this.name = 'ConfigurationLoadError';
    
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ConfigurationLoadError);
    }
  }
}