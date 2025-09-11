/**
 * Abstract ConfigService interface for dependency injection.
 * Provides type-safe access to configuration values with generic type support.
 */
export abstract class ConfigService<T = any> {
  /**
   * Get a configuration value by key with type safety.
   * @param key - The configuration key to retrieve
   * @returns The configuration value with proper typing
   */
  abstract get<K extends keyof T>(key: K): T[K];

  /**
   * Check if the configuration service has been initialized.
   * @returns True if the service is ready to serve configuration values
   */
  abstract isInitialized(): boolean;

  /**
   * Get all configuration values.
   * @returns The complete configuration object
   */
  abstract getAll(): T;
}