/**
 * Server-side configuration loading for Next.js applications.
 * Provides a cached getConfig() function that uses ConfigManager from @dyanet/config-aws.
 */

import type { ZodType } from 'zod';
import {
  ConfigManager,
  ConfigLoader,
  ConfigManagerOptions,
  PrecedenceStrategy,
  ConfigLoadResult,
} from '@dyanet/config-aws';

/**
 * Options for Next.js configuration loading
 */
export interface NextConfigOptions<T = Record<string, unknown>> {
  /** Zod schema for validation */
  schema?: ZodType<T>;
  /** Array of loaders to use */
  loaders?: ConfigLoader[];
  /** Precedence strategy for merging configurations */
  precedence?: PrecedenceStrategy;
  /** Enable caching. Default: true */
  cache?: boolean;
  /** Cache TTL in milliseconds. Default: 60000 (1 minute) */
  cacheTTL?: number;
  /** Enable logging. Default: false */
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
 * Generate a cache key from options
 * @internal
 */
function generateCacheKey<T>(options: NextConfigOptions<T>): string {
  const loaderNames = options.loaders?.map((l) => l.getName()).join(',') ?? '';
  const precedence = Array.isArray(options.precedence)
    ? options.precedence.map((p) => `${p.loader}:${p.priority}`).join(',')
    : options.precedence ?? 'aws-first';
  return `${loaderNames}|${precedence}`;
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
 * This function provides caching to avoid repeated AWS API calls during request handling.
 * Configuration is cached based on the loader configuration and precedence strategy.
 * 
 * @example
 * ```typescript
 * import { getConfig, EnvironmentLoader, SecretsManagerLoader } from '@dyanet/nextjs-config-aws';
 * import { z } from 'zod';
 * 
 * const schema = z.object({
 *   DATABASE_URL: z.string(),
 *   API_KEY: z.string(),
 * });
 * 
 * // In a Server Component or API route
 * export default async function Page() {
 *   const config = await getConfig({
 *     schema,
 *     loaders: [
 *       new EnvironmentLoader(),
 *       new SecretsManagerLoader({ secretName: '/my-app/config' }),
 *     ],
 *     precedence: 'aws-first',
 *   });
 * 
 *   return <div>DB: {config.DATABASE_URL}</div>;
 * }
 * ```
 * 
 * @param options Configuration options
 * @returns Promise resolving to the validated configuration object
 */
export async function getConfig<T = Record<string, unknown>>(
  options: NextConfigOptions<T> = {}
): Promise<T> {
  const {
    schema,
    loaders = [],
    precedence = 'aws-first',
    cache = true,
    cacheTTL = 60000, // 1 minute default
    enableLogging = false,
  } = options;

  // Generate cache key
  const cacheKey = generateCacheKey(options);

  // Check cache if enabled
  if (cache) {
    const cached = configCache.get(cacheKey) as CacheEntry<T> | undefined;
    if (isCacheValid(cached)) {
      return cached.config;
    }
  }

  // Increment API call counter (for testing)
  awsApiCallCount++;

  // Create ConfigManager with provided options
  const managerOptions: ConfigManagerOptions<T> = {
    loaders,
    schema,
    precedence,
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
  const cacheKey = generateCacheKey(options);
  configCache.delete(cacheKey);
}
