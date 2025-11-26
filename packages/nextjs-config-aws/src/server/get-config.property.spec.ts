/**
 * Property-based tests for getConfig() caching behavior.
 *
 * **Feature: package-extraction, Property 7: Next.js Configuration Caching**
 * **Validates: Requirements 3.4**
 */

import * as fc from 'fast-check';
import type { ConfigLoader } from '@dyanet/config-aws';
import {
  getConfig,
  clearConfigCache,
  getAwsApiCallCount,
  resetAwsApiCallCount,
} from './get-config';

/**
 * Mock loader implementation for testing
 */
class MockLoader implements ConfigLoader {
  private loadCount = 0;

  constructor(
    private readonly name: string,
    private readonly config: Record<string, unknown>
  ) {}

  getName(): string {
    return this.name;
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }

  async load(): Promise<Record<string, unknown>> {
    this.loadCount++;
    return { ...this.config };
  }

  getLoadCount(): number {
    return this.loadCount;
  }

  resetLoadCount(): void {
    this.loadCount = 0;
  }
}

/**
 * Arbitrary for generating valid configuration keys.
 */
const validConfigKey = fc
  .tuple(
    fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_'.split('')),
    fc.stringOf(
      fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_'.split('')),
      { minLength: 0, maxLength: 15 }
    )
  )
  .map(([first, rest]) => first + rest);

/**
 * Arbitrary for generating configuration values.
 */
const configValue = fc.oneof(
  fc.string({ minLength: 0, maxLength: 50 }),
  fc.integer(),
  fc.boolean(),
  fc.constant(null)
);

/**
 * Arbitrary for generating a configuration object.
 */
const configObject = fc.dictionary(validConfigKey, configValue, { minKeys: 1, maxKeys: 10 });

describe('getConfig Property Tests', () => {
  beforeEach(() => {
    clearConfigCache();
    resetAwsApiCallCount();
  });

  /**
   * **Feature: package-extraction, Property 7: Next.js Configuration Caching**
   * **Validates: Requirements 3.4**
   *
   * For any sequence of getConfig() calls within the cache TTL,
   * AWS APIs SHALL be called at most once.
   */
  describe('Property 7: Next.js Configuration Caching', () => {
    it('should call AWS APIs at most once for multiple getConfig() calls within TTL', async () => {
      await fc.assert(
        fc.asyncProperty(
          configObject,
          // Generate number of calls (2-10)
          fc.integer({ min: 2, max: 10 }),
          async (config, numCalls) => {
            clearConfigCache();
            resetAwsApiCallCount();

            const loader = new MockLoader('TestLoader', config);

            // Make multiple calls with the same options
            const options = {
              loaders: [loader],
              cache: true,
              cacheTTL: 60000, // 1 minute
            };

            for (let i = 0; i < numCalls; i++) {
              await getConfig(options);
            }

            // AWS APIs should be called at most once
            expect(getAwsApiCallCount()).toBe(1);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return the same configuration for cached calls', async () => {
      await fc.assert(
        fc.asyncProperty(
          configObject,
          fc.integer({ min: 2, max: 5 }),
          async (config, numCalls) => {
            clearConfigCache();

            const loader = new MockLoader('TestLoader', config);

            const options = {
              loaders: [loader],
              cache: true,
              cacheTTL: 60000,
            };

            const results: Record<string, unknown>[] = [];
            for (let i = 0; i < numCalls; i++) {
              const result = await getConfig(options);
              results.push(result);
            }

            // All results should be equal
            for (let i = 1; i < results.length; i++) {
              expect(results[i]).toEqual(results[0]);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should call AWS APIs again when cache is disabled', async () => {
      await fc.assert(
        fc.asyncProperty(
          configObject,
          fc.integer({ min: 2, max: 5 }),
          async (config, numCalls) => {
            clearConfigCache();
            resetAwsApiCallCount();

            const loader = new MockLoader('TestLoader', config);

            const options = {
              loaders: [loader],
              cache: false, // Disable caching
            };

            for (let i = 0; i < numCalls; i++) {
              await getConfig(options);
            }

            // AWS APIs should be called for each request
            expect(getAwsApiCallCount()).toBe(numCalls);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should use separate cache entries for different loader configurations', async () => {
      await fc.assert(
        fc.asyncProperty(
          configObject,
          configObject,
          async (config1, config2) => {
            clearConfigCache();
            resetAwsApiCallCount();

            const loader1 = new MockLoader('Loader1', config1);
            const loader2 = new MockLoader('Loader2', config2);

            // Call with first loader configuration
            await getConfig({
              loaders: [loader1],
              cache: true,
            });

            // Call with second loader configuration
            await getConfig({
              loaders: [loader2],
              cache: true,
            });

            // Should have made 2 API calls (one for each unique configuration)
            expect(getAwsApiCallCount()).toBe(2);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should use separate cache entries for different precedence strategies', async () => {
      await fc.assert(
        fc.asyncProperty(
          configObject,
          async (config) => {
            clearConfigCache();
            resetAwsApiCallCount();

            const loader = new MockLoader('TestLoader', config);

            // Call with aws-first precedence
            await getConfig({
              loaders: [loader],
              precedence: 'aws-first',
              cache: true,
            });

            // Call with local-first precedence
            await getConfig({
              loaders: [loader],
              precedence: 'local-first',
              cache: true,
            });

            // Should have made 2 API calls (one for each precedence strategy)
            expect(getAwsApiCallCount()).toBe(2);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reload configuration after cache is cleared', async () => {
      await fc.assert(
        fc.asyncProperty(
          configObject,
          async (config) => {
            clearConfigCache();
            resetAwsApiCallCount();

            const loader = new MockLoader('TestLoader', config);

            const options = {
              loaders: [loader],
              cache: true,
            };

            // First call
            await getConfig(options);
            expect(getAwsApiCallCount()).toBe(1);

            // Clear cache
            clearConfigCache();

            // Second call after cache clear
            await getConfig(options);
            expect(getAwsApiCallCount()).toBe(2);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
