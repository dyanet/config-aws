import { ConfigService } from '@nestjs/config';
import { Type } from '@nestjs/common';

/**
 * Enhanced ConfigService that provides AWS integration capabilities.
 */
export interface EnhancedConfigService extends ConfigService {
  /**
   * Get configuration value with AWS source information.
   * @param propertyPath - Configuration property path
   * @param defaultValue - Default value if property is not found
   * @returns Configuration value with source metadata
   */
  getWithSource<T = any>(propertyPath: string, defaultValue?: T): ConfigValueWithSource<T>;

  /**
   * Get configuration value from AWS sources only.
   * @param propertyPath - Configuration property path
   * @param defaultValue - Default value if property is not found
   * @returns Configuration value from AWS sources
   */
  getFromAws<T = any>(propertyPath: string, defaultValue?: T): T | undefined;

  /**
   * Get configuration value from local sources only.
   * @param propertyPath - Configuration property path
   * @param defaultValue - Default value if property is not found
   * @returns Configuration value from local sources
   */
  getFromLocal<T = any>(propertyPath: string, defaultValue?: T): T | undefined;

  /**
   * Check if a configuration value comes from AWS sources.
   * @param propertyPath - Configuration property path
   * @returns True if value comes from AWS, false otherwise
   */
  isFromAws(propertyPath: string): boolean;

  /**
   * Get all configuration keys from AWS sources.
   * @returns Array of configuration keys from AWS sources
   */
  getAwsKeys(): string[];

  /**
   * Get all configuration keys from local sources.
   * @returns Array of configuration keys from local sources
   */
  getLocalKeys(): string[];

  /**
   * Get configuration source information for a property.
   * @param propertyPath - Configuration property path
   * @returns Source information or undefined
   */
  getSourceInfo(propertyPath: string): ConfigSourceInfo | undefined;

  /**
   * Refresh AWS configuration values.
   * @returns Promise that resolves when refresh is complete
   */
  refreshAwsConfig(): Promise<void>;

  /**
   * Get configuration health status.
   * @returns Configuration health information
   */
  getHealthStatus(): ConfigHealthStatus;
}

/**
 * Configuration value with source metadata.
 */
export interface ConfigValueWithSource<T = any> {
  /** The configuration value */
  value: T;
  /** Source information */
  source: ConfigSourceInfo;
  /** Whether the value was found */
  found: boolean;
}

/**
 * Configuration source information.
 */
export interface ConfigSourceInfo {
  /** Source type */
  type: 'environment' | 'secrets-manager' | 'ssm' | 'local-file';
  /** Whether this is an AWS source */
  isAws: boolean;
  /** Source priority */
  priority: number;
  /** Namespace if applicable */
  namespace?: string;
  /** When the value was loaded */
  loadedAt: Date;
  /** Original key used to load the value */
  originalKey?: string;
}

/**
 * Configuration health status.
 */
export interface ConfigHealthStatus {
  /** Overall health status */
  healthy: boolean;
  /** AWS services availability */
  awsAvailable: boolean;
  /** Number of loaded configuration sources */
  sourcesLoaded: number;
  /** Number of failed sources */
  sourcesFailed: number;
  /** Last successful AWS load time */
  lastAwsLoad?: Date;
  /** Any health issues */
  issues: string[];
}

/**
 * Decorator for injecting enhanced config service.
 */
export const InjectEnhancedConfig = (): ParameterDecorator => {
  return (_target: any, _propertyKey: string | symbol | undefined, _parameterIndex: number) => {
    // Implementation would be handled by the actual decorator
  };
};

/**
 * Configuration property decorator for type-safe configuration access.
 */
export interface ConfigPropertyOptions {
  /** Configuration key */
  key: string;
  /** Default value */
  defaultValue?: any;
  /** Whether to require the property */
  required?: boolean;
  /** Validation function */
  validate?: (value: any) => boolean;
  /** Transformation function */
  transform?: (value: any) => any;
  /** Whether to prefer AWS sources */
  preferAws?: boolean;
}

/**
 * Configuration property decorator.
 */
export function ConfigProperty(options: ConfigPropertyOptions): PropertyDecorator {
  return function (target: any, propertyKey: string | symbol) {
    // Store metadata for the property
    Reflect.defineMetadata('config:property', options, target, propertyKey);
  };
}

/**
 * Configuration class decorator for automatic configuration injection.
 */
export interface ConfigClassOptions {
  /** Configuration namespace */
  namespace?: string;
  /** Whether to validate all properties */
  validate?: boolean;
  /** Whether to prefer AWS sources */
  preferAws?: boolean;
}

/**
 * Configuration class decorator.
 */
export function ConfigClass(options?: ConfigClassOptions): ClassDecorator {
  return function <T extends Function>(target: T) {
    // Store metadata for the class
    Reflect.defineMetadata('config:class', options || {}, target);
    return target;
  };
}

/**
 * Configuration validation decorator.
 */
export interface ConfigValidationOptions {
  /** Validation schema */
  schema?: any;
  /** Custom validation function */
  validator?: (config: any) => boolean | Promise<boolean>;
  /** Whether to throw on validation failure */
  throwOnError?: boolean;
}

/**
 * Configuration validation decorator.
 */
export function ValidateConfig(options: ConfigValidationOptions): ClassDecorator {
  return function <T extends Function>(target: T) {
    // Store validation metadata
    Reflect.defineMetadata('config:validation', options, target);
    return target;
  };
}

/**
 * Configuration transformer interface.
 */
export interface ConfigTransformer<TInput = any, TOutput = any> {
  /**
   * Transform configuration value.
   * @param value - Input value
   * @param key - Configuration key
   * @returns Transformed value
   */
  transform(value: TInput, key: string): TOutput;
}

/**
 * Configuration transformer decorator.
 */
export function TransformConfig<TInput, TOutput>(
  transformer: ConfigTransformer<TInput, TOutput>
): PropertyDecorator {
  return function (target: any, propertyKey: string | symbol) {
    // Store transformer metadata
    Reflect.defineMetadata('config:transformer', transformer, target, propertyKey);
  };
}

/**
 * Configuration factory with enhanced type safety.
 */
export interface TypeSafeConfigFactory<T = any> {
  (): T;
  KEY: string;
  asProvider(): {
    provide: string;
    useFactory: () => T;
    inject: [ConfigService];
  };
}

/**
 * Create a type-safe configuration factory.
 */
export function createTypeSafeConfigFactory<T>(
  key: string,
  factory: (config: ConfigService) => T
): TypeSafeConfigFactory<T> {
  const configFactory = () => {
    const configService = new ConfigService();
    return factory(configService);
  };
  (configFactory as any).KEY = key;
  (configFactory as any).asProvider = () => ({
    provide: key,
    useFactory: factory,
    inject: [ConfigService],
  });
  return configFactory as TypeSafeConfigFactory<T>;
}

/**
 * Configuration module builder for enhanced setup.
 */
export interface ConfigModuleBuilder {
  /**
   * Add AWS integration.
   */
  withAwsIntegration(options: any): ConfigModuleBuilder;

  /**
   * Add configuration factories.
   */
  withFactories(factories: TypeSafeConfigFactory[]): ConfigModuleBuilder;

  /**
   * Add validation.
   */
  withValidation(schema: any): ConfigModuleBuilder;

  /**
   * Set as global module.
   */
  asGlobal(): ConfigModuleBuilder;

  /**
   * Enable caching.
   */
  withCaching(): ConfigModuleBuilder;

  /**
   * Build the module.
   */
  build(): Type<any>;
}

/**
 * Configuration testing utilities.
 */
export interface ConfigTestingUtils {
  /**
   * Create a mock config service.
   */
  createMockConfigService(config: Record<string, any>): EnhancedConfigService;

  /**
   * Create test configuration module.
   */
  createTestConfigModule(config: Record<string, any>): Type<any>;

  /**
   * Mock AWS configuration sources.
   */
  mockAwsSources(config: Record<string, any>): void;

  /**
   * Reset all mocks.
   */
  resetMocks(): void;
}

/**
 * Configuration monitoring interface.
 */
export interface ConfigMonitor {
  /**
   * Start monitoring configuration changes.
   */
  startMonitoring(): void;

  /**
   * Stop monitoring configuration changes.
   */
  stopMonitoring(): void;

  /**
   * Get configuration metrics.
   */
  getMetrics(): ConfigMetrics;

  /**
   * Subscribe to configuration events.
   */
  subscribe(callback: (event: ConfigEvent) => void): () => void;
}

/**
 * Configuration metrics.
 */
export interface ConfigMetrics {
  /** Total configuration loads */
  totalLoads: number;
  /** Successful AWS loads */
  successfulAwsLoads: number;
  /** Failed AWS loads */
  failedAwsLoads: number;
  /** Average load time */
  averageLoadTime: number;
  /** Last load time */
  lastLoadTime?: Date;
  /** Configuration cache hit rate */
  cacheHitRate: number;
}

/**
 * Configuration event.
 */
export interface ConfigEvent {
  /** Event type */
  type: 'loaded' | 'updated' | 'error' | 'validated';
  /** Event timestamp */
  timestamp: Date;
  /** Event data */
  data: any;
  /** Source of the event */
  source: string;
}

/**
 * Configuration audit log entry.
 */
export interface ConfigAuditEntry {
  /** Audit entry ID */
  id: string;
  /** Timestamp */
  timestamp: Date;
  /** Action performed */
  action: 'load' | 'update' | 'delete' | 'validate';
  /** Configuration key affected */
  key: string;
  /** Old value (for updates) */
  oldValue?: any;
  /** New value */
  newValue?: any;
  /** Source of the change */
  source: string;
  /** User or system that made the change */
  actor: string;
}

/**
 * Configuration audit logger.
 */
export interface ConfigAuditLogger {
  /**
   * Log a configuration change.
   */
  log(entry: Omit<ConfigAuditEntry, 'id' | 'timestamp'>): void;

  /**
   * Get audit log entries.
   */
  getEntries(filter?: Partial<ConfigAuditEntry>): ConfigAuditEntry[];

  /**
   * Clear audit log.
   */
  clear(): void;
}