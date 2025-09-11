import { ConfigLoader } from '../interfaces/config-loader.interface';

/**
 * Configuration loader that loads values from environment variables (process.env).
 * This loader is always available and serves as the base configuration source.
 */
export class EnvironmentLoader implements ConfigLoader {
  private readonly envPrefix?: string;

  constructor(envPrefix?: string) {
    this.envPrefix = envPrefix;
  }

  /**
   * Load configuration from environment variables.
   * @returns Promise resolving to environment variables as key-value pairs
   */
  async load(): Promise<Record<string, any>> {
    const config: Record<string, any> = {};
    
    // Get all environment variables
    const envVars = process.env;
    
    // If prefix is specified, only load variables with that prefix
    if (this.envPrefix) {
      for (const [key, value] of Object.entries(envVars)) {
        if (key.startsWith(this.envPrefix)) {
          // Remove prefix from key
          const configKey = key.substring(this.envPrefix.length);
          if (configKey && value !== undefined) {
            config[configKey] = value;
          }
        }
      }
    } else {
      // Load all environment variables
      for (const [key, value] of Object.entries(envVars)) {
        if (value !== undefined) {
          config[key] = value;
        }
      }
    }
    
    return config;
  }

  /**
   * Get the name of this loader for logging and debugging.
   * @returns The loader name
   */
  getName(): string {
    return this.envPrefix ? `EnvironmentLoader(${this.envPrefix})` : 'EnvironmentLoader';
  }

  /**
   * Check if this loader is available.
   * Environment variables are always available.
   * @returns Promise resolving to true
   */
  async isAvailable(): Promise<boolean> {
    return true;
  }
}