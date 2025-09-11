/**
 * Interface for configuration source abstraction.
 * Allows different configuration sources (env vars, AWS services) to be loaded uniformly.
 */
export interface ConfigLoader {
  /**
   * Load configuration from the source.
   * @returns Promise resolving to a record of configuration key-value pairs
   */
  load(): Promise<Record<string, any>>;

  /**
   * Get the name of this configuration loader for logging and debugging.
   * @returns The loader name
   */
  getName(): string;

  /**
   * Check if this loader is available in the current environment.
   * @returns True if the loader can be used
   */
  isAvailable(): Promise<boolean>;
}