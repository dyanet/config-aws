/**
 * @dyanet/config-aws
 *
 * Framework-agnostic AWS configuration management library.
 * Supports environment variables, AWS Secrets Manager, SSM Parameter Store,
 * S3, and .env files with configurable precedence.
 */

// Interfaces
export type {
  ConfigLoader,
  ConfigLoaderResult,
} from './interfaces/config-loader.interface.js';

export type {
  ConfigManagerOptions,
  LoaderPrecedence,
  VerboseOptions,
  PrecedenceStrategy,
  ConfigLoadResult,
  ConfigSourceInfo,
  Logger,
} from './interfaces/config-manager.interface.js';

export type {
  EnvironmentLoaderConfig,
} from './interfaces/environment-loader.interface.js';

export type {
  EnvFileLoaderConfig,
} from './interfaces/env-file-loader.interface.js';

export type {
  S3LoaderConfig,
} from './interfaces/s3-loader.interface.js';

export type {
  SecretsManagerLoaderConfig,
} from './interfaces/secrets-manager-loader.interface.js';

export type {
  SSMParameterStoreLoaderConfig,
} from './interfaces/ssm-parameter-store-loader.interface.js';

// Error classes
export {
  ConfigurationError,
  ValidationError,
  AWSServiceError,
  ConfigurationLoadError,
  MissingConfigurationError,
} from './errors/index.js';

// Loaders
export { EnvironmentLoader } from './loaders/environment.loader.js';
export { EnvFileLoader } from './loaders/env-file.loader.js';
export { S3Loader } from './loaders/s3.loader.js';
export { SecretsManagerLoader } from './loaders/secrets-manager.loader.js';
export { SSMParameterStoreLoader } from './loaders/ssm-parameter-store.loader.js';

// ConfigManager
export { ConfigManager } from './config-manager.js';

// Utilities
export { ConfigValidationUtil } from './utils/validation.util.js';
export { EnvFileParser } from './utils/env-file-parser.util.js';
