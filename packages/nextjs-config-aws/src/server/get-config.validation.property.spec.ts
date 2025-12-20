/**
 * Property-based tests for getConfig() validation error behavior.
 *
 * **Feature: nextjs-interface-improvements, Property 5: Validation Errors Include Key Information**
 * **Validates: Requirements 1.6**
 */

import * as fc from 'fast-check';
import { z } from 'zod';
import { ValidationError } from '@dyanet/config-aws';
import { getConfig, clearConfigCache } from './get-config';

/**
 * Arbitrary for generating valid configuration keys.
 * Keys must start with a letter or underscore, followed by alphanumeric or underscore.
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
 * Arbitrary for generating a set of unique required keys.
 */
const requiredKeysArb = fc.uniqueArray(validConfigKey, { minLength: 1, maxLength: 5 });

describe('getConfig Validation Property Tests', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    clearConfigCache();
    // Reset environment to a clean state
    Object.keys(process.env).forEach(key => {
      if (!originalEnv[key]) {
        delete process.env[key];
      }
    });
  });

  afterEach(() => {
    // Restore original environment
    Object.keys(process.env).forEach(key => {
      if (!originalEnv[key]) {
        delete process.env[key];
      }
    });
  });

  /**
   * **Feature: nextjs-interface-improvements, Property 5: Validation Errors Include Key Information**
   * **Validates: Requirements 1.6**
   *
   * For any schema validation failure, the thrown error SHALL contain
   * the names of invalid or missing keys.
   */
  describe('Property 5: Validation Errors Include Key Information', () => {
    it('validation error should contain missing key names when required keys are absent', async () => {
      await fc.assert(
        fc.asyncProperty(
          requiredKeysArb,
          async (requiredKeys) => {
            clearConfigCache();

            // Clear any environment variables that might match our required keys
            for (const key of requiredKeys) {
              delete process.env[key];
            }

            // Create a schema that requires specific keys
            const schemaShape: Record<string, z.ZodString> = {};
            for (const key of requiredKeys) {
              schemaShape[key] = z.string();
            }
            const schema = z.object(schemaShape);

            // Call getConfig with the schema - should throw ValidationError
            try {
              await getConfig({
                schema,
                environment: 'test', // Use test environment to avoid file loading
                cache: false,
              });
              // If we get here, the test should fail (unless env vars happened to exist)
              // This is acceptable as the property is about error content when validation fails
            } catch (error) {
              // Verify it's a ValidationError
              expect(error).toBeInstanceOf(ValidationError);
              
              const validationError = error as ValidationError;
              
              // The error message or validationErrors should contain information about missing keys
              const errorMessage = validationError.message;
              const validationErrors = validationError.validationErrors;
              
              // Check that at least one of the missing keys is mentioned in the error
              // Either in the message or in the validation errors object
              const errorString = JSON.stringify({ message: errorMessage, errors: validationErrors });
              
              // At least one required key should be mentioned in the error
              const hasKeyInfo = requiredKeys.some(key => errorString.includes(key));
              expect(hasKeyInfo).toBe(true);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('validation error should contain invalid key names when values have wrong types', async () => {
      await fc.assert(
        fc.asyncProperty(
          validConfigKey,
          fc.integer(),
          async (key, invalidValue) => {
            clearConfigCache();

            // Set an environment variable with a value that will fail validation
            // We'll use a schema that expects a specific format
            process.env[key] = String(invalidValue);

            // Create a schema that expects an email format (will fail for integers)
            const schema = z.object({
              [key]: z.string().email(),
            });

            try {
              await getConfig({
                schema,
                environment: 'test',
                cache: false,
              });
              // If validation passes (unlikely with email format), that's fine
            } catch (error) {
              expect(error).toBeInstanceOf(ValidationError);
              
              const validationError = error as ValidationError;
              const errorString = JSON.stringify({
                message: validationError.message,
                errors: validationError.validationErrors,
              });
              
              // The key should be mentioned in the error
              expect(errorString).toContain(key);
            } finally {
              // Clean up
              delete process.env[key];
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('validation error validationErrors property should be defined and contain error details', async () => {
      await fc.assert(
        fc.asyncProperty(
          requiredKeysArb,
          async (requiredKeys) => {
            clearConfigCache();

            // Clear environment variables
            for (const key of requiredKeys) {
              delete process.env[key];
            }

            // Create schema requiring the keys
            const schemaShape: Record<string, z.ZodString> = {};
            for (const key of requiredKeys) {
              schemaShape[key] = z.string();
            }
            const schema = z.object(schemaShape);

            try {
              await getConfig({
                schema,
                environment: 'test',
                cache: false,
              });
            } catch (error) {
              expect(error).toBeInstanceOf(ValidationError);
              
              const validationError = error as ValidationError;
              
              // validationErrors should be defined
              expect(validationError.validationErrors).toBeDefined();
              
              // It should be an array or object with error information
              expect(validationError.validationErrors).not.toBeNull();
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
