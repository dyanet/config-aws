/**
 * Configuration options for SecretsManagerLoader
 */
export interface SecretsManagerLoaderConfig {
  /** Name or ARN of the secret to load */
  secretName?: string;
  /** AWS region. If not specified, uses default region from environment */
  region?: string;
  /** Mapping of environment names to path prefixes */
  environmentMapping?: Record<string, string>;
}
