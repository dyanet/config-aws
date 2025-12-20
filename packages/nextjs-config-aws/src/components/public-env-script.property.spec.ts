/**
 * Property-based tests for PublicEnvScript output correctness.
 *
 * **Feature: package-extraction, Property 8: PublicEnvScript Output Correctness**
 * **Validates: Requirements 7.2, 7.5, 7.6**
 *
 * **Feature: nextjs-interface-improvements, Property 6: PublicEnvScript Allowlist Filtering**
 * **Validates: Requirements 4.3, 4.4, 4.5**
 */

import * as fc from 'fast-check';
import { filterEnvVars, generateScriptContent } from './public-env-script';

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
const envVarsObject = fc.dictionary(validEnvVarName, envVarValue, { minKeys: 0, maxKeys: 20 });

/**
 * Arbitrary for generating a valid JavaScript variable name.
 */
const validJsVarName = fc
  .tuple(
    fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_$'.split('')),
    fc.stringOf(
      fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_$'.split('')),
      { minLength: 0, maxLength: 15 }
    )
  )
  .map(([first, rest]) => first + rest);

/**
 * Arbitrary for generating a prefix string.
 */
const prefixString = fc
  .stringOf(
    fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZ_'.split('')),
    { minLength: 1, maxLength: 10 }
  );

describe('PublicEnvScript Property Tests', () => {
  /**
   * **Feature: package-extraction, Property 8: PublicEnvScript Output Correctness**
   * **Validates: Requirements 7.2, 7.5, 7.6**
   *
   * For any set of environment variables V, allowlist A, and variable name N,
   * the rendered script SHALL:
   * - Contain only variables in the allowlist (or matching prefix)
   * - Use the specified variable name
   * - Produce valid JSON
   */
  describe('Property 8: PublicEnvScript Output Correctness', () => {
    describe('filterEnvVars with allowlist', () => {
      it('should only include variables that are in the allowlist', () => {
        fc.assert(
          fc.property(
            envVarsObject,
            fc.array(validEnvVarName, { minLength: 0, maxLength: 10 }),
            (env, allowlist) => {
              const result = filterEnvVars(env, allowlist);

              // All keys in result must be in the allowlist
              for (const key of Object.keys(result)) {
                expect(allowlist).toContain(key);
              }

              // All keys in result must exist in the original env
              for (const key of Object.keys(result)) {
                expect(env[key]).toBeDefined();
              }
            }
          ),
          { numRuns: 100 }
        );
      });

      it('should include all allowlisted variables that exist in env', () => {
        fc.assert(
          fc.property(
            envVarsObject,
            fc.array(validEnvVarName, { minLength: 0, maxLength: 10 }),
            (env, allowlist) => {
              const result = filterEnvVars(env, allowlist);

              // All allowlisted keys that exist in env should be in result
              for (const key of allowlist) {
                if (env[key] !== undefined) {
                  expect(result[key]).toBe(env[key]);
                }
              }
            }
          ),
          { numRuns: 100 }
        );
      });

      it('should preserve original values for allowlisted variables', () => {
        fc.assert(
          fc.property(
            envVarsObject,
            fc.array(validEnvVarName, { minLength: 0, maxLength: 10 }),
            (env, allowlist) => {
              const result = filterEnvVars(env, allowlist);

              // Values should match the original
              for (const [key, value] of Object.entries(result)) {
                expect(value).toBe(env[key]);
              }
            }
          ),
          { numRuns: 100 }
        );
      });
    });

    describe('filterEnvVars with prefix', () => {
      it('should only include variables that start with the prefix', () => {
        fc.assert(
          fc.property(
            envVarsObject,
            prefixString,
            (env, prefix) => {
              const result = filterEnvVars(env, undefined, prefix);

              // All keys in result must start with the prefix
              for (const key of Object.keys(result)) {
                expect(key.startsWith(prefix)).toBe(true);
              }
            }
          ),
          { numRuns: 100 }
        );
      });

      it('should include all variables that start with the prefix', () => {
        fc.assert(
          fc.property(
            envVarsObject,
            prefixString,
            (env, prefix) => {
              const result = filterEnvVars(env, undefined, prefix);

              // All env keys starting with prefix should be in result
              for (const [key, value] of Object.entries(env)) {
                if (key.startsWith(prefix) && value !== undefined) {
                  expect(result[key]).toBe(value);
                }
              }
            }
          ),
          { numRuns: 100 }
        );
      });

      it('should not include variables that do not start with the prefix', () => {
        fc.assert(
          fc.property(
            envVarsObject,
            prefixString,
            (env, prefix) => {
              const result = filterEnvVars(env, undefined, prefix);

              // No keys in result should NOT start with prefix
              for (const key of Object.keys(result)) {
                expect(key.startsWith(prefix)).toBe(true);
              }

              // Keys not starting with prefix should not be in result
              for (const key of Object.keys(env)) {
                if (!key.startsWith(prefix)) {
                  expect(result[key]).toBeUndefined();
                }
              }
            }
          ),
          { numRuns: 100 }
        );
      });
    });

    describe('filterEnvVars with no filter', () => {
      it('should return empty object when no allowlist or prefix is provided', () => {
        fc.assert(
          fc.property(
            envVarsObject,
            (env) => {
              const result = filterEnvVars(env);

              // Should return empty object for safety
              expect(Object.keys(result).length).toBe(0);
            }
          ),
          { numRuns: 100 }
        );
      });
    });

    describe('generateScriptContent', () => {
      it('should use the specified variable name', () => {
        fc.assert(
          fc.property(
            envVarsObject,
            validJsVarName,
            (env, varName) => {
              const script = generateScriptContent(env, varName);

              // Script should contain window.{varName}=
              expect(script).toContain(`window.${varName}=`);
            }
          ),
          { numRuns: 100 }
        );
      });

      it('should produce valid JSON in the script', () => {
        fc.assert(
          fc.property(
            envVarsObject,
            validJsVarName,
            (env, varName) => {
              const script = generateScriptContent(env, varName);

              // Extract the JSON part from the script
              const prefix = `window.${varName}=`;
              expect(script.startsWith(prefix)).toBe(true);

              const jsonPart = script.slice(prefix.length, -1); // Remove trailing semicolon

              // Should be valid JSON
              expect(() => JSON.parse(jsonPart)).not.toThrow();

              // Parsed JSON should equal original env
              const parsed = JSON.parse(jsonPart);
              expect(parsed).toEqual(env);
            }
          ),
          { numRuns: 100 }
        );
      });

      it('should produce script that ends with semicolon', () => {
        fc.assert(
          fc.property(
            envVarsObject,
            validJsVarName,
            (env, varName) => {
              const script = generateScriptContent(env, varName);

              expect(script.endsWith(';')).toBe(true);
            }
          ),
          { numRuns: 100 }
        );
      });

      it('should handle special characters in values correctly', () => {
        fc.assert(
          fc.property(
            // Generate env with potentially problematic characters
            fc.dictionary(
              validEnvVarName,
              fc.oneof(
                fc.string(),
                fc.constant('<script>alert("xss")</script>'),
                fc.constant('value with "quotes"'),
                fc.constant("value with 'single quotes'"),
                fc.constant('value\nwith\nnewlines'),
                fc.constant('value\twith\ttabs'),
                fc.constant('value\\with\\backslashes')
              ),
              { minKeys: 1, maxKeys: 5 }
            ),
            validJsVarName,
            (env, varName) => {
              const script = generateScriptContent(env, varName);

              // Extract and parse JSON
              const prefix = `window.${varName}=`;
              const jsonPart = script.slice(prefix.length, -1);

              // Should still be valid JSON
              expect(() => JSON.parse(jsonPart)).not.toThrow();

              // Values should be preserved exactly
              const parsed = JSON.parse(jsonPart);
              expect(parsed).toEqual(env);
            }
          ),
          { numRuns: 100 }
        );
      });
    });

    describe('End-to-end filtering and script generation', () => {
      it('should produce correct script with allowlist filtering', () => {
        fc.assert(
          fc.property(
            envVarsObject,
            fc.array(validEnvVarName, { minLength: 0, maxLength: 10 }),
            validJsVarName,
            (env, allowlist, varName) => {
              const filtered = filterEnvVars(env, allowlist);
              const script = generateScriptContent(filtered, varName);

              // Parse the script
              const prefix = `window.${varName}=`;
              const jsonPart = script.slice(prefix.length, -1);
              const parsed = JSON.parse(jsonPart);

              // All keys in parsed should be in allowlist
              for (const key of Object.keys(parsed)) {
                expect(allowlist).toContain(key);
              }

              // All values should match original env
              for (const [key, value] of Object.entries(parsed)) {
                expect(value).toBe(env[key]);
              }
            }
          ),
          { numRuns: 100 }
        );
      });

      it('should produce correct script with prefix filtering', () => {
        fc.assert(
          fc.property(
            envVarsObject,
            prefixString,
            validJsVarName,
            (env, prefix, varName) => {
              const filtered = filterEnvVars(env, undefined, prefix);
              const script = generateScriptContent(filtered, varName);

              // Parse the script
              const scriptPrefix = `window.${varName}=`;
              const jsonPart = script.slice(scriptPrefix.length, -1);
              const parsed = JSON.parse(jsonPart);

              // All keys in parsed should start with prefix
              for (const key of Object.keys(parsed)) {
                expect(key.startsWith(prefix)).toBe(true);
              }

              // All values should match original env
              for (const [key, value] of Object.entries(parsed)) {
                expect(value).toBe(env[key]);
              }
            }
          ),
          { numRuns: 100 }
        );
      });
    });
  });

  /**
   * **Feature: nextjs-interface-improvements, Property 6: PublicEnvScript Allowlist Filtering**
   * **Validates: Requirements 4.3, 4.4, 4.5**
   *
   * For any set of environment variables and allowlist (publicVars or publicPrefix),
   * the rendered script SHALL contain only allowed variables.
   *
   * Property definition from design:
   * ∀ envVars: Record<string, string>, allowlist: string[] | prefix: string,
   *   rendered = PublicEnvScript({ publicVars: allowlist })
   *   ∧ ∀ key in parsed(rendered): key ∈ allowlist OR key.startsWith(prefix)
   *   ∧ ∀ key ∉ allowlist AND !key.startsWith(prefix): key ∉ parsed(rendered)
   */
  describe('Property 6: PublicEnvScript Allowlist Filtering', () => {
    it('should only expose variables in publicVars allowlist', () => {
      fc.assert(
        fc.property(
          envVarsObject,
          fc.array(validEnvVarName, { minLength: 1, maxLength: 10 }),
          (env, allowlist) => {
            const result = filterEnvVars(env, allowlist);

            // All keys in result must be in the allowlist (Requirement 4.3)
            for (const key of Object.keys(result)) {
              expect(allowlist).toContain(key);
            }

            // Non-allowlisted variables must NOT be in result (Requirement 4.5)
            for (const key of Object.keys(env)) {
              if (!allowlist.includes(key)) {
                expect(result[key]).toBeUndefined();
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should only expose variables matching publicPrefix', () => {
      fc.assert(
        fc.property(
          envVarsObject,
          prefixString,
          (env, prefix) => {
            const result = filterEnvVars(env, undefined, prefix);

            // All keys in result must start with prefix (Requirement 4.4)
            for (const key of Object.keys(result)) {
              expect(key.startsWith(prefix)).toBe(true);
            }

            // Variables not matching prefix must NOT be in result (Requirement 4.5)
            for (const key of Object.keys(env)) {
              if (!key.startsWith(prefix)) {
                expect(result[key]).toBeUndefined();
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should not expose any variables when neither publicVars nor publicPrefix is provided', () => {
      fc.assert(
        fc.property(
          envVarsObject,
          (env) => {
            const result = filterEnvVars(env);

            // No variables should be exposed (safe default per Requirement 4.5)
            expect(Object.keys(result).length).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should give publicVars precedence over publicPrefix when both are provided', () => {
      fc.assert(
        fc.property(
          envVarsObject,
          fc.array(validEnvVarName, { minLength: 1, maxLength: 5 }),
          prefixString,
          (env, allowlist, prefix) => {
            // When both are provided, publicVars takes precedence
            const result = filterEnvVars(env, allowlist, prefix);

            // Result should only contain allowlisted keys, not prefix-matched keys
            for (const key of Object.keys(result)) {
              expect(allowlist).toContain(key);
            }

            // Keys matching prefix but not in allowlist should NOT be included
            for (const key of Object.keys(env)) {
              if (key.startsWith(prefix) && !allowlist.includes(key)) {
                expect(result[key]).toBeUndefined();
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
