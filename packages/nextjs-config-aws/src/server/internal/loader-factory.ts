/**
 * Internal loader factory for Next.js configuration.
 * Creates loaders based on environment and options.
 * @internal
 */

import {
  ConfigLoader,
  EnvironmentLoader,
  EnvFileLoader,
  SecretsManagerLoader,
  SSMParameterStoreLoader,
} from '@dyanet/config-aws';
import { EnvironmentMode } from './environment';

/**
 * AWS configuration options for the loader factory.
 */
export interface AwsOptions {
  /** Secret name for AWS Secrets Manager */
  secretName?: string;
  /** Parameter path prefix for SSM Parameter Store */
  ssmPrefix?: string;
  /** AWS region (defaults to AWS_REGION env var) */
  region?: string;
}

/**
 * Options for the loader factory.
 */
export interface LoaderFactoryOptions {
  /** The environment mode to use for loader selection */
  environment: EnvironmentMode;
  /** AWS configuration options */
  aws?: AwsOptions;
  /** Force AWS loading even in development mode */
  forceAwsInDev?: boolean;
}

/**
 * Environment Behavior Matrix:
 * 
 * | Environment | Env Vars | .env Files           | AWS Sources           |
 * |-------------|----------|----------------------|-----------------------|
 * | development | ✓        | .env.local, .env     | Only if forceAwsInDev |
 * | production  | ✓        | .env                 | ✓ (if configured)     |
 * | test        | ✓        | ✗                    | ✗                     |
 */

/**
 * Create loaders based on environment and options.
 * 
 * This factory implements the environment behavior matrix:
 * - development: env vars + .env.local/.env files, AWS only if forceAwsInDev
 * - production: env vars + .env file + AWS sources (if configured)
 * - test: env vars only (no file or AWS access)
 * 
 * @param options - Factory options including environment and AWS config
 * @returns Array of ConfigLoader instances
 */
export function createLoaders(options: LoaderFactoryOptions): ConfigLoader[] {
  const { environment, aws, forceAwsInDev = false } = options;
  const loaders: ConfigLoader[] = [];

  // Always include environment variables
  loaders.push(new EnvironmentLoader());

  // Include .env files based on environment
  if (environment === 'development') {
    loaders.push(new EnvFileLoader({ paths: ['.env.local', '.env'] }));
  } else if (environment === 'production') {
    loaders.push(new EnvFileLoader({ paths: ['.env'] }));
  }
  // test environment: no file loading

  // Include AWS loaders in production or when forced in development
  const shouldLoadAws = environment === 'production' || (environment === 'development' && forceAwsInDev);
  
  if (shouldLoadAws && aws) {
    if (aws.secretName) {
      loaders.push(new SecretsManagerLoader({
        secretName: aws.secretName,
        region: aws.region,
      }));
    }
    
    if (aws.ssmPrefix) {
      loaders.push(new SSMParameterStoreLoader({
        parameterPath: aws.ssmPrefix,
        region: aws.region,
      }));
    }
  }

  return loaders;
}
