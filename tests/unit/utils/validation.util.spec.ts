import { z, ZodError } from 'zod';
import { ConfigValidationUtil } from '../../../src/utils/validation.util';
import { ValidationError } from '../../../src/interfaces/errors.interface';

describe('ConfigValidationUtil', () => {
  const testSchema = z.object({
    name: z.string().min(1, 'Name is required'),
    age: z.number().min(0, 'Age must be non-negative'),
    email: z.string().email('Invalid email format'),
    optional: z.string().optional(),
  });

  const nestedSchema = z.object({
    user: z.object({
      profile: z.object({
        name: z.string(),
        settings: z.object({
          theme: z.enum(['light', 'dark']),
        }),
      }),
    }),
  });

  describe('validate', () => {
    it('should return validated data for valid input', () => {
      const validData = {
        name: 'John Doe',
        age: 30,
        email: 'john@example.com',
      };

      const result = ConfigValidationUtil.validate(testSchema, validData);

      expect(result).toEqual(validData);
    });

    it('should throw ValidationError for invalid input', () => {
      const invalidData = {
        name: '',
        age: -1,
        email: 'invalid-email',
      };

      expect(() => {
        ConfigValidationUtil.validate(testSchema, invalidData);
      }).toThrow(ValidationError);
    });

    it('should include context in error message when provided', () => {
      const invalidData = { name: '', age: -1 };

      expect(() => {
        ConfigValidationUtil.validate(testSchema, invalidData, 'test context');
      }).toThrow('Configuration validation failed for test context');
    });

    it('should handle single validation error at root level', () => {
      const simpleSchema = z.string().min(1, 'String cannot be empty');

      expect(() => {
        ConfigValidationUtil.validate(simpleSchema, '');
      }).toThrow(ValidationError);
    });

    it('should handle nested validation errors', () => {
      const invalidNestedData = {
        user: {
          profile: {
            name: '',
            settings: {
              theme: 'invalid-theme',
            },
          },
        },
      };

      expect(() => {
        ConfigValidationUtil.validate(nestedSchema, invalidNestedData);
      }).toThrow(ValidationError);
    });
  });

  describe('safeValidate', () => {
    it('should return success result for valid input', () => {
      const validData = {
        name: 'John Doe',
        age: 30,
        email: 'john@example.com',
      };

      const result = ConfigValidationUtil.safeValidate(testSchema, validData);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validData);
      }
    });

    it('should return error result for invalid input', () => {
      const invalidData = {
        name: '',
        age: -1,
        email: 'invalid-email',
      };

      const result = ConfigValidationUtil.safeValidate(testSchema, invalidData);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeInstanceOf(ValidationError);
        expect(result.error.message).toBe('Configuration validation failed');
      }
    });

    it('should not throw errors even for invalid input', () => {
      const invalidData = { completely: 'wrong' };

      expect(() => {
        ConfigValidationUtil.safeValidate(testSchema, invalidData);
      }).not.toThrow();
    });
  });

  describe('formatValidationErrors', () => {
    it('should return simple message for single root-level error', () => {
      const schema = z.string().min(1, 'String cannot be empty');
      const result = schema.safeParse('');

      if (!result.success) {
        const formatted = ConfigValidationUtil.formatValidationErrors(result.error);
        expect(formatted).toBe('String cannot be empty');
      }
    });

    it('should return structured object for multiple errors', () => {
      const invalidData = {
        name: '',
        age: -1,
        email: 'invalid-email',
      };

      const result = testSchema.safeParse(invalidData);

      if (!result.success) {
        const formatted = ConfigValidationUtil.formatValidationErrors(result.error);
        
        expect(formatted).toHaveProperty('name');
        expect(formatted).toHaveProperty('age');
        expect(formatted).toHaveProperty('email');
        
        expect(formatted.name[0]).toMatchObject({
          message: 'Name is required',
          code: 'too_small',
          path: ['name'],
        });
      }
    });

    it('should handle nested path errors correctly', () => {
      const invalidNestedData = {
        user: {
          profile: {
            settings: {
              theme: 'invalid-theme',
            },
          },
        },
      };

      const result = nestedSchema.safeParse(invalidNestedData);

      if (!result.success) {
        const formatted = ConfigValidationUtil.formatValidationErrors(result.error);
        
        // Should have errors for missing name and invalid theme
        expect(Object.keys(formatted)).toContain('user.profile.name');
        expect(Object.keys(formatted)).toContain('user.profile.settings.theme');
        
        // Verify the structure
        expect(formatted['user.profile.name']).toBeDefined();
        expect(formatted['user.profile.settings.theme']).toBeDefined();
        expect(formatted['user.profile.name'][0]).toMatchObject({
          message: 'Required',
          code: 'invalid_type',
          path: ['user', 'profile', 'name'],
        });
      }
    });
  });

  describe('createDetailedErrorMessage', () => {
    it('should create simple message for single error', () => {
      const schema = z.string().min(1, 'String cannot be empty');
      const result = schema.safeParse('');

      if (!result.success) {
        const message = ConfigValidationUtil.createDetailedErrorMessage(result.error);
        expect(message).toBe('String cannot be empty');
      }
    });

    it('should create detailed message for single error with path', () => {
      const invalidData = { name: '' };
      const result = testSchema.safeParse(invalidData);

      if (!result.success) {
        // Find the name error specifically
        const nameError = result.error.issues.find(issue => issue.path.includes('name'));
        if (nameError) {
          const singleIssueError = new ZodError([nameError]);
          const message = ConfigValidationUtil.createDetailedErrorMessage(singleIssueError);
          expect(message).toBe("Name is required at 'name'");
        }
      }
    });

    it('should create multi-line message for multiple errors', () => {
      const invalidData = {
        name: '',
        age: -1,
        email: 'invalid-email',
      };

      const result = testSchema.safeParse(invalidData);

      if (!result.success) {
        const message = ConfigValidationUtil.createDetailedErrorMessage(result.error);
        
        expect(message).toContain('Multiple validation errors:');
        expect(message).toContain('Name is required');
        expect(message).toContain('Age must be non-negative');
        expect(message).toContain('Invalid email format');
      }
    });

    it('should include context in error message', () => {
      const schema = z.string().min(1, 'String cannot be empty');
      const result = schema.safeParse('');

      if (!result.success) {
        const message = ConfigValidationUtil.createDetailedErrorMessage(result.error, 'Environment variables');
        expect(message).toBe('Environment variables: String cannot be empty');
      }
    });
  });

  describe('validateConfiguration', () => {
    it('should validate configuration with source context', () => {
      const validData = {
        name: 'John Doe',
        age: 30,
        email: 'john@example.com',
      };

      const result = ConfigValidationUtil.validateConfiguration(testSchema, validData, 'environment');

      expect(result).toEqual(validData);
    });

    it('should throw enhanced ValidationError with source information', () => {
      const invalidData = {
        name: '',
        age: -1,
        email: 'invalid-email',
      };

      expect(() => {
        ConfigValidationUtil.validateConfiguration(testSchema, invalidData, 'secrets-manager');
      }).toThrow("Configuration validation failed for source 'secrets-manager'");
    });

    it('should preserve original ValidationError properties', () => {
      const invalidData = { name: '' };

      try {
        ConfigValidationUtil.validateConfiguration(testSchema, invalidData, 'ssm');
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        if (error instanceof ValidationError) {
          expect(error.validationErrors).toBeDefined();
          expect(error.message).toContain("source 'ssm'");
        }
      }
    });

    it('should re-throw non-ValidationError errors unchanged', () => {
      const mockSchema = {
        safeParse: jest.fn().mockImplementation(() => {
          throw new Error('Unexpected error');
        }),
      } as any;

      expect(() => {
        ConfigValidationUtil.validateConfiguration(mockSchema, {}, 'test');
      }).toThrow('Unexpected error');
    });
  });

  describe('edge cases', () => {
    it('should handle undefined input', () => {
      expect(() => {
        ConfigValidationUtil.validate(testSchema, undefined);
      }).toThrow(ValidationError);
    });

    it('should handle null input', () => {
      expect(() => {
        ConfigValidationUtil.validate(testSchema, null);
      }).toThrow(ValidationError);
    });

    it('should handle empty object', () => {
      expect(() => {
        ConfigValidationUtil.validate(testSchema, {});
      }).toThrow(ValidationError);
    });

    it('should handle array input for object schema', () => {
      expect(() => {
        ConfigValidationUtil.validate(testSchema, []);
      }).toThrow(ValidationError);
    });

    it('should handle primitive input for object schema', () => {
      expect(() => {
        ConfigValidationUtil.validate(testSchema, 'string');
      }).toThrow(ValidationError);
    });
  });

  describe('type safety', () => {
    it('should return correctly typed data', () => {
      const validData = {
        name: 'John Doe',
        age: 30,
        email: 'john@example.com',
        optional: 'test',
      };

      const result = ConfigValidationUtil.validate(testSchema, validData);

      // TypeScript should infer the correct type
      expect(typeof result.name).toBe('string');
      expect(typeof result.age).toBe('number');
      expect(typeof result.email).toBe('string');
      expect(result.optional).toBe('test');
    });

    it('should handle optional fields correctly', () => {
      const validDataWithoutOptional = {
        name: 'John Doe',
        age: 30,
        email: 'john@example.com',
      };

      const result = ConfigValidationUtil.validate(testSchema, validDataWithoutOptional);

      expect(result.optional).toBeUndefined();
    });
  });
});