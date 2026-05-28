import { ZodType } from 'zod';

/**
 * Configuration for AWS Secrets Manager integration.
 */
export interface SecretsManagerConfig {
  /** AWS region for Secrets Manager */
  region?: string;
  /** Base path for secrets in different environments */
  paths?: {
    development?: string;
    test?: string;
    production?: string;
  };
  /** Whether to enable Secrets Manager integration */
  enabled?: boolean;
}

/**
 * Configuration for AWS Systems Manager Parameter Store integration.
 */
export interface SSMConfig {
  /** AWS region for SSM Parameter Store */
  region?: string;
  /** Base path for parameters in different environments */
  paths?: {
    development?: string;
    test?: string;
    production?: string;
  };
  /** Whether to enable SSM Parameter Store integration */
  enabled?: boolean;
  /** Whether to decrypt SecureString parameters */
  decrypt?: boolean;
}

/**
 * Simple, flat AWS options — the same ergonomic shape used by the Next.js adapter's
 * `getConfig`. When provided, exactly the named sources are loaded (a `secretName`
 * adds a Secrets Manager loader, an `ssmPrefix` adds an SSM loader); the granular
 * `secretsManagerConfig` / `ssmConfig` options are not applied.
 */
export interface AwsOptions {
  /** Secret name/path for AWS Secrets Manager. */
  secretName?: string;
  /** Parameter path prefix for AWS SSM Parameter Store. */
  ssmPrefix?: string;
  /** AWS region (defaults to the `AWS_REGION` env var, then `us-east-1`). */
  region?: string;
}

/**
 * Options for configuring the NestJS AWS Configuration module.
 */
export interface NestConfigAwsModuleOptions<T = any> {
  /** Zod schema for configuration validation. When omitted, values are returned as-is (no validation). */
  schema?: ZodType<T>;

  /**
   * Simple AWS options (`{ secretName, ssmPrefix, region }`) — mirrors the Next.js
   * adapter. When set, takes precedence over `secretsManagerConfig` / `ssmConfig`.
   */
  aws?: AwsOptions;

  /** Configuration for AWS Secrets Manager integration (advanced). */
  secretsManagerConfig?: SecretsManagerConfig;

  /** Configuration for AWS Systems Manager Parameter Store integration (advanced). */
  ssmConfig?: SSMConfig;

  /** Prefix for environment variables (e.g., 'APP_') */
  envPrefix?: string;
  
  /** Whether to ignore validation errors and continue with partial config */
  ignoreValidationErrors?: boolean;
  
  /** Custom environment variable name for APP_ENV (defaults to 'APP_ENV') */
  appEnvVariable?: string;
  
  /** Whether to load configuration synchronously during module initialization */
  loadSync?: boolean;
}

/**
 * Async factory options for dynamic module configuration.
 */
export interface NestConfigAwsModuleAsyncOptions<T = any> {
  /** Factory function to create module options */
  useFactory: (...args: any[]) => Promise<NestConfigAwsModuleOptions<T>> | NestConfigAwsModuleOptions<T>;
  
  /** Dependencies to inject into the factory function */
  inject?: any[];
  
  /** Imports required for the factory function */
  imports?: any[];
}
