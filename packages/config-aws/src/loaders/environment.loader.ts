import type { ConfigLoader } from '../interfaces/config-loader.interface.js';
import type { EnvironmentLoaderConfig } from '../interfaces/environment-loader.interface.js';

/**
 * Loader that reads configuration from process.env.
 * Supports prefix filtering and exclusion lists.
 *
 * @example
 * ```typescript
 * // Load all environment variables
 * const loader = new EnvironmentLoader();
 *
 * // Load only variables starting with 'APP_', stripping the prefix
 * const loader = new EnvironmentLoader({ prefix: 'APP_' });
 *
 * // Load all except specific variables
 * const loader = new EnvironmentLoader({ exclude: ['PATH', 'HOME'] });
 *
 * // Combine prefix and exclusion
 * const loader = new EnvironmentLoader({
 *   prefix: 'APP_',
 *   exclude: ['APP_DEBUG']
 * });
 * ```
 */
export class EnvironmentLoader implements ConfigLoader {
  /** @internal */
  protected readonly _config: EnvironmentLoaderConfig;

  constructor(config: EnvironmentLoaderConfig = {}) {
    this._config = config;
  }

  getName(): string {
    return 'EnvironmentLoader';
  }

  async isAvailable(): Promise<boolean> {
    return true;
  }

  /**
   * Load configuration from process.env.
   *
   * When a prefix is specified:
   * - Only variables starting with the prefix are included
   * - The prefix is stripped from the resulting key names
   *
   * When an exclusion list is specified:
   * - Variables in the list are excluded from the result
   * - Exclusion is checked against the original key (before prefix stripping)
   *
   * @returns Promise resolving to the loaded configuration
   */
  async load(): Promise<Record<string, unknown>> {
    const result: Record<string, unknown> = {};
    const { prefix, exclude = [] } = this._config;
    const excludeSet = new Set(exclude);

    for (const [key, value] of Object.entries(process.env)) {
      // Skip undefined values
      if (value === undefined) {
        continue;
      }

      // Check exclusion list (against original key)
      if (excludeSet.has(key)) {
        continue;
      }

      // Handle prefix filtering
      if (prefix) {
        if (key.startsWith(prefix)) {
          // Strip prefix from key
          const strippedKey = key.slice(prefix.length);
          // Only include if there's a key remaining after stripping
          if (strippedKey) {
            result[strippedKey] = value;
          }
        }
        // Skip keys that don't match the prefix
      } else {
        // No prefix - include all non-excluded keys
        result[key] = value;
      }
    }

    return result;
  }
}
