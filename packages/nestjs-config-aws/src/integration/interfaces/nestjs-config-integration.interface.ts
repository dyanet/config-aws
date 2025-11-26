import { ConfigFactory, ConfigModuleOptions } from '@nestjs/config';
import { DynamicModule, ModuleMetadata, Type } from '@nestjs/common';
import { IntegrationOptions } from './integration-options.interface';
import { ConfigurationSource } from './configuration-source.interface';
import { TypedConfiguration, ConfigurationSchema } from './typed-configuration.interface';

/**
 * Enhanced module options that extend @nestjs/config options with AWS integration.
 */
export interface EnhancedConfigModuleOptions extends ConfigModuleOptions {
  /** AWS integration options */
  awsIntegration?: IntegrationOptions;
  /** Whether to enable AWS configuration loading */
  enableAwsIntegration?: boolean;
  /** Custom configuration schemas for type safety */
  schemas?: ConfigurationSchema[];
}

/**
 * Factory function type for creating enhanced configuration modules.
 */
export type EnhancedConfigModuleFactory = (
  options?: EnhancedConfigModuleOptions
) => DynamicModule;

/**
 * Async factory function type for creating enhanced configuration modules.
 */
export type EnhancedAsyncConfigModuleFactory = (
  options: EnhancedAsyncConfigModuleOptions
) => DynamicModule;

/**
 * Async options for enhanced configuration module.
 */
export interface EnhancedAsyncConfigModuleOptions extends ModuleMetadata {
  /** Factory function to create enhanced configuration options */
  useFactory?: (
    ...args: any[]
  ) => Promise<EnhancedConfigModuleOptions> | EnhancedConfigModuleOptions;
  
  /** Class to use as factory */
  useClass?: Type<EnhancedConfigModuleOptionsFactory>;
  
  /** Existing instance to use as factory */
  useExisting?: Type<EnhancedConfigModuleOptionsFactory>;
  
  /** Dependencies to inject into the factory function */
  inject?: any[];
}

/**
 * Factory interface for creating enhanced configuration module options.
 */
export interface EnhancedConfigModuleOptionsFactory {
  /**
   * Create enhanced configuration module options.
   * @returns Enhanced configuration module options
   */
  createConfigOptions(): Promise<EnhancedConfigModuleOptions> | EnhancedConfigModuleOptions;
}

/**
 * Integration service interface for managing AWS and @nestjs/config integration.
 */
export interface NestJSConfigIntegrationService {
  /**
   * Initialize the integration with @nestjs/config.
   * @param options - Integration options
   */
  initialize(options: IntegrationOptions): Promise<void>;

  /**
   * Register configuration factories with @nestjs/config.
   * @param factories - Configuration factories to register
   */
  registerFactories(factories: ConfigFactory[]): Promise<void>;

  /**
   * Get configuration from AWS sources and format for @nestjs/config.
   * @param namespaces - Optional namespaces to load
   * @returns Configuration data organized for @nestjs/config
   */
  getConfigurationForNestJS(namespaces?: string[]): Promise<Record<string, any>>;

  /**
   * Create configuration factories from AWS sources.
   * @param sources - Configuration sources from AWS
   * @param namespaces - Optional namespaces to organize configuration
   * @returns Array of configuration factories
   */
  createFactoriesFromAwsSources(
    sources: ConfigurationSource[],
    namespaces?: string[]
  ): ConfigFactory[];

  /**
   * Merge AWS configuration with existing @nestjs/config configuration.
   * @param awsConfig - Configuration from AWS sources
   * @param existingConfig - Existing @nestjs/config configuration
   * @returns Merged configuration
   */
  mergeWithExistingConfig(
    awsConfig: Record<string, any>,
    existingConfig: Record<string, any>
  ): Record<string, any>;

  /**
   * Validate configuration using @nestjs/config validation patterns.
   * @param config - Configuration to validate
   * @param validationSchema - Optional validation schema
   * @returns Validation result
   */
  validateConfiguration(
    config: Record<string, any>,
    validationSchema?: any
  ): Promise<boolean>;

  /**
   * Get typed configuration with full type safety.
   * @param key - Configuration key or namespace
   * @returns Typed configuration
   */
  getTypedConfiguration<T = any>(key: string): TypedConfiguration<T> | undefined;

  /**
   * Check if the integration is properly initialized.
   * @returns True if initialized, false otherwise
   */
  isInitialized(): boolean;

  /**
   * Get integration status and health information.
   * @returns Integration status information
   */
  getStatus(): IntegrationStatus;
}

/**
 * Integration status information.
 */
export interface IntegrationStatus {
  /** Whether the integration is initialized */
  initialized: boolean;
  /** Whether AWS services are available */
  awsAvailable: boolean;
  /** Number of configuration sources loaded */
  sourcesLoaded: number;
  /** Number of factories registered */
  factoriesRegistered: number;
  /** Any errors encountered */
  errors: string[];
  /** Last update timestamp */
  lastUpdated: Date;
}

/**
 * Configuration loader interface for AWS integration with @nestjs/config.
 */
export interface AwsConfigurationLoader {
  /**
   * Load configuration from AWS sources for @nestjs/config integration.
   * @param options - Integration options
   * @returns Promise resolving to configuration data
   */
  loadForNestJSConfig(options: IntegrationOptions): Promise<Record<string, any>>;

  /**
   * Load namespaced configuration from AWS sources.
   * @param namespaces - Namespaces to load
   * @param options - Integration options
   * @returns Promise resolving to namespaced configuration data
   */
  loadNamespacedForNestJSConfig(
    namespaces: string[],
    options: IntegrationOptions
  ): Promise<Record<string, Record<string, any>>>;

  /**
   * Check if AWS services are available for configuration loading.
   * @returns Promise resolving to availability status
   */
  checkAwsAvailability(): Promise<boolean>;

  /**
   * Get configuration sources that are available.
   * @param options - Integration options
   * @returns Promise resolving to available sources
   */
  getAvailableSources(options: IntegrationOptions): Promise<string[]>;
}

/**
 * Configuration merger interface for handling precedence rules.
 */
export interface ConfigurationMerger {
  /**
   * Merge configurations with precedence rules.
   * @param sources - Configuration sources to merge
   * @param precedenceRule - Precedence rule to apply
   * @returns Merged configuration
   */
  mergeWithPrecedence(
    sources: ConfigurationSource[],
    precedenceRule: 'aws-first' | 'local-first' | 'merge'
  ): Record<string, any>;

  /**
   * Merge two configuration objects.
   * @param primary - Primary configuration (higher precedence)
   * @param secondary - Secondary configuration (lower precedence)
   * @returns Merged configuration
   */
  merge(
    primary: Record<string, any>,
    secondary: Record<string, any>
  ): Record<string, any>;

  /**
   * Deep merge configuration objects with conflict resolution.
   * @param configs - Array of configuration objects to merge
   * @param conflictResolution - How to resolve conflicts
   * @returns Merged configuration
   */
  deepMerge(
    configs: Record<string, any>[],
    conflictResolution?: 'first-wins' | 'last-wins' | 'merge-arrays'
  ): Record<string, any>;
}

/**
 * Configuration validator interface for AWS-sourced values.
 */
export interface AwsConfigurationValidator {
  /**
   * Validate configuration using Joi schema.
   * @param config - Configuration to validate
   * @param schema - Joi validation schema
   * @returns Validation result
   */
  validateWithJoi(config: Record<string, any>, schema: any): Promise<boolean>;

  /**
   * Validate configuration using class-validator.
   * @param config - Configuration to validate
   * @param validationClass - Class with validation decorators
   * @returns Validation result
   */
  validateWithClassValidator(config: Record<string, any>, validationClass: any): Promise<boolean>;

  /**
   * Validate configuration using custom validation function.
   * @param config - Configuration to validate
   * @param validationFn - Custom validation function
   * @returns Validation result
   */
  validateWithCustomFunction(
    config: Record<string, any>,
    validationFn: (config: any) => boolean | Promise<boolean>
  ): Promise<boolean>;

  /**
   * Get validation errors for configuration.
   * @param config - Configuration to validate
   * @param schema - Validation schema
   * @returns Array of validation errors
   */
  getValidationErrors(config: Record<string, any>, schema: any): string[];
}

/**
 * Utility type for extracting configuration type from @nestjs/config factory.
 */
export type ExtractConfigType<T> = T extends () => infer U ? U : never;

/**
 * Utility type for creating strongly typed configuration service.
 */
export type TypedConfigService<T extends Record<string, ConfigFactory>> = {
  get<K extends keyof T>(key: K): ExtractConfigType<T[K]> | undefined;
  getOrThrow<K extends keyof T>(key: K): ExtractConfigType<T[K]>;
};

/**
 * Configuration namespace registry for managing namespaced configurations.
 */
export interface ConfigurationNamespaceRegistry {
  /**
   * Register a namespace with its configuration factory.
   * @param namespace - Namespace name
   * @param factory - Configuration factory for the namespace
   */
  register(namespace: string, factory: ConfigFactory): void;

  /**
   * Get a configuration factory by namespace.
   * @param namespace - Namespace name
   * @returns Configuration factory or undefined
   */
  get(namespace: string): ConfigFactory | undefined;

  /**
   * Check if a namespace is registered.
   * @param namespace - Namespace name
   * @returns True if registered, false otherwise
   */
  has(namespace: string): boolean;

  /**
   * Get all registered namespaces.
   * @returns Array of namespace names
   */
  getNamespaces(): string[];

  /**
   * Unregister a namespace.
   * @param namespace - Namespace name
   */
  unregister(namespace: string): void;

  /**
   * Clear all registered namespaces.
   */
  clear(): void;
}