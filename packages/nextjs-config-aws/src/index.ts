/**
 * @dyanet/nextjs-config-aws
 *
 * Next.js adapter for AWS configuration management.
 * Provides server-side configuration loading, React context providers,
 * and runtime environment variable support for Next.js applications.
 */

// Re-export all types and classes from @dyanet/config-aws
export type {
  ConfigLoader,
  ConfigLoaderResult,
  ConfigManagerOptions,
  LoaderPrecedence,
  VerboseOptions,
  PrecedenceStrategy,
  ConfigLoadResult,
  ConfigSourceInfo,
  Logger,
  EnvironmentLoaderConfig,
  EnvFileLoaderConfig,
  S3LoaderConfig,
  SecretsManagerLoaderConfig,
  SSMParameterStoreLoaderConfig,
} from '@dyanet/config-aws';

export {
  ConfigurationError,
  ValidationError,
  AWSServiceError,
  ConfigurationLoadError,
  MissingConfigurationError,
  EnvironmentLoader,
  EnvFileLoader,
  S3Loader,
  SecretsManagerLoader,
  SSMParameterStoreLoader,
  ConfigManager,
  ConfigValidationUtil,
  EnvFileParser,
} from '@dyanet/config-aws';

// Server-side exports
export {
  getConfig,
  clearConfigCache,
  getConfigCacheSize,
  invalidateConfig,
  type NextConfigOptions,
  createConfigProvider,
  ConfigProvider,
  useConfig,
  ConfigContext,
} from './server';

// Components for runtime environment variables
export {
  PublicEnvScript,
  filterEnvVars,
  generateScriptContent,
  type PublicEnvScriptProps,
} from './components';

// Client-side environment variable access
export { env, envFrom, getAllEnv, hasEnv } from './client';
