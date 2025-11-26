/**
 * Property-based tests for error class hierarchy
 *
 * **Feature: package-extraction, Property: Error classes maintain proper inheritance chain**
 * **Validates: Requirements 1.2**
 */

import * as fc from 'fast-check';
import {
  ConfigurationError,
  ValidationError,
  AWSServiceError,
  ConfigurationLoadError,
  MissingConfigurationError,
} from './index';

describe('Error Class Hierarchy Property Tests', () => {
  /**
   * **Feature: package-extraction, Property: Error classes maintain proper inheritance chain**
   * **Validates: Requirements 1.2**
   *
   * Property: For any error class in the hierarchy, it should:
   * 1. Be an instance of Error
   * 2. Be an instance of ConfigurationError (for all derived classes)
   * 3. Have the correct name property
   * 4. Preserve the message and cause
   */
  describe('ConfigurationError', () => {
    it('should be an instance of Error for any message', () => {
      fc.assert(
        fc.property(fc.string(), (message) => {
          const error = new ConfigurationError(message);
          expect(error).toBeInstanceOf(Error);
          expect(error).toBeInstanceOf(ConfigurationError);
          expect(error.name).toBe('ConfigurationError');
          expect(error.message).toBe(message);
        }),
        { numRuns: 100 }
      );
    });

    it('should preserve cause when provided', () => {
      fc.assert(
        fc.property(fc.string(), fc.string(), (message, causeMessage) => {
          const cause = new Error(causeMessage);
          const error = new ConfigurationError(message, cause);
          expect(error.cause).toBe(cause);
          expect(error.cause?.message).toBe(causeMessage);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('ValidationError', () => {
    it('should extend ConfigurationError for any message and validation errors', () => {
      fc.assert(
        fc.property(
          fc.string(),
          fc.anything(),
          (message, validationErrors) => {
            const error = new ValidationError(message, validationErrors);
            expect(error).toBeInstanceOf(Error);
            expect(error).toBeInstanceOf(ConfigurationError);
            expect(error).toBeInstanceOf(ValidationError);
            expect(error.name).toBe('ValidationError');
            expect(error.message).toBe(message);
            expect(error.validationErrors).toBe(validationErrors);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('AWSServiceError', () => {
    it('should extend ConfigurationError for any service and operation', () => {
      fc.assert(
        fc.property(
          fc.string(),
          fc.string({ minLength: 1 }),
          fc.string({ minLength: 1 }),
          (message, service, operation) => {
            const error = new AWSServiceError(message, service, operation);
            expect(error).toBeInstanceOf(Error);
            expect(error).toBeInstanceOf(ConfigurationError);
            expect(error).toBeInstanceOf(AWSServiceError);
            expect(error.name).toBe('AWSServiceError');
            expect(error.message).toBe(message);
            expect(error.service).toBe(service);
            expect(error.operation).toBe(operation);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('ConfigurationLoadError', () => {
    it('should extend ConfigurationError for any loader name', () => {
      fc.assert(
        fc.property(
          fc.string(),
          fc.string({ minLength: 1 }),
          (message, loader) => {
            const error = new ConfigurationLoadError(message, loader);
            expect(error).toBeInstanceOf(Error);
            expect(error).toBeInstanceOf(ConfigurationError);
            expect(error).toBeInstanceOf(ConfigurationLoadError);
            expect(error.name).toBe('ConfigurationLoadError');
            expect(error.message).toBe(message);
            expect(error.loader).toBe(loader);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('MissingConfigurationError', () => {
    it('should extend ConfigurationError for any missing keys', () => {
      fc.assert(
        fc.property(
          fc.string(),
          fc.array(fc.string({ minLength: 1 }), { minLength: 1 }),
          (message, missingKeys) => {
            const error = new MissingConfigurationError(message, missingKeys);
            expect(error).toBeInstanceOf(Error);
            expect(error).toBeInstanceOf(ConfigurationError);
            expect(error).toBeInstanceOf(MissingConfigurationError);
            expect(error.name).toBe('MissingConfigurationError');
            expect(error.message).toBe(message);
            expect(error.missingKeys).toEqual(missingKeys);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Inheritance chain consistency', () => {
    it('all error types should maintain proper prototype chain', () => {
      fc.assert(
        fc.property(fc.string(), (message) => {
          const errors = [
            new ConfigurationError(message),
            new ValidationError(message, {}),
            new AWSServiceError(message, 'service', 'operation'),
            new ConfigurationLoadError(message, 'loader'),
            new MissingConfigurationError(message, ['key']),
          ];

          for (const error of errors) {
            // All should be Error instances
            expect(error).toBeInstanceOf(Error);
            // All should be ConfigurationError instances
            expect(error).toBeInstanceOf(ConfigurationError);
            // All should have a name property
            expect(typeof error.name).toBe('string');
            expect(error.name.length).toBeGreaterThan(0);
            // All should have the message
            expect(error.message).toBe(message);
          }
        }),
        { numRuns: 100 }
      );
    });
  });
});
