/**
 * Configuration options for EnvironmentLoader
 */
export interface EnvironmentLoaderConfig {
  /** Prefix to filter environment variables. Only variables starting with this prefix will be loaded. */
  prefix?: string;
  /** List of environment variable names to exclude from loading */
  exclude?: string[];
}
