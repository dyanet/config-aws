/**
 * Configuration options for SSMParameterStoreLoader
 */
export interface SSMParameterStoreLoaderConfig {
  /** Path prefix for parameters to load */
  parameterPath?: string;
  /** AWS region. If not specified, uses default region from environment */
  region?: string;
  /** Mapping of environment names to path prefixes */
  environmentMapping?: Record<string, string>;
  /** Whether to decrypt SecureString parameters. Default: true */
  withDecryption?: boolean;
}
