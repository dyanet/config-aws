import { GetParametersByPathCommand, SSMClient } from '@aws-sdk/client-ssm';
import { fromNodeProviderChain } from '@aws-sdk/credential-providers';

import { ConfigLoader } from '../interfaces/config-loader.interface';
import { ConfigurationError } from '../interfaces/errors.interface';

/**
 * Configuration options for SSMParameterStoreLoader
 */
export interface SSMParameterStoreLoaderConfig {
  /**
   * Base parameter path (without environment prefix)
   * @default '/nestjs-config-aws'
   */
  parameterPath?: string;
  
  /**
   * AWS region for SSM client
   * If not provided, will use AWS_REGION environment variable or default to 'us-east-1'
   */
  region?: string;
  
  /**
   * Custom environment mapping for parameter paths
   * @default { development: 'dev', test: 'test', production: 'production' }
   */
  environmentMapping?: Record<string, string>;
  
  /**
   * Whether to decrypt SecureString parameters
   * @default true
   */
  withDecryption?: boolean;
}

/**
 * Configuration loader that loads values from AWS Systems Manager Parameter Store.
 * Supports environment-aware parameter path construction, recursive parameter fetching with pagination,
 * and parameter name transformation (remove prefix, convert to uppercase).
 */
export class SSMParameterStoreLoader implements ConfigLoader {
  private readonly client: SSMClient;
  private readonly config: Required<SSMParameterStoreLoaderConfig>;
  private readonly appEnv: string;

  constructor(config: SSMParameterStoreLoaderConfig = {}) {
    this.appEnv = process.env['APP_ENV'] || process.env['NODE_ENV'] || 'local';
    
    // Set default configuration
    this.config = {
      parameterPath: config.parameterPath || '/nestjs-config-aws',
      region: config.region || process.env['AWS_REGION'] || 'us-east-1',
      environmentMapping: config.environmentMapping || {
        development: 'dev',
        test: 'test',
        production: 'production'
      },
      withDecryption: config.withDecryption ?? true
    };

    // Initialize AWS SSM client
    this.client = new SSMClient({
      credentials: fromNodeProviderChain(),
      region: this.config.region,
    });
  }

  /**
   * Load configuration from AWS Systems Manager Parameter Store.
   * Implements recursive parameter fetching with NextToken handling for pagination.
   * @returns Promise resolving to configuration key-value pairs from parameters
   */
  async load(): Promise<Record<string, any>> {
    // Skip loading in local environment or if AWS_REGION is not available
    if (this.appEnv === 'local' || !process.env['AWS_REGION']) {
      return {};
    }

    const parameterPath = this.buildParameterPath();
    const result: Record<string, string> = {};
    let nextToken: string | undefined;

    try {
      do {
        const command = new GetParametersByPathCommand({
          Path: parameterPath,
          Recursive: true,
          WithDecryption: this.config.withDecryption,
          NextToken: nextToken,
        });

        const response = await this.client.send(command);

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
        if (error.name === 'AccessDeniedException') {
          throw new ConfigurationError(
            `Access denied when retrieving parameters from path '${parameterPath}'. Check AWS credentials and permissions.`,
            error
          );
        }
        
        if (error.name === 'InvalidFilterKey' || error.name === 'InvalidFilterValue') {
          throw new ConfigurationError(
            `Invalid parameter path '${parameterPath}'. Check path format.`,
            error
          );
        }
        
        if (error.name === 'ParameterNotFound') {
          // No parameters found at path - this is not necessarily an error
          return {};
        }
      }
      
      // For other errors, wrap in ConfigurationError
      throw new ConfigurationError(
        `Failed to retrieve parameters from path '${parameterPath}' in AWS SSM Parameter Store: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Get the name of this loader for logging and debugging.
   * @returns The loader name with parameter path
   */
  getName(): string {
    const parameterPath = this.buildParameterPath();
    return `SSMParameterStoreLoader(${parameterPath})`;
  }

  /**
   * Check if this loader is available in the current environment.
   * @returns Promise resolving to true if not in local environment, AWS_REGION is set, and AWS credentials are available
   */
  async isAvailable(): Promise<boolean> {
    // Skip in local environment or if AWS_REGION is not available
    if (this.appEnv === 'local' || !process.env['AWS_REGION']) {
      return false;
    }

    try {
      // Test AWS credentials by attempting to get caller identity
      // This is a lightweight way to verify AWS access without making actual SSM calls
      await this.client.config.credentials();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Build the environment-aware parameter path.
   * @returns The full parameter path with environment prefix
   */
  private buildParameterPath(): string {
    const envPrefix = this.config.environmentMapping[this.appEnv];
    
    if (!envPrefix) {
      throw new ConfigurationError(
        `No environment mapping found for APP_ENV '${this.appEnv}'. ` +
        `Available environments: ${Object.keys(this.config.environmentMapping).join(', ')}`
      );
    }

    return `/${envPrefix}${this.config.parameterPath}`;
  }

  /**
   * Transform parameter name by removing the prefix and converting to uppercase.
   * Example: '/dev/nestjs-config-aws/database/host' -> 'DATABASEHOST'
   * This matches the original prospectory-backend implementation
   * @param parameterName The full parameter name from AWS
   * @param pathPrefix The path prefix to remove
   * @returns The transformed parameter name or null if invalid
   */
  private transformParameterName(parameterName: string | undefined, pathPrefix: string): string | null {
    if (!parameterName) {
      return null;
    }

    // Remove the path prefix and all slashes, then convert to uppercase
    // This matches the original implementation: .replace(envPrefix, '').replace(/\//g, '').toUpperCase()
    const key = parameterName.replace(pathPrefix, '').replace(/\//g, '').toUpperCase();
    
    // Return null for empty keys
    return key || null;
  }
}