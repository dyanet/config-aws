/**
 * Server-side exports for Next.js configuration management.
 */

export {
  getConfig,
  clearConfigCache,
  getConfigCacheSize,
  invalidateConfig,
  type NextConfigOptions,
} from './get-config';

export {
  createConfigProvider,
  ConfigProvider,
  useConfig,
  ConfigContext,
} from './config-provider';

// Export types from internal modules for advanced usage
export type { AwsOptions } from './internal/loader-factory';
export type { EnvironmentMode } from './internal/environment';