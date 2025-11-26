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
} from './interfaces/config-loader.interface';

export type {
  ConfigManagerOptions,
  LoaderPrecedence,
  VerboseOptions,
  PrecedenceStrategy,
  ConfigLoadResult,
  ConfigSourceInfo,
  Logger,
} from './interfaces/config-manager.interface';

export type {
  EnvironmentLoaderConfig,
} from './interfaces/environment-loader.interface';

export type {
  EnvFileLoaderConfig,
} from './interfaces/env-file-loader.interface';

export type {
  S3LoaderConfig,
} from './interfaces/s3-loader.interface';

export type {
  SecretsManagerLoaderConfig,
} from './interfaces/secrets-manager-loader.interface';

export type {
  SSMParameterStoreLoaderConfig,
} from './interfaces/ssm-parameter-store-loader.interface';

// Error classes
export {
  ConfigurationError,
  ValidationError,
  AWSServiceError,
  ConfigurationLoadError,
  MissingConfigurationError,
} from './errors';

// Loaders
export { EnvironmentLoader } from './loaders/environment.loader';
export { EnvFileLoader } from './loaders/env-file.loader';
export { S3Loader } from './loaders/s3.loader';
export { SecretsManagerLoader } from './loaders/secrets-manager.loader';
export { SSMParameterStoreLoader } from './loaders/ssm-parameter-store.loader';

// ConfigManager
export { ConfigManager } from './config-manager';

// Utilities
export { ConfigValidationUtil } from './utils/validation.util';
export { EnvFileParser } from './utils/env-file-parser.util';
