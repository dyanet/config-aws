import { z } from 'zod';
import { ConfigServiceImpl } from '../../../src/services/config.service';
import { ConfigLoader } from '../../../src/interfaces/config-loader.interface';
import { EnvironmentLoader } from '../../../src/loaders/environment.loader';
import { ConfigurationError, ValidationError } from '../../../src/interfaces/errors.interface';

// Mock NestJS Logger
const mockLoggerFunctions = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
};

jest.mock('@nestjs/common', () => ({
  Injectable: () => (target: any) => target,
  Logger: jest.fn().mockImplementation(() => mockLoggerFunctions),
}));

describe('Error Handling Edge Cases', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    
    // Set up test environment
    process.env['APP_ENV'] = 'local';
    
    // Clear all mocks
    jest.clearAllMocks();
    mockLoggerFunctions.log.mockClear();
    mockLoggerFunctions.error.mockClear();
    mockLoggerFunctions.warn.mockClear();
    mockLoggerFunctions.debug.mockClear();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('loader error scenarios', () => {
    it('should handle loader throwing synchronous errors', async () => {
      const errorLoader: ConfigLoader = {
        load: jest.fn().mockImplementation(() => {
          throw new Error('Synchronous loader error');
        }),
        getName: jest.fn().mockReturnValue('ErrorLoader'),
        isAvailable: jest.fn().mockResolvedValue(true),
      };

      const schema = z.object({
        TEST_VAR: z.string().optional(),
      });

      const configService = new ConfigServiceImpl({
        schema,
        loaders: [errorLoader],
      });

      await expect(configService.initialize()).rejects.toThrow(ConfigurationError);
      await expect(configService.initialize()).rejects.toThrow('Failed to initialize configuration service');
    });

    it('should handle loader throwing non-Error objects', async () => {
      const stringErrorLoader: ConfigLoader = {
        load: jest.fn().mockImplementation(() => {
          throw 'String error';
        }),
        getName: jest.fn().mockReturnValue('StringErrorLoader'),
        isAvailable: jest.fn().mockResolvedValue(true),
      };

      const schema = z.object({
        TEST_VAR: z.string().optional(),
      });

      const configService = new ConfigServiceImpl({
        schema,
        loaders: [stringErrorLoader],
      });

      await expect(configService.initialize()).rejects.toThrow(ConfigurationError);
    });

    it('should handle loader throwing null/undefined', async () => {
      const nullErrorLoader: ConfigLoader = {
        load: jest.fn().mockImplementation(() => {
          throw null;
        }),
        getName: jest.fn().mockReturnValue('NullErrorLoader'),
        isAvailable: jest.fn().mockResolvedValue(true),
      };

      const schema = z.object({
        TEST_VAR: z.string().optional(),
      });

      const configService = new ConfigServiceImpl({
        schema,
        loaders: [nullErrorLoader],
      });

      await expect(configService.initialize()).rejects.toThrow(ConfigurationError);
    });

    it('should handle loader returning invalid data types', async () => {
      const invalidDataLoader: ConfigLoader = {
        load: jest.fn().mockResolvedValue('not an object'),
        getName: jest.fn().mockReturnValue('InvalidDataLoader'),
        isAvailable: jest.fn().mockResolvedValue(true),
      };

      const schema = z.object({
        TEST_VAR: z.string(),
      });

      const configService = new ConfigServiceImpl({
        schema,
        loaders: [invalidDataLoader],
      });

      await expect(configService.initialize()).rejects.toThrow();
    });

    it('should handle loader returning null/undefined', async () => {
      const nullDataLoader: ConfigLoader = {
        load: jest.fn().mockResolvedValue(null),
        getName: jest.fn().mockReturnValue('NullDataLoader'),
        isAvailable: jest.fn().mockResolvedValue(true),
      };

      const schema = z.object({
        TEST_VAR: z.string().optional(),
      });

      const configService = new ConfigServiceImpl({
        schema,
        loaders: [nullDataLoader],
      });

      await expect(configService.initialize()).rejects.toThrow();
    });

    it('should handle loader isAvailable throwing errors', async () => {
      const availabilityErrorLoader: ConfigLoader = {
        load: jest.fn().mockResolvedValue({ TEST_VAR: 'value' }),
        getName: jest.fn().mockReturnValue('AvailabilityErrorLoader'),
        isAvailable: jest.fn().mockRejectedValue(new Error('Availability check failed')),
      };

      const schema = z.object({
        TEST_VAR: z.string().optional(),
      });

      const configService = new ConfigServiceImpl({
        schema,
        loaders: [availabilityErrorLoader],
      });

      // Should handle availability check errors gracefully
      await expect(configService.initialize()).rejects.toThrow(ConfigurationError);
    });

    it('should handle loader getName throwing errors', async () => {
      const nameErrorLoader: ConfigLoader = {
        load: jest.fn().mockResolvedValue({ TEST_VAR: 'value' }),
        getName: jest.fn().mockImplementation(() => {
          throw new Error('getName failed');
        }),
        isAvailable: jest.fn().mockResolvedValue(true),
      };

      const schema = z.object({
        TEST_VAR: z.string().optional(),
      });

      const configService = new ConfigServiceImpl({
        schema,
        loaders: [nameErrorLoader],
      });

      await expect(configService.initialize()).rejects.toThrow(ConfigurationError);
    });
  });

  describe('validation error scenarios', () => {
    it('should handle complex nested validation errors', async () => {
      process.env['NESTED_OBJECT'] = JSON.stringify({
        user: {
          profile: {
            name: '', // Invalid: too short
            age: -1,  // Invalid: negative
            email: 'invalid-email', // Invalid: not email format
          },
        },
      });

      const nestedSchema = z.object({
        NESTED_OBJECT: z.string().transform((str) => JSON.parse(str)).pipe(
          z.object({
            user: z.object({
              profile: z.object({
                name: z.string().min(1),
                age: z.number().min(0),
                email: z.string().email(),
              }),
            }),
          })
        ),
      }) as z.ZodType<any>;

      const configService = new ConfigServiceImpl({ 
        schema: nestedSchema,
        loaders: [new EnvironmentLoader()]
      });

      await expect(configService.initialize()).rejects.toThrow(ValidationError);
    });

    it('should handle circular reference in configuration data', async () => {
      const circularLoader: ConfigLoader = {
        load: jest.fn().mockImplementation(() => {
          const obj: any = { key: 'value' };
          obj.circular = obj; // Create circular reference
          return obj;
        }),
        getName: jest.fn().mockReturnValue('CircularLoader'),
        isAvailable: jest.fn().mockResolvedValue(true),
      };

      const schema = z.object({
        key: z.string(),
      });

      const configService = new ConfigServiceImpl({
        schema,
        loaders: [circularLoader],
      });

      // Should handle circular references gracefully
      await expect(configService.initialize()).rejects.toThrow();
    });

    it('should handle very large validation error messages', async () => {
      const largeSchema = z.object({
        LARGE_STRING: z.string().max(10, 'String is too long and exceeds the maximum allowed length of 10 characters. This error message is intentionally very long to test how the system handles large error messages that might cause memory or performance issues.'),
      });

      process.env['LARGE_STRING'] = 'a'.repeat(1000); // Much longer than allowed

      const configService = new ConfigServiceImpl({ schema: largeSchema });

      await expect(configService.initialize()).rejects.toThrow(ValidationError);
    });

    it('should handle validation with custom error messages containing special characters', async () => {
      const specialCharSchema = z.object({
        SPECIAL_VAR: z.string().min(1, 'Error with special chars: 🚀 "quotes" \'apostrophes\' <tags> & ampersands'),
      });

      process.env['SPECIAL_VAR'] = '';

      const configService = new ConfigServiceImpl({ schema: specialCharSchema });

      try {
        await configService.initialize();
        fail('Expected validation error');
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        if (error instanceof ValidationError) {
          expect(error.message).toContain('🚀');
          expect(error.message).toContain('"quotes"');
          expect(error.message).toContain('\'apostrophes\'');
        }
      }
    });
  });

  describe('configuration access error scenarios', () => {
    it('should handle accessing configuration before initialization', () => {
      const schema = z.object({
        TEST_VAR: z.string(),
      });

      const configService = new ConfigServiceImpl({ schema });

      expect(() => configService.get('TEST_VAR')).toThrow(ConfigurationError);
      expect(() => configService.get('TEST_VAR')).toThrow('not initialized');
    });

    it('should handle accessing non-existent configuration keys', async () => {
      process.env['EXISTING_VAR'] = 'value';

      const schema = z.object({
        EXISTING_VAR: z.string(),
      });

      const configService = new ConfigServiceImpl({ schema });
      await configService.initialize();

      // TypeScript should prevent this, but test runtime behavior
      const nonExistentKey = 'NON_EXISTENT_VAR' as any;
      const result = configService.get(nonExistentKey);
      
      expect(result).toBeUndefined();
    });

    it('should handle getAll() before initialization', () => {
      const schema = z.object({
        TEST_VAR: z.string(),
      });

      const configService = new ConfigServiceImpl({ schema });

      expect(() => configService.getAll()).toThrow(ConfigurationError);
      expect(() => configService.getAll()).toThrow('not initialized');
    });

    it('should handle multiple initialization attempts after failure', async () => {
      const failingLoader: ConfigLoader = {
        load: jest.fn().mockRejectedValue(new Error('Loader always fails')),
        getName: jest.fn().mockReturnValue('FailingLoader'),
        isAvailable: jest.fn().mockResolvedValue(true),
      };

      const schema = z.object({
        TEST_VAR: z.string(),
      });

      const configService = new ConfigServiceImpl({
        schema,
        loaders: [failingLoader],
      });

      // First initialization attempt should fail
      await expect(configService.initialize()).rejects.toThrow();
      expect(configService.isInitialized()).toBe(false);

      // Second initialization attempt should also fail
      await expect(configService.initialize()).rejects.toThrow();
      expect(configService.isInitialized()).toBe(false);

      // Configuration access should still fail
      expect(() => configService.get('TEST_VAR')).toThrow(ConfigurationError);
    });
  });

  describe('schema error scenarios', () => {
    it('should handle invalid schema objects', async () => {
      const invalidSchema = null as any;

      expect(() => {
        new ConfigServiceImpl({ schema: invalidSchema });
      }).toThrow();
    });

    it('should handle schema with conflicting transformations', async () => {
      process.env['TRANSFORM_VAR'] = 'not-a-number';

      const conflictingSchema = z.object({
        TRANSFORM_VAR: z.string()
          .transform((val) => parseInt(val, 10))
          .pipe(z.number())
          .transform((num) => num.toString())
          .pipe(z.string().email()), // This will fail since parsed number as string won't be email
      });

      const configService = new ConfigServiceImpl({ schema: conflictingSchema });

      await expect(configService.initialize()).rejects.toThrow();
    });

    it('should handle schema with recursive definitions', async () => {
      // Create a schema that references itself (not directly supported by Zod, but test edge case)
      const recursiveSchema: z.ZodType<any> = z.object({
        name: z.string(),
        children: z.array(z.lazy(() => recursiveSchema)).optional(),
      });

      process.env['RECURSIVE_DATA'] = JSON.stringify({
        name: 'root',
        children: [
          { name: 'child1' },
          { name: 'child2', children: [{ name: 'grandchild' }] },
        ],
      });

      const schema = z.object({
        RECURSIVE_DATA: z.string().transform(str => JSON.parse(str)).pipe(recursiveSchema),
      });

      const configService = new ConfigServiceImpl({ schema });

      // Should handle recursive schema validation
      await expect(configService.initialize()).resolves.not.toThrow();
    });
  });

  describe('memory and resource error scenarios', () => {
    it('should handle out-of-memory scenarios gracefully', async () => {
      // Create a loader that tries to allocate a lot of memory
      const memoryHogLoader: ConfigLoader = {
        load: jest.fn().mockImplementation(() => {
          const largeObject: Record<string, string> = {};
          
          // Try to create a very large object (but not so large it actually crashes the test)
          for (let i = 0; i < 100000; i++) {
            largeObject[`key_${i}`] = 'x'.repeat(1000);
          }
          
          return largeObject;
        }),
        getName: jest.fn().mockReturnValue('MemoryHogLoader'),
        isAvailable: jest.fn().mockResolvedValue(true),
      };

      const schema = z.object({}).catchall(z.string());

      const configService = new ConfigServiceImpl({
        schema,
        loaders: [memoryHogLoader],
      });

      // Should either succeed or fail gracefully without crashing
      try {
        await configService.initialize();
        // If it succeeds, verify it's working
        expect(configService.isInitialized()).toBe(true);
      } catch (error) {
        // If it fails, it should be a proper error
        expect(error).toBeInstanceOf(Error);
      }
    });

    it('should handle stack overflow in validation', async () => {
      // Create deeply nested data that might cause stack overflow
      let deepObject: any = { value: 'deep' };
      for (let i = 0; i < 1000; i++) {
        deepObject = { nested: deepObject };
      }

      const deepLoader: ConfigLoader = {
        load: jest.fn().mockResolvedValue({ DEEP_OBJECT: JSON.stringify(deepObject) }),
        getName: jest.fn().mockReturnValue('DeepLoader'),
        isAvailable: jest.fn().mockResolvedValue(true),
      };

      // Create a schema that tries to validate the deep structure
      const createDeepSchema = (depth: number): z.ZodType<any> => {
        if (depth <= 0) {
          return z.object({ value: z.string() });
        }
        return z.object({ nested: createDeepSchema(depth - 1) });
      };

      const schema = z.object({
        DEEP_OBJECT: z.string().transform(str => JSON.parse(str)).pipe(createDeepSchema(100)),
      });

      const configService = new ConfigServiceImpl({
        schema,
        loaders: [deepLoader],
      });

      // Should handle deep validation without stack overflow
      try {
        await configService.initialize();
        expect(configService.isInitialized()).toBe(true);
      } catch (error) {
        // If it fails due to stack limits, it should be handled gracefully
        expect(error).toBeInstanceOf(Error);
      }
    });
  });

  describe('concurrent error scenarios', () => {
    it('should handle concurrent initialization attempts with failures', async () => {
      let callCount = 0;
      const intermittentLoader: ConfigLoader = {
        load: jest.fn().mockImplementation(() => {
          callCount++;
          if (callCount % 2 === 0) {
            throw new Error(`Intermittent failure ${callCount}`);
          }
          return { TEST_VAR: `value_${callCount}` };
        }),
        getName: jest.fn().mockReturnValue('IntermittentLoader'),
        isAvailable: jest.fn().mockResolvedValue(true),
      };

      const schema = z.object({
        TEST_VAR: z.string(),
      });

      const configService = new ConfigServiceImpl({
        schema,
        loaders: [intermittentLoader],
      });

      // Start multiple concurrent initialization attempts
      const promises = Array.from({ length: 10 }, () => configService.initialize());

      // Some should succeed, some should fail, but it should be handled consistently
      const results = await Promise.allSettled(promises);

      // All results should be either fulfilled or rejected, not hanging
      expect(results).toHaveLength(10);
      
      // At least one should have succeeded (the first call)
      const successCount = results.filter(r => r.status === 'fulfilled').length;
      expect(successCount).toBeGreaterThan(0);
    });

    it('should handle race conditions in configuration access', async () => {
      process.env['RACE_VAR'] = 'race-value';

      const schema = z.object({
        RACE_VAR: z.string(),
      });

      const configService = new ConfigServiceImpl({ schema });

      // Start initialization
      const initPromise = configService.initialize();

      // Immediately try to access configuration (before init completes)
      const accessPromises = Array.from({ length: 100 }, () => 
        new Promise((resolve) => {
          try {
            const value = configService.get('RACE_VAR');
            resolve({ success: true, value });
          } catch (error) {
            resolve({ success: false, error: (error as Error).message });
          }
        })
      );

      // Wait for initialization to complete
      await initPromise;

      // Wait for all access attempts
      const accessResults = await Promise.all(accessPromises);

      // After initialization, all subsequent accesses should succeed
      const finalValue = configService.get('RACE_VAR');
      expect(finalValue).toBe('race-value');

      // Most access attempts should have failed (before init), but some might succeed
      const failedAccesses = accessResults.filter((r: any) => !r.success);
      expect(failedAccesses.length).toBeGreaterThan(0);
    });
  });

  describe('error message formatting edge cases', () => {
    it('should handle error messages with null/undefined values', async () => {
      const nullMessageLoader: ConfigLoader = {
        load: jest.fn().mockRejectedValue(new Error()),
        getName: jest.fn().mockReturnValue('NullMessageLoader'),
        isAvailable: jest.fn().mockResolvedValue(true),
      };

      const schema = z.object({
        TEST_VAR: z.string().optional(),
      });

      const configService = new ConfigServiceImpl({
        schema,
        loaders: [nullMessageLoader],
      });

      try {
        await configService.initialize();
        fail('Expected error');
      } catch (error) {
        expect(error).toBeInstanceOf(ConfigurationError);
        expect((error as Error).message).toBeDefined();
        expect(typeof (error as Error).message).toBe('string');
      }
    });

    it('should handle very long error messages', async () => {
      const longMessage = 'Error message that is extremely long and contains a lot of text to test how the system handles very long error messages that might cause issues with logging or display. '.repeat(100);
      
      const longErrorLoader: ConfigLoader = {
        load: jest.fn().mockRejectedValue(new Error(longMessage)),
        getName: jest.fn().mockReturnValue('LongErrorLoader'),
        isAvailable: jest.fn().mockResolvedValue(true),
      };

      const schema = z.object({
        TEST_VAR: z.string().optional(),
      });

      const configService = new ConfigServiceImpl({
        schema,
        loaders: [longErrorLoader],
      });

      try {
        await configService.initialize();
        fail('Expected error');
      } catch (error) {
        expect(error).toBeInstanceOf(ConfigurationError);
        expect((error as Error).message).toContain('Failed to initialize configuration service');
      }
    });

    it('should handle error messages with special formatting characters', async () => {
      const specialMessage = 'Error with %s %d %j formatting chars and \n newlines \t tabs';
      
      const specialErrorLoader: ConfigLoader = {
        load: jest.fn().mockRejectedValue(new Error(specialMessage)),
        getName: jest.fn().mockReturnValue('SpecialErrorLoader'),
        isAvailable: jest.fn().mockResolvedValue(true),
      };

      const schema = z.object({
        TEST_VAR: z.string().optional(),
      });

      const configService = new ConfigServiceImpl({
        schema,
        loaders: [specialErrorLoader],
      });

      try {
        await configService.initialize();
        fail('Expected error');
      } catch (error) {
        expect(error).toBeInstanceOf(ConfigurationError);
        expect((error as Error).message).toBeDefined();
      }
    });
  });
});