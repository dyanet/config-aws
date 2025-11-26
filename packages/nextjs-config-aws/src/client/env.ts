/**
 * Client-side environment variable access for Next.js applications.
 *
 * This module provides a function to read runtime environment variables
 * that were injected by the PublicEnvScript server component.
 *
 * @example
 * ```tsx
 * 'use client';
 *
 * import { env } from '@dyanet/nextjs-config-aws/client';
 *
 * function MyComponent() {
 *   const apiUrl = env('API_URL');
 *   const appName = env('APP_NAME', 'Default App');
 *
 *   return <div>API: {apiUrl}, App: {appName}</div>;
 * }
 * ```
 */

/**
 * Type declaration for the global window object with environment variables.
 */
declare global {
  interface Window {
    __ENV?: Record<string, string>;
    [key: string]: unknown;
  }
}

/**
 * Default variable name used by PublicEnvScript.
 */
const DEFAULT_VARIABLE_NAME = '__ENV';

/**
 * Gets the environment variables object from the window.
 *
 * @param variableName - The global variable name to read from
 * @returns The environment variables object, or an empty object if not found
 */
function getEnvObject(variableName: string = DEFAULT_VARIABLE_NAME): Record<string, string> {
  if (typeof window === 'undefined') {
    // Server-side or during SSR - return empty object
    return {};
  }

  const envObj = window[variableName];
  if (envObj && typeof envObj === 'object' && !Array.isArray(envObj)) {
    return envObj as Record<string, string>;
  }

  return {};
}

/**
 * Retrieves a runtime environment variable value.
 *
 * This function reads from the global window object where environment
 * variables were injected by the PublicEnvScript component.
 *
 * @param key - The environment variable name
 * @returns The value of the environment variable, or undefined if not found
 *
 * @example
 * ```ts
 * const apiUrl = env('API_URL');
 * if (apiUrl) {
 *   // Use the API URL
 * }
 * ```
 */
export function env(key: string): string | undefined;

/**
 * Retrieves a runtime environment variable value with a default.
 *
 * @param key - The environment variable name
 * @param defaultValue - The default value to return if the variable is not found
 * @returns The value of the environment variable, or the default value
 *
 * @example
 * ```ts
 * const apiUrl = env('API_URL', 'http://localhost:3000');
 * // apiUrl is guaranteed to be a string
 * ```
 */
export function env<T>(key: string, defaultValue: T): string | T;

/**
 * Implementation of the env function.
 */
export function env<T>(key: string, defaultValue?: T): string | T | undefined {
  const envObj = getEnvObject();
  const value = envObj[key];

  if (value !== undefined) {
    return value;
  }

  return defaultValue;
}

/**
 * Retrieves a runtime environment variable from a custom variable name.
 *
 * Use this when you've configured PublicEnvScript with a custom variableName.
 *
 * @param variableName - The global variable name to read from
 * @param key - The environment variable name
 * @returns The value of the environment variable, or undefined if not found
 *
 * @example
 * ```ts
 * // If PublicEnvScript was configured with variableName="__MY_ENV"
 * const apiUrl = envFrom('__MY_ENV', 'API_URL');
 * ```
 */
export function envFrom(variableName: string, key: string): string | undefined;

/**
 * Retrieves a runtime environment variable from a custom variable name with a default.
 *
 * @param variableName - The global variable name to read from
 * @param key - The environment variable name
 * @param defaultValue - The default value to return if the variable is not found
 * @returns The value of the environment variable, or the default value
 */
export function envFrom<T>(variableName: string, key: string, defaultValue: T): string | T;

/**
 * Implementation of the envFrom function.
 */
export function envFrom<T>(variableName: string, key: string, defaultValue?: T): string | T | undefined {
  const envObj = getEnvObject(variableName);
  const value = envObj[key];

  if (value !== undefined) {
    return value;
  }

  return defaultValue;
}

/**
 * Gets all runtime environment variables.
 *
 * @param variableName - The global variable name to read from (default: '__ENV')
 * @returns A copy of all environment variables
 *
 * @example
 * ```ts
 * const allEnv = getAllEnv();
 * console.log(allEnv); // { API_URL: '...', APP_NAME: '...' }
 * ```
 */
export function getAllEnv(variableName: string = DEFAULT_VARIABLE_NAME): Record<string, string> {
  return { ...getEnvObject(variableName) };
}

/**
 * Checks if a runtime environment variable exists.
 *
 * @param key - The environment variable name
 * @param variableName - The global variable name to read from (default: '__ENV')
 * @returns True if the variable exists, false otherwise
 *
 * @example
 * ```ts
 * if (hasEnv('FEATURE_FLAG')) {
 *   // Feature is enabled
 * }
 * ```
 */
export function hasEnv(key: string, variableName: string = DEFAULT_VARIABLE_NAME): boolean {
  const envObj = getEnvObject(variableName);
  return key in envObj;
}

export default env;
