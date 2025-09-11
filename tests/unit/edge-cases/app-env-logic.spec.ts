import { ConfigServiceImpl } from '../../../src/services/config.service';
import { EnvironmentLoader } from '../../../src/loaders/environment.loader';
import { z } from 'zod';

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

describe('APP_ENV Logic Edge Cases', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    
    // Clear environment variables
    delete process.env['NODE_ENV'];
    delete process.env['APP_ENV'];
    
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

  describe('APP_ENV initialization edge cases', () => {
    it('should handle empty string APP_ENV', () => {
      process.env['APP_ENV'] = '';
      process.env['NODE_ENV'] = 'development';
      
      const configService = new ConfigServiceImpl({
        loaders: [new EnvironmentLoader()]
      });
      
      expect(configService.getAppEnv()).toBe('development');
      expect(mockLoggerFunctions.warn).toHaveBeenCalledWith(
        expect.stringContaining("Invalid APP_ENV value ''")
      );
    });

    it('should handle whitespace-only APP_ENV', () => {
      process.env['APP_ENV'] = '   ';
      process.env['NODE_ENV'] = 'test';
      
      const configService = new ConfigServiceImpl({
        loaders: [new EnvironmentLoader()]
      });
      
      expect(configService.getAppEnv()).toBe('test');
      expect(mockLoggerFunctions.warn).toHaveBeenCalledWith(
        expect.stringContaining("Invalid APP_ENV value '   '")
      );
    });

    it('should handle case-sensitive APP_ENV values', () => {
      process.env['APP_ENV'] = 'PRODUCTION'; // Uppercase
      process.env['NODE_ENV'] = 'development';
      
      const configService = new ConfigServiceImpl();
      
      expect(configService.getAppEnv()).toBe('development');
      expect(mockLoggerFunctions.warn).toHaveBeenCalledWith(
        expect.stringContaining("Invalid APP_ENV value 'PRODUCTION'")
      );
    });

    it('should handle mixed case APP_ENV values', () => {
      process.env['APP_ENV'] = 'Production';
      process.env['NODE_ENV'] = 'development';
      
      const configService = new ConfigServiceImpl();
      
      expect(configService.getAppEnv()).toBe('development');
      expect(mockLoggerFunctions.warn).toHaveBeenCalledWith(
        expect.stringContaining("Invalid APP_ENV value 'Production'")
      );
    });

    it('should handle numeric APP_ENV values', () => {
      process.env['APP_ENV'] = '123';
      process.env['NODE_ENV'] = 'development';
      
      const configService = new ConfigServiceImpl();
      
      expect(configService.getAppEnv()).toBe('development');
      expect(mockLoggerFunctions.warn).toHaveBeenCalledWith(
        expect.stringContaining("Invalid APP_ENV value '123'")
      );
    });

    it('should handle special characters in APP_ENV', () => {
      process.env['APP_ENV'] = 'dev-test';
      process.env['NODE_ENV'] = 'development';
      
      const configService = new ConfigServiceImpl();
      
      expect(configService.getAppEnv()).toBe('development');
      expect(mockLoggerFunctions.warn).toHaveBeenCalledWith(
        expect.stringContaining("Invalid APP_ENV value 'dev-test'")
      );
    });

    it('should handle unicode characters in APP_ENV', () => {
      process.env['APP_ENV'] = 'développement';
      process.env['NODE_ENV'] = 'development';
      
      const configService = new ConfigServiceImpl();
      
      expect(configService.getAppEnv()).toBe('development');
      expect(mockLoggerFunctions.warn).toHaveBeenCalledWith(
        expect.stringContaining("Invalid APP_ENV value 'développement'")
      );
    });

    it('should handle very long APP_ENV values', () => {
      const longValue = 'a'.repeat(1000);
      process.env['APP_ENV'] = longValue;
      process.env['NODE_ENV'] = 'development';
      
      const configService = new ConfigServiceImpl();
      
      expect(configService.getAppEnv()).toBe('development');
      expect(mockLoggerFunctions.warn).toHaveBeenCalledWith(
        expect.stringContaining(`Invalid APP_ENV value '${longValue}'`)
      );
    });
  });

  describe('NODE_ENV fallback edge cases', () => {
    it('should handle empty string NODE_ENV', () => {
      process.env['NODE_ENV'] = '';
      
      const configService = new ConfigServiceImpl();
      
      expect(configService.getAppEnv()).toBe('local');
      expect(mockLoggerFunctions.warn).toHaveBeenCalledWith(
        expect.stringContaining("Invalid NODE_ENV value ''")
      );
    });

    it('should handle whitespace-only NODE_ENV', () => {
      process.env['NODE_ENV'] = '  \t\n  ';
      
      const configService = new ConfigServiceImpl();
      
      expect(configService.getAppEnv()).toBe('local');
      expect(mockLoggerFunctions.warn).toHaveBeenCalledWith(
        expect.stringContaining("Invalid NODE_ENV value '  \t\n  '")
      );
    });

    it('should handle case-sensitive NODE_ENV values', () => {
      process.env['NODE_ENV'] = 'DEVELOPMENT';
      
      const configService = new ConfigServiceImpl();
      
      expect(configService.getAppEnv()).toBe('local');
      expect(mockLoggerFunctions.warn).toHaveBeenCalledWith(
        expect.stringContaining("Invalid NODE_ENV value 'DEVELOPMENT'")
      );
    });

    it('should handle both APP_ENV and NODE_ENV being invalid', () => {
      process.env['APP_ENV'] = 'invalid-app-env';
      process.env['NODE_ENV'] = 'invalid-node-env';
      
      const configService = new ConfigServiceImpl();
      
      expect(configService.getAppEnv()).toBe('local');
      expect(mockLoggerFunctions.warn).toHaveBeenCalledWith(
        expect.stringContaining("Invalid APP_ENV value 'invalid-app-env' and no valid NODE_ENV fallback")
      );
    });
  });

  describe('warning message edge cases', () => {
    it('should warn when APP_ENV and NODE_ENV are both valid but different', () => {
      process.env['APP_ENV'] = 'production';
      process.env['NODE_ENV'] = 'development';
      
      const configService = new ConfigServiceImpl();
      
      expect(configService.getAppEnv()).toBe('production');
      expect(mockLoggerFunctions.warn).toHaveBeenCalledWith(
        "APP_ENV 'production' differs from NODE_ENV 'development'. Using APP_ENV value."
      );
    });

    it('should not warn when APP_ENV and NODE_ENV are the same', () => {
      process.env['APP_ENV'] = 'production';
      process.env['NODE_ENV'] = 'production';
      
      const configService = new ConfigServiceImpl();
      
      expect(configService.getAppEnv()).toBe('production');
      expect(mockLoggerFunctions.warn).not.toHaveBeenCalled();
    });

    it('should not warn when only APP_ENV is set', () => {
      process.env['APP_ENV'] = 'production';
      
      const configService = new ConfigServiceImpl();
      
      expect(configService.getAppEnv()).toBe('production');
      expect(mockLoggerFunctions.warn).not.toHaveBeenCalled();
    });

    it('should not warn when only NODE_ENV is set', () => {
      process.env['NODE_ENV'] = 'production';
      
      const configService = new ConfigServiceImpl();
      
      expect(configService.getAppEnv()).toBe('production');
      expect(mockLoggerFunctions.warn).not.toHaveBeenCalled();
    });

    it('should handle logging disabled scenario', () => {
      process.env['APP_ENV'] = 'invalid';
      process.env['NODE_ENV'] = 'development';
      
      const configService = new ConfigServiceImpl({
        enableLogging: false,
      });
      
      expect(configService.getAppEnv()).toBe('development');
      expect(mockLoggerFunctions.warn).not.toHaveBeenCalled();
    });
  });

  describe('environment variable precedence', () => {
    it('should prioritize APP_ENV over NODE_ENV even when NODE_ENV is set first', () => {
      // Simulate NODE_ENV being set first in the environment
      process.env['NODE_ENV'] = 'development';
      process.env['APP_ENV'] = 'production';
      
      const configService = new ConfigServiceImpl();
      
      expect(configService.getAppEnv()).toBe('production');
    });

    it('should handle dynamic environment variable changes', () => {
      // Initial state
      process.env['APP_ENV'] = 'development';
      
      const configService1 = new ConfigServiceImpl();
      expect(configService1.getAppEnv()).toBe('development');
      
      // Change environment (simulating runtime change)
      process.env['APP_ENV'] = 'production';
      
      // New instance should pick up the change
      const configService2 = new ConfigServiceImpl();
      expect(configService2.getAppEnv()).toBe('production');
      
      // Original instance should maintain its value
      expect(configService1.getAppEnv()).toBe('development');
    });
  });

  describe('edge cases with configuration loading', () => {
    it('should use correct APP_ENV for loader availability checks', async () => {
      process.env['APP_ENV'] = 'local';
      process.env['TEST_VAR'] = 'test-value';
      
      const schema = z.object({
        TEST_VAR: z.string(),
      });
      
      const configService = new ConfigServiceImpl({ schema });
      await configService.initialize();
      
      // In local mode, AWS loaders should be skipped
      expect(configService.getAppEnv()).toBe('local');
      expect(configService.get('TEST_VAR')).toBe('test-value');
    });

    it('should handle APP_ENV changes affecting loader behavior', async () => {
      // First, test with local environment
      process.env['APP_ENV'] = 'local';
      process.env['TEST_VAR'] = 'local-value';
      
      const schema = z.object({
        TEST_VAR: z.string(),
      });
      
      const localConfigService = new ConfigServiceImpl({ schema });
      await localConfigService.initialize();
      
      expect(localConfigService.getAppEnv()).toBe('local');
      expect(localConfigService.get('TEST_VAR')).toBe('local-value');
      
      // Now test with development environment (new instance)
      process.env['APP_ENV'] = 'development';
      process.env['TEST_VAR'] = 'dev-value';
      
      const devConfigService = new ConfigServiceImpl({ schema });
      await devConfigService.initialize();
      
      expect(devConfigService.getAppEnv()).toBe('development');
      expect(devConfigService.get('TEST_VAR')).toBe('dev-value');
    });
  });

  describe('concurrent initialization with different environments', () => {
    it('should handle multiple config services with different APP_ENV values', async () => {
      const schema = z.object({
        TEST_VAR: z.string().default('default'),
      });
      
      // Create multiple services concurrently with different environments
      const promises = [
        (async () => {
          const originalAppEnv = process.env['APP_ENV'];
          process.env['APP_ENV'] = 'local';
          const service = new ConfigServiceImpl({ schema });
          await service.initialize();
          process.env['APP_ENV'] = originalAppEnv;
          return { env: service.getAppEnv(), service };
        })(),
        (async () => {
          const originalAppEnv = process.env['APP_ENV'];
          process.env['APP_ENV'] = 'development';
          const service = new ConfigServiceImpl({ schema });
          await service.initialize();
          process.env['APP_ENV'] = originalAppEnv;
          return { env: service.getAppEnv(), service };
        })(),
        (async () => {
          const originalAppEnv = process.env['APP_ENV'];
          process.env['APP_ENV'] = 'production';
          const service = new ConfigServiceImpl({ schema });
          await service.initialize();
          process.env['APP_ENV'] = originalAppEnv;
          return { env: service.getAppEnv(), service };
        })(),
      ];
      
      const results = await Promise.all(promises);
      
      // Each service should have captured its environment at construction time
      expect(results[0]?.env).toBe('local');
      expect(results[1]?.env).toBe('development');
      expect(results[2]?.env).toBe('production');
      
      // All services should be properly initialized
      results.forEach(({ service }) => {
        expect(service.isInitialized()).toBe(true);
      });
    });
  });

  describe('memory and performance with invalid environments', () => {
    it('should not leak memory when handling many invalid APP_ENV values', () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Create many config services with invalid environments
      for (let i = 0; i < 1000; i++) {
        process.env['APP_ENV'] = `invalid-env-${i}`;
        process.env['NODE_ENV'] = 'development';
        
        const configService = new ConfigServiceImpl();
        expect(configService.getAppEnv()).toBe('development');
      }
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be reasonable (less than 5MB)
      expect(memoryIncrease).toBeLessThan(5 * 1024 * 1024);
    });

    it('should handle rapid APP_ENV validation efficiently', () => {
      const startTime = performance.now();
      
      // Perform many validations
      for (let i = 0; i < 10000; i++) {
        process.env['APP_ENV'] = i % 2 === 0 ? 'development' : 'invalid';
        process.env['NODE_ENV'] = 'production';
        
        const configService = new ConfigServiceImpl();
        const appEnv = configService.getAppEnv();
        
        if (i % 2 === 0) {
          expect(appEnv).toBe('development');
        } else {
          expect(appEnv).toBe('production');
        }
      }
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;
      
      // Should complete in reasonable time (less than 1 second)
      expect(totalTime).toBeLessThan(1000);
    });
  });
});