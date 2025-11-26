/**
 * Result returned by a configuration loader
 */
export interface ConfigLoaderResult {
  /** The loaded configuration key-value pairs */
  config: Record<string, unknown>;
  /** Keys that were loaded by this loader */
  keysLoaded: string[];
  /** Time taken to load in milliseconds */
  duration: number;
}

/**
 * Interface for configuration loaders.
 * All loaders must implement this interface to be used with ConfigManager.
 */
export interface ConfigLoader {
  /**
   * Load configuration from the source.
   * @returns Promise resolving to the loaded configuration
   */
  load(): Promise<Record<string, unknown>>;

  /**
   * Get the name of this loader for logging and debugging.
   * @returns The loader name
   */
  getName(): string;

  /**
   * Check if this loader is available and can load configuration.
   * @returns Promise resolving to true if the loader can load configuration
   */
  isAvailable(): Promise<boolean>;
}
