import { Injectable, Logger } from '@nestjs/common';
import { ConfigManager, ConfigurationError } from '@dyanet/config-aws';
import type { ConfigManagerOptions } from '@dyanet/config-aws';

import { ConfigService } from '../interfaces/config-service.interface';

/**
 * Configuration options for NestJS ConfigService wrapper.
 * Extends ConfigManagerOptions from @dyanet/config-aws.
 */
export interface ConfigServiceOptions<T = Record<string, unknown>> extends ConfigManagerOptions<T> {
  /**
   * Whether to enable NestJS logging
   * @default true
   */
  enableNestLogging?: boolean;
}

/**
 * NestJS Injectable wrapper around ConfigManager from @dyanet/config-aws.
 * Provides type-safe configuration access with NestJS dependency injection support.
 * 
 * This is a thin adapter layer that delegates all configuration loading and
 * management to the framework-agnostic ConfigManager from config-aws.
 * 
 * @example
 * ```typescript
 * import { ConfigServiceImpl } from '@dyanet/nestjs-config-aws';
 * import { z } from 'zod';
 * 
 * const schema = z.object({
 *   DATABASE_URL: z.string(),
 *   PORT: z.coerce.number().default(3000),
 * });
 * 
 * const configService = new ConfigServiceImpl({
 *   loaders: [new EnvironmentLoader()],
 *   schema,
 * });
 * 
 * await configService.initialize();
 * const dbUrl = configService.get('DATABASE_URL');
 * ```
 */
@Injectable()
export class ConfigServiceImpl<T = Record<string, unknown>> extends ConfigService<T> {
  private readonly logger = new Logger(ConfigServiceImpl.name);
  private readonly configManager: ConfigManager<T>;
  private readonly enableNestLogging: boolean;

  constructor(options: ConfigServiceOptions<T> = {}) {
    super();
    
    this.enableNestLogging = options.enableNestLogging ?? true;
    
    // Create ConfigManager from config-aws with provided options
    this.configManager = new ConfigManager<T>({
      loaders: options.loaders,
      schema: options.schema,
      precedence: options.precedence,
      validateOnLoad: options.validateOnLoad,
      enableLogging: options.enableLogging,
      logger: options.logger,
      verbose: options.verbose,
    });
  }

  /**
   * Initialize the configuration service by loading configuration from all sources.
   * This method should be called during application startup.
   * 
   * @throws ConfigurationError if loading or validation fails
   */
  async initialize(): Promise<void> {
    if (this.configManager.isLoaded()) {
      return;
    }

    try {
      if (this.enableNestLogging) {
        this.logger.log('Initializing configuration service...');
      }

      await this.configManager.load();

      if (this.enableNestLogging) {
        this.logger.log('Configuration service initialized successfully');
      }
    } catch (error) {
      const errorMessage = `Failed to initialize configuration service: ${error instanceof Error ? error.message : String(error)}`;
      this.logger.error(errorMessage);
      throw error;
    }
  }

  /**
   * Get a configuration value by key with type safety.
   * 
   * @param key - The configuration key to retrieve
   * @returns The configuration value with proper typing
   * @throws ConfigurationError if configuration is not initialized
   */
  get<K extends keyof T>(key: K): T[K] {
    if (!this.configManager.isLoaded()) {
      throw new ConfigurationError(
        'Configuration service not initialized. Call initialize() first.'
      );
    }
    return this.configManager.get(key);
  }

  /**
   * Check if the configuration service has been initialized.
   * 
   * @returns True if the service is ready to serve configuration values
   */
  isInitialized(): boolean {
    return this.configManager.isLoaded();
  }

  /**
   * Get all configuration values.
   * 
   * @returns The complete configuration object
   * @throws ConfigurationError if configuration is not initialized
   */
  getAll(): T {
    if (!this.configManager.isLoaded()) {
      throw new ConfigurationError(
        'Configuration service not initialized. Call initialize() first.'
      );
    }
    return this.configManager.getAll();
  }

  /**
   * Get the current application environment.
   * 
   * @returns The APP_ENV value or 'development' as default
   */
  getAppEnv(): string {
    return this.configManager.getAppEnv();
  }

  /**
   * Get the underlying ConfigManager instance.
   * Useful for advanced use cases that need direct access to ConfigManager features.
   * 
   * @returns The ConfigManager instance from @dyanet/config-aws
   */
  getConfigManager(): ConfigManager<T> {
    return this.configManager;
  }
}
