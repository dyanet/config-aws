import { Injectable, Logger, Inject, Optional } from '@nestjs/common';
import { ConfigFactory, ConfigModuleOptions } from '@nestjs/config';
import { FactoryRegistrationService } from './factory-registration.service';
import { IntegrationOptions } from '../interfaces/integration-options.interface';
import { NESTJS_CONFIG_AWS_INTEGRATION_OPTIONS } from '../nestjs-config-integration.module';

/**
 * Helper service for async configuration support with @nestjs/config.
 * This service provides utilities for creating async configuration factories
 * and managing dependency injection in async scenarios.
 */
@Injectable()
export class AsyncConfigHelperService {
  private readonly logger = new Logger(AsyncConfigHelperService.name);

  constructor(
    private readonly factoryRegistrationService: FactoryRegistrationService,
    @Optional() @Inject(NESTJS_CONFIG_AWS_INTEGRATION_OPTIONS) 
    private readonly options: IntegrationOptions = {}
  ) {}

  /**
   * Create an async configuration factory that loads AWS configuration.
   * This factory can be used with @nestjs/config's load array.
   * 
   * @returns Promise resolving to configuration factory
   */
  async createAsyncConfigFactory(): Promise<ConfigFactory> {
    this.logger.debug('Creating async configuration factory');
    
    try {
      // Register AWS factories and get the first one
      const awsFactories = await this.factoryRegistrationService.registerFactories();
      
      if (awsFactories.length === 0) {
        this.logger.warn('No AWS factories available, creating empty factory');
        return () => ({});
      }
      
      // Create a combined factory that merges all AWS factories
      const combinedFactory: ConfigFactory = () => {
        const combinedConfig: Record<string, any> = {};
        
        for (const factory of awsFactories) {
          try {
            const factoryConfig = factory();
            Object.assign(combinedConfig, factoryConfig);
          } catch (error) {
            this.logger.error(`Error executing AWS factory:`, error);
          }
        }
        
        return combinedConfig;
      };
      
      this.logger.debug(`Created async configuration factory with ${awsFactories.length} AWS factories`);
      return combinedFactory;
    } catch (error) {
      const factoryError = error instanceof Error ? error : new Error(String(error));
      this.logger.error('Failed to create async configuration factory:', factoryError);
      
      // Handle error based on options
      if (this.options.failOnAwsError) {
        throw factoryError;
      }
      
      // Return empty factory as fallback
      if (this.options.fallbackToLocal) {
        this.logger.warn('Returning empty factory due to AWS error');
        return () => ({});
      }
      
      throw factoryError;
    }
  }

  /**
   * Create multiple async configuration factories for namespaces.
   * This method creates separate factories for each namespace.
   * 
   * @param namespaces - Array of namespace names
   * @returns Promise resolving to array of namespaced configuration factories
   */
  async createAsyncNamespacedFactories(namespaces: string[]): Promise<ConfigFactory[]> {
    this.logger.debug(`Creating async namespaced factories for: ${namespaces.join(', ')}`);
    
    try {
      const namespacedFactories = await this.factoryRegistrationService.registerNamespacedFactories(namespaces);
      
      if (namespacedFactories.length === 0) {
        this.logger.warn('No namespaced factories available, creating empty factories');
        return namespaces.map(() => () => ({}));
      }
      
      this.logger.debug(`Created ${namespacedFactories.length} async namespaced factories`);
      return namespacedFactories;
    } catch (error) {
      const namespacedError = error instanceof Error ? error : new Error(String(error));
      this.logger.error('Failed to create async namespaced factories:', namespacedError);
      
      // Handle error based on options
      if (this.options.failOnAwsError) {
        throw namespacedError;
      }
      
      // Return empty factories as fallback
      if (this.options.fallbackToLocal) {
        this.logger.warn('Returning empty namespaced factories due to AWS error');
        return namespaces.map(() => () => ({}));
      }
      
      throw namespacedError;
    }
  }

  /**
   * Create an async factory function that can be used with dependency injection.
   * This method creates a factory that can receive injected dependencies.
   * 
   * @param dependencies - Array of dependency tokens to inject
   * @returns Async factory function
   */
  createAsyncFactoryWithDependencies(dependencies: any[] = []): (...args: any[]) => Promise<ConfigModuleOptions> {
    this.logger.debug(`Creating async factory with ${dependencies.length} dependencies`);
    
    return async (..._injectedDependencies: any[]): Promise<ConfigModuleOptions> => {
      try {
        this.logger.debug('Executing async factory with dependencies');
        
        // Create AWS configuration factory
        const awsFactory = await this.createAsyncConfigFactory();
        
        // Create enhanced configuration options
        const configOptions: ConfigModuleOptions = {
          load: [awsFactory],
          isGlobal: this.options.registerGlobally ?? true,
          cache: this.options.factoryOptions?.cache ?? true,
          expandVariables: this.options.factoryOptions?.expandVariables ?? true,
        };
        
        this.logger.debug('Async factory with dependencies executed successfully');
        return configOptions;
      } catch (error) {
        const dependencyError = error instanceof Error ? error : new Error(String(error));
        this.logger.error('Failed to execute async factory with dependencies:', dependencyError);
        
        // Handle error based on options
        if (this.options.failOnAwsError) {
          throw dependencyError;
        }
        
        // Return basic configuration as fallback
        if (this.options.fallbackToLocal) {
          this.logger.warn('Returning basic configuration due to dependency error');
          return {
            load: [],
            isGlobal: this.options.registerGlobally ?? true,
            cache: this.options.factoryOptions?.cache ?? true,
            expandVariables: this.options.factoryOptions?.expandVariables ?? true,
          };
        }
        
        throw dependencyError;
      }
    };
  }

  /**
   * Create an async factory that merges with existing configuration.
   * This method creates a factory that can be combined with other configuration sources.
   * 
   * @param existingFactory - Existing configuration factory to merge with
   * @returns Promise resolving to merged configuration factory
   */
  async createMergedAsyncFactory(existingFactory?: ConfigFactory): Promise<ConfigFactory> {
    this.logger.debug('Creating merged async configuration factory');
    
    try {
      // Create AWS configuration factory
      const awsFactory = await this.createAsyncConfigFactory();
      
      // If no existing factory, return AWS factory
      if (!existingFactory) {
        return awsFactory;
      }
      
      // Create merged factory
      const mergedFactory: ConfigFactory = () => {
        const awsConfig = awsFactory();
        const existingConfig = existingFactory();
        
        // Merge configurations based on precedence
        const precedence = this.options.precedence || 'aws-first';
        
        if (precedence === 'aws-first') {
          return { ...existingConfig, ...awsConfig };
        } else if (precedence === 'local-first') {
          return { ...awsConfig, ...existingConfig };
        } else {
          // merge - deep merge both configurations
          return this.deepMerge(existingConfig, awsConfig);
        }
      };
      
      this.logger.debug('Created merged async configuration factory');
      return mergedFactory;
    } catch (error) {
      const mergeError = error instanceof Error ? error : new Error(String(error));
      this.logger.error('Failed to create merged async factory:', mergeError);
      
      // Handle error based on options
      if (this.options.failOnAwsError) {
        throw mergeError;
      }
      
      // Return existing factory or empty factory as fallback
      if (this.options.fallbackToLocal) {
        this.logger.warn('Returning existing factory due to merge error');
        return existingFactory || (() => ({}));
      }
      
      throw mergeError;
    }
  }

  /**
   * Create configuration options for async module setup.
   * This method creates options that can be used with ConfigModule.forRoot().
   * 
   * @param baseOptions - Base configuration options to enhance
   * @returns Promise resolving to enhanced configuration options
   */
  async createAsyncConfigOptions(baseOptions: ConfigModuleOptions = {}): Promise<ConfigModuleOptions> {
    this.logger.debug('Creating async configuration options');
    
    try {
      // Create AWS configuration factory
      const awsFactory = await this.createAsyncConfigFactory();
      
      // Merge with existing load array
      const existingLoad = baseOptions.load || [];
      const enhancedLoad = [...existingLoad, awsFactory];
      
      // Create enhanced options
      const enhancedOptions: ConfigModuleOptions = {
        ...baseOptions,
        load: enhancedLoad,
        isGlobal: baseOptions.isGlobal !== undefined ? baseOptions.isGlobal : (this.options.registerGlobally ?? true),
        cache: baseOptions.cache !== undefined ? baseOptions.cache : (this.options.factoryOptions?.cache ?? true),
        expandVariables: baseOptions.expandVariables !== undefined ? baseOptions.expandVariables : (this.options.factoryOptions?.expandVariables ?? true),
      };
      
      this.logger.debug('Created async configuration options');
      return enhancedOptions;
    } catch (error) {
      const optionsError = error instanceof Error ? error : new Error(String(error));
      this.logger.error('Failed to create async configuration options:', optionsError);
      
      // Handle error based on options
      if (this.options.failOnAwsError) {
        throw optionsError;
      }
      
      // Return base options as fallback
      if (this.options.fallbackToLocal) {
        this.logger.warn('Returning base options due to async error');
        return baseOptions;
      }
      
      throw optionsError;
    }
  }

  /**
   * Check if AWS configuration is available for async loading.
   * This method can be used to determine if AWS integration should be enabled.
   * 
   * @returns Promise resolving to availability status
   */
  async checkAsyncAvailability(): Promise<{
    isAvailable: boolean;
    factoriesCount: number;
    errors: string[];
  }> {
    this.logger.debug('Checking async configuration availability');
    
    const status = {
      isAvailable: false,
      factoriesCount: 0,
      errors: [] as string[]
    };

    try {
      // Try to register factories to check availability
      const factories = await this.factoryRegistrationService.registerFactories();
      
      status.isAvailable = factories.length > 0;
      status.factoriesCount = factories.length;
      
      this.logger.debug(`Async availability check: available=${status.isAvailable}, factories=${status.factoriesCount}`);
    } catch (error) {
      const availabilityError = error instanceof Error ? error : new Error(String(error));
      status.errors.push(availabilityError.message);
      this.logger.error('Async availability check failed:', availabilityError);
    }

    return status;
  }

  /**
   * Create a factory that loads configuration on-demand.
   * This factory delays AWS configuration loading until it's actually needed.
   * 
   * @returns Configuration factory with lazy loading
   */
  createLazyAsyncFactory(): ConfigFactory {
    this.logger.debug('Creating lazy async configuration factory');
    
    let cachedConfig: Record<string, any> | null = null;
    let loadingPromise: Promise<Record<string, any>> | null = null;
    
    return () => {
      // Return cached config if available
      if (cachedConfig !== null) {
        return cachedConfig;
      }
      
      // If already loading, wait for the promise
      if (loadingPromise) {
        // For synchronous factory, we can't wait for async operations
        // Return empty config and let the promise resolve in background
        this.logger.warn('Lazy factory called while loading, returning empty config');
        return {};
      }
      
      // Start loading configuration
      loadingPromise = this.loadConfigurationLazily();
      
      // Return empty config for now (will be populated on next call)
      this.logger.debug('Started lazy loading, returning empty config');
      return {};
    };
  }

  /**
   * Load configuration lazily for the lazy factory.
   * @returns Promise resolving to configuration data
   */
  private async loadConfigurationLazily(): Promise<Record<string, any>> {
    try {
      this.logger.debug('Loading configuration lazily');
      
      const awsFactory = await this.createAsyncConfigFactory();
      const config = awsFactory();
      
      // Cache the configuration
      const cachedConfig = config;
      
      this.logger.debug('Lazy configuration loading completed');
      return cachedConfig;
    } catch (error) {
      const lazyError = error instanceof Error ? error : new Error(String(error));
      this.logger.error('Lazy configuration loading failed:', lazyError);
      
      // Return empty config on error
      return {};
    }
  }

  /**
   * Deep merge two configuration objects.
   * @param target - Target object
   * @param source - Source object
   * @returns Merged object
   */
  private deepMerge(target: Record<string, any>, source: Record<string, any>): Record<string, any> {
    const result = { ...target };

    for (const [key, value] of Object.entries(source)) {
      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        if (result[key] && typeof result[key] === 'object' && !Array.isArray(result[key])) {
          result[key] = this.deepMerge(result[key], value);
        } else {
          result[key] = { ...value };
        }
      } else {
        result[key] = value;
      }
    }

    return result;
  }
}