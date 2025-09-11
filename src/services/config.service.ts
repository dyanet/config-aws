import { Injectable, Logger } from '@nestjs/common';
import { ZodType } from 'zod';

import { ConfigService } from '../interfaces/config-service.interface';
import { ConfigLoader } from '../interfaces/config-loader.interface';
import { DefaultConfigSchema, getSchemaForEnvironment, appEnvSchema } from '../interfaces/default-schema.interface';
import { ConfigurationError, ConfigurationLoadError } from '../interfaces/errors.interface';
import { ConfigValidationUtil } from '../utils/validation.util';
import { EnvironmentLoader } from '../loaders/environment.loader';
import { SecretsManagerLoader } from '../loaders/secrets-manager.loader';
import { SSMParameterStoreLoader } from '../loaders/ssm-parameter-store.loader';

/**
 * Configuration options for ConfigServiceImpl
 */
export interface ConfigServiceOptions<T = DefaultConfigSchema> {
  /**
   * Zod schema for configuration validation
   * @default defaultConfigSchema
   */
  schema?: ZodType<T>;
  
  /**
   * Custom configuration loaders
   * If not provided, default loaders (env, secrets manager, ssm) will be used
   */
  loaders?: ConfigLoader[];
  
  /**
   * Environment variable prefix for EnvironmentLoader
   */
  envPrefix?: string;
  
  /**
   * Whether to validate configuration on load
   * @default true
   */
  validateOnLoad?: boolean;
  
  /**
   * Whether to log configuration loading steps
   * @default true
   */
  enableLogging?: boolean;
}

/**
 * Implementation of ConfigService with AWS integration and APP_ENV logic.
 * Provides type-safe configuration access with orchestrated loading from multiple sources.
 */
@Injectable()
export class ConfigServiceImpl<T = DefaultConfigSchema> extends ConfigService<T> {
  private readonly logger = new Logger(ConfigServiceImpl.name);
  private readonly schema: ZodType<T>;
  private readonly loaders: ConfigLoader[];
  private readonly options: {
    envPrefix?: string;
    validateOnLoad: boolean;
    enableLogging: boolean;
  };
  
  private config: T | null = null;
  private initialized = false;
  private appEnv: string;

  constructor(options: ConfigServiceOptions<T> = {}) {
    super();
    
    // Set default options
    this.options = {
      envPrefix: options.envPrefix,
      validateOnLoad: options.validateOnLoad ?? true,
      enableLogging: options.enableLogging ?? true,
    };
    
    // Initialize APP_ENV logic
    this.appEnv = this.initializeAppEnv();
    
    // Set schema - use environment-specific schema if no custom schema provided
    this.schema = options.schema || (getSchemaForEnvironment(this.appEnv) as ZodType<T>);
    
    // Initialize loaders
    this.loaders = options.loaders || this.createDefaultLoaders();
  }

  /**
   * Initialize the configuration service by loading and validating configuration.
   * This method should be called during application startup.
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      if (this.options.enableLogging) {
        this.logger.log(`Initializing configuration service with APP_ENV: ${this.appEnv}`);
      }

      // Load configuration from all sources
      const rawConfig = await this.loadConfiguration();
      
      // Validate configuration if enabled
      if (this.options.validateOnLoad) {
        this.config = ConfigValidationUtil.validateConfiguration(
          this.schema,
          rawConfig,
          'merged configuration'
        );
      } else {
        this.config = rawConfig as T;
      }
      
      this.initialized = true;
      
      if (this.options.enableLogging) {
        this.logger.log('Configuration service initialized successfully');
      }
    } catch (error) {
      const errorMessage = `Failed to initialize configuration service: ${error instanceof Error ? error.message : String(error)}`;
      this.logger.error(errorMessage);
      throw new ConfigurationError(errorMessage, error instanceof Error ? error : undefined);
    }
  }

  /**
   * Get a configuration value by key with type safety.
   * @param key - The configuration key to retrieve
   * @returns The configuration value with proper typing
   */
  get<K extends keyof T>(key: K): T[K] {
    if (!this.initialized || !this.config) {
      throw new ConfigurationError(
        'Configuration service not initialized. Call initialize() first.'
      );
    }
    
    return this.config[key];
  }

  /**
   * Check if the configuration service has been initialized.
   * @returns True if the service is ready to serve configuration values
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get all configuration values.
   * @returns The complete configuration object
   */
  getAll(): T {
    if (!this.initialized || !this.config) {
      throw new ConfigurationError(
        'Configuration service not initialized. Call initialize() first.'
      );
    }
    
    return this.config;
  }

  /**
   * Get the current APP_ENV value.
   * @returns The current application environment
   */
  getAppEnv(): string {
    return this.appEnv;
  }

  /**
   * Initialize APP_ENV with NODE_ENV mirroring and warning logic.
   * Implements requirement 2.0: APP_ENV mirroring NODE_ENV with "local" default and warning logic.
   */
  private initializeAppEnv(): string {
    const nodeEnv = process.env['NODE_ENV'];
    const appEnv = process.env['APP_ENV'];
    
    // If APP_ENV is explicitly set
    if (appEnv) {
      // Validate APP_ENV value
      const validation = ConfigValidationUtil.safeValidate(appEnvSchema, appEnv);
      
      if (!validation.success) {
        // If APP_ENV is invalid, try to use NODE_ENV as fallback
        if (nodeEnv) {
          const nodeEnvValidation = ConfigValidationUtil.safeValidate(appEnvSchema, nodeEnv);
          if (nodeEnvValidation.success) {
            if (this.options.enableLogging) {
              this.logger.warn(
                `Invalid APP_ENV value '${appEnv}'. Using NODE_ENV '${nodeEnv}' as fallback.`
              );
            }
            return nodeEnv;
          }
        }
        
        // Both APP_ENV and NODE_ENV are invalid, default to 'local'
        if (this.options.enableLogging) {
          this.logger.warn(
            `Invalid APP_ENV value '${appEnv}' and no valid NODE_ENV fallback. Defaulting to 'local'.`
          );
        }
        return 'local';
      }
      
      // APP_ENV is valid, check if it differs from NODE_ENV
      if (nodeEnv && nodeEnv !== appEnv) {
        if (this.options.enableLogging) {
          this.logger.warn(
            `APP_ENV '${appEnv}' differs from NODE_ENV '${nodeEnv}'. Using APP_ENV value.`
          );
        }
      }
      
      return appEnv;
    }
    
    // APP_ENV not set, try to use NODE_ENV
    if (nodeEnv) {
      const validation = ConfigValidationUtil.safeValidate(appEnvSchema, nodeEnv);
      if (validation.success) {
        return nodeEnv;
      }
      
      // NODE_ENV is invalid, log warning and default to 'local'
      if (this.options.enableLogging) {
        this.logger.warn(
          `Invalid NODE_ENV value '${nodeEnv}'. Defaulting to 'local'.`
        );
      }
    }
    
    // Neither APP_ENV nor NODE_ENV set, default to 'local'
    return 'local';
  }

  /**
   * Create default configuration loaders.
   * @returns Array of default loaders in precedence order
   */
  private createDefaultLoaders(): ConfigLoader[] {
    return [
      new EnvironmentLoader(this.options.envPrefix),
      new SecretsManagerLoader(),
      new SSMParameterStoreLoader(),
    ];
  }

  /**
   * Load configuration from all sources with proper precedence order.
   * Implements orchestration: env -> secrets -> ssm with proper merging.
   */
  private async loadConfiguration(): Promise<Record<string, any>> {
    const mergedConfig: Record<string, any> = {};
    
    for (const loader of this.loaders) {
      try {
        // Check if loader is available in current environment
        const isAvailable = await loader.isAvailable();
        
        if (!isAvailable) {
          if (this.options.enableLogging) {
            this.logger.debug(`Skipping ${loader.getName()} - not available in current environment`);
          }
          continue;
        }
        
        if (this.options.enableLogging) {
          this.logger.debug(`Loading configuration from ${loader.getName()}`);
        }
        
        // Load configuration from this source
        const loaderConfig = await loader.load();
        
        // Merge with existing configuration
        // Later loaders override earlier ones (environment variables have lowest precedence)
        Object.assign(mergedConfig, loaderConfig);
        
        if (this.options.enableLogging) {
          const keyCount = Object.keys(loaderConfig).length;
          this.logger.debug(`Loaded ${keyCount} configuration values from ${loader.getName()}`);
        }
      } catch (error) {
        const errorMessage = `Failed to load configuration from ${loader.getName()}: ${error instanceof Error ? error.message : String(error)}`;
        
        if (this.options.enableLogging) {
          this.logger.error(errorMessage);
        }
        
        throw new ConfigurationLoadError(
          errorMessage,
          loader.getName(),
          error instanceof Error ? error : undefined
        );
      }
    }
    
    // Handle special case for local environment with .env file override
    if (this.appEnv === 'local') {
      await this.handleLocalEnvironmentOverrides(mergedConfig);
    }
    
    return mergedConfig;
  }

  /**
   * Handle local environment overrides according to requirement 2.4.
   * In local mode with valid AWS profile and .env file, .env values override AWS values.
   */
  private async handleLocalEnvironmentOverrides(config: Record<string, any>): Promise<void> {
    // Check if we have a valid AWS profile in the credential chain
    const awsProfile = process.env['AWS_PROFILE'];
    
    if (!awsProfile) {
      return; // No AWS profile, no special handling needed
    }
    
    // Check if .env file exists (this is a simplified check - in real implementation
    // you might want to use a library like dotenv to properly detect .env files)
    try {
      const fs = await import('fs');
      const path = await import('path');
      
      const envFilePath = path.resolve(process.cwd(), '.env');
      const envFileExists = fs.existsSync(envFilePath);
      
      if (envFileExists) {
        if (this.options.enableLogging) {
          this.logger.debug(
            'Local environment detected with AWS profile and .env file. ' +
            'Environment variables from .env will override AWS values.'
          );
        }
        
        // Load .env file and override AWS values
        const dotenv = await import('dotenv');
        const envConfig = dotenv.config({ path: envFilePath });
        
        if (envConfig.parsed) {
          // Override AWS values with .env values
          Object.assign(config, envConfig.parsed);
          
          if (this.options.enableLogging) {
            const overrideCount = Object.keys(envConfig.parsed).length;
            this.logger.debug(`Applied ${overrideCount} overrides from .env file`);
          }
        }
      }
    } catch (error) {
      // If we can't load .env file, just log a warning and continue
      if (this.options.enableLogging) {
        this.logger.warn(`Failed to load .env file for local overrides: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }
}