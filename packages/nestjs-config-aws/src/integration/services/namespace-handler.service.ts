import { Injectable, Logger } from '@nestjs/common';
import { ConfigFactory, registerAs } from '@nestjs/config';
import { ConfigurationSource } from '../interfaces/configuration-source.interface';

/**
 * Service for handling namespace-aware configuration loading and factory creation.
 * Provides enhanced namespace support for @nestjs/config integration.
 */
@Injectable()
export class NamespaceHandlerService {
  private readonly logger = new Logger(NamespaceHandlerService.name);

  /**
   * Create a registerAs factory for a specific namespace.
   * This method creates a factory that can be used with @nestjs/config's registerAs pattern.
   * 
   * @param namespace - The namespace for the configuration
   * @param config - The configuration data for the namespace
   * @param sources - Optional configuration sources metadata
   * @returns A registerAs factory for the namespace
   */
  createNamespaceFactory(
    namespace: string,
    config: Record<string, any>,
    sources?: ConfigurationSource[]
  ): ConfigFactory {
    this.logger.debug(`Creating namespace factory for: ${namespace}`);

    // Validate namespace
    if (!this.isValidNamespace(namespace)) {
      throw new Error(`Invalid namespace: ${namespace}`);
    }

    // Create the factory function
    const factory = () => {
      this.logger.debug(`Namespace factory called for: ${namespace}`);
      
      // Process and validate configuration
      const processedConfig = this.processNamespaceConfig(config, namespace);
      
      this.logger.debug(`Namespace factory returning ${Object.keys(processedConfig).length} keys for: ${namespace}`);
      return processedConfig;
    };

    // Create registerAs factory
    const namespacedFactory = registerAs(namespace, factory);

    // Add metadata for introspection and debugging
    this.addFactoryMetadata(namespacedFactory, namespace, config, sources);

    return namespacedFactory;
  }

  /**
   * Create multiple namespace factories from configuration data.
   * 
   * @param namespacedConfig - Configuration data organized by namespace
   * @param sources - Optional configuration sources metadata
   * @returns Array of namespace factories
   */
  createMultipleNamespaceFactories(
    namespacedConfig: Record<string, Record<string, any>>,
    sources?: ConfigurationSource[]
  ): ConfigFactory[] {
    this.logger.debug(`Creating multiple namespace factories for: ${Object.keys(namespacedConfig).join(', ')}`);

    const factories: ConfigFactory[] = [];

    for (const [namespace, config] of Object.entries(namespacedConfig)) {
      if (this.isValidNamespaceConfig(namespace, config)) {
        try {
          const namespaceSources = sources?.filter(s => 
            s.namespace === namespace || 
            s.data[namespace] !== undefined
          );

          const factory = this.createNamespaceFactory(namespace, config, namespaceSources);
          factories.push(factory);
          
          this.logger.debug(`Created namespace factory for: ${namespace}`);
        } catch (error) {
          this.logger.error(`Failed to create namespace factory for ${namespace}:`, error);
        }
      } else {
        this.logger.warn(`Skipping invalid namespace configuration: ${namespace}`);
      }
    }

    this.logger.debug(`Created ${factories.length} namespace factories`);
    return factories;
  }

  /**
   * Extract namespace configuration from flat configuration using various strategies.
   * 
   * @param config - Flat configuration object
   * @param namespace - Target namespace
   * @returns Configuration for the namespace
   */
  extractNamespaceConfig(config: Record<string, any>, namespace: string): Record<string, any> {
    const namespaceConfig: Record<string, any> = {};

    // Strategy 1: Direct namespace key (e.g., config.database)
    if (config[namespace] && typeof config[namespace] === 'object') {
      Object.assign(namespaceConfig, config[namespace]);
    }

    // Strategy 2: Prefixed keys (e.g., DATABASE_HOST -> host)
    const prefixedConfig = this.extractPrefixedConfig(config, namespace);
    Object.assign(namespaceConfig, prefixedConfig);

    // Strategy 3: Path-based keys (e.g., /app/database/host -> host)
    const pathConfig = this.extractPathBasedConfig(config, namespace);
    Object.assign(namespaceConfig, pathConfig);

    return namespaceConfig;
  }

  /**
   * Organize flat configuration into namespaces based on patterns.
   * 
   * @param config - Flat configuration object
   * @param namespaces - List of target namespaces
   * @returns Configuration organized by namespace
   */
  organizeConfigByNamespaces(
    config: Record<string, any>,
    namespaces: string[]
  ): Record<string, Record<string, any>> {
    const organized: Record<string, Record<string, any>> = {};

    // Initialize all namespaces
    for (const namespace of namespaces) {
      organized[namespace] = {};
    }

    // Extract configuration for each namespace
    for (const namespace of namespaces) {
      organized[namespace] = this.extractNamespaceConfig(config, namespace);
    }

    // Handle remaining configuration that doesn't match any namespace
    const remainingConfig = this.extractRemainingConfig(config, namespaces);
    if (Object.keys(remainingConfig).length > 0) {
      organized['default'] = remainingConfig;
    }

    return organized;
  }

  /**
   * Validate namespace access patterns for @nestjs/config compatibility.
   * 
   * @param namespace - Namespace to validate
   * @param config - Configuration for the namespace
   * @returns Validation result with suggestions
   */
  validateNamespaceAccess(
    namespace: string,
    config: Record<string, any>
  ): {
    isValid: boolean;
    issues: string[];
    suggestions: string[];
  } {
    const issues: string[] = [];
    const suggestions: string[] = [];

    // Check namespace name validity
    if (!this.isValidNamespace(namespace)) {
      issues.push(`Invalid namespace name: ${namespace}`);
      suggestions.push('Use alphanumeric characters and underscores only');
    }

    // Check for reserved namespace names
    if (this.isReservedNamespace(namespace)) {
      issues.push(`Reserved namespace name: ${namespace}`);
      suggestions.push('Choose a different namespace name');
    }

    // Check configuration structure
    if (!this.isValidNamespaceConfig(namespace, config)) {
      issues.push('Invalid configuration structure for namespace');
      suggestions.push('Ensure configuration is a non-empty object');
    }

    // Check for potential key conflicts
    const conflicts = this.findKeyConflicts(config);
    if (conflicts.length > 0) {
      issues.push(`Key conflicts found: ${conflicts.join(', ')}`);
      suggestions.push('Resolve key naming conflicts');
    }

    return {
      isValid: issues.length === 0,
      issues,
      suggestions
    };
  }

  /**
   * Generate access patterns documentation for a namespace.
   * 
   * @param namespace - Namespace name
   * @param config - Configuration for the namespace
   * @returns Access patterns documentation
   */
  generateAccessPatterns(
    namespace: string,
    config: Record<string, any>
  ): {
    namespace: string;
    patterns: {
      injection: string;
      service: string;
      direct: string;
    };
    examples: string[];
  } {
    const patterns = {
      injection: `@Inject(${namespace}Config.KEY)`,
      service: `this.configService.get('${namespace}')`,
      direct: `this.configService.get('${namespace}.key')`
    };

    const examples = this.generateUsageExamples(namespace, config);

    return {
      namespace,
      patterns,
      examples
    };
  }

  /**
   * Process namespace configuration with validation and transformation.
   * 
   * @param config - Raw configuration for the namespace
   * @param namespace - Namespace name
   * @returns Processed configuration
   */
  private processNamespaceConfig(
    config: Record<string, any>,
    namespace: string
  ): Record<string, any> {
    // Deep clone to avoid mutations
    const processed = JSON.parse(JSON.stringify(config));

    // Apply transformations
    this.transformConfigValues(processed);

    // Validate processed configuration
    this.validateProcessedConfig(processed, namespace);

    return processed;
  }

  /**
   * Extract configuration using prefix patterns.
   * 
   * @param config - Source configuration
   * @param namespace - Target namespace
   * @returns Prefixed configuration
   */
  private extractPrefixedConfig(
    config: Record<string, any>,
    namespace: string
  ): Record<string, any> {
    const prefixedConfig: Record<string, any> = {};
    const prefix = namespace.toUpperCase() + '_';

    for (const [key, value] of Object.entries(config)) {
      if (key.toUpperCase().startsWith(prefix)) {
        const namespacedKey = key.substring(prefix.length);
        const camelCaseKey = this.toCamelCase(namespacedKey);
        
        if (camelCaseKey) {
          prefixedConfig[camelCaseKey] = value;
        }
      }
    }

    return prefixedConfig;
  }

  /**
   * Extract configuration using path patterns.
   * 
   * @param config - Source configuration
   * @param namespace - Target namespace
   * @returns Path-based configuration
   */
  private extractPathBasedConfig(
    config: Record<string, any>,
    namespace: string
  ): Record<string, any> {
    const pathConfig: Record<string, any> = {};
    const namespacePath = `/${namespace}/`;

    for (const [key, value] of Object.entries(config)) {
      if (key.includes(namespacePath)) {
        const pathIndex = key.indexOf(namespacePath);
        const afterNamespace = key.substring(pathIndex + namespacePath.length);
        
        if (afterNamespace) {
          const nestedKey = this.pathToNestedKey(afterNamespace);
          this.setNestedValue(pathConfig, nestedKey, value);
        }
      }
    }

    return pathConfig;
  }

  /**
   * Extract configuration that doesn't belong to any namespace.
   * 
   * @param config - Source configuration
   * @param namespaces - Known namespaces
   * @returns Remaining configuration
   */
  private extractRemainingConfig(
    config: Record<string, any>,
    namespaces: string[]
  ): Record<string, any> {
    const remaining: Record<string, any> = {};
    const namespacePrefixes = namespaces.map(ns => ns.toUpperCase() + '_');
    const namespacePaths = namespaces.map(ns => `/${ns}/`);

    for (const [key, value] of Object.entries(config)) {
      const upperKey = key.toUpperCase();
      
      // Skip if key belongs to a known namespace
      const belongsToNamespace = 
        namespaces.includes(key) ||
        namespacePrefixes.some(prefix => upperKey.startsWith(prefix)) ||
        namespacePaths.some(path => key.includes(path));

      if (!belongsToNamespace) {
        remaining[key] = value;
      }
    }

    return remaining;
  }

  /**
   * Add metadata to a factory for introspection.
   * 
   * @param factory - Configuration factory
   * @param namespace - Namespace name
   * @param config - Configuration data
   * @param sources - Configuration sources
   */
  private addFactoryMetadata(
    factory: ConfigFactory,
    namespace: string,
    config: Record<string, any>,
    sources?: ConfigurationSource[]
  ): void {
    (factory as any).__namespace = namespace;
    (factory as any).__isAwsNamespaceFactory = true;
    (factory as any).__configKeys = Object.keys(config);
    (factory as any).__sources = sources?.map(s => s.name) || [];
    (factory as any).__createdAt = new Date().toISOString();
  }

  /**
   * Transform configuration values (type conversion, etc.).
   * 
   * @param config - Configuration to transform
   */
  private transformConfigValues(config: Record<string, any>): void {
    for (const [key, value] of Object.entries(config)) {
      if (typeof value === 'string') {
        config[key] = this.convertStringValue(value);
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        this.transformConfigValues(value);
      }
    }
  }

  /**
   * Convert string values to appropriate types.
   * 
   * @param value - String value to convert
   * @returns Converted value
   */
  private convertStringValue(value: string): any {
    // Boolean conversion
    if (value.toLowerCase() === 'true') return true;
    if (value.toLowerCase() === 'false') return false;

    // Number conversion
    if (/^\d+$/.test(value)) {
      const num = parseInt(value, 10);
      return isNaN(num) ? value : num;
    }

    if (/^\d*\.\d+$/.test(value)) {
      const num = parseFloat(value);
      return isNaN(num) ? value : num;
    }

    // JSON conversion
    if ((value.startsWith('{') && value.endsWith('}')) || 
        (value.startsWith('[') && value.endsWith(']'))) {
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    }

    return value;
  }

  /**
   * Validate processed configuration.
   * 
   * @param config - Configuration to validate
   * @param namespace - Namespace name
   */
  private validateProcessedConfig(config: Record<string, any>, namespace: string): void {
    if (!config || typeof config !== 'object') {
      throw new Error(`Invalid processed configuration for namespace: ${namespace}`);
    }

    // Additional validation can be added here
  }

  /**
   * Convert snake_case or kebab-case to camelCase.
   * 
   * @param str - String to convert
   * @returns camelCase string
   */
  private toCamelCase(str: string): string {
    return str
      .toLowerCase()
      .replace(/[_-](.)/g, (_, char) => char.toUpperCase());
  }

  /**
   * Convert path segments to nested key structure.
   * 
   * @param path - Path string
   * @returns Nested key structure
   */
  private pathToNestedKey(path: string): string {
    return path
      .split('/')
      .map(segment => this.toCamelCase(segment))
      .join('.');
  }

  /**
   * Set a nested value in an object using dot notation.
   * 
   * @param obj - Target object
   * @param path - Dot notation path
   * @param value - Value to set
   */
  private setNestedValue(obj: Record<string, any>, path: string, value: any): void {
    const keys = path.split('.');
    let current = obj;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (key && (!(key in current) || typeof current[key] !== 'object')) {
        current[key] = {};
      }
      if (key) {
        current = current[key];
      }
    }

    const lastKey = keys[keys.length - 1];
    if (lastKey) {
      current[lastKey] = value;
    }
  }

  /**
   * Validate namespace name.
   * 
   * @param namespace - Namespace to validate
   * @returns Whether namespace is valid
   */
  private isValidNamespace(namespace: string): boolean {
    return typeof namespace === 'string' &&
           namespace.trim() !== '' &&
           /^[a-zA-Z][a-zA-Z0-9_]*$/.test(namespace);
  }

  /**
   * Check if namespace is reserved.
   * 
   * @param namespace - Namespace to check
   * @returns Whether namespace is reserved
   */
  private isReservedNamespace(namespace: string): boolean {
    const reserved = ['config', 'env', 'process', 'global', 'default', 'root'];
    return reserved.includes(namespace.toLowerCase());
  }

  /**
   * Validate namespace configuration.
   * 
   * @param namespace - Namespace name
   * @param config - Configuration data
   * @returns Whether configuration is valid
   */
  private isValidNamespaceConfig(namespace: string, config: any): boolean {
    return typeof namespace === 'string' &&
           namespace.trim() !== '' &&
           config !== null &&
           config !== undefined &&
           typeof config === 'object' &&
           !Array.isArray(config) &&
           Object.keys(config).length > 0;
  }

  /**
   * Find key conflicts in configuration.
   * 
   * @param config - Configuration to check
   * @returns Array of conflicting keys
   */
  private findKeyConflicts(config: Record<string, any>): string[] {
    const conflicts: string[] = [];
    const keys = Object.keys(config);
    
    // Check for case-insensitive duplicates
    const lowerKeys = keys.map(k => k.toLowerCase());
    const duplicates = lowerKeys.filter((key, index) => lowerKeys.indexOf(key) !== index);
    
    conflicts.push(...duplicates);
    
    return [...new Set(conflicts)];
  }

  /**
   * Generate usage examples for a namespace.
   * 
   * @param namespace - Namespace name
   * @param config - Configuration data
   * @returns Array of usage examples
   */
  private generateUsageExamples(namespace: string, config: Record<string, any>): string[] {
    const examples: string[] = [];
    const sampleKeys = Object.keys(config).slice(0, 3);

    examples.push(`// Inject the entire ${namespace} configuration`);
    examples.push(`@Inject(${namespace}Config.KEY) private ${namespace}: ConfigType<typeof ${namespace}Config>`);
    examples.push('');
    examples.push(`// Access via ConfigService`);
    examples.push(`const ${namespace}Config = this.configService.get('${namespace}');`);
    
    if (sampleKeys.length > 0) {
      examples.push('');
      examples.push(`// Access specific values`);
      sampleKeys.forEach(key => {
        examples.push(`const ${key} = this.configService.get('${namespace}.${key}');`);
      });
    }

    return examples;
  }
}