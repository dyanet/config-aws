import { ConfigServiceImpl, ConfigServiceOptions } from '../config.service';
import { ConfigManager, ConfigurationError } from '@dyanet/config-aws';
import type { ConfigLoader } from '@dyanet/config-aws';
import { z } from 'zod';

// Mock the NestJS Logger
jest.mock('@nestjs/common', () => ({
  Injectable: () => (target: any) => target,
  Logger: jest.fn().mockImplementation(() => ({
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  })),
}));

describe('ConfigServiceImpl', () => {
  // Test schema - use input type for proper Zod compatibility
  const testSchema = z.object({
    DATABASE_URL: z.string(),
    PORT: z.coerce.number(),
    DEBUG: z.coerce.boolean(),
  });

  type TestConfig = z.output<typeof testSchema>;

  // Mock loader that returns predefined config
  const createMockLoader = (config: Record<string, unknown>, name = 'MockLoader'): ConfigLoader => ({
    load: jest.fn().mockResolvedValue(config),
    getName: () => name,
    isAvailable: jest.fn().mockResolvedValue(true),
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create instance with default options', () => {
      const service = new ConfigServiceImpl();
      expect(service).toBeInstanceOf(ConfigServiceImpl);
      expect(service.isInitialized()).toBe(false);
    });

    it('should create instance with custom options', () => {
      const mockLoader = createMockLoader({ DATABASE_URL: 'postgres://localhost' });
      const options: ConfigServiceOptions<TestConfig> = {
        loaders: [mockLoader],
        schema: testSchema,
        enableNestLogging: false,
      };

      const service = new ConfigServiceImpl(options);
      expect(service).toBeInstanceOf(ConfigServiceImpl);
      expect(service.isInitialized()).toBe(false);
    });
  });

  describe('initialize', () => {
    it('should load configuration from loaders', async () => {
      const mockConfig = {
        DATABASE_URL: 'postgres://localhost:5432/db',
        PORT: '8080',
        DEBUG: 'true',
      };
      const mockLoader = createMockLoader(mockConfig);

      const service = new ConfigServiceImpl<TestConfig>({
        loaders: [mockLoader],
        schema: testSchema,
        enableNestLogging: false,
      });

      await service.initialize();

      expect(service.isInitialized()).toBe(true);
      expect(mockLoader.load).toHaveBeenCalled();
    });

    it('should not reinitialize if already initialized', async () => {
      const mockConfig = { DATABASE_URL: 'postgres://localhost', PORT: '3000', DEBUG: 'false' };
      const mockLoader = createMockLoader(mockConfig);

      const service = new ConfigServiceImpl<TestConfig>({
        loaders: [mockLoader],
        schema: testSchema,
        enableNestLogging: false,
      });

      await service.initialize();
      await service.initialize(); // Second call

      expect(mockLoader.load).toHaveBeenCalledTimes(1);
    });

    it('should throw error on initialization failure', async () => {
      const failingLoader: ConfigLoader = {
        load: jest.fn().mockRejectedValue(new Error('Load failed')),
        getName: () => 'FailingLoader',
        isAvailable: jest.fn().mockResolvedValue(true),
      };

      const service = new ConfigServiceImpl({
        loaders: [failingLoader],
        enableNestLogging: false,
      });

      await expect(service.initialize()).rejects.toThrow('Load failed');
    });
  });

  describe('get', () => {
    it('should return configuration value by key', async () => {
      const mockConfig = {
        DATABASE_URL: 'postgres://localhost:5432/db',
        PORT: '3000',
      };
      const mockLoader = createMockLoader(mockConfig);

      const service = new ConfigServiceImpl<TestConfig>({
        loaders: [mockLoader],
        schema: testSchema,
        enableNestLogging: false,
      });

      await service.initialize();

      expect(service.get('DATABASE_URL')).toBe('postgres://localhost:5432/db');
      expect(service.get('PORT')).toBe(3000); // Coerced to number by schema
    });

    it('should throw error if not initialized', () => {
      const service = new ConfigServiceImpl<TestConfig>({
        schema: testSchema,
        enableNestLogging: false,
      });

      expect(() => service.get('DATABASE_URL')).toThrow(ConfigurationError);
      expect(() => service.get('DATABASE_URL')).toThrow('not initialized');
    });
  });

  describe('getAll', () => {
    it('should return all configuration values', async () => {
      const mockConfig = {
        DATABASE_URL: 'postgres://localhost:5432/db',
        PORT: '8080',
        DEBUG: 'true',
      };
      const mockLoader = createMockLoader(mockConfig);

      const service = new ConfigServiceImpl<TestConfig>({
        loaders: [mockLoader],
        schema: testSchema,
        enableNestLogging: false,
      });

      await service.initialize();

      const config = service.getAll();
      expect(config).toEqual({
        DATABASE_URL: 'postgres://localhost:5432/db',
        PORT: 8080,
        DEBUG: true,
      });
    });

    it('should throw error if not initialized', () => {
      const service = new ConfigServiceImpl<TestConfig>({
        schema: testSchema,
        enableNestLogging: false,
      });

      expect(() => service.getAll()).toThrow(ConfigurationError);
      expect(() => service.getAll()).toThrow('not initialized');
    });
  });

  describe('isInitialized', () => {
    it('should return false before initialization', () => {
      const service = new ConfigServiceImpl();
      expect(service.isInitialized()).toBe(false);
    });

    it('should return true after initialization', async () => {
      const mockLoader = createMockLoader({ DATABASE_URL: 'postgres://localhost', PORT: '3000', DEBUG: 'false' });

      const service = new ConfigServiceImpl<TestConfig>({
        loaders: [mockLoader],
        schema: testSchema,
        enableNestLogging: false,
      });

      await service.initialize();
      expect(service.isInitialized()).toBe(true);
    });
  });

  describe('getAppEnv', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should return APP_ENV value when set', async () => {
      process.env['APP_ENV'] = 'production';
      const mockLoader = createMockLoader({ DATABASE_URL: 'postgres://localhost', PORT: '3000', DEBUG: 'false' });

      const service = new ConfigServiceImpl<TestConfig>({
        loaders: [mockLoader],
        schema: testSchema,
        enableNestLogging: false,
      });

      await service.initialize();
      expect(service.getAppEnv()).toBe('production');
    });

    it('should return development as default when APP_ENV not set', async () => {
      delete process.env['APP_ENV'];
      const mockLoader = createMockLoader({ DATABASE_URL: 'postgres://localhost', PORT: '3000', DEBUG: 'false' });

      const service = new ConfigServiceImpl<TestConfig>({
        loaders: [mockLoader],
        schema: testSchema,
        enableNestLogging: false,
      });

      await service.initialize();
      expect(service.getAppEnv()).toBe('development');
    });
  });

  describe('getConfigManager', () => {
    it('should return the underlying ConfigManager instance', () => {
      const service = new ConfigServiceImpl();
      const manager = service.getConfigManager();

      expect(manager).toBeInstanceOf(ConfigManager);
    });
  });

  describe('integration with ConfigManager options', () => {
    it('should pass precedence option to ConfigManager', async () => {
      const envLoader = createMockLoader({ KEY: 'env-value' }, 'EnvironmentLoader');
      const awsLoader = createMockLoader({ KEY: 'aws-value' }, 'SecretsManagerLoader');

      const service = new ConfigServiceImpl({
        loaders: [envLoader, awsLoader],
        precedence: 'aws-first',
        enableNestLogging: false,
      });

      await service.initialize();

      // With aws-first, AWS loader (SecretsManagerLoader) should win
      expect(service.getAll()).toEqual({ KEY: 'aws-value' });
    });

    it('should pass verbose option to ConfigManager', async () => {
      const mockLoader = createMockLoader({ DATABASE_URL: 'postgres://localhost' });

      const service = new ConfigServiceImpl({
        loaders: [mockLoader],
        verbose: true,
        enableLogging: true,
        enableNestLogging: false,
      });

      // Should not throw - verbose option should be passed correctly
      await service.initialize();
      expect(service.isInitialized()).toBe(true);
    });
  });
});
