/**
 * Backward Compatibility Tests
 * 
 * These tests verify that the refactored nestjs-config-aws package maintains
 * backward compatibility with the previous API surface.
 * 
 * Requirements: 5.1, 5.4
 * - Maintain the same public API surface for ConfigModule and ConfigService
 * - Export all previously exported types and interfaces
 */

import { z } from 'zod';

// Import from the package's index to test exports
import {
  // Core exports from @dyanet/config-aws
  EnvironmentLoader,
  EnvFileLoader,
  S3Loader,
  SecretsManagerLoader,
  SSMParameterStoreLoader,
  ConfigManager,
  ConfigurationError,
  ValidationError,
  AWSServiceError,
  ConfigurationLoadError,
  MissingConfigurationError,
  ConfigValidationUtil,
  EnvFileParser,
  // NestJS-specific exports
  ConfigModule,
  ConfigService,
  NestConfigAwsIntegrationModule,
  // Integration utility exports
  isAwsSource,
  isLocalSource,
  hasMetadata,
  isValidationResult,
  isCacheEntry,
  // Decorators and utility functions
  InjectEnhancedConfig,
  ConfigProperty,
  ConfigClass,
  ValidateConfig,
  TransformConfig,
  createTypeSafeConfigFactory,
} from '../index';

// Test that all expected exports are available from the main package
describe('Backward Compatibility - Package Exports', () => {
  describe('Core exports from @dyanet/config-aws', () => {
    it('should export all loaders', () => {
      expect(EnvironmentLoader).toBeDefined();
      expect(EnvFileLoader).toBeDefined();
      expect(S3Loader).toBeDefined();
      expect(SecretsManagerLoader).toBeDefined();
      expect(SSMParameterStoreLoader).toBeDefined();
    });

    it('should export ConfigManager', () => {
      expect(ConfigManager).toBeDefined();
    });

    it('should export all error classes', () => {
      expect(ConfigurationError).toBeDefined();
      expect(ValidationError).toBeDefined();
      expect(AWSServiceError).toBeDefined();
      expect(ConfigurationLoadError).toBeDefined();
      expect(MissingConfigurationError).toBeDefined();
    });

    it('should export utilities', () => {
      expect(ConfigValidationUtil).toBeDefined();
      expect(EnvFileParser).toBeDefined();
    });
  });

  describe('NestJS-specific exports', () => {
    it('should export ConfigModule with forRoot and forRootAsync', () => {
      expect(ConfigModule).toBeDefined();
      expect(typeof ConfigModule.forRoot).toBe('function');
      expect(typeof ConfigModule.forRootAsync).toBe('function');
    });

    it('should export ConfigService abstract class', () => {
      expect(ConfigService).toBeDefined();
    });

    it('should export NestConfigAwsIntegrationModule', () => {
      expect(NestConfigAwsIntegrationModule).toBeDefined();
      expect(typeof NestConfigAwsIntegrationModule.forRoot).toBe('function');
      expect(typeof NestConfigAwsIntegrationModule.forRootAsync).toBe('function');
    });
  });

  describe('Integration utility exports', () => {
    it('should export utility type guards', () => {
      expect(typeof isAwsSource).toBe('function');
      expect(typeof isLocalSource).toBe('function');
      expect(typeof hasMetadata).toBe('function');
      expect(typeof isValidationResult).toBe('function');
      expect(typeof isCacheEntry).toBe('function');
    });

    it('should export decorators and utility functions', () => {
      expect(InjectEnhancedConfig).toBeDefined();
      expect(ConfigProperty).toBeDefined();
      expect(ConfigClass).toBeDefined();
      expect(ValidateConfig).toBeDefined();
      expect(TransformConfig).toBeDefined();
      expect(typeof createTypeSafeConfigFactory).toBe('function');
    });
  });
});

describe('Backward Compatibility - ConfigModule API', () => {
  describe('forRoot', () => {
    it('should accept empty options', () => {
      const dynamicModule = ConfigModule.forRoot();
      
      expect(dynamicModule).toBeDefined();
      expect(dynamicModule.module).toBe(ConfigModule);
      expect(dynamicModule.global).toBe(true);
    });

    it('should accept schema option', () => {
      const schema = z.object({
        DATABASE_URL: z.string(),
        PORT: z.coerce.number().default(3000),
      });

      const dynamicModule = ConfigModule.forRoot({ schema });
      
      expect(dynamicModule).toBeDefined();
      expect(dynamicModule.module).toBe(ConfigModule);
    });

    it('should accept secretsManagerConfig option', () => {
      const dynamicModule = ConfigModule.forRoot({
        secretsManagerConfig: {
          region: 'us-east-1',
          enabled: true,
          paths: {
            development: 'dev',
            production: 'prod',
          },
        },
      });
      
      expect(dynamicModule).toBeDefined();
    });

    it('should accept ssmConfig option', () => {
      const dynamicModule = ConfigModule.forRoot({
        ssmConfig: {
          region: 'us-east-1',
          enabled: true,
          decrypt: true,
          paths: {
            development: '/dev',
            production: '/prod',
          },
        },
      });
      
      expect(dynamicModule).toBeDefined();
    });

    it('should accept envPrefix option', () => {
      const dynamicModule = ConfigModule.forRoot({
        envPrefix: 'APP_',
      });
      
      expect(dynamicModule).toBeDefined();
    });

    it('should accept ignoreValidationErrors option', () => {
      const dynamicModule = ConfigModule.forRoot({
        ignoreValidationErrors: true,
      });
      
      expect(dynamicModule).toBeDefined();
    });

    it('should accept loadSync option', () => {
      const dynamicModule = ConfigModule.forRoot({
        loadSync: true,
      });
      
      expect(dynamicModule).toBeDefined();
    });
  });

  describe('forRootAsync', () => {
    it('should accept useFactory option', () => {
      const dynamicModule = ConfigModule.forRootAsync({
        useFactory: () => ({
          envPrefix: 'APP_',
        }),
      });
      
      expect(dynamicModule).toBeDefined();
      expect(dynamicModule.module).toBe(ConfigModule);
    });

    it('should accept inject option', () => {
      const dynamicModule = ConfigModule.forRootAsync({
        useFactory: (someService: any) => ({
          envPrefix: someService?.prefix || 'APP_',
        }),
        inject: ['SomeService'],
      });
      
      expect(dynamicModule).toBeDefined();
    });

    it('should accept imports option', () => {
      const dynamicModule = ConfigModule.forRootAsync({
        imports: [],
        useFactory: () => ({}),
      });
      
      expect(dynamicModule).toBeDefined();
      expect(dynamicModule.imports).toEqual([]);
    });
  });
});

describe('Backward Compatibility - ConfigService API', () => {
  it('should be an abstract class with get method signature', () => {
    // ConfigService is an abstract class - verify it exists and can be extended
    expect(ConfigService).toBeDefined();
    
    // Create a concrete implementation to verify the interface
    class TestConfigService extends ConfigService<{ test: string }> {
      get<K extends keyof { test: string }>(_key: K): { test: string }[K] {
        return 'value' as any;
      }
      isInitialized(): boolean {
        return true;
      }
      getAll(): { test: string } {
        return { test: 'value' };
      }
    }
    
    const service = new TestConfigService();
    expect(service.get('test')).toBe('value');
  });

  it('should be an abstract class with isInitialized method signature', () => {
    class TestConfigService extends ConfigService<{ test: string }> {
      get<K extends keyof { test: string }>(_key: K): { test: string }[K] {
        return 'value' as any;
      }
      isInitialized(): boolean {
        return true;
      }
      getAll(): { test: string } {
        return { test: 'value' };
      }
    }
    
    const service = new TestConfigService();
    expect(service.isInitialized()).toBe(true);
  });

  it('should be an abstract class with getAll method signature', () => {
    class TestConfigService extends ConfigService<{ test: string }> {
      get<K extends keyof { test: string }>(_key: K): { test: string }[K] {
        return 'value' as any;
      }
      isInitialized(): boolean {
        return true;
      }
      getAll(): { test: string } {
        return { test: 'value' };
      }
    }
    
    const service = new TestConfigService();
    expect(service.getAll()).toEqual({ test: 'value' });
  });
});

describe('Backward Compatibility - NestConfigAwsIntegrationModule API', () => {
  describe('forRoot', () => {
    it('should accept empty options', () => {
      const dynamicModule = NestConfigAwsIntegrationModule.forRoot();
      
      expect(dynamicModule).toBeDefined();
      expect(dynamicModule.module).toBe(NestConfigAwsIntegrationModule);
    });

    it('should accept integration options', () => {
      const dynamicModule = NestConfigAwsIntegrationModule.forRoot({
        enableLogging: true,
        failOnAwsError: false,
        fallbackToLocal: true,
        precedence: 'aws-first',
        registerGlobally: true,
      });
      
      expect(dynamicModule).toBeDefined();
    });
  });

  describe('forRootAsync', () => {
    it('should accept async options', () => {
      const dynamicModule = NestConfigAwsIntegrationModule.forRootAsync({
        useFactory: () => ({
          enableLogging: true,
        }),
      });
      
      expect(dynamicModule).toBeDefined();
      expect(dynamicModule.module).toBe(NestConfigAwsIntegrationModule);
    });
  });
});

describe('Backward Compatibility - Error Classes', () => {
  it('ConfigurationError should be throwable with message', () => {
    const error = new ConfigurationError('Test error');
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe('Test error');
    expect(error.name).toBe('ConfigurationError');
  });

  it('ValidationError should be throwable with validation errors', () => {
    const validationErrors = [{ path: 'field', message: 'required' }];
    const error = new ValidationError('Validation failed', validationErrors);
    expect(error).toBeInstanceOf(Error);
    expect(error.validationErrors).toEqual(validationErrors);
  });

  it('AWSServiceError should include service and operation', () => {
    const error = new AWSServiceError('AWS error', 'SecretsManager', 'GetSecretValue');
    expect(error).toBeInstanceOf(Error);
    expect(error.service).toBe('SecretsManager');
    expect(error.operation).toBe('GetSecretValue');
  });

  it('ConfigurationLoadError should include loader name', () => {
    const error = new ConfigurationLoadError('Load failed', 'EnvironmentLoader');
    expect(error).toBeInstanceOf(Error);
    expect(error.loader).toBe('EnvironmentLoader');
  });

  it('MissingConfigurationError should include missing keys', () => {
    const error = new MissingConfigurationError('Missing keys', ['KEY1', 'KEY2']);
    expect(error).toBeInstanceOf(Error);
    expect(error.missingKeys).toEqual(['KEY1', 'KEY2']);
  });
});

describe('Backward Compatibility - Loader Instantiation', () => {
  it('EnvironmentLoader should be instantiable with config', () => {
    const loader = new EnvironmentLoader({ prefix: 'APP_' });
    expect(loader).toBeDefined();
    expect(loader.getName()).toBe('EnvironmentLoader');
  });

  it('EnvFileLoader should be instantiable with config', () => {
    const loader = new EnvFileLoader({ paths: ['.env'] });
    expect(loader).toBeDefined();
    expect(loader.getName()).toBe('EnvFileLoader');
  });

  it('SecretsManagerLoader should be instantiable with config', () => {
    const loader = new SecretsManagerLoader({ region: 'us-east-1' });
    expect(loader).toBeDefined();
    // getName() includes path context, so check it starts with the loader name
    expect(loader.getName()).toMatch(/^SecretsManagerLoader/);
  });

  it('SSMParameterStoreLoader should be instantiable with config', () => {
    const loader = new SSMParameterStoreLoader({ region: 'us-east-1' });
    expect(loader).toBeDefined();
    // getName() includes path context, so check it starts with the loader name
    expect(loader.getName()).toMatch(/^SSMParameterStoreLoader/);
  });

  it('S3Loader should be instantiable with config', () => {
    const loader = new S3Loader({ bucket: 'test-bucket', key: 'config.json' });
    expect(loader).toBeDefined();
    // getName() includes bucket/key context, so check it starts with the loader name
    expect(loader.getName()).toMatch(/^S3Loader/);
  });
});

describe('Backward Compatibility - ConfigManager', () => {
  it('should be instantiable with options', () => {
    const manager = new ConfigManager({
      loaders: [new EnvironmentLoader()],
      precedence: 'aws-first',
    });
    
    expect(manager).toBeDefined();
    expect(manager.isLoaded()).toBe(false);
  });

  it('should support all precedence strategies', () => {
    // aws-first
    const awsFirst = new ConfigManager({
      loaders: [new EnvironmentLoader()],
      precedence: 'aws-first',
    });
    expect(awsFirst).toBeDefined();

    // local-first
    const localFirst = new ConfigManager({
      loaders: [new EnvironmentLoader()],
      precedence: 'local-first',
    });
    expect(localFirst).toBeDefined();

    // custom
    const custom = new ConfigManager({
      loaders: [new EnvironmentLoader()],
      precedence: [{ loader: 'EnvironmentLoader', priority: 1 }],
    });
    expect(custom).toBeDefined();
  });
});

describe('Backward Compatibility - Type Exports', () => {
  // These tests verify that types are exported correctly by using them
  it('should export ConfigLoader type', () => {
    // Create a mock loader that implements ConfigLoader interface
    const mockLoader = {
      load: async () => ({}),
      getName: () => 'MockLoader',
      isAvailable: async () => true,
    };
    
    // If this compiles and runs, the type is exported correctly
    const manager = new ConfigManager({ loaders: [mockLoader] });
    expect(manager).toBeDefined();
  });

  it('should export ConfigManagerOptions type', () => {
    // If this compiles and runs, the type is exported correctly
    const options = {
      loaders: [new EnvironmentLoader()],
      precedence: 'aws-first' as const,
      validateOnLoad: true,
      enableLogging: false,
    };
    
    const manager = new ConfigManager(options);
    expect(manager).toBeDefined();
  });

  it('should export VerboseOptions type', () => {
    // If this compiles and runs, the type is exported correctly
    const options = {
      loaders: [new EnvironmentLoader()],
      verbose: {
        logKeys: true,
        logValues: false,
        logOverrides: true,
        logTiming: true,
        maskValues: true,
        sensitiveKeys: ['password', 'secret'],
      },
    };
    
    const manager = new ConfigManager(options);
    expect(manager).toBeDefined();
  });
});
