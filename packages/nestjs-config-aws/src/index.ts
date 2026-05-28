// Re-export all public types from @dyanet/config-aws core package
export {
  // Loaders
  EnvironmentLoader,
  EnvFileLoader,
  S3Loader,
  SecretsManagerLoader,
  SSMParameterStoreLoader,

  // ConfigManager
  ConfigManager,

  // Error classes
  ConfigurationError,
  ValidationError,
  AWSServiceError,
  ConfigurationLoadError,
  MissingConfigurationError,

  // Utilities
  ConfigValidationUtil,
  EnvFileParser,
} from '@dyanet/config-aws';

// Re-export types from @dyanet/config-aws
export type {
  // Core interfaces
  ConfigLoader,
  ConfigManagerOptions,
  LoaderPrecedence,
  VerboseOptions,
  PrecedenceStrategy,
  ConfigLoadResult,
  ConfigSourceInfo,
  Logger,

  // Loader configs
  EnvironmentLoaderConfig,
  EnvFileLoaderConfig,
  S3LoaderConfig,
  SecretsManagerLoaderConfig,
  SSMParameterStoreLoaderConfig,
} from '@dyanet/config-aws';

// NestJS dependency-injection module + service
export * from './config.module';
export * from './interfaces';
export * from './services/config.service';

// @nestjs/config integration: a single factory helper for the `load` array
export { awsConfigLoader } from './aws-config-loader';
export type { AwsConfigLoaderOptions } from './aws-config-loader';
export { buildAwsLoaders } from './build-loaders';
export type { AwsLoaderSources } from './build-loaders';
