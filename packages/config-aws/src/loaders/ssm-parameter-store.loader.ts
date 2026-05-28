import type { SSMClient } from '@aws-sdk/client-ssm';

import type { ConfigLoader } from '../interfaces/config-loader.interface';
import type { SSMParameterStoreLoaderConfig } from '../interfaces/ssm-parameter-store-loader.interface';
import { AWSServiceError, ConfigurationLoadError } from '../errors';
import { loadOptionalDependency } from '../utils/optional-dependency.util';

/**
 * Loader that reads configuration from AWS SSM Parameter Store.
 * Supports environment-aware path construction, pagination, and decryption options.
 *
 * @example
 * ```typescript
 * // Basic usage
 * const loader = new SSMParameterStoreLoader({
 *   parameterPath: '/my-app/config',
 *   region: 'us-east-1'
 * });
 *
 * // With environment mapping
 * const loader = new SSMParameterStoreLoader({
 *   parameterPath: '/my-app/config',
 *   environmentMapping: {
 *     development: 'dev',
 *     staging: 'stg',
 *     production: 'prod'
 *   }
 * });
 * ```
 */
export class SSMParameterStoreLoader implements ConfigLoader {
  /** @internal Lazily created on first use so the AWS SDK stays optional. */
  protected _client?: SSMClient;
  /** @internal */
  protected readonly _config: Required<SSMParameterStoreLoaderConfig>;
  /** @internal */
  protected readonly _appEnv: string;

  constructor(config: SSMParameterStoreLoaderConfig = {}) {
    this._appEnv = process.env['APP_ENV'] || process.env['NODE_ENV'] || 'local';

    // Set default configuration
    this._config = {
      parameterPath: config.parameterPath || '/config-aws',
      region: config.region || process.env['AWS_REGION'] || 'us-east-1',
      environmentMapping: config.environmentMapping || {
        development: 'dev',
        test: 'test',
        production: 'production',
      },
      withDecryption: config.withDecryption ?? true,
    };
  }

  /**
   * Lazily import the AWS SSM SDK. Imported on demand so the SDK is an optional
   * peer dependency and is never loaded unless this loader runs.
   * @internal
   */
  protected importSdk(): Promise<typeof import('@aws-sdk/client-ssm')> {
    return loadOptionalDependency('@aws-sdk/client-ssm', () => import('@aws-sdk/client-ssm'));
  }

  /**
   * Get (creating on first use) the SSM client. The client relies on the AWS SDK's
   * default Node credential provider chain.
   * @internal
   */
  protected async getClient(): Promise<SSMClient> {
    if (!this._client) {
      const { SSMClient } = await this.importSdk();
      this._client = new SSMClient({ region: this._config.region });
    }
    return this._client;
  }


  /**
   * Get the name of this loader for logging and debugging.
   * @returns The loader name with parameter path
   */
  getName(): string {
    try {
      const parameterPath = this.buildParameterPath();
      return `SSMParameterStoreLoader(${parameterPath})`;
    } catch {
      // Fallback if path construction fails (e.g., missing env mapping)
      return `SSMParameterStoreLoader(${this._config.parameterPath})`;
    }
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
      // Test AWS credentials by resolving the default provider chain
      const client = await this.getClient();
      await client.config.credentials();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Load configuration from AWS SSM Parameter Store.
   * Implements recursive parameter fetching with NextToken handling for pagination.
   * @returns Promise resolving to configuration key-value pairs from parameters
   * @throws AWSServiceError if AWS operation fails
   * @throws ConfigurationLoadError if parameter path cannot be constructed
   */
  async load(): Promise<Record<string, unknown>> {
    // Skip loading in local environment
    if (this._appEnv === 'local') {
      return {};
    }

    const parameterPath = this.buildParameterPath();
    const { GetParametersByPathCommand } = await this.importSdk();
    const client = await this.getClient();
    const result: Record<string, string> = {};
    let nextToken: string | undefined;

    try {
      do {
        const command = new GetParametersByPathCommand({
          Path: parameterPath,
          Recursive: true,
          WithDecryption: this._config.withDecryption,
          NextToken: nextToken,
        });

        const response = await client.send(command);

        if (!response.Parameters) {
          // No parameters found - this is not necessarily an error
          break;
        }

        // Process each parameter
        for (const param of response.Parameters) {
          const key = this.transformParameterName(param.Name, parameterPath);

          if (key && param.Value !== undefined) {
            result[key] = param.Value;
          }
        }

        nextToken = response.NextToken;
      } while (nextToken);

      return result;
    } catch (error) {
      // Handle specific AWS errors
      if (error instanceof Error) {
        if (error.name === 'ResourceNotFoundException' || error.name === 'ParameterNotFound') {
          // No parameters found at path - this is not necessarily an error
          return {};
        }

        if (error.name === 'AccessDeniedException') {
          throw new AWSServiceError(
            `Access denied when retrieving parameters from path '${parameterPath}'. Check AWS credentials and permissions.`,
            'SSM',
            'GetParametersByPath',
            error,
          );
        }

        if (error.name === 'InvalidFilterKey' || error.name === 'InvalidFilterValue') {
          throw new AWSServiceError(
            `Invalid parameter path '${parameterPath}'. Check path format.`,
            'SSM',
            'GetParametersByPath',
            error,
          );
        }
      }

      // For other errors, wrap in AWSServiceError
      throw new AWSServiceError(
        `Failed to retrieve parameters from path '${parameterPath}' in AWS SSM Parameter Store: ${error instanceof Error ? error.message : String(error)}`,
        'SSM',
        'GetParametersByPath',
        error instanceof Error ? error : undefined,
      );
    }
  }


  /**
   * Build the environment-aware parameter path.
   * @returns The full parameter path with environment prefix
   * @throws ConfigurationLoadError if no environment mapping found
   */
  buildParameterPath(): string {
    const envPrefix = this._config.environmentMapping[this._appEnv];

    if (!envPrefix) {
      throw new ConfigurationLoadError(
        `No environment mapping found for APP_ENV '${this._appEnv}'. ` +
          `Available environments: ${Object.keys(this._config.environmentMapping).join(', ')}`,
        this.getName(),
      );
    }

    return `/${envPrefix}${this._config.parameterPath}`;
  }

  /**
   * Transform parameter name by removing the prefix and converting to uppercase.
   * Example: '/dev/config-aws/database/host' -> 'DATABASE_HOST'
   * @param parameterName The full parameter name from AWS
   * @param pathPrefix The path prefix to remove
   * @returns The transformed parameter name or null if invalid
   */
  private transformParameterName(parameterName: string | undefined, pathPrefix: string): string | null {
    if (!parameterName) {
      return null;
    }

    // Remove the path prefix
    let key = parameterName;
    if (key.startsWith(pathPrefix)) {
      key = key.substring(pathPrefix.length);
    }

    // Remove leading slash if present
    if (key.startsWith('/')) {
      key = key.substring(1);
    }

    // Convert slashes to underscores and uppercase
    key = key.replace(/\//g, '_').toUpperCase();

    // Return null for empty keys
    return key || null;
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
