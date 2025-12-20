/**
 * Server-side configuration loading for Next.js applications.
 * Provides a cached getConfig() function that uses ConfigManager from @dyanet/config-aws.
 *
 * This module provides a simplified, opinionated API that hides loader complexity.
 * For advanced usage such as custom loaders, direct AWS SDK integration, or
 * fine-grained control over configuration loading, import from `@dyanet/config-aws` directly:
 *
 * @example
 * ```typescript
 * // Advanced usage with custom loaders
 * import {
 *   ConfigManager,
 *   EnvironmentLoader,
 *   SecretsManagerLoader,
 *   SSMParameterStoreLoader,
 * } from '@dyanet/config-aws';
 *
 * const manager = new ConfigManager({
 *   loaders: [
 *     new EnvironmentLoader({ prefix: 'APP_' }),
 *     new SecretsManagerLoader({ secretName: '/my-app/config' }),
 *   ],
 *   schema: mySchema,
 * });
 * await manager.load();
 * const config = manager.getAll();
 * ```
 */

import type { ZodType } from 'zod';
import {
  ConfigManager,
  ConfigManagerOptions,
  ConfigLoadResult,
} from '@dyanet/config-aws';
import { detectEnvironment, EnvironmentMode } from './internal/environment';
import { createLoaders, AwsOptions } from './internal/loader-factory';

/**
 * Options for Next.js configuration loading.
 * 
 * This interface provides a simplified, opinionated API that hides loader complexity
 * and provides automatic environment detection.
 * 
 * @example
 * ```typescript
 * // Minimal usage - just schema
 * const config = await getConfig({ schema: mySchema });
 * 
 * // With AWS Secrets Manager
 * const config = await getConfig({
 *   schema: mySchema,
 *   aws: { secretName: '/myapp/config' }
 * });
 * 
 * // Force AWS in development
 * const config = await getConfig({
 *   schema: mySchema,
 *   aws: { secretName: '/myapp/config' },
 *   forceAwsInDev: true
 * });
 * ```
 */
export interface NextConfigOptions<T = Record<string, unknown>> {
  /** Zod schema for validation */
  schema?: ZodType<T>;
  
  /** 
   * AWS configuration options.
   * When provided, enables loading from AWS services based on environment.
   */
  aws?: AwsOptions;
  
  /** 
   * Override environment detection ('development' | 'production' | 'test').
   * When provided, this takes precedence over NODE_ENV auto-detection.
   */
  environment?: EnvironmentMode;
  
  /** 
   * Force AWS loading even in development mode.
   * By default, AWS sources are only loaded in production.
   * @default false
   */
  forceAwsInDev?: boolean;
  
  /** 
   * Enable caching.
   * @default true
   */
  cache?: boolean;
  
  /** 
   * Cache TTL in milliseconds.
   * @default 60000 (1 minute)
   */
  cacheTTL?: number;
  
  /** 
   * Enable logging.
   * @default false
   */
  enableLogging?: boolean;
}

/**
 * Internal cache entry structure
 */
interface CacheEntry<T> {
  config: T;
  loadResult: ConfigLoadResult<T>;
  expiresAt: number;
}

/**
 * Cache storage for configuration
 * Uses a Map to support multiple cache keys (for different option combinations)
 */
const configCache = new Map<string, CacheEntry<unknown>>();

/**
 * Track AWS API call counts for testing purposes
 * @internal
 */
let awsApiCallCount = 0;

/**
 * Generate a cache key from options.
 * The cache key is based on aws options, environment, and forceAwsInDev.
 * @internal
 */
function generateCacheKey<T>(options: NextConfigOptions<T>, resolvedEnvironment: EnvironmentMode): string {
  return JSON.stringify({
    aws: options.aws,
    environment: resolvedEnvironment,
    forceAwsInDev: options.forceAwsInDev ?? false,
  });
}

/**
 * Check if a cache entry is still valid
 * @internal
 */
function isCacheValid<T>(entry: CacheEntry<T> | undefined): entry is CacheEntry<T> {
  if (!entry) return false;
  return Date.now() < entry.expiresAt;
}

/**
 * Load configuration for Next.js server-side use.
 * 
 * This function provides automatic environment detection and caching to avoid 
 * repeated AWS API calls during request handling. Configuration is cached based 
 * on the AWS options, environment, and forceAwsInDev setting.
 * 
 * Environment Behavior:
 * - development: env vars + .env.local/.env files, AWS only if forceAwsInDev
 * - production: env vars + .env file + AWS sources (if configured)
 * - test: env vars only (no file or AWS access)
 * 
 * @example
 * ```typescript
 * import { getConfig } from '@dyanet/nextjs-config-aws';
 * import { z } from 'zod';
 * 
 * const schema = z.object({
 *   DATABASE_URL: z.string(),
 *   API_KEY: z.string(),
 * });
 * 
 * // Minimal usage - auto-detects environment
 * const config = await getConfig({ schema });
 * 
 * // With AWS Secrets Manager (loaded in production)
 * const config = await getConfig({
 *   schema,
 *   aws: { secretName: '/my-app/config', region: 'us-east-1' }
 * });
 * 
 * // Force AWS in development for testing
 * const config = await getConfig({
 *   schema,
 *   aws: { secretName: '/my-app/config' },
 *   forceAwsInDev: true
 * });
 * ```
 * 
 * @param options Configuration options
 * @returns Promise resolving to the validated configuration object
 * @throws {ValidationError} When schema validation fails (includes invalid key names)
 */
export async function getConfig<T = Record<string, unknown>>(
  options: NextConfigOptions<T> = {}
): Promise<T> {
  const {
    schema,
    aws,
    environment: explicitEnvironment,
    forceAwsInDev = false,
    cache = true,
    cacheTTL = 60000, // 1 minute default
    enableLogging = false,
  } = options;

  // Determine environment: explicit option takes precedence over auto-detection
  const resolvedEnvironment = explicitEnvironment ?? detectEnvironment();

  // Generate cache key based on aws options, environment, and forceAwsInDev
  const cacheKey = generateCacheKey(options, resolvedEnvironment);

  // Check cache if enabled
  if (cache) {
    const cached = configCache.get(cacheKey) as CacheEntry<T> | undefined;
    if (isCacheValid(cached)) {
      return cached.config;
    }
  }

  // Increment API call counter (for testing)
  awsApiCallCount++;

  // Create loaders using the internal factory
  const loaders = createLoaders({
    environment: resolvedEnvironment,
    aws,
    forceAwsInDev,
  });

  // Create ConfigManager with generated loaders
  const managerOptions: ConfigManagerOptions<T> = {
    loaders,
    schema,
    precedence: 'aws-first',
    validateOnLoad: true,
    enableLogging,
  };

  const manager = new ConfigManager<T>(managerOptions);
  await manager.load();

  const config = manager.getAll();
  const loadResult = manager.getLoadResult();

  // Store in cache if enabled
  if (cache && loadResult) {
    const entry: CacheEntry<T> = {
      config,
      loadResult,
      expiresAt: Date.now() + cacheTTL,
    };
    configCache.set(cacheKey, entry as CacheEntry<unknown>);
  }

  return config;
}

/**
 * Clear the configuration cache.
 * Useful for testing or when configuration needs to be reloaded.
 */
export function clearConfigCache(): void {
  configCache.clear();
}

/**
 * Get the current cache size.
 * @returns Number of cached configurations
 */
export function getConfigCacheSize(): number {
  return configCache.size;
}

/**
 * Get the AWS API call count.
 * This is primarily for testing the caching behavior.
 * @internal
 */
export function getAwsApiCallCount(): number {
  return awsApiCallCount;
}

/**
 * Reset the AWS API call count.
 * This is primarily for testing the caching behavior.
 * @internal
 */
export function resetAwsApiCallCount(): void {
  awsApiCallCount = 0;
}

/**
 * Invalidate a specific cache entry by regenerating with the same options.
 * @param options The options used to create the cache entry
 */
export function invalidateConfig<T>(options: NextConfigOptions<T>): void {
  const resolvedEnvironment = options.environment ?? detectEnvironment();
  const cacheKey = generateCacheKey(options, resolvedEnvironment);
  configCache.delete(cacheKey);
}
