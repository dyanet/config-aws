import { GetSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager';
import { fromNodeProviderChain } from '@aws-sdk/credential-providers';

import { ConfigLoader } from '../interfaces/config-loader.interface';
import { ConfigurationError } from '../interfaces/errors.interface';

/**
 * Configuration options for SecretsManagerLoader
 */
export interface SecretsManagerLoaderConfig {
  /**
   * Base secret name/path (without environment prefix)
   * @default '/nestjs-config-aws'
   */
  secretName?: string;
  
  /**
   * AWS region for Secrets Manager client
   * If not provided, will use AWS_REGION environment variable or default to 'us-east-1'
   */
  region?: string;
  
  /**
   * Custom environment mapping for secret paths
   * @default { development: 'dev', test: 'test', production: 'production' }
   */
  environmentMapping?: Record<string, string>;
}

/**
 * Configuration loader that loads values from AWS Secrets Manager.
 * Supports environment-aware secret path construction and JSON parsing with string fallback.
 */
export class SecretsManagerLoader implements ConfigLoader {
  private readonly client: SecretsManagerClient;
  private readonly config: Required<SecretsManagerLoaderConfig>;
  private readonly appEnv: string;

  constructor(config: SecretsManagerLoaderConfig = {}) {
    this.appEnv = process.env['APP_ENV'] || process.env['NODE_ENV'] || 'local';
    
    // Set default configuration
    this.config = {
      secretName: config.secretName || '/nestjs-config-aws',
      region: config.region || process.env['AWS_REGION'] || 'us-east-1',
      environmentMapping: config.environmentMapping || {
        development: 'dev',
        test: 'test',
        production: 'production'
      }
    };

    // Initialize AWS Secrets Manager client
    this.client = new SecretsManagerClient({
      credentials: fromNodeProviderChain(),
      region: this.config.region,
    });
  }

  /**
   * Load configuration from AWS Secrets Manager.
   * @returns Promise resolving to configuration key-value pairs from the secret
   */
  async load(): Promise<Record<string, any>> {
    // Skip loading in local environment
    if (this.appEnv === 'local') {
      return {};
    }

    const secretName = this.buildSecretName();
    
    try {
      const command = new GetSecretValueCommand({ SecretId: secretName });
      const response = await this.client.send(command);

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
          throw new ConfigurationError(
            `Access denied when retrieving secret '${secretName}'. Check AWS credentials and permissions.`,
            error
          );
        }
        
        if (error.name === 'InvalidRequestException') {
          throw new ConfigurationError(
            `Invalid request when retrieving secret '${secretName}'. Check secret name format.`,
            error
          );
        }
      }
      
      // For other errors, wrap in ConfigurationError
      throw new ConfigurationError(
        `Failed to retrieve secret '${secretName}' from AWS Secrets Manager: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error : undefined
      );
    }
  }

  /**
   * Get the name of this loader for logging and debugging.
   * @returns The loader name with secret path
   */
  getName(): string {
    const secretName = this.buildSecretName();
    return `SecretsManagerLoader(${secretName})`;
  }

  /**
   * Check if this loader is available in the current environment.
   * @returns Promise resolving to true if not in local environment and AWS credentials are available
   */
  async isAvailable(): Promise<boolean> {
    // Skip in local environment
    if (this.appEnv === 'local') {
      return false;
    }

    try {
      // Test AWS credentials by attempting to get caller identity
      // This is a lightweight way to verify AWS access without making actual Secrets Manager calls
      await this.client.config.credentials();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Build the environment-aware secret name/path.
   * @returns The full secret name with environment prefix
   */
  private buildSecretName(): string {
    const envPrefix = this.config.environmentMapping[this.appEnv];
    
    if (!envPrefix) {
      throw new ConfigurationError(
        `No environment mapping found for APP_ENV '${this.appEnv}'. ` +
        `Available environments: ${Object.keys(this.config.environmentMapping).join(', ')}`
      );
    }

    return `/${envPrefix}${this.config.secretName}`;
  }
}