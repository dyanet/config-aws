import { z } from 'zod';

import { ConfigServiceImpl, ConfigServiceOptions } from '../../../src/services/config.service';
import { ConfigLoader } from '../../../src/interfaces/config-loader.interface';
import { ConfigurationError } from '../../../src/interfaces/errors.interface';

// Create mock logger functions
const mockLoggerFunctions = {
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
};

// Mock NestJS Logger
jest.mock('@nestjs/common', () => ({
  Injectable: () => (target: any) => target,
  Logger: jest.fn().mockImplementation(() => mockLoggerFunctions),
}));

// Mock AWS SDK
jest.mock('@aws-sdk/client-secrets-manager', () => ({
  SecretsManagerClient: jest.fn(),
  GetSecretValueCommand: jest.fn(),
}));

jest.mock('@aws-sdk/client-ssm', () => ({
  SSMClient: jest.fn(),
  GetParametersByPathCommand: jest.fn(),
}));

jest.mock('@aws-sdk/credential-providers', () => ({
  fromNodeProviderChain: jest.fn(),
}));

// Mock dotenv and fs for local environment testing
jest.mock('dotenv', () => ({
  config: jest.fn(),
}));

jest.mock('fs', () => ({
  existsSync: jest.fn(),
}));

describe('ConfigServiceImpl', () => {
  let configService: ConfigServiceImpl<any>;
  let mockLoader1: jest.Mocked<ConfigLoader>;
  let mockLoader2: jest.Mocked<ConfigLoader>;
  let mockLoader3: jest.Mocked<ConfigLoader>;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Store original environment
    originalEnv = { ...process.env };
    
    // Clear environment variables
    delete process.env['NODE_ENV'];
    delete process.env['APP_ENV'];
    delete process.env['AWS_PROFILE'];
    delete process.env['AWS_REGION'];

    // Create mock loaders
    mockLoader1 = {
      load: jest.fn(),
      getName: jest.fn().mockReturnValue('MockLoader1'),
      isAvailable: jest.fn().mockResolvedValue(true),
    };

    mockLoader2 = {
      load: jest.fn(),
      getName: jest.fn().mockReturnValue('MockLoader2'),
      isAvailable: jest.fn().mockResolvedValue(true),
    };

    mockLoader3 = {
      load: jest.fn(),
      getName: jest.fn().mockReturnValue('MockLoader3'),
      isAvailable: jest.fn().mockResolvedValue(true),
    };

    // Clear all mocks including logger
    jest.clearAllMocks();
    mockLoggerFunctions.log.mockClear();
    mockLoggerFunctions.error.mockClear();
    mockLoggerFunctions.warn.mockClear();
    mockLoggerFunctions.debug.mockClear();
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('APP_ENV initialization', () => {
    it('should default to "local" when neither APP_ENV nor NODE_ENV is set', () => {
      configService = new ConfigServiceImpl();
      expect(configService.getAppEnv()).toBe('local');
    });

    it('should use APP_ENV when explicitly set', () => {
      process.env['APP_ENV'] = 'development';
      process.env['NODE_ENV'] = 'production';
      
      configService = new ConfigServiceImpl();
      expect(configService.getAppEnv()).toBe('development');
    });

    it('should warn when APP_ENV differs from NODE_ENV', () => {
      process.env['APP_ENV'] = 'development';
      process.env['NODE_ENV'] = 'production';
      
      configService = new ConfigServiceImpl();
      
      // Logger should have been called with warning
      expect(mockLoggerFunctions.warn).toHaveBeenCalledWith(
        expect.stringContaining("APP_ENV 'development' differs from NODE_ENV 'production'")
      );
    });

    it('should use NODE_ENV when APP_ENV is not set', () => {
      process.env['NODE_ENV'] = 'test';
      
      configService = new ConfigServiceImpl();
      expect(configService.getAppEnv()).toBe('test');
    });

    it('should fallback to NODE_ENV when APP_ENV is invalid', () => {
      process.env['APP_ENV'] = 'invalid';
      process.env['NODE_ENV'] = 'development';
      
      configService = new ConfigServiceImpl();
      
      expect(configService.getAppEnv()).toBe('development');
      expect(mockLoggerFunctions.warn).toHaveBeenCalledWith(
        expect.stringContaining("Invalid APP_ENV value 'invalid'")
      );
    });

    it('should default to "local" when both APP_ENV and NODE_ENV are invalid', () => {
      process.env['APP_ENV'] = 'invalid';
      process.env['NODE_ENV'] = 'also-invalid';
      
      configService = new ConfigServiceImpl();
      
      expect(configService.getAppEnv()).toBe('local');
      expect(mockLoggerFunctions.warn).toHaveBeenCalledWith(
        expect.stringContaining("Invalid APP_ENV value 'invalid' and no valid NODE_ENV fallback")
      );
    });
  });

  describe('Configuration loading orchestration', () => {
    beforeEach(() => {
      // Set up mock loaders with different configurations
      mockLoader1.load.mockResolvedValue({ KEY1: 'value1', SHARED: 'from-loader1' });
      mockLoader2.load.mockResolvedValue({ KEY2: 'value2', SHARED: 'from-loader2' });
      mockLoader3.load.mockResolvedValue({ KEY3: 'value3', SHARED: 'from-loader3' });
    });

    it('should load configuration from all available loaders in order', async () => {
      const options: ConfigServiceOptions<any> = {
        loaders: [mockLoader1, mockLoader2, mockLoader3],
        schema: z.object({
          KEY1: z.string(),
          KEY2: z.string(),
          KEY3: z.string(),
          SHARED: z.string(),
        }),
      };
      
      configService = new ConfigServiceImpl(options);
      await configService.initialize();
      
      expect(mockLoader1.load).toHaveBeenCalled();
      expect(mockLoader2.load).toHaveBeenCalled();
      expect(mockLoader3.load).toHaveBeenCalled();
      
      // Later loaders should override earlier ones
      expect(configService.get('SHARED')).toBe('from-loader3');
    });

    it('should skip unavailable loaders', async () => {
      mockLoader2.isAvailable.mockResolvedValue(false);
      
      const options: ConfigServiceOptions<any> = {
        loaders: [mockLoader1, mockLoader2, mockLoader3],
        schema: z.object({
          KEY1: z.string(),
          KEY3: z.string(),
          SHARED: z.string(),
        }),
      };
      
      configService = new ConfigServiceImpl(options);
      await configService.initialize();
      
      expect(mockLoader1.load).toHaveBeenCalled();
      expect(mockLoader2.load).not.toHaveBeenCalled();
      expect(mockLoader3.load).toHaveBeenCalled();
    });

    it('should throw ConfigurationLoadError when loader fails', async () => {
      const loaderError = new Error('Loader failed');
      mockLoader2.load.mockRejectedValue(loaderError);
      
      const options: ConfigServiceOptions<any> = {
        loaders: [mockLoader1, mockLoader2, mockLoader3],
        schema: z.object({
          KEY1: z.string(),
        }),
      };
      
      configService = new ConfigServiceImpl(options);
      
      await expect(configService.initialize()).rejects.toThrow(ConfigurationError);
      await expect(configService.initialize()).rejects.toThrow('Failed to initialize configuration service');
    });
  });

  describe('Configuration merging', () => {
    it('should merge configurations with proper precedence order', async () => {
      mockLoader1.load.mockResolvedValue({ 
        KEY1: 'value1', 
        SHARED: 'from-loader1',
        OVERRIDE_ME: 'original'
      });
      mockLoader2.load.mockResolvedValue({ 
        KEY2: 'value2', 
        SHARED: 'from-loader2',
        OVERRIDE_ME: 'updated'
      });
      mockLoader3.load.mockResolvedValue({ 
        KEY3: 'value3', 
        SHARED: 'from-loader3'
      });
      
      const customSchema = z.object({
        KEY1: z.string(),
        KEY2: z.string(),
        KEY3: z.string(),
        SHARED: z.string(),
        OVERRIDE_ME: z.string(),
      });
      
      const options: ConfigServiceOptions<any> = {
        loaders: [mockLoader1, mockLoader2, mockLoader3],
        schema: customSchema,
      };
      
      configService = new ConfigServiceImpl(options);
      await configService.initialize();
      
      const config = configService.getAll();
      expect(config.KEY1).toBe('value1');
      expect(config.KEY2).toBe('value2');
      expect(config.KEY3).toBe('value3');
      expect(config.SHARED).toBe('from-loader3'); // Last loader wins
      expect(config.OVERRIDE_ME).toBe('updated'); // Second loader overrode first
    });
  });

  describe('Zod schema validation', () => {
    it('should validate configuration against provided schema', async () => {
      const customSchema = z.object({
        REQUIRED_STRING: z.string(),
        OPTIONAL_NUMBER: z.coerce.number().optional(),
      });
      
      mockLoader1.load.mockResolvedValue({
        REQUIRED_STRING: 'test',
        OPTIONAL_NUMBER: '42',
      });
      
      const options: ConfigServiceOptions<any> = {
        loaders: [mockLoader1],
        schema: customSchema,
      };
      
      configService = new ConfigServiceImpl(options);
      await configService.initialize();
      
      const config = configService.getAll();
      expect(config.REQUIRED_STRING).toBe('test');
      expect(config.OPTIONAL_NUMBER).toBe(42); // Should be coerced to number
    });

    it('should throw ValidationError for invalid configuration', async () => {
      const customSchema = z.object({
        REQUIRED_STRING: z.string(),
        REQUIRED_NUMBER: z.number(),
      });
      
      mockLoader1.load.mockResolvedValue({
        REQUIRED_STRING: 'test',
        // Missing REQUIRED_NUMBER
      });
      
      const options: ConfigServiceOptions<any> = {
        loaders: [mockLoader1],
        schema: customSchema,
      };
      
      configService = new ConfigServiceImpl(options);
      
      await expect(configService.initialize()).rejects.toThrow(ConfigurationError);
    });

    it('should skip validation when validateOnLoad is false', async () => {
      const customSchema = z.object({
        REQUIRED_STRING: z.string(),
      });
      
      mockLoader1.load.mockResolvedValue({
        // Missing required field, but validation is disabled
      });
      
      const options: ConfigServiceOptions<any> = {
        loaders: [mockLoader1],
        schema: customSchema,
        validateOnLoad: false,
      };
      
      configService = new ConfigServiceImpl(options);
      await configService.initialize();
      
      // Should not throw, even with invalid config
      expect(configService.isInitialized()).toBe(true);
    });
  });

  describe('Type-safe get method', () => {
    beforeEach(async () => {
      const customSchema = z.object({
        STRING_VALUE: z.string(),
        NUMBER_VALUE: z.coerce.number(),
        BOOLEAN_VALUE: z.coerce.boolean(),
      });
      
      mockLoader1.load.mockResolvedValue({
        STRING_VALUE: 'test',
        NUMBER_VALUE: '42',
        BOOLEAN_VALUE: 'true',
      });
      
      const options: ConfigServiceOptions<any> = {
        loaders: [mockLoader1],
        schema: customSchema,
      };
      
      configService = new ConfigServiceImpl(options);
      await configService.initialize();
    });

    it('should return typed values for configuration keys', () => {
      expect(configService.get('STRING_VALUE')).toBe('test');
      expect(configService.get('NUMBER_VALUE')).toBe(42);
      expect(configService.get('BOOLEAN_VALUE')).toBe(true);
    });

    it('should throw error when accessing config before initialization', () => {
      const uninitializedService = new ConfigServiceImpl({
        loaders: [mockLoader1],
        schema: z.object({ STRING_VALUE: z.string() }),
      });
      
      expect(() => uninitializedService.get('STRING_VALUE')).toThrow(ConfigurationError);
      expect(() => uninitializedService.get('STRING_VALUE')).toThrow('not initialized');
    });
  });

  describe('Local environment overrides', () => {
    beforeEach(() => {
      process.env['APP_ENV'] = 'local';
      process.env['AWS_PROFILE'] = 'test-profile';
    });

    it('should apply .env file overrides when AWS profile is present', async () => {
      // Mock fs.existsSync to return true for .env file
      const fs = require('fs');
      fs.existsSync.mockReturnValue(true);
      
      // Mock dotenv.config to return parsed values
      const dotenv = require('dotenv');
      dotenv.config.mockReturnValue({
        parsed: {
          OVERRIDE_KEY: 'from-dotenv',
          NEW_KEY: 'dotenv-only',
        },
      });
      
      mockLoader1.load.mockResolvedValue({
        OVERRIDE_KEY: 'from-aws',
        EXISTING_KEY: 'from-aws',
      });
      
      const customSchema = z.object({
        OVERRIDE_KEY: z.string(),
        EXISTING_KEY: z.string(),
        NEW_KEY: z.string(),
      });
      
      const options: ConfigServiceOptions<any> = {
        loaders: [mockLoader1],
        schema: customSchema,
      };
      
      configService = new ConfigServiceImpl(options);
      await configService.initialize();
      
      const config = configService.getAll();
      expect(config.OVERRIDE_KEY).toBe('from-dotenv'); // .env overrides AWS
      expect(config.EXISTING_KEY).toBe('from-aws'); // AWS value preserved
      expect(config.NEW_KEY).toBe('dotenv-only'); // New value from .env
    });

    it('should not apply overrides when no AWS profile is present', async () => {
      delete process.env['AWS_PROFILE'];
      
      mockLoader1.load.mockResolvedValue({
        TEST_KEY: 'from-aws',
      });
      
      const customSchema = z.object({
        TEST_KEY: z.string(),
      });
      
      const options: ConfigServiceOptions<any> = {
        loaders: [mockLoader1],
        schema: customSchema,
      };
      
      configService = new ConfigServiceImpl(options);
      await configService.initialize();
      
      const config = configService.getAll();
      expect(config.TEST_KEY).toBe('from-aws'); // No override applied
    });

    it('should handle .env file loading errors gracefully', async () => {
      const fs = require('fs');
      fs.existsSync.mockReturnValue(true);
      
      const dotenv = require('dotenv');
      dotenv.config.mockImplementation(() => {
        throw new Error('Failed to load .env');
      });
      
      mockLoader1.load.mockResolvedValue({
        TEST_KEY: 'from-aws',
      });
      
      const customSchema = z.object({
        TEST_KEY: z.string(),
      });
      
      const options: ConfigServiceOptions<any> = {
        loaders: [mockLoader1],
        schema: customSchema,
      };
      
      configService = new ConfigServiceImpl(options);
      
      // Should not throw, just log warning
      await expect(configService.initialize()).resolves.not.toThrow();
      
      const config = configService.getAll();
      expect(config.TEST_KEY).toBe('from-aws');
    });
  });

  describe('Service state management', () => {
    it('should report correct initialization state', async () => {
      mockLoader1.load.mockResolvedValue({ TEST: 'value' });
      
      const options: ConfigServiceOptions<any> = {
        loaders: [mockLoader1],
        schema: z.object({ TEST: z.string() }),
      };
      
      configService = new ConfigServiceImpl(options);
      
      expect(configService.isInitialized()).toBe(false);
      
      await configService.initialize();
      
      expect(configService.isInitialized()).toBe(true);
    });

    it('should not reinitialize if already initialized', async () => {
      mockLoader1.load.mockResolvedValue({ TEST: 'value' });
      
      const options: ConfigServiceOptions<any> = {
        loaders: [mockLoader1],
        schema: z.object({ TEST: z.string() }),
      };
      
      configService = new ConfigServiceImpl(options);
      
      await configService.initialize();
      await configService.initialize(); // Second call
      
      // Loader should only be called once
      expect(mockLoader1.load).toHaveBeenCalledTimes(1);
    });

    it('should return complete configuration with getAll()', async () => {
      const testConfig = { 
        STRING_VAL: 'test', 
        NUMBER_VAL: '42' 
      };
      
      mockLoader1.load.mockResolvedValue(testConfig);
      
      const customSchema = z.object({
        STRING_VAL: z.string(),
        NUMBER_VAL: z.coerce.number(),
      });
      
      const options: ConfigServiceOptions<any> = {
        loaders: [mockLoader1],
        schema: customSchema,
      };
      
      configService = new ConfigServiceImpl(options);
      await configService.initialize();
      
      const config = configService.getAll();
      expect(config.STRING_VAL).toBe('test');
      expect(config.NUMBER_VAL).toBe(42);
    });
  });

  describe('Logging configuration', () => {
    it('should disable logging when enableLogging is false', async () => {
      mockLoader1.load.mockResolvedValue({ TEST: 'value' });
      
      const options: ConfigServiceOptions<any> = {
        loaders: [mockLoader1],
        schema: z.object({ TEST: z.string() }),
        enableLogging: false,
      };
      
      configService = new ConfigServiceImpl(options);
      await configService.initialize();
      
      expect(mockLoggerFunctions.log).not.toHaveBeenCalled();
      expect(mockLoggerFunctions.debug).not.toHaveBeenCalled();
    });

    it('should log configuration loading steps when enabled', async () => {
      mockLoader1.load.mockResolvedValue({ TEST: 'value' });
      
      const options: ConfigServiceOptions<any> = {
        loaders: [mockLoader1],
        schema: z.object({ TEST: z.string() }),
        enableLogging: true,
      };
      
      configService = new ConfigServiceImpl(options);
      await configService.initialize();
      
      expect(mockLoggerFunctions.log).toHaveBeenCalledWith(
        expect.stringContaining('Initializing configuration service')
      );
      expect(mockLoggerFunctions.log).toHaveBeenCalledWith(
        expect.stringContaining('initialized successfully')
      );
    });
  });
});