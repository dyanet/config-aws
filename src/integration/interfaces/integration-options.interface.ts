import { SecretsManagerConfig, SSMConfig } from '../../interfaces/module-options.interface';

/**
 * Precedence rules for configuration sources when the same key exists in multiple sources.
 */
export type PrecedenceRule = 'aws-first' | 'local-first' | 'merge';

/**
 * Error handling strategy for various failure scenarios.
 */
export interface ErrorHandlingStrategy {
  /** How to handle AWS service unavailability */
  onAwsUnavailable: 'fail' | 'warn' | 'silent';
  /** How to handle configuration errors */
  onConfigurationError: 'fail' | 'warn' | 'use-default';
  /** How to handle validation errors */
  onValidationError: 'fail' | 'warn' | 'skip-invalid';
  /** Whether to enable detailed logging */
  enableDetailedLogging: boolean;
}

/**
 * Factory options for @nestjs/config compatibility.
 */
export interface FactoryOptions {
  /** Whether to cache configuration values */
  cache?: boolean;
  /** Whether to expand variables in configuration values */
  expandVariables?: boolean;
}

/**
 * Configuration options for the NestJS Config AWS Integration module.
 */
export interface IntegrationOptions {
  // AWS Configuration
  /** Configuration for AWS Secrets Manager integration */
  secretsManagerConfig?: SecretsManagerConfig;
  /** Configuration for AWS Systems Manager Parameter Store integration */
  ssmConfig?: SSMConfig;
  
  // Integration Settings
  /** Precedence rule for configuration sources */
  precedence?: PrecedenceRule;
  /** Namespaces to load configuration for */
  namespaces?: string[];
  /** Whether to enable logging */
  enableLogging?: boolean;
  
  // @nestjs/config compatibility
  /** Whether to register the module globally */
  registerGlobally?: boolean;
  /** Factory options for @nestjs/config compatibility */
  factoryOptions?: FactoryOptions;
  
  // Error handling
  /** Whether to fail on AWS errors */
  failOnAwsError?: boolean;
  /** Whether to fallback to local configuration on AWS errors */
  fallbackToLocal?: boolean;
  /** Error handling strategy */
  errorHandling?: ErrorHandlingStrategy;
  
  /** Prefix for environment variables (e.g., 'APP_') */
  envPrefix?: string;
}

/**
 * Async factory options for dynamic integration module configuration.
 */
export interface AsyncIntegrationOptions {
  /** Factory function to create integration options */
  useFactory: (...args: any[]) => Promise<IntegrationOptions> | IntegrationOptions;
  
  /** Dependencies to inject into the factory function */
  inject?: any[];
  
  /** Imports required for the factory function */
  imports?: any[];
}