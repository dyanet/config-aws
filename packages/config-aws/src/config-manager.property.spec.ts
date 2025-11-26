/**
 * Property-based tests for ConfigManager.
 *
 * **Feature: package-extraction, Property 2: Precedence Order Consistency**
 * **Validates: Requirements 1.4, 1.11**
 *
 * **Feature: package-extraction, Property 1: Configuration Serialization Round-Trip**
 * **Validates: Requirements 1.6, 1.7**
 */

import * as fc from 'fast-check';
import { ConfigManager } from './config-manager';
import type { ConfigLoader } from './interfaces/config-loader.interface';
import type { LoaderPrecedence } from './interfaces/config-manager.interface';

/**
 * Mock loader implementation for testing
 */
class MockLoader implements ConfigLoader {
  constructor(
    private readonly name: string,
    private readonly config: Record<string, unknown>,
    private readonly available: boolean = true
  ) {}

  getName(): string {
    return this.name;
  }

  async isAvailable(): Promise<boolean> {
    return this.available;
  }

  async load(): Promise<Record<string, unknown>> {
    return { ...this.config };
  }
}

/**
 * Arbitrary for generating valid configuration keys.
 * Must be valid JavaScript property names.
 */
const validConfigKey = fc
  .tuple(
    fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_'.split('')),
    fc.stringOf(
      fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_'.split('')),
      { minLength: 0, maxLength: 15 },
    ),
  )
  .map(([first, rest]) => first + rest);

/**
 * Arbitrary for generating configuration values (JSON-serializable primitives).
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
const configObject = fc.dictionary(validConfigKey, configValue, { minKeys: 0, maxKeys: 10 });

/**
 * Arbitrary for generating loader names.
 */
const loaderName = fc
  .tuple(
    fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')),
    fc.stringOf(
      fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')),
      { minLength: 2, maxLength: 10 },
    ),
  )
  .map(([first, rest]) => first + rest + 'Loader');

describe('ConfigManager Property Tests', () => {
  /**
   * **Feature: package-extraction, Property 2: Precedence Order Consistency**
   * **Validates: Requirements 1.4, 1.11**
   *
   * For any set of loaders L and precedence strategy P, when multiple loaders
   * provide the same key K, the final value SHALL come from the loader with
   * highest precedence according to P.
   */
  describe('Property 2: Precedence Order Consistency', () => {
    it('should use value from highest precedence loader when keys overlap (custom precedence)', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate 2-4 unique loader names
          fc.array(loaderName, { minLength: 2, maxLength: 4 })
            .filter((names) => new Set(names).size === names.length),
          // Generate a shared key that all loaders will have
          validConfigKey,
          // Generate unique values for each loader
          fc.array(configValue, { minLength: 2, maxLength: 4 }),
          async (loaderNames, sharedKey, values) => {
            // Ensure we have enough values for each loader
            if (values.length < loaderNames.length) return;

            // Create loaders with the shared key, each with a different value
            const loaders: ConfigLoader[] = loaderNames.map((name, index) => {
              return new MockLoader(name, { [sharedKey]: values[index] });
            });

            // Create custom precedence: higher index = higher priority
            const precedence: LoaderPrecedence[] = loaderNames.map((name, index) => ({
              loader: name,
              priority: index,
            }));

            const manager = new ConfigManager({
              loaders,
              precedence,
            });

            await manager.load();
            const result = manager.getAll();

            // The value should come from the loader with highest priority (last in the list)
            const highestPriorityIndex = loaderNames.length - 1;
            expect(result[sharedKey]).toBe(values[highestPriorityIndex]);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should use value from highest precedence loader with aws-first strategy', async () => {
      await fc.assert(
        fc.asyncProperty(
          validConfigKey,
          configValue,
          configValue,
          async (sharedKey, envValue, ssmValue) => {
            // Skip if values are the same (can't distinguish which loader won)
            if (envValue === ssmValue) return;

            // Create loaders matching the aws-first order
            const envLoader = new MockLoader('EnvironmentLoader', { [sharedKey]: envValue });
            const ssmLoader = new MockLoader('SSMParameterStoreLoader', { [sharedKey]: ssmValue });

            const manager = new ConfigManager({
              loaders: [envLoader, ssmLoader],
              precedence: 'aws-first',
            });

            await manager.load();
            const result = manager.getAll();

            // In aws-first, SSMParameterStoreLoader has higher precedence than EnvironmentLoader
            expect(result[sharedKey]).toBe(ssmValue);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should use value from highest precedence loader with local-first strategy', async () => {
      await fc.assert(
        fc.asyncProperty(
          validConfigKey,
          configValue,
          configValue,
          async (sharedKey, envValue, ssmValue) => {
            // Skip if values are the same (can't distinguish which loader won)
            if (envValue === ssmValue) return;

            // Create loaders matching the local-first order
            const envLoader = new MockLoader('EnvironmentLoader', { [sharedKey]: envValue });
            const ssmLoader = new MockLoader('SSMParameterStoreLoader', { [sharedKey]: ssmValue });

            const manager = new ConfigManager({
              loaders: [envLoader, ssmLoader],
              precedence: 'local-first',
            });

            await manager.load();
            const result = manager.getAll();

            // In local-first, EnvironmentLoader has higher precedence than SSMParameterStoreLoader
            expect(result[sharedKey]).toBe(envValue);
          }
        ),
        { numRuns: 100 }
      );
    });


    it('should preserve all unique keys from all loaders', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate 2-3 config objects for different loaders
          fc.array(configObject, { minLength: 2, maxLength: 3 }),
          async (configs) => {
            // Create loaders with different configs
            const loaders: ConfigLoader[] = configs.map((config, index) => {
              return new MockLoader(`Loader${index}`, config);
            });

            // Create custom precedence
            const precedence: LoaderPrecedence[] = loaders.map((loader, index) => ({
              loader: loader.getName(),
              priority: index,
            }));

            const manager = new ConfigManager({
              loaders,
              precedence,
            });

            await manager.load();
            const result = manager.getAll();

            // All unique keys from all configs should be present
            const allKeys = new Set<string>();
            for (const config of configs) {
              for (const key of Object.keys(config)) {
                allKeys.add(key);
              }
            }

            for (const key of allKeys) {
              expect(result).toHaveProperty(key);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should skip unavailable loaders', async () => {
      await fc.assert(
        fc.asyncProperty(
          validConfigKey,
          configValue,
          configValue,
          async (sharedKey, availableValue, unavailableValue) => {
            // Skip if values are the same
            if (availableValue === unavailableValue) return;

            // Create one available and one unavailable loader
            const availableLoader = new MockLoader('AvailableLoader', { [sharedKey]: availableValue }, true);
            const unavailableLoader = new MockLoader('UnavailableLoader', { [sharedKey]: unavailableValue }, false);

            // Give unavailable loader higher priority
            const precedence: LoaderPrecedence[] = [
              { loader: 'AvailableLoader', priority: 1 },
              { loader: 'UnavailableLoader', priority: 2 },
            ];

            const manager = new ConfigManager({
              loaders: [availableLoader, unavailableLoader],
              precedence,
            });

            await manager.load();
            const result = manager.getAll();

            // Should use value from available loader, not unavailable one
            expect(result[sharedKey]).toBe(availableValue);
          }
        ),
        { numRuns: 100 }
      );
    });
  });


  /**
   * **Feature: package-extraction, Property 1: Configuration Serialization Round-Trip**
   * **Validates: Requirements 1.6, 1.7**
   *
   * For any valid configuration object T, serializing to JSON and deserializing
   * back SHALL produce an object equal to the original.
   */
  describe('Property 1: Configuration Serialization Round-Trip', () => {
    it('should produce equal configuration after serialize/deserialize', async () => {
      await fc.assert(
        fc.asyncProperty(
          configObject,
          async (config) => {
            // Create a loader with the config
            const loader = new MockLoader('TestLoader', config);

            const manager = new ConfigManager({
              loaders: [loader],
            });

            await manager.load();

            // Serialize
            const serialized = manager.serialize();

            // Deserialize into a new manager
            const restoredManager = ConfigManager.deserialize(serialized);

            // Get both configs
            const original = manager.getAll();
            const restored = restoredManager.getAll();

            // They should be deeply equal
            expect(restored).toEqual(original);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should produce valid JSON when serializing', async () => {
      await fc.assert(
        fc.asyncProperty(
          configObject,
          async (config) => {
            const loader = new MockLoader('TestLoader', config);

            const manager = new ConfigManager({
              loaders: [loader],
            });

            await manager.load();

            const serialized = manager.serialize();

            // Should be valid JSON
            expect(() => JSON.parse(serialized)).not.toThrow();

            // Parsed JSON should match original config
            const parsed = JSON.parse(serialized);
            expect(parsed).toEqual(config);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should restore configuration that can be accessed via get()', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate config with at least one key
          fc.dictionary(validConfigKey, configValue, { minKeys: 1, maxKeys: 5 }),
          async (config) => {
            const loader = new MockLoader('TestLoader', config);

            const manager = new ConfigManager({
              loaders: [loader],
            });

            await manager.load();

            const serialized = manager.serialize();
            const restoredManager = ConfigManager.deserialize(serialized);

            // Each key should be accessible via get()
            for (const [key, value] of Object.entries(config)) {
              expect(restoredManager.get(key as keyof typeof config)).toBe(value);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should mark restored manager as loaded', async () => {
      await fc.assert(
        fc.asyncProperty(
          configObject,
          async (config) => {
            const loader = new MockLoader('TestLoader', config);

            const manager = new ConfigManager({
              loaders: [loader],
            });

            await manager.load();

            const serialized = manager.serialize();
            const restoredManager = ConfigManager.deserialize(serialized);

            expect(restoredManager.isLoaded()).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle nested objects in round-trip', async () => {
      // Test with nested objects (JSON-serializable)
      const nestedConfig = fc.dictionary(
        validConfigKey,
        fc.oneof(
          configValue,
          fc.dictionary(validConfigKey, configValue, { minKeys: 0, maxKeys: 3 })
        ),
        { minKeys: 0, maxKeys: 5 }
      );

      await fc.assert(
        fc.asyncProperty(
          nestedConfig,
          async (config) => {
            const loader = new MockLoader('TestLoader', config);

            const manager = new ConfigManager({
              loaders: [loader],
            });

            await manager.load();

            const serialized = manager.serialize();
            const restoredManager = ConfigManager.deserialize(serialized);

            expect(restoredManager.getAll()).toEqual(manager.getAll());
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
