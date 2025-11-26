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
