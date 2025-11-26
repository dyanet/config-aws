import { Injectable, Logger, Inject, Optional } from '@nestjs/common';
import {
  ConfigLoader,
  SecretsManagerLoader,
  SSMParameterStoreLoader,
  EnvironmentLoader,
} from '@dyanet/config-aws';
import { IntegrationOptions } from '../interfaces/integration-options.interface';
import { ConfigurationSource, ConfigurationSourceType } from '../interfaces/configuration-source.interface';

import { ErrorHandlerService } from '../services/error-handler.service';

/**
 * Service for loading configuration from AWS sources for integration with @nestjs/config.
 * Uses existing AWS loaders to fetch configuration and provides namespace-aware loading capabilities.
 */
@Injectable()
export class AwsConfigurationLoaderService {
  private readonly logger = new Logger(AwsConfigurationLoaderService.name);
  private readonly loaders: ConfigLoader[];
  private readonly options: IntegrationOptions;
  private readonly errorHandler: ErrorHandlerService;

  constructor(
    @Optional() @Inject('INTEGRATION_OPTIONS') options?: IntegrationOptions
  ) {
    this.options = options || {};
    this.errorHandler = new ErrorHandlerService(this.options);
    this.loaders = this.createLoaders();
  }

  /**
   * Load configuration from AWS sources.
   * @returns Promise resolving to configuration data
   */
  async loadConfiguration(): Promise<Record<string, any>> {
    const mergedConfig: Record<string, any> = {};
    const sources: ConfigurationSource[] = [];

    for (const loader of this.loaders) {
      try {
        // Check if loader is available in current environment with timeout
        const isAvailable = await this.checkAvailabilityWithTimeout(loader);
        
        if (!isAvailable) {
          if (this.options.enableLogging) {
            this.logger.debug(`Skipping ${loader.getName()} - not available in current environment`);
          }
          continue;
        }

        if (this.options.enableLogging) {
          this.logger.debug(`Loading configuration from ${loader.getName()}`);
        }

        // Load configuration from this source with retry logic for AWS services
        const loaderConfig = loader instanceof EnvironmentLoader 
          ? await loader.load() 
          : await this.loadWithRetry(loader);
        
        // Create configuration source metadata
        const source: ConfigurationSource = {
          name: loader.getName(),
          type: this.getSourceType(loader),
          priority: this.getSourcePriority(loader),
          data: loaderConfig,
          loadedAt: new Date(),
        };

        sources.push(source);

        // Merge with existing configuration based on precedence
        Object.assign(mergedConfig, loaderConfig);
        
        if (this.options.enableLogging) {
          const keyCount = Object.keys(loaderConfig).length;
          this.logger.debug(`Loaded ${keyCount} configuration values from ${loader.getName()}`);
        }
      } catch (error) {
        const loaderError = error instanceof Error ? error : new Error(String(error));
        
        // Log detailed error information for troubleshooting
        this.errorHandler.logDetailedError(`loadConfiguration - ${loader.getName()}`, loaderError, {
          loaderName: loader.getName(),
          loaderType: this.getSourceType(loader),
        });

        // Handle specific error types
        if (this.isAwsServiceError(loaderError)) {
          const shouldContinue = this.handleAwsSpecificError(loader, loaderError);
          if (!shouldContinue) {
            throw loaderError;
          }
        } else {
          // Handle general configuration errors
          const shouldContinue = this.errorHandler.handleConfigurationError(loader.getName(), loaderError);
          if (!shouldContinue) {
            throw loaderError;
          }
        }

        // Add error to source metadata
        const errorSource: ConfigurationSource = {
          name: loader.getName(),
          type: this.getSourceType(loader),
          priority: this.getSourcePriority(loader),
          data: {},
          loadedAt: new Date(),
          errors: [loaderError.message],
        };
        sources.push(errorSource);
      }
    }

    return mergedConfig;
  }

  /**
   * Load configuration for specific namespaces from AWS sources.
   * @param namespaces - Array of namespace names to load
   * @returns Promise resolving to namespaced configuration data
   */
  async loadNamespacedConfiguration(namespaces: string[]): Promise<Record<string, Record<string, any>>> {
    const result: Record<string, Record<string, any>> = {};
    
    // Initialize all namespaces
    for (const namespace of namespaces) {
      result[namespace] = {};
    }

    for (const loader of this.loaders) {
      try {
        // Check if loader is available in current environment with timeout
        const isAvailable = await this.checkAvailabilityWithTimeout(loader);
        
        if (!isAvailable) {
          if (this.options.enableLogging) {
            this.logger.debug(`Skipping ${loader.getName()} for namespace loading - not available`);
          }
          continue;
        }

        if (this.options.enableLogging) {
          this.logger.debug(`Loading namespaced configuration from ${loader.getName()}`);
        }

        // Load configuration from this source with retry logic for AWS services
        const loaderConfig = loader instanceof EnvironmentLoader 
          ? await loader.load() 
          : await this.loadWithRetry(loader);
        
        // Distribute configuration to namespaces based on key prefixes or patterns
        for (const namespace of namespaces) {
          const namespacedConfig = this.extractNamespaceConfig(loaderConfig, namespace);
          
          if (Object.keys(namespacedConfig).length > 0) {
            Object.assign(result[namespace]!, namespacedConfig);
            
            if (this.options.enableLogging) {
              const keyCount = Object.keys(namespacedConfig).length;
              this.logger.debug(`Loaded ${keyCount} values for namespace '${namespace}' from ${loader.getName()}`);
            }
          }
        }
      } catch (error) {
        const loaderError = error instanceof Error ? error : new Error(String(error));
        
        // Log detailed error information for troubleshooting
        this.errorHandler.logDetailedError(`loadNamespacedConfiguration - ${loader.getName()}`, loaderError, {
          loaderName: loader.getName(),
          loaderType: this.getSourceType(loader),
          namespaces,
        });

        // Handle specific error types
        if (this.isAwsServiceError(loaderError)) {
          const shouldContinue = this.handleAwsSpecificError(loader, loaderError);
          if (!shouldContinue) {
            throw loaderError;
          }
        } else {
          // Handle general configuration errors
          const shouldContinue = this.errorHandler.handleConfigurationError(loader.getName(), loaderError);
          if (!shouldContinue) {
            throw loaderError;
          }
        }

        // Create fallback configuration for each namespace
        if (this.options.fallbackToLocal) {
          for (const namespace of namespaces) {
            const fallbackConfig = this.errorHandler.createFallbackConfiguration(namespace);
            Object.assign(result[namespace]!, fallbackConfig);
          }
        }
      }
    }

    return result;
  }

  /**
   * Check if AWS services are available.
   * @returns Promise resolving to availability status
   */
  async isAvailable(): Promise<boolean> {
    try {
      // Check if at least one AWS loader is available
      const availabilityChecks = this.loaders
        .filter(loader => !(loader instanceof EnvironmentLoader)) // Skip environment loader
        .map(loader => this.checkAvailabilityWithTimeout(loader));

      if (availabilityChecks.length === 0) {
        // No AWS loaders configured
        return false;
      }

      // Wait for all availability checks to complete
      const results = await Promise.allSettled(availabilityChecks);
      
      // Return true if at least one AWS service is available
      return results.some(result => result.status === 'fulfilled' && result.value === true);
    } catch (error) {
      const availabilityError = error instanceof Error ? error : new Error(String(error));
      
      this.errorHandler.logDetailedError('isAvailable', availabilityError);
      
      // Handle as AWS unavailable
      this.errorHandler.handleAwsUnavailable('AWS Services', availabilityError);
      
      return false;
    }
  }

  /**
   * Get all available configuration sources with their metadata.
   * @returns Promise resolving to array of configuration sources
   */
  async getAvailableSources(): Promise<ConfigurationSource[]> {
    const sources: ConfigurationSource[] = [];

    for (const loader of this.loaders) {
      try {
        const isAvailable = await loader.isAvailable();
        
        if (isAvailable) {
          const loaderConfig = await loader.load();
          
          const source: ConfigurationSource = {
            name: loader.getName(),
            type: this.getSourceType(loader),
            priority: this.getSourcePriority(loader),
            data: loaderConfig,
            loadedAt: new Date(),
          };

          sources.push(source);
        }
      } catch (error) {
        // Add source with error information
        const source: ConfigurationSource = {
          name: loader.getName(),
          type: this.getSourceType(loader),
          priority: this.getSourcePriority(loader),
          data: {},
          loadedAt: new Date(),
          errors: [error instanceof Error ? error.message : String(error)],
        };

        sources.push(source);
      }
    }

    return sources;
  }

  /**
   * Create configuration loaders based on integration options.
   * @returns Array of configuration loaders
   */
  private createLoaders(): ConfigLoader[] {
    const loaders: ConfigLoader[] = [];

    // Always include environment loader
    loaders.push(new EnvironmentLoader({ prefix: this.options.envPrefix }));

    // Add AWS Secrets Manager loader if configured
    if (this.options.secretsManagerConfig?.enabled !== false) {
      const secretsConfig = {
        region: this.options.secretsManagerConfig?.region,
        // Convert paths to secretName format expected by SecretsManagerLoader
        secretName: this.getSecretsManagerPath(),
      };
      loaders.push(new SecretsManagerLoader(secretsConfig));
    }

    // Add SSM Parameter Store loader if configured
    if (this.options.ssmConfig?.enabled !== false) {
      const ssmConfig = {
        region: this.options.ssmConfig?.region,
        // Convert paths to parameterPath format expected by SSMParameterStoreLoader
        parameterPath: this.getSSMParameterPath(),
        withDecryption: this.options.ssmConfig?.decrypt ?? true,
      };
      loaders.push(new SSMParameterStoreLoader(ssmConfig));
    }

    return loaders;
  }

  /**
   * Get the source type for a given loader.
   * @param loader - The configuration loader
   * @returns The configuration source type
   */
  private getSourceType(loader: ConfigLoader): ConfigurationSourceType {
    if (loader instanceof EnvironmentLoader) {
      return 'environment';
    } else if (loader instanceof SecretsManagerLoader) {
      return 'secrets-manager';
    } else if (loader instanceof SSMParameterStoreLoader) {
      return 'ssm';
    } else {
      return 'local-file';
    }
  }

  /**
   * Get the priority for a given loader based on precedence rules.
   * @param loader - The configuration loader
   * @returns The priority number (higher = higher priority)
   */
  private getSourcePriority(loader: ConfigLoader): number {
    const precedence = this.options.precedence || 'aws-first';
    
    if (precedence === 'local-first') {
      // Environment variables have highest priority
      if (loader instanceof EnvironmentLoader) return 100;
      if (loader instanceof SecretsManagerLoader) return 50;
      if (loader instanceof SSMParameterStoreLoader) return 40;
    } else if (precedence === 'aws-first') {
      // AWS sources have higher priority
      if (loader instanceof SecretsManagerLoader) return 100;
      if (loader instanceof SSMParameterStoreLoader) return 90;
      if (loader instanceof EnvironmentLoader) return 50;
    } else {
      // merge - equal priority, order matters
      return 50;
    }
    
    return 50;
  }

  /**
   * Extract configuration for a specific namespace from loaded configuration.
   * @param config - The loaded configuration
   * @param namespace - The namespace to extract
   * @returns Configuration values for the namespace
   */
  private extractNamespaceConfig(config: Record<string, any>, namespace: string): Record<string, any> {
    const namespaceConfig: Record<string, any> = {};
    const namespacePrefix = namespace.toUpperCase();

    // Strategy 1: Look for direct namespace key (e.g., config.database)
    if (config[namespace]) {
      Object.assign(namespaceConfig, config[namespace]);
    }

    // Strategy 2: Look for keys that start with the namespace prefix (e.g., DATABASE_HOST)
    for (const [key, value] of Object.entries(config)) {
      const upperKey = key.toUpperCase();
      
      // Check if key starts with namespace prefix followed by underscore
      if (upperKey.startsWith(`${namespacePrefix}_`)) {
        // Remove namespace prefix and underscore, convert to camelCase
        const namespacedKey = key.substring(namespace.length + 1);
        const camelCaseKey = this.toCamelCase(namespacedKey);
        
        if (camelCaseKey) {
          namespaceConfig[camelCaseKey] = value;
        }
      }
    }

    // Strategy 3: Look for nested namespace paths (e.g., /app/database/host)
    const nestedConfig = this.extractNestedNamespaceConfig(config, namespace);
    Object.assign(namespaceConfig, nestedConfig);

    return namespaceConfig;
  }

  /**
   * Extract nested namespace configuration from hierarchical keys.
   * @param config - The loaded configuration
   * @param namespace - The namespace to extract
   * @returns Configuration values for the namespace
   */
  private extractNestedNamespaceConfig(config: Record<string, any>, namespace: string): Record<string, any> {
    const namespaceConfig: Record<string, any> = {};
    const namespacePath = `/${namespace}/`;

    for (const [key, value] of Object.entries(config)) {
      // Check if key contains namespace path
      if (key.includes(namespacePath)) {
        // Extract the part after the namespace path
        const pathIndex = key.indexOf(namespacePath);
        const afterNamespace = key.substring(pathIndex + namespacePath.length);
        
        if (afterNamespace) {
          // Convert path segments to nested object structure
          const nestedKey = this.pathToNestedKey(afterNamespace);
          this.setNestedValue(namespaceConfig, nestedKey, value);
        }
      }
    }

    return namespaceConfig;
  }

  /**
   * Convert snake_case or kebab-case to camelCase.
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
   * @param path - Path string (e.g., "host/port")
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
   * Get the Secrets Manager path based on configuration.
   * @returns The secrets manager path
   */
  private getSecretsManagerPath(): string {
    const paths = this.options.secretsManagerConfig?.paths;
    if (!paths) {
      return '/nestjs-config-aws';
    }

    // Use the first available path or default
    return paths.production || paths.development || paths.test || '/nestjs-config-aws';
  }

  /**
   * Get the SSM Parameter Store path based on configuration.
   * @returns The SSM parameter path
   */
  private getSSMParameterPath(): string {
    const paths = this.options.ssmConfig?.paths;
    if (!paths) {
      return '/nestjs-config-aws';
    }

    // Use the first available path or default
    return paths.production || paths.development || paths.test || '/nestjs-config-aws';
  }

  /**
   * Check if an error is an AWS service error.
   * @param error - The error to check
   * @returns Whether the error is from an AWS service
   */
  private isAwsServiceError(error: Error): boolean {
    // AWS SDK errors typically have specific names
    const awsErrorNames = [
      'AccessDeniedException',
      'ResourceNotFoundException',
      'InvalidRequestException',
      'ThrottlingException',
      'ServiceUnavailableException',
      'NetworkingError',
      'TimeoutError',
      'CredentialsError',
      'UnknownEndpoint',
    ];

    return awsErrorNames.includes(error.name) || error.message.includes('AWS');
  }

  /**
   * Handle AWS-specific errors with appropriate strategies.
   * @param loader - The loader that encountered the error
   * @param error - The AWS error
   * @returns Whether to continue processing
   */
  private handleAwsSpecificError(loader: ConfigLoader, error: Error): boolean {
    const serviceName = this.getServiceName(loader);

    switch (error.name) {
      case 'AccessDeniedException':
        return this.errorHandler.handlePermissionError(
          serviceName,
          this.getResourceName(loader),
          error
        );

      case 'ResourceNotFoundException':
        return this.errorHandler.handleResourceNotFound(
          serviceName,
          this.getResourceName(loader),
          error
        );

      case 'NetworkingError':
      case 'TimeoutError':
        const networkResult = this.errorHandler.handleNetworkError(serviceName, error);
        return networkResult.shouldContinue;

      case 'ThrottlingException':
      case 'TooManyRequestsException':
        this.logger.warn(`Rate limiting encountered for ${serviceName}, continuing with other sources`);
        return true;

      case 'ServiceUnavailableException':
        return this.errorHandler.handleAwsUnavailable(serviceName, error);

      case 'CredentialsError':
        this.logger.error(`AWS credentials error for ${serviceName}: ${error.message}`);
        this.logger.error('Please check AWS credentials configuration');
        return this.errorHandler.handleAwsUnavailable(serviceName, error);

      default:
        // Handle as general configuration error
        return this.errorHandler.handleConfigurationError(serviceName, error);
    }
  }

  /**
   * Get the service name for a loader.
   * @param loader - The configuration loader
   * @returns The service name
   */
  private getServiceName(loader: ConfigLoader): string {
    if (loader instanceof SecretsManagerLoader) {
      return 'AWS Secrets Manager';
    } else if (loader instanceof SSMParameterStoreLoader) {
      return 'AWS Systems Manager Parameter Store';
    } else if (loader instanceof EnvironmentLoader) {
      return 'Environment Variables';
    } else {
      return 'Unknown Service';
    }
  }

  /**
   * Get the resource name for a loader.
   * @param loader - The configuration loader
   * @returns The resource name
   */
  private getResourceName(loader: ConfigLoader): string {
    if (loader instanceof SecretsManagerLoader) {
      return this.getSecretsManagerPath();
    } else if (loader instanceof SSMParameterStoreLoader) {
      return this.getSSMParameterPath();
    } else {
      return 'configuration';
    }
  }

  /**
   * Load configuration with retry logic for retryable errors.
   * @param loader - The configuration loader
   * @param maxRetries - Maximum number of retries
   * @returns Promise resolving to configuration data
   */
  private async loadWithRetry(loader: ConfigLoader, maxRetries: number = 3): Promise<Record<string, any>> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await loader.load();
      } catch (error) {
        const loaderError = error instanceof Error ? error : new Error(String(error));
        lastError = loaderError;

        // Check if error is retryable
        if (!this.errorHandler.isRetryableError(loaderError) || attempt === maxRetries) {
          throw loaderError;
        }

        // Wait before retrying
        const delay = this.errorHandler.getRetryDelay(attempt);
        this.logger.warn(`Retrying ${loader.getName()} in ${delay}ms (attempt ${attempt}/${maxRetries})`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    // This should never be reached, but just in case
    throw lastError || new Error('Unknown error during retry');
  }

  /**
   * Check availability with timeout and error handling.
   * @param loader - The configuration loader
   * @param timeoutMs - Timeout in milliseconds
   * @returns Promise resolving to availability status
   */
  private async checkAvailabilityWithTimeout(loader: ConfigLoader, timeoutMs: number = 5000): Promise<boolean> {
    try {
      const timeoutPromise = new Promise<boolean>((_, reject) => {
        setTimeout(() => reject(new Error('Availability check timeout')), timeoutMs);
      });

      const availabilityPromise = loader.isAvailable();

      return await Promise.race([availabilityPromise, timeoutPromise]);
    } catch (error) {
      const loaderError = error instanceof Error ? error : new Error(String(error));
      
      if (this.options.enableLogging) {
        this.logger.debug(`Availability check failed for ${loader.getName()}: ${loaderError.message}`);
      }

      return false;
    }
  }
}