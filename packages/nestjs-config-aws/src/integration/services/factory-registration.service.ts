import { Injectable, Logger, Inject, Optional } from '@nestjs/common';
import { ConfigFactory } from '@nestjs/config';
import { ConfigurationFactoryProviderImpl } from '../providers/configuration-factory.provider';
import { AwsConfigurationLoaderService } from '../providers/aws-configuration-loader.service';
import { IntegrationOptions } from '../interfaces/integration-options.interface';
import { ConfigurationSource } from '../interfaces/configuration-source.interface';
import { NESTJS_CONFIG_AWS_INTEGRATION_OPTIONS } from '../nestjs-config-integration.module';
import { NamespaceHandlerService } from './namespace-handler.service';
import { ValidationIntegrationService } from './validation-integration.service';

/**
 * Service responsible for registering configuration factories with @nestjs/config.
 * This service creates and manages the bridge between AWS-loaded configuration
 * and the standard @nestjs/config module.
 */
@Injectable()
export class FactoryRegistrationService {
  private readonly logger = new Logger(FactoryRegistrationService.name);
  private readonly registeredFactories: Map<string, ConfigFactory> = new Map();
  private isInitialized = false;

  constructor(
    private readonly configurationFactoryProvider: ConfigurationFactoryProviderImpl,
    private readonly awsConfigurationLoader: AwsConfigurationLoaderService,
    private readonly namespaceHandler: NamespaceHandlerService,
    private readonly validationService: ValidationIntegrationService,
    @Optional() @Inject(NESTJS_CONFIG_AWS_INTEGRATION_OPTIONS) 
    private readonly options: IntegrationOptions = {}
  ) {}

  /**
   * Register configuration factories with @nestjs/config based on AWS-loaded configuration.
   * This method loads configuration from AWS sources and creates factories that can be
   * consumed by @nestjs/config.
   * 
   * @returns Promise resolving to array of registered configuration factories
   */
  async registerFactories(): Promise<ConfigFactory[]> {
    if (this.isInitialized) {
      this.logger.debug('Factories already registered, returning cached factories');
      return Array.from(this.registeredFactories.values());
    }

    try {
      this.logger.debug('Starting factory registration process');
      
      // Load configuration from AWS sources
      const awsConfig = await this.loadAwsConfiguration();
      
      // Create configuration factories based on options
      const factories = await this.createConfigurationFactories(awsConfig);
      
      // Register factories and track them
      this.registerFactoriesInternal(factories);
      
      this.isInitialized = true;
      this.logger.log(`Successfully registered ${factories.length} configuration factories`);
      
      return factories;
    } catch (error) {
      const registrationError = error instanceof Error ? error : new Error(String(error));
      this.logger.error('Failed to register configuration factories:', registrationError);
      
      // Handle registration failure based on options
      if (this.options.failOnAwsError) {
        throw registrationError;
      }
      
      // Return empty factories array if fallback is enabled
      if (this.options.fallbackToLocal) {
        this.logger.warn('Falling back to empty configuration factories due to AWS error');
        return [];
      }
      
      throw registrationError;
    }
  }

  /**
   * Register configuration factories asynchronously.
   * This method is designed to work with @nestjs/config's forRootAsync pattern.
   * 
   * @returns Promise resolving to array of configuration factories
   */
  async registerFactoriesAsync(): Promise<ConfigFactory[]> {
    this.logger.debug('Starting async factory registration');
    
    try {
      // Ensure AWS services are available before proceeding
      const isAwsAvailable = await this.awsConfigurationLoader.isAvailable();
      
      if (!isAwsAvailable && this.options.failOnAwsError) {
        throw new Error('AWS services are not available and failOnAwsError is enabled');
      }
      
      if (!isAwsAvailable) {
        this.logger.warn('AWS services not available, registering empty factories');
        return [];
      }
      
      // Load configuration asynchronously
      const factories = await this.registerFactories();
      
      this.logger.debug(`Async factory registration completed with ${factories.length} factories`);
      return factories;
    } catch (error) {
      const asyncError = error instanceof Error ? error : new Error(String(error));
      this.logger.error('Async factory registration failed:', asyncError);
      
      // Handle async registration failure
      if (this.options.fallbackToLocal) {
        this.logger.warn('Falling back to empty factories for async registration');
        return [];
      }
      
      throw asyncError;
    }
  }

  /**
   * Create a single configuration factory for immediate use.
   * This method can be used for synchronous factory creation.
   * 
   * @param namespace - Optional namespace for the factory
   * @param config - Configuration data to use for the factory
   * @returns Configuration factory
   */
  createSyncFactory(namespace?: string, config?: Record<string, any>): ConfigFactory {
    this.logger.debug(`Creating synchronous factory for namespace: ${namespace || 'default'}`);
    
    // Use provided config or create empty config
    const factoryConfig = config || {};
    
    // Create factory using the configuration factory provider
    const factory = this.configurationFactoryProvider.createFactory(
      namespace || '',
      factoryConfig
    );
    
    // Track the factory
    const factoryKey = namespace || 'default';
    this.registeredFactories.set(factoryKey, factory);
    
    this.logger.debug(`Created synchronous factory: ${factoryKey}`);
    return factory;
  }

  /**
   * Register factories for specific namespaces.
   * This method allows selective registration of configuration for specific namespaces.
   * 
   * @param namespaces - Array of namespace names to register
   * @returns Promise resolving to array of namespace-specific factories
   */
  async registerNamespacedFactories(namespaces: string[]): Promise<ConfigFactory[]> {
    this.logger.debug(`Registering factories for namespaces: ${namespaces.join(', ')}`);
    
    try {
      // Load namespaced configuration from AWS
      const namespacedConfig = await this.awsConfigurationLoader.loadNamespacedConfiguration(namespaces);
      
      // Create factories for each namespace
      const factories: ConfigFactory[] = [];
      
      for (const namespace of namespaces) {
        const namespaceConfig = namespacedConfig[namespace];
        
        if (namespaceConfig && Object.keys(namespaceConfig).length > 0) {
          const factory = this.configurationFactoryProvider.createFactory(namespace, namespaceConfig);
          factories.push(factory);
          
          // Track the factory
          this.registeredFactories.set(namespace, factory);
          
          this.logger.debug(`Created factory for namespace: ${namespace}`);
        } else {
          this.logger.warn(`No configuration found for namespace: ${namespace}`);
        }
      }
      
      this.logger.log(`Successfully registered ${factories.length} namespaced factories`);
      return factories;
    } catch (error) {
      const namespacedError = error instanceof Error ? error : new Error(String(error));
      this.logger.error('Failed to register namespaced factories:', namespacedError);
      
      if (this.options.failOnAwsError) {
        throw namespacedError;
      }
      
      // Return empty factories if fallback is enabled
      return [];
    }
  }

  /**
   * Get all registered factories.
   * @returns Map of factory names to configuration factories
   */
  getRegisteredFactories(): Map<string, ConfigFactory> {
    return new Map(this.registeredFactories);
  }

  /**
   * Get a specific registered factory by name.
   * @param name - Name of the factory to retrieve
   * @returns Configuration factory or undefined if not found
   */
  getFactory(name: string): ConfigFactory | undefined {
    return this.registeredFactories.get(name);
  }

  /**
   * Check if factories have been initialized.
   * @returns Whether factories have been registered
   */
  isFactoriesInitialized(): boolean {
    return this.isInitialized;
  }

  /**
   * Register validated namespace factories with schema validation.
   * This method creates factories that validate configuration using Joi, class-validator, or custom functions.
   * 
   * @param namespaces - Array of namespace names to register
   * @param validationSchemas - Validation schemas for each namespace
   * @param validationType - Type of validation to use
   * @returns Promise resolving to array of validated namespace factories
   */
  async registerValidatedNamespaceFactories(
    namespaces: string[],
    validationSchemas: Record<string, any>,
    validationType: 'joi' | 'class-validator' | 'custom' = 'custom'
  ): Promise<ConfigFactory[]> {
    this.logger.debug(`Registering validated factories for namespaces: ${namespaces.join(', ')} with ${validationType} validation`);
    
    try {
      // Load namespaced configuration from AWS
      const namespacedConfig = await this.awsConfigurationLoader.loadNamespacedConfiguration(namespaces);
      const sources = await this.awsConfigurationLoader.getAvailableSources();
      
      // Create validated factories for each namespace
      const factories: ConfigFactory[] = [];
      
      for (const namespace of namespaces) {
        const namespaceConfig = namespacedConfig[namespace];
        const validationSchema = validationSchemas[namespace];
        
        if (namespaceConfig && Object.keys(namespaceConfig).length > 0 && validationSchema) {
          try {
            // Create validated factory using the validation service
            const factory = this.validationService.createValidatedFactory(
              namespace,
              namespaceConfig,
              validationSchema,
              validationType,
              sources.filter(s => s.namespace === namespace || s.data[namespace])
            );
            
            factories.push(factory);
            
            // Track the factory
            this.registeredFactories.set(namespace, factory);
            
            this.logger.debug(`Created validated factory for namespace: ${namespace}`);
          } catch (error) {
            this.logger.error(`Failed to create validated factory for namespace ${namespace}:`, error);
            
            if (this.options.failOnAwsError) {
              throw error;
            }
          }
        } else {
          if (!namespaceConfig || Object.keys(namespaceConfig).length === 0) {
            this.logger.warn(`No configuration found for namespace: ${namespace}`);
          }
          if (!validationSchema) {
            this.logger.warn(`No validation schema provided for namespace: ${namespace}`);
          }
        }
      }
      
      this.logger.log(`Successfully registered ${factories.length} validated namespace factories`);
      return factories;
    } catch (error) {
      const validatedError = error instanceof Error ? error : new Error(String(error));
      this.logger.error('Failed to register validated namespace factories:', validatedError);
      
      if (this.options.failOnAwsError) {
        throw validatedError;
      }
      
      // Return empty factories if fallback is enabled
      return [];
    }
  }

  /**
   * Create enhanced namespace factories using the namespace handler service.
   * This method provides improved namespace support with better configuration extraction.
   * 
   * @param namespaces - Array of namespace names to create factories for
   * @returns Promise resolving to array of enhanced namespace factories
   */
  async createEnhancedNamespaceFactories(namespaces: string[]): Promise<ConfigFactory[]> {
    this.logger.debug(`Creating enhanced namespace factories for: ${namespaces.join(', ')}`);
    
    try {
      // Load configuration from AWS sources
      const awsConfig = await this.awsConfigurationLoader.loadConfiguration();
      const sources = await this.awsConfigurationLoader.getAvailableSources();
      
      // Organize configuration by namespaces using the namespace handler
      const organizedConfig = this.namespaceHandler.organizeConfigByNamespaces(awsConfig, namespaces);
      
      // Create namespace factories using the namespace handler
      const factories = this.namespaceHandler.createMultipleNamespaceFactories(organizedConfig, sources);
      
      // Track the factories
      for (const factory of factories) {
        const namespace = (factory as any).__namespace;
        if (namespace) {
          this.registeredFactories.set(namespace, factory);
        }
      }
      
      this.logger.log(`Successfully created ${factories.length} enhanced namespace factories`);
      return factories;
    } catch (error) {
      const enhancedError = error instanceof Error ? error : new Error(String(error));
      this.logger.error('Failed to create enhanced namespace factories:', enhancedError);
      
      if (this.options.failOnAwsError) {
        throw enhancedError;
      }
      
      return [];
    }
  }

  /**
   * Get validation recommendations for current configuration.
   * This method analyzes the loaded configuration and provides validation recommendations.
   * 
   * @returns Promise resolving to validation recommendations
   */
  async getValidationRecommendations(): Promise<Record<string, any>> {
    try {
      const awsConfig = await this.awsConfigurationLoader.loadConfiguration();
      return this.validationService.getValidationRecommendations(awsConfig);
    } catch (error) {
      this.logger.error('Failed to get validation recommendations:', error);
      return {
        recommendedProvider: 'custom',
        reasons: ['Unable to analyze configuration'],
        examples: {}
      };
    }
  }

  /**
   * Validate namespace access patterns for current configuration.
   * This method checks if namespace configurations are properly structured for @nestjs/config access.
   * 
   * @param namespaces - Namespaces to validate
   * @returns Promise resolving to validation results
   */
  async validateNamespaceAccess(namespaces: string[]): Promise<Record<string, any>> {
    try {
      const namespacedConfig = await this.awsConfigurationLoader.loadNamespacedConfiguration(namespaces);
      const results: Record<string, any> = {};
      
      for (const [namespace, config] of Object.entries(namespacedConfig)) {
        results[namespace] = this.namespaceHandler.validateNamespaceAccess(namespace, config);
      }
      
      return results;
    } catch (error) {
      this.logger.error('Failed to validate namespace access:', error);
      return {};
    }
  }

  /**
   * Reset the factory registration state.
   * This method clears all registered factories and resets the initialization state.
   */
  reset(): void {
    this.logger.debug('Resetting factory registration state');
    this.registeredFactories.clear();
    this.isInitialized = false;
  }

  /**
   * Load configuration from AWS sources with error handling.
   * @returns Promise resolving to AWS configuration data
   */
  private async loadAwsConfiguration(): Promise<Record<string, any>> {
    try {
      // Check if namespaces are specified for targeted loading
      if (this.options.namespaces && this.options.namespaces.length > 0) {
        this.logger.debug(`Loading configuration for namespaces: ${this.options.namespaces.join(', ')}`);
        const namespacedConfig = await this.awsConfigurationLoader.loadNamespacedConfiguration(this.options.namespaces);
        
        // Flatten namespaced configuration for factory creation
        const flattenedConfig: Record<string, any> = {};
        for (const [namespace, config] of Object.entries(namespacedConfig)) {
          flattenedConfig[namespace] = config;
        }
        
        return flattenedConfig;
      } else {
        // Load all available configuration
        this.logger.debug('Loading all available AWS configuration');
        return await this.awsConfigurationLoader.loadConfiguration();
      }
    } catch (error) {
      const loadError = error instanceof Error ? error : new Error(String(error));
      this.logger.error('Failed to load AWS configuration:', loadError);
      
      // Handle AWS unavailability
      if (this.options.fallbackToLocal) {
        this.logger.warn('AWS configuration loading failed, using empty configuration');
        return {};
      }
      
      throw loadError;
    }
  }

  /**
   * Create configuration factories based on loaded AWS configuration.
   * @param awsConfig - Configuration data loaded from AWS
   * @returns Promise resolving to array of configuration factories
   */
  private async createConfigurationFactories(awsConfig: Record<string, any>): Promise<ConfigFactory[]> {
    const factories: ConfigFactory[] = [];
    
    try {
      // Get configuration sources for metadata
      const sources = await this.awsConfigurationLoader.getAvailableSources();
      
      if (this.options.namespaces && this.options.namespaces.length > 0) {
        // Create namespaced factories
        factories.push(...this.createNamespacedFactoriesFromConfig(awsConfig, sources));
      } else {
        // Create a single factory with all configuration
        const factory = this.createSingleFactoryFromConfig(awsConfig, sources);
        if (factory) {
          factories.push(factory);
        }
      }
      
      this.logger.debug(`Created ${factories.length} configuration factories`);
      return factories;
    } catch (error) {
      const factoryError = error instanceof Error ? error : new Error(String(error));
      this.logger.error('Failed to create configuration factories:', factoryError);
      throw factoryError;
    }
  }

  /**
   * Create namespaced factories from configuration data.
   * @param config - Configuration data organized by namespace
   * @param sources - Configuration sources metadata
   * @returns Array of namespaced configuration factories
   */
  private createNamespacedFactoriesFromConfig(
    config: Record<string, any>,
    sources: ConfigurationSource[]
  ): ConfigFactory[] {
    const factories: ConfigFactory[] = [];
    
    for (const [namespace, namespaceConfig] of Object.entries(config)) {
      if (this.isValidNamespaceConfig(namespace, namespaceConfig)) {
        try {
          const factory = this.configurationFactoryProvider.createAwsConfigurationFactory(
            namespace,
            namespaceConfig as Record<string, any>,
            sources.filter(s => s.namespace === namespace || s.data[namespace]),
            this.options.precedence || 'aws-first'
          );
          
          factories.push(factory);
          this.logger.debug(`Created namespaced factory: ${namespace}`);
        } catch (error) {
          this.logger.error(`Failed to create factory for namespace ${namespace}:`, error);
        }
      }
    }
    
    return factories;
  }

  /**
   * Create a single factory from all configuration data.
   * @param config - All configuration data
   * @param sources - Configuration sources metadata
   * @returns Single configuration factory or null if no valid configuration
   */
  private createSingleFactoryFromConfig(
    config: Record<string, any>,
    sources: ConfigurationSource[]
  ): ConfigFactory | null {
    if (!config || Object.keys(config).length === 0) {
      this.logger.warn('No configuration data available for factory creation');
      return null;
    }
    
    try {
      const factory = this.configurationFactoryProvider.createAwsConfigurationFactory(
        undefined,
        config,
        sources,
        this.options.precedence || 'aws-first'
      );
      
      this.logger.debug('Created single configuration factory');
      return factory;
    } catch (error) {
      this.logger.error('Failed to create single configuration factory:', error);
      return null;
    }
  }

  /**
   * Register factories internally and track them.
   * @param factories - Array of factories to register
   */
  private registerFactoriesInternal(factories: ConfigFactory[]): void {
    for (const factory of factories) {
      // Determine factory name/key
      const factoryKey = this.getFactoryKey(factory);
      
      // Track the factory
      this.registeredFactories.set(factoryKey, factory);
      
      this.logger.debug(`Registered factory: ${factoryKey}`);
    }
  }

  /**
   * Get a unique key for a factory for tracking purposes.
   * @param factory - Configuration factory
   * @returns Unique key for the factory
   */
  private getFactoryKey(factory: ConfigFactory): string {
    // Check if it's an AWS configuration factory with namespace
    if ('namespace' in factory && factory.namespace) {
      return factory.namespace as string;
    }
    
    // Generate a unique key based on factory properties
    const factoryString = factory.toString();
    const hash = this.simpleHash(factoryString);
    
    return `factory_${hash}`;
  }

  /**
   * Generate a simple hash for factory identification.
   * @param str - String to hash
   * @returns Simple hash value
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Validate if a namespace configuration is valid.
   * @param namespace - The namespace name
   * @param config - The configuration data
   * @returns True if valid, false otherwise
   */
  private isValidNamespaceConfig(namespace: string, config: any): boolean {
    return typeof namespace === 'string' && 
           namespace.trim() !== '' &&
           config !== null &&
           config !== undefined &&
           typeof config === 'object' &&
           !Array.isArray(config);
  }
}