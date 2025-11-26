import type { ZodError } from 'zod';
import type { ConfigLoader } from './interfaces/config-loader.interface';
import type {
  ConfigManagerOptions,
  ConfigLoadResult,
  ConfigSourceInfo,
  Logger,
  LoaderPrecedence,
  VerboseOptions,
} from './interfaces/config-manager.interface';
import { ConfigurationError, ConfigurationLoadError, ValidationError } from './errors';

/**
 * Default console logger implementation
 */
const defaultLogger: Logger = {
  log: (message: string) => console.log(message),
  error: (message: string) => console.error(message),
  warn: (message: string) => console.warn(message),
  debug: (message: string) => console.debug(message),
};

/**
 * Default sensitive keys that should always be masked
 */
const DEFAULT_SENSITIVE_KEYS = ['password', 'secret', 'key', 'token', 'credential', 'api_key', 'apikey'];

/**
 * Default verbose options
 */
const DEFAULT_VERBOSE_OPTIONS: Required<VerboseOptions> = {
  logKeys: true,
  logValues: false,
  logOverrides: true,
  logTiming: true,
  maskValues: true,
  sensitiveKeys: DEFAULT_SENSITIVE_KEYS,
};

/**
 * Predefined precedence orders for common strategies
 * Higher index = higher priority (later loaders override earlier ones)
 */
const PRECEDENCE_ORDERS: Record<'aws-first' | 'local-first', string[]> = {
  // AWS wins: env -> envFile -> s3 -> secretsManager -> ssm
  'aws-first': [
    'EnvironmentLoader',
    'EnvFileLoader',
    'S3Loader',
    'SecretsManagerLoader',
    'SSMParameterStoreLoader',
  ],
  // Local wins: ssm -> secretsManager -> s3 -> envFile -> env
  'local-first': [
    'SSMParameterStoreLoader',
    'SecretsManagerLoader',
    'S3Loader',
    'EnvFileLoader',
    'EnvironmentLoader',
  ],
};


/**
 * ConfigManager orchestrates loading configuration from multiple sources
 * with configurable precedence and validation.
 *
 * @example
 * ```typescript
 * import { ConfigManager, EnvironmentLoader, SecretsManagerLoader } from '@dyanet/config-aws';
 * import { z } from 'zod';
 *
 * const schema = z.object({
 *   DATABASE_URL: z.string(),
 *   API_KEY: z.string(),
 *   PORT: z.coerce.number().default(3000),
 * });
 *
 * const manager = new ConfigManager({
 *   loaders: [
 *     new EnvironmentLoader({ prefix: 'APP_' }),
 *     new SecretsManagerLoader({ secretName: '/my-app/config' }),
 *   ],
 *   schema,
 *   precedence: 'aws-first',
 *   verbose: true,
 * });
 *
 * await manager.load();
 * const dbUrl = manager.get('DATABASE_URL');
 * ```
 */
export class ConfigManager<T = Record<string, unknown>> {
  /** @internal */
  protected readonly _options: Required<Omit<ConfigManagerOptions<T>, 'schema' | 'logger' | 'verbose'>> & {
    schema?: ConfigManagerOptions<T>['schema'];
    logger?: Logger;
    verbose?: VerboseOptions | boolean;
  };
  /** @internal */
  protected readonly _logger: Logger;
  /** @internal */
  protected readonly _verboseOptions: Required<VerboseOptions> | null;

  private config: T | null = null;
  private loadResult: ConfigLoadResult<T> | null = null;
  private loaded = false;

  constructor(options: ConfigManagerOptions<T> = {}) {
    this._options = {
      loaders: options.loaders ?? [],
      schema: options.schema,
      precedence: options.precedence ?? 'aws-first',
      validateOnLoad: options.validateOnLoad ?? true,
      enableLogging: options.enableLogging ?? false,
      logger: options.logger,
      verbose: options.verbose,
    };
    this._logger = options.logger ?? defaultLogger;
    this._verboseOptions = this.resolveVerboseOptions(options.verbose);
  }

  /**
   * Resolve verbose options from boolean or object
   */
  private resolveVerboseOptions(verbose?: VerboseOptions | boolean): Required<VerboseOptions> | null {
    if (verbose === undefined || verbose === false) {
      return null;
    }
    if (verbose === true) {
      return { ...DEFAULT_VERBOSE_OPTIONS };
    }
    return {
      logKeys: verbose.logKeys ?? DEFAULT_VERBOSE_OPTIONS.logKeys,
      logValues: verbose.logValues ?? DEFAULT_VERBOSE_OPTIONS.logValues,
      logOverrides: verbose.logOverrides ?? DEFAULT_VERBOSE_OPTIONS.logOverrides,
      logTiming: verbose.logTiming ?? DEFAULT_VERBOSE_OPTIONS.logTiming,
      maskValues: verbose.maskValues ?? DEFAULT_VERBOSE_OPTIONS.maskValues,
      sensitiveKeys: verbose.sensitiveKeys ?? DEFAULT_VERBOSE_OPTIONS.sensitiveKeys,
    };
  }

  /**
   * Log a message if logging is enabled
   */
  private log(message: string): void {
    if (this._options.enableLogging || this._verboseOptions) {
      this._logger.log(`[config-aws] ${message}`);
    }
  }

  /**
   * Mask a value for logging
   */
  private maskValue(key: string, value: unknown): string {
    if (!this._verboseOptions?.logValues) {
      return '';
    }

    const strValue = String(value);
    const lowerKey = key.toLowerCase();

    // Check if key contains any sensitive patterns
    const isSensitive = this._verboseOptions.sensitiveKeys.some(
      (pattern) => lowerKey.includes(pattern.toLowerCase())
    );

    if (this._verboseOptions.maskValues || isSensitive) {
      if (strValue.length <= 4) {
        return '****';
      }
      return `${strValue.slice(0, 2)}**...${strValue.slice(-2)}`;
    }

    return strValue;
  }


  /**
   * Get the loading order for loaders based on precedence strategy.
   * Returns loaders sorted by priority (lower priority first, so higher priority loads last and wins).
   */
  private getLoadOrder(): ConfigLoader[] {
    const { loaders, precedence } = this._options;

    if (!loaders || loaders.length === 0) {
      return [];
    }

    // If precedence is a custom array, use it
    if (Array.isArray(precedence)) {
      return this.sortByCustomPrecedence(loaders, precedence);
    }

    // Use predefined precedence order
    const order = PRECEDENCE_ORDERS[precedence];
    return this.sortByPredefinedOrder(loaders, order);
  }

  /**
   * Sort loaders by custom precedence configuration
   */
  private sortByCustomPrecedence(loaders: ConfigLoader[], precedence: LoaderPrecedence[]): ConfigLoader[] {
    const priorityMap = new Map<string, number>();
    for (const p of precedence) {
      priorityMap.set(p.loader, p.priority);
    }

    // Sort by priority (lower first, so higher priority loads last and wins)
    return [...loaders].sort((a, b) => {
      const priorityA = priorityMap.get(a.getName()) ?? 0;
      const priorityB = priorityMap.get(b.getName()) ?? 0;
      return priorityA - priorityB;
    });
  }

  /**
   * Sort loaders by predefined order
   */
  private sortByPredefinedOrder(loaders: ConfigLoader[], order: string[]): ConfigLoader[] {
    const orderMap = new Map<string, number>();
    order.forEach((name, index) => orderMap.set(name, index));

    // Sort by order index (lower first, so higher index loads last and wins)
    return [...loaders].sort((a, b) => {
      const indexA = orderMap.get(a.getName()) ?? -1;
      const indexB = orderMap.get(b.getName()) ?? -1;
      return indexA - indexB;
    });
  }

  /**
   * Load configuration from all configured loaders.
   * Loaders are executed in precedence order, with later loaders overriding earlier ones.
   */
  async load(): Promise<void> {
    const startTime = Date.now();
    const sources: ConfigSourceInfo[] = [];
    let mergedConfig: Record<string, unknown> = {};
    const keyOrigins: Map<string, string> = new Map(); // Track which loader set each key

    this.log('Loading configuration...');

    const orderedLoaders = this.getLoadOrder();

    for (const loader of orderedLoaders) {
      const loaderName = loader.getName();
      const loaderStartTime = Date.now();

      try {
        // Check if loader is available
        const isAvailable = await loader.isAvailable();
        if (!isAvailable) {
          if (this._verboseOptions?.logTiming) {
            this.log(`${loaderName}: skipped (not available)`);
          }
          continue;
        }

        // Load configuration from this loader
        const loaderConfig = await loader.load();
        const keysLoaded = Object.keys(loaderConfig);
        const duration = Date.now() - loaderStartTime;

        // Track source info
        sources.push({
          loader: loaderName,
          keysLoaded,
          duration,
        });

        // Log timing and keys
        if (this._verboseOptions?.logTiming) {
          this.log(`${loaderName}: loaded ${keysLoaded.length} keys in ${duration}ms`);
        }

        // Log individual keys and track overrides
        for (const key of keysLoaded) {
          const previousLoader = keyOrigins.get(key);
          const isOverride = previousLoader !== undefined;

          if (this._verboseOptions?.logKeys) {
            let logLine = `  - ${key}`;
            if (this._verboseOptions.logValues) {
              logLine += ` = "${this.maskValue(key, loaderConfig[key])}"`;
            }
            if (isOverride && this._verboseOptions.logOverrides) {
              logLine += ` (overrides ${previousLoader})`;
            }
            this.log(logLine);
          }

          keyOrigins.set(key, loaderName);
        }

        // Merge configuration (later loaders override earlier ones)
        mergedConfig = { ...mergedConfig, ...loaderConfig };
      } catch (error) {
        throw new ConfigurationLoadError(
          `Failed to load configuration from ${loaderName}: ${error instanceof Error ? error.message : String(error)}`,
          loaderName,
          error instanceof Error ? error : undefined
        );
      }
    }

    // Count overrides
    const totalKeys = Object.keys(mergedConfig).length;
    const totalDuration = Date.now() - startTime;
    const overrideCount = sources.reduce((acc, s) => acc + s.keysLoaded.length, 0) - totalKeys;

    if (this._verboseOptions?.logTiming) {
      this.log(`Configuration loaded: ${totalKeys} total keys, ${overrideCount} overrides, ${totalDuration}ms total`);
    }

    // Validate if schema is provided and validation is enabled
    if (this._options.schema && this._options.validateOnLoad) {
      const result = this._options.schema.safeParse(mergedConfig);
      if (!result.success) {
        const zodError = result.error as ZodError;
        throw new ValidationError(
          `Configuration validation failed: ${zodError.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')}`,
          zodError.errors,
          undefined
        );
      }
      this.config = result.data as T;
    } else {
      this.config = mergedConfig as T;
    }

    this.loadResult = {
      config: this.config,
      sources,
      loadedAt: new Date(),
    };

    this.loaded = true;
  }


  /**
   * Get a specific configuration value by key.
   * @param key The configuration key
   * @returns The configuration value
   * @throws ConfigurationError if configuration is not loaded
   */
  get<K extends keyof T>(key: K): T[K] {
    if (!this.loaded || this.config === null) {
      throw new ConfigurationError('Configuration not loaded. Call load() first.');
    }
    // Non-null assertion is safe here because we've checked this.config !== null above
    return this.config![key];
  }

  /**
   * Get all configuration values.
   * @returns The complete configuration object
   * @throws ConfigurationError if configuration is not loaded
   */
  getAll(): T {
    if (!this.loaded || this.config === null) {
      throw new ConfigurationError('Configuration not loaded. Call load() first.');
    }
    return this.config;
  }

  /**
   * Check if configuration has been loaded.
   * @returns true if configuration is loaded
   */
  isLoaded(): boolean {
    return this.loaded;
  }

  /**
   * Get the current application environment.
   * @returns The APP_ENV value or 'development' as default
   */
  getAppEnv(): string {
    return process.env['APP_ENV'] ?? 'development';
  }

  /**
   * Get the load result with source information.
   * @returns The load result or null if not loaded
   */
  getLoadResult(): ConfigLoadResult<T> | null {
    return this.loadResult;
  }

  /**
   * Serialize the current configuration to JSON string.
   * @returns JSON string representation of the configuration
   * @throws ConfigurationError if configuration is not loaded
   */
  serialize(): string {
    if (!this.loaded || this.config === null) {
      throw new ConfigurationError('Configuration not loaded. Call load() first.');
    }
    return JSON.stringify(this.config);
  }

  /**
   * Create a new ConfigManager with configuration loaded from a JSON string.
   * This is useful for restoring configuration from a serialized state.
   * @param json JSON string to deserialize
   * @param options Optional ConfigManager options (schema will be used for validation)
   * @returns A new ConfigManager instance with the deserialized configuration
   */
  static deserialize<T = Record<string, unknown>>(
    json: string,
    options: ConfigManagerOptions<T> = {}
  ): ConfigManager<T> {
    const parsed = JSON.parse(json);

    // Validate if schema is provided
    if (options.schema) {
      const result = options.schema.safeParse(parsed);
      if (!result.success) {
        const zodError = result.error as ZodError;
        throw new ValidationError(
          `Deserialization validation failed: ${zodError.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ')}`,
          zodError.errors,
          undefined
        );
      }
    }

    // Create a new ConfigManager and set its internal state
    const manager = new ConfigManager<T>(options);
    manager.config = parsed as T;
    manager.loaded = true;
    manager.loadResult = {
      config: parsed as T,
      sources: [{ loader: 'deserialize', keysLoaded: Object.keys(parsed), duration: 0 }],
      loadedAt: new Date(),
    };

    return manager;
  }
}
