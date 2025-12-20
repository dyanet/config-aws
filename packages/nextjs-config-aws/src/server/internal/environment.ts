/**
 * Environment detection utilities for Next.js configuration.
 * @internal
 */

/**
 * Supported environment modes for configuration loading.
 */
export type EnvironmentMode = 'development' | 'production' | 'test';

/**
 * Detect the current environment mode based on NODE_ENV.
 * 
 * @returns The detected environment mode:
 *   - 'production' if NODE_ENV is 'production'
 *   - 'test' if NODE_ENV is 'test'
 *   - 'development' for all other cases (including undefined)
 * 
 * @example
 * ```typescript
 * // NODE_ENV=production
 * detectEnvironment(); // 'production'
 * 
 * // NODE_ENV=test
 * detectEnvironment(); // 'test'
 * 
 * // NODE_ENV=development or undefined
 * detectEnvironment(); // 'development'
 * ```
 */
export function detectEnvironment(): EnvironmentMode {
  const nodeEnv = process.env['NODE_ENV'];
  
  if (nodeEnv === 'production') {
    return 'production';
  }
  
  if (nodeEnv === 'test') {
    return 'test';
  }
  
  return 'development';
}
