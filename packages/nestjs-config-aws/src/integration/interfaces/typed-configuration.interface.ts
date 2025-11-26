// Type definitions for typed configuration access

/**
 * Generic type for typed configuration access.
 * Provides type safety for configuration values loaded from AWS sources.
 */
export interface TypedConfiguration<T = any> {
  /** The configuration data with proper typing */
  data: T;
  /** Namespace for this configuration */
  namespace?: string;
  /** Whether this configuration was loaded from AWS sources */
  fromAws: boolean;
  /** Timestamp when this configuration was loaded */
  loadedAt: Date;
}

/**
 * Generic configuration factory with type safety.
 */
export interface TypedConfigurationFactory<T = any> {
  /** Type-safe configuration data */
  (): T;
}

/**
 * Configuration accessor with type safety for AWS-sourced values.
 */
export interface TypedConfigurationAccessor {
  /**
   * Get typed configuration value with type safety.
   * @param key - Configuration key (supports dot notation)
   * @returns Typed configuration value
   */
  get<T = any>(key: string): T | undefined;

  /**
   * Get typed configuration value or throw if not found.
   * @param key - Configuration key (supports dot notation)
   * @returns Typed configuration value
   * @throws Error if key is not found
   */
  getOrThrow<T = any>(key: string): T;

  /**
   * Get namespaced typed configuration.
   * @param namespace - Configuration namespace
   * @returns Typed configuration for the namespace
   */
  getNamespaced<T = any>(namespace: string): TypedConfiguration<T> | undefined;

  /**
   * Get namespaced typed configuration or throw if not found.
   * @param namespace - Configuration namespace
   * @returns Typed configuration for the namespace
   * @throws Error if namespace is not found
   */
  getNamespacedOrThrow<T = any>(namespace: string): TypedConfiguration<T>;

  /**
   * Check if a configuration key exists.
   * @param key - Configuration key (supports dot notation)
   * @returns True if key exists, false otherwise
   */
  has(key: string): boolean;

  /**
   * Check if a namespace exists.
   * @param namespace - Configuration namespace
   * @returns True if namespace exists, false otherwise
   */
  hasNamespace(namespace: string): boolean;

  /**
   * Get all configuration keys.
   * @returns Array of all configuration keys
   */
  getKeys(): string[];

  /**
   * Get all namespaces.
   * @returns Array of all namespaces
   */
  getNamespaces(): string[];
}

/**
 * Type-safe configuration schema definition.
 */
export interface ConfigurationSchema<T = any> {
  /** Schema name/identifier */
  name: string;
  /** Optional namespace for this schema */
  namespace?: string;
  /** Type definition for the configuration */
  type: new () => T;
  /** Optional validation function */
  validate?: (config: any) => config is T;
  /** Optional default values */
  defaults?: Partial<T>;
}

/**
 * Configuration registry for managing typed configurations.
 */
export interface TypedConfigurationRegistry {
  /**
   * Register a typed configuration schema.
   * @param schema - Configuration schema to register
   */
  register<T>(schema: ConfigurationSchema<T>): void;

  /**
   * Get a typed configuration by name.
   * @param name - Schema name
   * @returns Typed configuration or undefined
   */
  get<T = any>(name: string): TypedConfiguration<T> | undefined;

  /**
   * Get a typed configuration by name or throw if not found.
   * @param name - Schema name
   * @returns Typed configuration
   * @throws Error if schema is not found
   */
  getOrThrow<T = any>(name: string): TypedConfiguration<T>;

  /**
   * Check if a schema is registered.
   * @param name - Schema name
   * @returns True if schema is registered, false otherwise
   */
  has(name: string): boolean;

  /**
   * Get all registered schema names.
   * @returns Array of schema names
   */
  getSchemaNames(): string[];

  /**
   * Unregister a schema.
   * @param name - Schema name to unregister
   */
  unregister(name: string): void;

  /**
   * Clear all registered schemas.
   */
  clear(): void;
}

/**
 * Options for typed configuration access.
 */
export interface TypedConfigurationOptions {
  /** Whether to enable strict type checking */
  strictTypes?: boolean;
  /** Whether to cache typed configurations */
  cache?: boolean;
  /** Default namespace for unnamespaced configurations */
  defaultNamespace?: string;
  /** Whether to throw on type validation failures */
  throwOnValidationError?: boolean;
}

/**
 * Utility type for extracting configuration type from a factory.
 */
export type ConfigurationType<T> = T extends TypedConfigurationFactory<infer U> ? U : never;

/**
 * Utility type for creating strongly typed configuration objects.
 */
export type StronglyTypedConfig<T extends Record<string, any>> = {
  readonly [K in keyof T]: T[K];
};

/**
 * Configuration value with metadata about its source and type.
 */
export interface ConfigurationValue<T = any> {
  /** The actual configuration value */
  value: T;
  /** Source of this configuration value */
  source: 'environment' | 'secrets-manager' | 'ssm' | 'local-file';
  /** Whether this value came from AWS */
  fromAws: boolean;
  /** Namespace this value belongs to */
  namespace?: string;
  /** Original key used to access this value */
  key: string;
  /** Type of the value */
  type: string;
  /** Whether this value was validated */
  validated: boolean;
  /** Timestamp when this value was loaded */
  loadedAt: Date;
}

/**
 * Configuration path resolver for nested configuration access.
 */
export interface ConfigurationPathResolver {
  /**
   * Resolve a configuration path to its value.
   * @param path - Configuration path (supports dot notation)
   * @param config - Configuration object to resolve against
   * @returns Resolved value or undefined
   */
  resolve<T = any>(path: string, config: Record<string, any>): T | undefined;

  /**
   * Set a value at a configuration path.
   * @param path - Configuration path (supports dot notation)
   * @param value - Value to set
   * @param config - Configuration object to modify
   */
  set<T = any>(path: string, value: T, config: Record<string, any>): void;

  /**
   * Check if a configuration path exists.
   * @param path - Configuration path (supports dot notation)
   * @param config - Configuration object to check
   * @returns True if path exists, false otherwise
   */
  exists(path: string, config: Record<string, any>): boolean;

  /**
   * Get all paths in a configuration object.
   * @param config - Configuration object to analyze
   * @returns Array of all configuration paths
   */
  getAllPaths(config: Record<string, any>): string[];
}