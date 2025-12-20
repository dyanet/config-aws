/**
 * Property-based tests for client-side env() function.
 *
 * **Feature: nextjs-interface-improvements, Property 7: Client env() Reads Injected Values**
 * **Validates: Requirements 4.2**
 */

import * as fc from 'fast-check';
import { env, envFrom, getAllEnv, hasEnv } from './env';

/**
 * Arbitrary for generating valid environment variable names.
 * Variable names must start with a letter or underscore, followed by
 * alphanumeric characters or underscores.
 */
const validEnvVarName = fc
  .tuple(
    fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_'.split('')),
    fc.stringOf(
      fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_'.split('')),
      { minLength: 0, maxLength: 20 }
    )
  )
  .map(([first, rest]) => first + rest);

/**
 * Arbitrary for generating environment variable values.
 * Values can be any string.
 */
const envVarValue = fc.string({ minLength: 0, maxLength: 100 });

/**
 * Arbitrary for generating an environment variables object.
 */
const envVarsObject = fc.dictionary(validEnvVarName, envVarValue, { minKeys: 1, maxKeys: 20 });

/**
 * Arbitrary for generating a valid JavaScript variable name for window property.
 */
const validWindowVarName = fc
  .tuple(
    fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_'.split('')),
    fc.stringOf(
      fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_'.split('')),
      { minLength: 0, maxLength: 15 }
    )
  )
  .map(([first, rest]) => `__${first}${rest}`);

describe('Client env() Property Tests', () => {
  // Store original window
  const originalWindow = global.window;

  afterEach(() => {
    // Restore original window after each test
    (global as any).window = originalWindow;
  });

  /**
   * **Feature: nextjs-interface-improvements, Property 7: Client env() Reads Injected Values**
   * **Validates: Requirements 4.2**
   *
   * For any key-value pair injected by PublicEnvScript, the env() function
   * SHALL return the correct value.
   *
   * Property definition from design:
   * ∀ key: string, value: string where window.__ENV[key] === value,
   *   env(key) === value
   */
  describe('Property 7: Client env() Reads Injected Values', () => {
    it('should return the correct value for any injected key-value pair', () => {
      fc.assert(
        fc.property(
          envVarsObject,
          validEnvVarName,
          (envVars, keyToCheck) => {
            // Setup: inject environment variables into window.__ENV
            (global as any).window = {
              __ENV: { ...envVars },
            };

            // If the key exists in envVars, env() should return its value
            if (keyToCheck in envVars) {
              expect(env(keyToCheck)).toBe(envVars[keyToCheck]);
            } else {
              // If key doesn't exist, env() should return undefined
              expect(env(keyToCheck)).toBeUndefined();
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return all injected values correctly via env()', () => {
      fc.assert(
        fc.property(
          envVarsObject,
          (envVars) => {
            // Setup: inject environment variables into window.__ENV
            (global as any).window = {
              __ENV: { ...envVars },
            };

            // Every key in envVars should be retrievable via env()
            for (const [key, value] of Object.entries(envVars)) {
              expect(env(key)).toBe(value);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return default value when key is not in injected values', () => {
      fc.assert(
        fc.property(
          envVarsObject,
          validEnvVarName,
          envVarValue,
          (envVars, missingKey, defaultValue) => {
            // Ensure missingKey is not in envVars
            const filteredEnvVars = { ...envVars };
            delete filteredEnvVars[missingKey];

            // Setup: inject environment variables into window.__ENV
            (global as any).window = {
              __ENV: filteredEnvVars,
            };

            // env() with default should return the default for missing keys
            expect(env(missingKey, defaultValue)).toBe(defaultValue);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return actual value over default when key exists', () => {
      fc.assert(
        fc.property(
          envVarsObject,
          envVarValue,
          (envVars, defaultValue) => {
            // Setup: inject environment variables into window.__ENV
            (global as any).window = {
              __ENV: { ...envVars },
            };

            // For every existing key, env() should return actual value, not default
            for (const [key, value] of Object.entries(envVars)) {
              expect(env(key, defaultValue)).toBe(value);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('envFrom() with custom variable names', () => {
    it('should read from custom variable name correctly', () => {
      fc.assert(
        fc.property(
          envVarsObject,
          validWindowVarName,
          (envVars, customVarName) => {
            // Setup: inject environment variables into custom window property
            (global as any).window = {
              [customVarName]: { ...envVars },
            };

            // Every key should be retrievable via envFrom()
            for (const [key, value] of Object.entries(envVars)) {
              expect(envFrom(customVarName, key)).toBe(value);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('getAllEnv() retrieval', () => {
    it('should return all injected values', () => {
      fc.assert(
        fc.property(
          envVarsObject,
          (envVars) => {
            // Setup: inject environment variables into window.__ENV
            (global as any).window = {
              __ENV: { ...envVars },
            };

            const allEnv = getAllEnv();

            // getAllEnv() should return all injected values
            expect(allEnv).toEqual(envVars);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return a copy, not the original object', () => {
      fc.assert(
        fc.property(
          envVarsObject,
          validEnvVarName,
          envVarValue,
          (envVars, newKey, newValue) => {
            // Setup: inject environment variables into window.__ENV
            (global as any).window = {
              __ENV: { ...envVars },
            };

            const allEnv = getAllEnv();

            // Modifying the returned object should not affect the original
            allEnv[newKey] = newValue;

            // Original should be unchanged
            if (!(newKey in envVars)) {
              expect(env(newKey)).toBeUndefined();
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('hasEnv() existence check', () => {
    it('should return true for all injected keys', () => {
      fc.assert(
        fc.property(
          envVarsObject,
          (envVars) => {
            // Setup: inject environment variables into window.__ENV
            (global as any).window = {
              __ENV: { ...envVars },
            };

            // hasEnv() should return true for all injected keys
            for (const key of Object.keys(envVars)) {
              expect(hasEnv(key)).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return false for non-injected keys', () => {
      fc.assert(
        fc.property(
          envVarsObject,
          validEnvVarName,
          (envVars, keyToCheck) => {
            // Setup: inject environment variables into window.__ENV
            (global as any).window = {
              __ENV: { ...envVars },
            };

            // hasEnv() should return false for keys not in envVars
            if (!(keyToCheck in envVars)) {
              expect(hasEnv(keyToCheck)).toBe(false);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
