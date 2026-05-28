import type { ZodType } from 'zod';
import type { ConfigLoader } from './config-loader.interface.js';

/**
 * Logger interface for ConfigManager
 */
export interface Logger {
  log(message: string): void;
  error(message: string): void;
  warn(message: string): void;
  debug?(message: string): void;
}

/**
 * Options for verbose logging output
 */
export interface VerboseOptions {
  /** Log all variable names being loaded. Default: true */
  logKeys?: boolean;
  /** Log variable values (WARNING: may expose secrets). Default: false */
  logValues?: boolean;
  /** Log when a variable is overridden by a higher-precedence loader. Default: true */
  logOverrides?: boolean;
  /** Log loader timing information. Default: true */
  logTiming?: boolean;
  /** Mask sensitive values (show first/last 2 chars only). Default: true (when logValues is true) */
  maskValues?: boolean;
  /** Keys to always mask regardless of maskValues setting. Default: ['password', 'secret', 'key', 'token'] */
  sensitiveKeys?: string[];
}

/**
 * Custom loader precedence configuration
 */
export interface LoaderPrecedence {
  /** Loader name */
  loader: string;
  /** Priority - higher values override lower values */
  priority: number;
}

/**
 * Precedence strategy for merging configurations
 * - 'aws-first': env -> envFile -> s3 -> secretsManager -> ssm (AWS wins)
 * - 'local-first': secretsManager -> ssm -> s3 -> envFile -> env (local wins)
 * - Custom array: user-defined order via LoaderPrecedence[]
 */
export type PrecedenceStrategy = 'aws-first' | 'local-first' | LoaderPrecedence[];

/**
 * Options for ConfigManager
 */
export interface ConfigManagerOptions<T = Record<string, unknown>> {
  /** Array of loaders to use */
  loaders?: ConfigLoader[];
  /** Zod schema for validation */
  schema?: ZodType<T>;
  /** Precedence strategy for merging configurations */
  precedence?: PrecedenceStrategy;
  /** Whether to validate configuration on load. Default: true */
  validateOnLoad?: boolean;
  /** Enable logging. Default: false */
  enableLogging?: boolean;
  /** Custom logger instance */
  logger?: Logger;
  /** Verbose debugging output options */
  verbose?: VerboseOptions | boolean;
}

/**
 * Information about a configuration source
 */
export interface ConfigSourceInfo {
  /** Name of the loader */
  loader: string;
  /** Keys loaded by this loader */
  keysLoaded: string[];
  /** Time taken to load in milliseconds */
  duration: number;
}

/**
 * Result of loading configuration
 */
export interface ConfigLoadResult<T> {
  /** The merged configuration */
  config: T;
  /** Information about each source */
  sources: ConfigSourceInfo[];
  /** When the configuration was loaded */
  loadedAt: Date;
}
