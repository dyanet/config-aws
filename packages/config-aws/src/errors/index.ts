/**
 * Base error class for all configuration-related errors
 */
export class ConfigurationError extends Error {
  /** The underlying cause of this error */
  public readonly cause?: Error;

  constructor(message: string, cause?: Error) {
    super(message);
    this.name = 'ConfigurationError';
    this.cause = cause;
    Object.setPrototypeOf(this, ConfigurationError.prototype);
  }
}

/**
 * Error thrown when configuration validation fails
 */
export class ValidationError extends ConfigurationError {
  /** Detailed validation errors from Zod */
  public readonly validationErrors: unknown;

  constructor(message: string, validationErrors: unknown, cause?: Error) {
    super(message, cause);
    this.name = 'ValidationError';
    this.validationErrors = validationErrors;
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * Error thrown when an AWS service operation fails
 */
export class AWSServiceError extends ConfigurationError {
  /** The AWS service that failed */
  public readonly service: string;
  /** The operation that failed */
  public readonly operation: string;

  constructor(message: string, service: string, operation: string, cause?: Error) {
    super(message, cause);
    this.name = 'AWSServiceError';
    this.service = service;
    this.operation = operation;
    Object.setPrototypeOf(this, AWSServiceError.prototype);
  }
}

/**
 * Error thrown when a configuration loader fails to load
 */
export class ConfigurationLoadError extends ConfigurationError {
  /** The name of the loader that failed */
  public readonly loader: string;

  constructor(message: string, loader: string, cause?: Error) {
    super(message, cause);
    this.name = 'ConfigurationLoadError';
    this.loader = loader;
    Object.setPrototypeOf(this, ConfigurationLoadError.prototype);
  }
}

/**
 * Error thrown when required configuration keys are missing
 */
export class MissingConfigurationError extends ConfigurationError {
  /** The keys that are missing */
  public readonly missingKeys: string[];

  constructor(message: string, missingKeys: string[], cause?: Error) {
    super(message, cause);
    this.name = 'MissingConfigurationError';
    this.missingKeys = missingKeys;
    Object.setPrototypeOf(this, MissingConfigurationError.prototype);
  }
}
