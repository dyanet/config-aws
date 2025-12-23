import { GetSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager';
import { fromNodeProviderChain } from '@aws-sdk/credential-providers';

import type { ConfigLoader } from '../interfaces/config-loader.interface.js';
import type { SecretsManagerLoaderConfig } from '../interfaces/secrets-manager-loader.interface.js';
import { AWSServiceError, ConfigurationLoadError } from '../errors/index.js';

/**
 * Loader that reads configuration from AWS Secrets Manager.
 * Supports environment-aware path construction.
 *
 * @example
 * ```typescript
 * // Basic usage
 * const loader = new SecretsManagerLoader({
 *   secretName: '/my-app/config',
 *   region: 'us-east-1'
 * });
 *
 * // With environment mapping
 * const loader = new SecretsManagerLoader({
 *   secretName: '/my-app/config',
 *   environmentMapping: {
 *     development: 'dev',
 *     staging: 'stg',
 *     production: 'prod'
 *   }
 * });
 * ```
 */
export class SecretsManagerLoader implements ConfigLoader {
  /** @internal */
  protected readonly _client: SecretsManagerClient;
  /** @internal */
  protected readonly _config: Required<SecretsManagerLoaderConfig>;
  /** @internal */
  protected readonly _appEnv: string;

  constructor(config: SecretsManagerLoaderConfig = {}) {
    this._appEnv = process.env['APP_ENV'] || process.env['NODE_ENV'] || 'local';

    // Set default configuration
    this._config = {
      secretName: config.secretName || '/nestjs-config-aws',
      region: config.region || process.env['AWS_REGION'] || 'us-east-1',
      environmentMapping: config.environmentMapping || {
        development: 'dev',
        test: 'test',
        production: 'production',
      },
    };

    // Initialize AWS Secrets Manager client
    this._client = new SecretsManagerClient({
      credentials: fromNodeProviderChain(),
      region: this._config.region,
    });
  }


  /**
   * Get the name of this loader for logging and debugging.
   * @returns The loader name with secret path or base secret name if path cannot be built
   */
  getName(): string {
    // Avoid calling buildSecretName() to prevent stack overflow when
    // environment mapping is missing - buildSecretName() throws an error
    // that includes getName() in the message, causing infinite recursion.
    const envPrefix = this._config.environmentMapping[this._appEnv];
    if (envPrefix) {
      return `SecretsManagerLoader(/${envPrefix}${this._config.secretName})`;
    }
    // Fallback to base secret name when environment mapping is unavailable
    return `SecretsManagerLoader(${this._config.secretName})`;
  }

  /**
   * Check if this loader is available in the current environment.
   * @returns Promise resolving to true if not in local environment and AWS credentials are available
   */
  async isAvailable(): Promise<boolean> {
    // Skip in local environment
    if (this._appEnv === 'local') {
      return false;
    }

    try {
      // Test AWS credentials by attempting to get caller identity
      await this._client.config.credentials();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Load configuration from AWS Secrets Manager.
   * @returns Promise resolving to configuration key-value pairs from the secret
   * @throws AWSServiceError if AWS operation fails
   * @throws ConfigurationLoadError if secret cannot be parsed
   */
  async load(): Promise<Record<string, unknown>> {
    // Skip loading in local environment
    if (this._appEnv === 'local') {
      return {};
    }

    const secretName = this.buildSecretName();

    try {
      const command = new GetSecretValueCommand({ SecretId: secretName });
      const response = await this._client.send(command);

      if (!response.SecretString) {
        return {};
      }

      // Try to parse as JSON, fallback to string value
      try {
        const parsed = JSON.parse(response.SecretString);

        // Ensure we return an object for configuration merging
        if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
          return parsed;
        } else {
          // If it's not an object, wrap it in a configuration object
          return { SECRET_VALUE: parsed };
        }
      } catch {
        // If JSON parsing fails, treat as a single string value
        return { SECRET_VALUE: response.SecretString };
      }
    } catch (error) {
      // Handle specific AWS errors
      if (error instanceof Error) {
        if (error.name === 'ResourceNotFoundException') {
          // Secret doesn't exist - this is not necessarily an error in all environments
          return {};
        }

        if (error.name === 'AccessDeniedException') {
          throw new AWSServiceError(
            `Access denied when retrieving secret '${secretName}'. Check AWS credentials and permissions.`,
            'SecretsManager',
            'GetSecretValue',
            error,
          );
        }

        if (error.name === 'InvalidRequestException') {
          throw new AWSServiceError(
            `Invalid request when retrieving secret '${secretName}'. Check secret name format.`,
            'SecretsManager',
            'GetSecretValue',
            error,
          );
        }
      }

      // For other errors, wrap in AWSServiceError
      throw new AWSServiceError(
        `Failed to retrieve secret '${secretName}' from AWS Secrets Manager: ${error instanceof Error ? error.message : String(error)}`,
        'SecretsManager',
        'GetSecretValue',
        error instanceof Error ? error : undefined,
      );
    }
  }

  /**
   * Build the environment-aware secret name/path.
   * @returns The full secret name with environment prefix
   */
  buildSecretName(): string {
    const envPrefix = this._config.environmentMapping[this._appEnv];

    if (!envPrefix) {
      throw new ConfigurationLoadError(
        `No environment mapping found for APP_ENV '${this._appEnv}'. ` +
          `Available environments: ${Object.keys(this._config.environmentMapping).join(', ')}`,
        this.getName(),
      );
    }

    return `/${envPrefix}${this._config.secretName}`;
  }

  /**
   * Get the current app environment.
   * @returns The current APP_ENV or NODE_ENV value
   */
  getAppEnv(): string {
    return this._appEnv;
  }

  /**
   * Get the environment mapping configuration.
   * @returns The environment mapping record
   */
  getEnvironmentMapping(): Record<string, string> {
    return { ...this._config.environmentMapping };
  }
}
