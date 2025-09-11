import { Injectable, Logger, Inject, Optional } from '@nestjs/common';
import { ConfigFactory, registerAs } from '@nestjs/config';
import { ConfigurationFactoryProvider, AwsConfigurationFactory } from '../interfaces/configuration-factory.interface';
import { ConfigurationSource } from '../interfaces/configuration-source.interface';
import { PrecedenceRule, IntegrationOptions } from '../interfaces/integration-options.interface';
import { PrecedenceHandlerService } from '../services/precedence-handler.service';
import { NESTJS_CONFIG_AWS_INTEGRATION_OPTIONS } from '../nestjs-config-integration.module';

/**
 * Implementation of ConfigurationFactoryProvider that creates configuration factories
 * for @nestjs/config integration with AWS configuration sources.
 */
@Injectable()
export class ConfigurationFactoryProviderImpl implements ConfigurationFactoryProvider {
  private readonly logger = new Logger(ConfigurationFactoryProviderImpl.name);

  constructor(
    private readonly precedenceHandler: PrecedenceHandlerService,
    @Optional() @Inject(NESTJS_CONFIG_AWS_INTEGRATION_OPTIONS) 
    private readonly options?: IntegrationOptions
  ) {}

  /**
   * Create a configuration factory for a specific namespace.
   * @param namespace - The namespace for the configuration
   * @param config - The configuration data
   * @returns A configuration factory that can be used with @nestjs/config
   */
  createFactory(namespace: string, config: Record<string, any>): ConfigFactory {
    this.logger.debug(`Creating configuration factory for namespace: ${namespace}`);
    
    // Create a factory function that returns the configuration
    const factory = () => {
      this.logger.debug(`Factory called for namespace: ${namespace}`);
      const processedConfig = this.processConfigurationValues(config);
      
      // Add metadata for debugging and introspection
      if (this.options?.enableLogging) {
        this.logger.debug(`Factory returning ${Object.keys(processedConfig).length} configuration keys for namespace: ${namespace}`);
      }
      
      return processedConfig;
    };

    // If namespace is provided, use registerAs to create a namespaced factory
    if (namespace && namespace.trim() !== '') {
      const namespacedFactory = registerAs(namespace, factory);
      
      // Enhance the factory with additional metadata for better integration
      (namespacedFactory as any).__namespace = namespace;
      (namespacedFactory as any).__isAwsFactory = true;
      (namespacedFactory as any).__configKeys = Object.keys(config);
      
      return namespacedFactory;
    }

    // For non-namespaced factories, add metadata as well
    (factory as any).__isAwsFactory = true;
    (factory as any).__configKeys = Object.keys(config);
    
    return factory;
  }

  /**
   * Create multiple namespaced configuration factories from a configuration object.
   * @param config - The configuration data organized by namespace
   * @returns Array of configuration factories
   */
  createNamespacedFactories(config: Record<string, any>): ConfigFactory[] {
    this.logger.debug(`Creating namespaced factories for ${Object.keys(config).length} namespaces`);
    const factories: ConfigFactory[] = [];
    
    for (const [namespace, namespaceConfig] of Object.entries(config)) {
      if (this.isValidNamespaceConfig(namespace, namespaceConfig)) {
        try {
          const factory = this.createFactory(namespace, namespaceConfig as Record<string, any>);
          factories.push(factory);
          this.logger.debug(`Created factory for namespace: ${namespace}`);
        } catch (error) {
          this.logger.error(`Failed to create factory for namespace ${namespace}:`, error);
        }
      } else {
        this.logger.warn(`Skipping invalid namespace configuration: ${namespace}`);
      }
    }
    
    return factories;
  }

  /**
   * Merge AWS configuration with existing local configuration using precedence rules.
   * @param awsConfig - Configuration loaded from AWS sources
   * @param localConfig - Local configuration data
   * @returns Merged configuration data
   */
  mergeWithExisting(
    awsConfig: Record<string, any>, 
    localConfig: Record<string, any>
  ): Record<string, any> {
    this.logger.debug('Merging AWS configuration with local configuration');
    
    // Create configuration sources for precedence handling
    const sources: ConfigurationSource[] = [
      {
        name: 'local-config',
        type: 'local-file',
        priority: 1,
        data: localConfig,
        loadedAt: new Date()
      },
      {
        name: 'aws-config',
        type: 'secrets-manager', // Assume AWS config is from secrets manager for now
        priority: 2,
        data: awsConfig,
        loadedAt: new Date()
      }
    ];

    // Use AWS-first precedence by default
    const merged = this.precedenceHandler.applyPrecedenceRules(sources, 'aws-first');
    
    this.logger.debug(`Merged configuration with ${Object.keys(merged).length} top-level keys`);
    return merged;
  }

  /**
   * Create an enhanced AWS configuration factory with metadata.
   * @param namespace - Optional namespace for the configuration
   * @param config - The configuration data
   * @param sources - Sources that contributed to this configuration
   * @param precedenceRule - Precedence rule applied to this configuration
   * @returns Enhanced AWS configuration factory
   */
  createAwsConfigurationFactory(
    namespace: string | undefined,
    config: Record<string, any>,
    sources: ConfigurationSource[],
    precedenceRule: PrecedenceRule
  ): AwsConfigurationFactory {
    const baseFactory = namespace 
      ? this.createFactory(namespace, config)
      : this.createFactory('', config);

    // Enhance the factory with AWS-specific metadata
    const awsFactory = baseFactory as AwsConfigurationFactory;
    awsFactory.namespace = namespace;
    awsFactory.sources = sources;
    awsFactory.precedenceRule = precedenceRule;

    this.logger.debug(`Created AWS configuration factory with ${sources.length} sources and precedence: ${precedenceRule}`);
    
    return awsFactory;
  }

  /**
   * Create configuration factories from multiple sources with proper organization.
   * @param sourceConfigs - Map of source name to configuration data
   * @param namespaces - Optional list of namespaces to organize configuration
   * @returns Array of configuration factories organized by namespace
   */
  createFactoriesFromSources(
    sourceConfigs: Map<string, Record<string, any>>,
    namespaces?: string[]
  ): ConfigFactory[] {
    this.logger.debug(`Creating factories from ${sourceConfigs.size} sources`);
    const factories: ConfigFactory[] = [];

    if (namespaces && namespaces.length > 0) {
      // Create namespaced factories
      for (const namespace of namespaces) {
        const namespaceConfig = this.extractNamespaceConfig(sourceConfigs, namespace);
        if (Object.keys(namespaceConfig).length > 0) {
          const factory = this.createFactory(namespace, namespaceConfig);
          factories.push(factory);
        }
      }
    } else {
      // Create a single factory with all configuration
      const mergedConfig = this.mergeSourceConfigs(sourceConfigs);
      if (Object.keys(mergedConfig).length > 0) {
        const factory = this.createFactory('', mergedConfig);
        factories.push(factory);
      }
    }

    this.logger.debug(`Created ${factories.length} factories from sources`);
    return factories;
  }

  /**
   * Create configuration factories from sources with precedence rules.
   * @param sources - Array of configuration sources
   * @param precedenceRule - Precedence rule to apply
   * @param namespaces - Optional list of namespaces to organize configuration
   * @returns Array of configuration factories
   */
  createFactoriesWithPrecedence(
    sources: ConfigurationSource[],
    precedenceRule: PrecedenceRule,
    namespaces?: string[]
  ): ConfigFactory[] {
    this.logger.debug(`Creating factories with precedence rule: ${precedenceRule}`);
    
    // Validate sources first
    const validation = this.precedenceHandler.validateSources(sources);
    if (!validation.valid) {
      this.logger.error('Invalid sources provided:', validation.issues);
      throw new Error(`Invalid configuration sources: ${validation.issues.join(', ')}`);
    }

    const factories: ConfigFactory[] = [];

    if (namespaces && namespaces.length > 0) {
      // Create namespaced factories with precedence
      for (const namespace of namespaces) {
        const namespaceSources = this.extractNamespaceSources(sources, namespace);
        if (namespaceSources.length > 0) {
          const mergedConfig = this.precedenceHandler.applyPrecedenceRules(namespaceSources, precedenceRule);
          const factory = this.createAwsConfigurationFactory(namespace, mergedConfig, namespaceSources, precedenceRule);
          factories.push(factory);
        }
      }
    } else {
      // Create a single factory with all configuration
      const mergedConfig = this.precedenceHandler.applyPrecedenceRules(sources, precedenceRule);
      const factory = this.createAwsConfigurationFactory(undefined, mergedConfig, sources, precedenceRule);
      factories.push(factory);
    }

    this.logger.debug(`Created ${factories.length} factories with precedence`);
    return factories;
  }

  /**
   * Merge configuration with explicit precedence rule.
   * @param sources - Configuration sources
   * @param precedenceRule - Precedence rule to apply
   * @returns Merged configuration data
   */
  mergeWithPrecedence(
    sources: ConfigurationSource[],
    precedenceRule: PrecedenceRule
  ): Record<string, any> {
    this.logger.debug(`Merging ${sources.length} sources with precedence: ${precedenceRule}`);
    
    const validation = this.precedenceHandler.validateSources(sources);
    if (!validation.valid) {
      this.logger.error('Invalid sources provided:', validation.issues);
      throw new Error(`Invalid configuration sources: ${validation.issues.join(', ')}`);
    }

    return this.precedenceHandler.applyPrecedenceRules(sources, precedenceRule);
  }

  /**
   * Process configuration values to handle special cases and transformations.
   * @param config - Raw configuration object
   * @returns Processed configuration object
   */
  private processConfigurationValues(config: Record<string, any>): Record<string, any> {
    const processed: Record<string, any> = {};

    for (const [key, value] of Object.entries(config)) {
      processed[key] = this.processValue(value);
    }

    return processed;
  }

  /**
   * Process individual configuration values.
   * @param value - The value to process
   * @returns Processed value
   */
  private processValue(value: any): any {
    if (value === null || value === undefined) {
      return value;
    }

    // Handle string values that might need type conversion
    if (typeof value === 'string') {
      return this.convertStringValue(value);
    }

    // Handle nested objects
    if (typeof value === 'object' && !Array.isArray(value)) {
      return this.processConfigurationValues(value);
    }

    // Handle arrays
    if (Array.isArray(value)) {
      return value.map(item => this.processValue(item));
    }

    return value;
  }

  /**
   * Convert string values to appropriate types.
   * @param value - String value to convert
   * @returns Converted value
   */
  private convertStringValue(value: string): any {
    // Handle boolean strings
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;

    // Handle numeric strings
    if (/^\d+$/.test(value)) {
      const num = parseInt(value, 10);
      return isNaN(num) ? value : num;
    }

    if (/^\d*\.\d+$/.test(value)) {
      const num = parseFloat(value);
      return isNaN(num) ? value : num;
    }

    // Handle JSON strings
    if ((value.startsWith('{') && value.endsWith('}')) || 
        (value.startsWith('[') && value.endsWith(']'))) {
      try {
        return JSON.parse(value);
      } catch {
        // If parsing fails, return as string
        return value;
      }
    }

    return value;
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

  /**
   * Extract configuration for a specific namespace from multiple sources.
   * @param sourceConfigs - Map of source configurations
   * @param namespace - Target namespace
   * @returns Configuration for the namespace
   */
  private extractNamespaceConfig(
    sourceConfigs: Map<string, Record<string, any>>,
    namespace: string
  ): Record<string, any> {
    let namespaceConfig: Record<string, any> = {};

    for (const [sourceName, config] of sourceConfigs) {
      if (config[namespace]) {
        namespaceConfig = this.deepMerge(namespaceConfig, config[namespace]);
        this.logger.debug(`Extracted ${namespace} config from source: ${sourceName}`);
      }
    }

    return namespaceConfig;
  }

  /**
   * Merge configuration from multiple sources.
   * @param sourceConfigs - Map of source configurations
   * @returns Merged configuration
   */
  private mergeSourceConfigs(sourceConfigs: Map<string, Record<string, any>>): Record<string, any> {
    let mergedConfig: Record<string, any> = {};

    for (const [sourceName, config] of sourceConfigs) {
      mergedConfig = this.deepMerge(mergedConfig, config);
      this.logger.debug(`Merged config from source: ${sourceName}`);
    }

    return mergedConfig;
  }

  /**
   * Extract sources for a specific namespace.
   * @param sources - All configuration sources
   * @param namespace - Target namespace
   * @returns Sources filtered for the namespace
   */
  private extractNamespaceSources(sources: ConfigurationSource[], namespace: string): ConfigurationSource[] {
    const namespaceSources: ConfigurationSource[] = [];

    for (const source of sources) {
      if (source.namespace === namespace || source.data[namespace]) {
        const namespaceData = source.namespace === namespace ? source.data : source.data[namespace];
        
        if (namespaceData && typeof namespaceData === 'object') {
          namespaceSources.push({
            ...source,
            data: namespaceData,
            namespace: namespace
          });
        }
      }
    }

    return namespaceSources;
  }
}