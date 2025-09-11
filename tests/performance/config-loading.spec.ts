import { z } from 'zod';
import { ConfigServiceImpl } from '../../src/services/config.service';
import { ConfigLoader } from '../../src/interfaces/config-loader.interface';
import { EnvironmentLoader } from '../../src/loaders/environment.loader';
// Performance tests for configuration loading

describe('Configuration Loading Performance', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    
    // Set up test environment
    process.env['APP_ENV'] = 'local';
    
    // Clear all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('initialization performance', () => {
    it('should initialize quickly with small configuration', async () => {
      // Set up small configuration
      process.env['TEST_VAR1'] = 'value1';
      process.env['TEST_VAR2'] = 'value2';
      process.env['TEST_VAR3'] = 'value3';

      const schema = z.object({
        TEST_VAR1: z.string(),
        TEST_VAR2: z.string(),
        TEST_VAR3: z.string(),
      });

      const configService = new ConfigServiceImpl({ 
        schema,
        loaders: [new EnvironmentLoader()]
      });

      const startTime = performance.now();
      await configService.initialize();
      const endTime = performance.now();

      const initTime = endTime - startTime;
      expect(initTime).toBeLessThan(100); // Should initialize in less than 100ms
      expect(configService.isInitialized()).toBe(true);
    });

    it('should handle large configuration efficiently', async () => {
      // Set up large configuration (1000 variables)
      const schemaFields: Record<string, z.ZodString> = {};
      
      for (let i = 0; i < 1000; i++) {
        const key = `TEST_VAR_${i}`;
        process.env[key] = `value_${i}`;
        schemaFields[key] = z.string();
      }

      const schema = z.object(schemaFields);
      const configService = new ConfigServiceImpl({ 
        schema,
        loaders: [new EnvironmentLoader()]
      });

      const startTime = performance.now();
      await configService.initialize();
      const endTime = performance.now();

      const initTime = endTime - startTime;
      expect(initTime).toBeLessThan(1000); // Should initialize in less than 1 second
      expect(configService.isInitialized()).toBe(true);

      // Verify all values are loaded correctly
      for (let i = 0; i < 1000; i++) {
        const key = `TEST_VAR_${i}` as keyof typeof schemaFields;
        expect(configService.get(key)).toBe(`value_${i}`);
      }
    });

    it('should handle multiple loaders efficiently', async () => {
      const loaders: ConfigLoader[] = [];
      
      // Create 10 mock loaders
      for (let i = 0; i < 10; i++) {
        const loader: ConfigLoader = {
          load: jest.fn().mockResolvedValue({ [`LOADER_${i}_VAR`]: `loader_${i}_value` }),
          getName: jest.fn().mockReturnValue(`MockLoader${i}`),
          isAvailable: jest.fn().mockResolvedValue(true),
        };
        loaders.push(loader);
      }

      const schemaFields: Record<string, z.ZodString> = {};
      for (let i = 0; i < 10; i++) {
        schemaFields[`LOADER_${i}_VAR`] = z.string();
      }

      const schema = z.object(schemaFields);
      const configService = new ConfigServiceImpl({ schema, loaders });

      const startTime = performance.now();
      await configService.initialize();
      const endTime = performance.now();

      const initTime = endTime - startTime;
      expect(initTime).toBeLessThan(500); // Should initialize in less than 500ms
      expect(configService.isInitialized()).toBe(true);

      // Verify all loaders were called
      loaders.forEach(loader => {
        expect(loader.load).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('configuration access performance', () => {
    let configService: ConfigServiceImpl<any>;

    beforeEach(async () => {
      // Set up configuration
      for (let i = 0; i < 100; i++) {
        process.env[`PERF_VAR_${i}`] = `value_${i}`;
      }

      const schemaFields: Record<string, z.ZodString> = {};
      for (let i = 0; i < 100; i++) {
        schemaFields[`PERF_VAR_${i}`] = z.string();
      }

      const schema = z.object(schemaFields);
      configService = new ConfigServiceImpl({ 
        schema,
        loaders: [new EnvironmentLoader()]
      });
      await configService.initialize();
    });

    it('should access configuration values quickly', () => {
      const iterations = 10000;
      
      const startTime = performance.now();
      
      for (let i = 0; i < iterations; i++) {
        const key = `PERF_VAR_${i % 100}` as any;
        configService.get(key);
      }
      
      const endTime = performance.now();
      const accessTime = endTime - startTime;
      
      // Should be able to access 10,000 values in less than 100ms
      expect(accessTime).toBeLessThan(100);
      
      const avgAccessTime = accessTime / iterations;
      expect(avgAccessTime).toBeLessThan(0.01); // Less than 0.01ms per access
    });

    it('should handle concurrent access efficiently', async () => {
      const concurrentRequests = 1000;
      
      const startTime = performance.now();
      
      const promises = Array.from({ length: concurrentRequests }, (_, i) => {
        const key = `PERF_VAR_${i % 100}` as any;
        return Promise.resolve(configService.get(key));
      });
      
      const results = await Promise.all(promises);
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      
      // Should handle 1000 concurrent requests in less than 50ms
      expect(totalTime).toBeLessThan(50);
      expect(results).toHaveLength(concurrentRequests);
      
      // Verify all results are correct
      results.forEach((result, i) => {
        const expectedValue = `value_${i % 100}`;
        expect(result).toBe(expectedValue);
      });
    });

    it('should cache configuration efficiently', () => {
      const key = 'PERF_VAR_0' as any;
      
      // First access
      const startTime1 = performance.now();
      const value1 = configService.get(key);
      const endTime1 = performance.now();
      
      // Subsequent accesses
      const startTime2 = performance.now();
      const value2 = configService.get(key);
      const value3 = configService.get(key);
      const value4 = configService.get(key);
      const endTime2 = performance.now();
      
      const firstAccessTime = endTime1 - startTime1;
      const subsequentAccessTime = (endTime2 - startTime2) / 3;
      
      // Subsequent accesses should be faster (cached)
      expect(subsequentAccessTime).toBeLessThan(firstAccessTime);
      expect(value1).toBe(value2);
      expect(value2).toBe(value3);
      expect(value3).toBe(value4);
    });
  });

  describe('memory usage', () => {
    it('should not leak memory during repeated initialization', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Perform multiple initialization cycles
      for (let cycle = 0; cycle < 10; cycle++) {
        const schema = z.object({
          TEST_VAR: z.string().default('test'),
        });
        
        const configService = new ConfigServiceImpl({ 
          schema,
          loaders: [new EnvironmentLoader()]
        });
        await configService.initialize();
        
        // Access configuration multiple times
        for (let i = 0; i < 100; i++) {
          configService.get('TEST_VAR');
        }
      }
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be reasonable (less than 10MB)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    });

    it('should handle large configuration without excessive memory usage', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Create large configuration
      const schemaFields: Record<string, z.ZodString> = {};
      for (let i = 0; i < 5000; i++) {
        const key = `LARGE_VAR_${i}`;
        process.env[key] = `${'x'.repeat(100)}_${i}`; // 100 character values
        schemaFields[key] = z.string();
      }
      
      const schema = z.object(schemaFields);
      const configService = new ConfigServiceImpl({ 
        schema,
        loaders: [new EnvironmentLoader()]
      });
      await configService.initialize();
      
      const afterInitMemory = process.memoryUsage().heapUsed;
      const memoryUsed = afterInitMemory - initialMemory;
      
      // Should use reasonable amount of memory (less than 50MB for 5000 vars)
      expect(memoryUsed).toBeLessThan(50 * 1024 * 1024);
      
      // Verify configuration is accessible
      expect(configService.get('LARGE_VAR_0' as any)).toContain('x'.repeat(100));
      expect(configService.get('LARGE_VAR_4999' as any)).toContain('x'.repeat(100));
    });
  });

  describe('loader performance', () => {
    it('should handle slow loaders without blocking', async () => {
      const fastLoader: ConfigLoader = {
        load: jest.fn().mockResolvedValue({ FAST_VAR: 'fast_value' }),
        getName: jest.fn().mockReturnValue('FastLoader'),
        isAvailable: jest.fn().mockResolvedValue(true),
      };
      
      const slowLoader: ConfigLoader = {
        load: jest.fn().mockImplementation(() => 
          new Promise(resolve => 
            setTimeout(() => resolve({ SLOW_VAR: 'slow_value' }), 100)
          )
        ),
        getName: jest.fn().mockReturnValue('SlowLoader'),
        isAvailable: jest.fn().mockResolvedValue(true),
      };
      
      const schema = z.object({
        FAST_VAR: z.string(),
        SLOW_VAR: z.string(),
      });
      
      const configService = new ConfigServiceImpl({ 
        schema, 
        loaders: [fastLoader, slowLoader] 
      });
      
      const startTime = performance.now();
      await configService.initialize();
      const endTime = performance.now();
      
      const totalTime = endTime - startTime;
      
      // Should wait for all loaders but not be significantly slower
      expect(totalTime).toBeGreaterThan(100); // At least as long as slow loader
      expect(totalTime).toBeLessThan(200); // But not much longer
      
      expect(configService.get('FAST_VAR')).toBe('fast_value');
      expect(configService.get('SLOW_VAR')).toBe('slow_value');
    });

    it('should handle loader failures efficiently', async () => {
      const workingLoader: ConfigLoader = {
        load: jest.fn().mockResolvedValue({ WORKING_VAR: 'working_value' }),
        getName: jest.fn().mockReturnValue('WorkingLoader'),
        isAvailable: jest.fn().mockResolvedValue(true),
      };
      
      const failingLoader: ConfigLoader = {
        load: jest.fn().mockRejectedValue(new Error('Loader failed')),
        getName: jest.fn().mockReturnValue('FailingLoader'),
        isAvailable: jest.fn().mockResolvedValue(true),
      };
      
      const schema = z.object({
        WORKING_VAR: z.string(),
      });
      
      const configService = new ConfigServiceImpl({ 
        schema, 
        loaders: [workingLoader, failingLoader] 
      });
      
      const startTime = performance.now();
      
      await expect(configService.initialize()).rejects.toThrow();
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      
      // Should fail quickly without hanging
      expect(totalTime).toBeLessThan(100);
    });
  });

  describe('validation performance', () => {
    it('should validate large schemas efficiently', async () => {
      // Create complex schema with various validation rules
      const schemaFields: Record<string, any> = {};
      
      for (let i = 0; i < 1000; i++) {
        process.env[`STRING_VAR_${i}`] = `string_${i}`;
        process.env[`NUMBER_VAR_${i}`] = `${i}`;
        process.env[`EMAIL_VAR_${i}`] = `user${i}@example.com`;
        
        schemaFields[`STRING_VAR_${i}`] = z.string().min(1).max(100);
        schemaFields[`NUMBER_VAR_${i}`] = z.coerce.number().min(0).max(10000);
        schemaFields[`EMAIL_VAR_${i}`] = z.string().email();
      }
      
      const schema = z.object(schemaFields);
      const configService = new ConfigServiceImpl({ 
        schema,
        loaders: [new EnvironmentLoader()]
      });
      
      const startTime = performance.now();
      await configService.initialize();
      const endTime = performance.now();
      
      const validationTime = endTime - startTime;
      
      // Should validate 3000 fields in reasonable time (less than 2 seconds)
      expect(validationTime).toBeLessThan(2000);
      expect(configService.isInitialized()).toBe(true);
    });

    it('should handle validation errors efficiently', async () => {
      // Set up invalid data
      process.env['INVALID_EMAIL'] = 'not-an-email';
      process.env['INVALID_NUMBER'] = 'not-a-number';
      process.env['INVALID_URL'] = 'not-a-url';
      
      const schema = z.object({
        INVALID_EMAIL: z.string().email(),
        INVALID_NUMBER: z.coerce.number(),
        INVALID_URL: z.string().url(),
      });
      
      const configService = new ConfigServiceImpl({ 
        schema,
        loaders: [new EnvironmentLoader()]
      });
      
      const startTime = performance.now();
      
      await expect(configService.initialize()).rejects.toThrow();
      
      const endTime = performance.now();
      const errorTime = endTime - startTime;
      
      // Should fail quickly with validation errors
      expect(errorTime).toBeLessThan(100);
    });
  });
});