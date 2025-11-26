/**
 * Property-based tests for EnvironmentLoader prefix filtering.
 *
 * **Feature: package-extraction, Property 4: Environment Loader Prefix Filtering**
 * **Validates: Requirements 1.10**
 */

import * as fc from 'fast-check';
import { EnvironmentLoader } from './environment.loader';

/**
 * Arbitrary for generating valid environment variable names.
 * Must start with letter or underscore, followed by alphanumeric or underscore.
 */
const validEnvVarName = fc
  .tuple(
    fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_'.split('')),
    fc.stringOf(
      fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_'.split('')),
      { minLength: 0, maxLength: 20 },
    ),
  )
  .map(([first, rest]) => first + rest);

/**
 * Arbitrary for generating valid prefixes (ending with underscore for clarity).
 */
const validPrefix = fc
  .tuple(
    fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')),
    fc.stringOf(
      fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.split('')),
      { minLength: 0, maxLength: 10 },
    ),
  )
  .map(([first, rest]) => first + rest + '_');

/**
 * Arbitrary for generating environment variable values.
 */
const envValue = fc.string({ minLength: 0, maxLength: 100 });

/**
 * Arbitrary for generating a map of environment variables.
 */
const envVarMap = fc.dictionary(validEnvVarName, envValue, { minKeys: 0, maxKeys: 20 });

describe('EnvironmentLoader Property Tests', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };
    // Clear process.env for isolated testing
    for (const key of Object.keys(process.env)) {
      delete process.env[key];
    }
  });

  afterEach(() => {
    // Restore original environment
    for (const key of Object.keys(process.env)) {
      delete process.env[key];
    }
    Object.assign(process.env, originalEnv);
  });

  /**
   * Helper to clean up process.env
   */
  const cleanupEnv = () => {
    for (const key of Object.keys(process.env)) {
      delete process.env[key];
    }
  };

  /**
   * **Feature: package-extraction, Property 4: Environment Loader Prefix Filtering**
   * **Validates: Requirements 1.10**
   */
  describe('Property 4: Environment Loader Prefix Filtering', () => {
    it('should return only keys starting with prefix, with prefix stripped', async () => {
      await fc.assert(
        fc.asyncProperty(validPrefix, envVarMap, async (prefix, envVars) => {
          cleanupEnv();

          // On Windows, env var names are case-insensitive, so normalize to uppercase
          // to avoid collisions like 't' and 'T' being the same variable
          const normalizedEnvVars: Record<string, string> = {};
          for (const [key, value] of Object.entries(envVars)) {
            const upperKey = key.toUpperCase();
            normalizedEnvVars[upperKey] = value;
          }

          // Set up environment with both prefixed and non-prefixed variables
          const prefixedVars: Record<string, string> = {};
          const nonPrefixedVars: Record<string, string> = {};

          for (const [key, value] of Object.entries(normalizedEnvVars)) {
            // Add some variables with the prefix
            const prefixedKey = prefix + key;
            process.env[prefixedKey] = value;
            prefixedVars[key] = value; // Store with stripped key

            // Add the original key without prefix (if it doesn't start with prefix)
            if (!key.startsWith(prefix)) {
              process.env[key] = value + '_original';
              nonPrefixedVars[key] = value + '_original';
            }
          }

          const loader = new EnvironmentLoader({ prefix });
          const result = await loader.load();

          // Property 1: All returned keys should be stripped versions of prefixed keys
          for (const key of Object.keys(result)) {
            expect(prefixedVars).toHaveProperty(key);
          }

          // Property 2: All prefixed keys should be in the result (with prefix stripped)
          for (const [strippedKey, value] of Object.entries(prefixedVars)) {
            expect(result[strippedKey]).toBe(value);
          }

          // Property 3: No non-prefixed keys should be in the result
          for (const key of Object.keys(nonPrefixedVars)) {
            // The key in result should come from the prefixed version, not the non-prefixed
            if (result[key] !== undefined) {
              expect(result[key]).toBe(prefixedVars[key]);
            }
          }
        }),
        { numRuns: 100 },
      );
    });

    it('should return empty object when no keys match prefix', async () => {
      await fc.assert(
        fc.asyncProperty(validPrefix, envVarMap, async (prefix, envVars) => {
          cleanupEnv();

          // Set up environment with only non-prefixed variables
          for (const [key, value] of Object.entries(envVars)) {
            // Ensure key doesn't start with prefix
            if (!key.startsWith(prefix)) {
              process.env[key] = value;
            }
          }

          const loader = new EnvironmentLoader({ prefix });
          const result = await loader.load();

          // No keys should match
          expect(Object.keys(result)).toHaveLength(0);
        }),
        { numRuns: 100 },
      );
    });

    it('should not include keys that exactly match prefix (empty suffix)', async () => {
      await fc.assert(
        fc.asyncProperty(validPrefix, envValue, async (prefix, value) => {
          cleanupEnv();

          // Set a key that exactly matches the prefix (no suffix)
          process.env[prefix.slice(0, -1)] = value; // Remove trailing underscore to test edge case
          process.env[prefix] = value; // Key is exactly the prefix

          const loader = new EnvironmentLoader({ prefix });
          const result = await loader.load();

          // Empty key (from exact prefix match) should not be included
          expect(result['']).toBeUndefined();
        }),
        { numRuns: 100 },
      );
    });
  });

  describe('Exclusion list filtering', () => {
    it('should exclude specified keys from result', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(validEnvVarName, { minLength: 1, maxLength: 10 }),
          envValue,
          async (keys, value) => {
            cleanupEnv();

            // Ensure unique keys
            const uniqueKeys = [...new Set(keys)];
            if (uniqueKeys.length < 2) return; // Need at least 2 keys for meaningful test

            // Set up environment
            for (const key of uniqueKeys) {
              process.env[key] = value;
            }

            // Exclude some keys
            const keysToExclude = uniqueKeys.slice(0, Math.ceil(uniqueKeys.length / 2));
            const keysToInclude = uniqueKeys.slice(Math.ceil(uniqueKeys.length / 2));

            const loader = new EnvironmentLoader({ exclude: keysToExclude });
            const result = await loader.load();

            // Excluded keys should not be in result
            for (const key of keysToExclude) {
              expect(result[key]).toBeUndefined();
            }

            // Non-excluded keys should be in result
            for (const key of keysToInclude) {
              expect(result[key]).toBe(value);
            }
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should apply exclusion to original key names (before prefix stripping)', async () => {
      await fc.assert(
        fc.asyncProperty(validPrefix, validEnvVarName, envValue, async (prefix, key, value) => {
          cleanupEnv();

          const prefixedKey = prefix + key;
          process.env[prefixedKey] = value;

          // Exclude the prefixed key (original name)
          const loader = new EnvironmentLoader({ prefix, exclude: [prefixedKey] });
          const result = await loader.load();

          // The key should be excluded
          expect(result[key]).toBeUndefined();
        }),
        { numRuns: 100 },
      );
    });
  });

  describe('Combined prefix and exclusion', () => {
    it('should apply both prefix filtering and exclusion correctly', async () => {
      await fc.assert(
        fc.asyncProperty(
          validPrefix,
          fc.array(validEnvVarName, { minLength: 2, maxLength: 10 }),
          envValue,
          async (prefix, keys, value) => {
            cleanupEnv();

            const uniqueKeys = [...new Set(keys)];
            if (uniqueKeys.length < 2) return;

            // Set up prefixed environment variables
            for (const key of uniqueKeys) {
              process.env[prefix + key] = value;
            }

            // Exclude some prefixed keys
            const firstKey = uniqueKeys[0] as string;
            const keysToExclude = [prefix + firstKey];
            const loader = new EnvironmentLoader({ prefix, exclude: keysToExclude });
            const result = await loader.load();

            // First key should be excluded
            expect(result[firstKey]).toBeUndefined();

            // Other keys should be included (with prefix stripped)
            for (let i = 1; i < uniqueKeys.length; i++) {
              const key = uniqueKeys[i] as string;
              expect(result[key]).toBe(value);
            }
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe('No prefix (load all)', () => {
    it('should load all environment variables when no prefix specified', async () => {
      await fc.assert(
        fc.asyncProperty(envVarMap, async (envVars) => {
          cleanupEnv();

          // On Windows, env var names are case-insensitive, so normalize to uppercase
          // to avoid collisions like 's' and 'S' being the same variable
          const normalizedVars: Record<string, string> = {};
          for (const [key, value] of Object.entries(envVars)) {
            const upperKey = key.toUpperCase();
            normalizedVars[upperKey] = value;
          }

          // Set up environment with normalized keys
          for (const [key, value] of Object.entries(normalizedVars)) {
            process.env[key] = value;
          }

          const loader = new EnvironmentLoader();
          const result = await loader.load();

          // All variables should be loaded
          for (const [key, value] of Object.entries(normalizedVars)) {
            expect(result[key]).toBe(value);
          }
        }),
        { numRuns: 100 },
      );
    });
  });

  describe('Loader metadata', () => {
    it('should return correct loader name', () => {
      const loader = new EnvironmentLoader();
      expect(loader.getName()).toBe('EnvironmentLoader');
    });

    it('should always be available', async () => {
      const loader = new EnvironmentLoader();
      expect(await loader.isAvailable()).toBe(true);
    });
  });
});
