import { ConfigFactory } from '@nestjs/config';
import { ConfigurationSource } from './configuration-source.interface';
import { PrecedenceRule } from './integration-options.interface';

/**
 * Enhanced configuration factory that includes AWS integration metadata.
 */
export interface AwsConfigurationFactory extends ConfigFactory {
  /** Optional namespace for the configuration */
  namespace?: string;
  /** Sources that contributed to this configuration */
  sources: ConfigurationSource[];
  /** Precedence rule applied to this configuration */
  precedenceRule: PrecedenceRule;
}

/**
 * Provider for creating configuration factories that @nestjs/config can consume.
 */
export interface ConfigurationFactoryProvider {
  /**
   * Create a configuration factory for a specific namespace.
   * @param namespace - The namespace for the configuration
   * @param config - The configuration data
   * @returns A configuration factory
   */
  createFactory(namespace: string, config: Record<string, any>): ConfigFactory;
  
  /**
   * Create multiple namespaced configuration factories.
   * @param config - The configuration data organized by namespace
   * @returns Array of configuration factories
   */
  createNamespacedFactories(config: Record<string, any>): ConfigFactory[];
  
  /**
   * Merge AWS configuration with existing local configuration.
   * @param awsConfig - Configuration loaded from AWS sources
   * @param localConfig - Local configuration data
   * @returns Merged configuration data
   */
  mergeWithExisting(
    awsConfig: Record<string, any>, 
    localConfig: Record<string, any>
  ): Record<string, any>;

  /**
   * Create an enhanced AWS configuration factory with metadata.
   * @param namespace - Optional namespace for the configuration
   * @param config - The configuration data
   * @param sources - Sources that contributed to this configuration
   * @param precedenceRule - Precedence rule applied to this configuration
   * @returns Enhanced AWS configuration factory
   */
  createAwsConfigurationFactory(
    namespace: string | undefined,
    config: Record<string, any>,
    sources: ConfigurationSource[],
    precedenceRule: PrecedenceRule
  ): AwsConfigurationFactory;

  /**
   * Create configuration factories from multiple sources with proper organization.
   * @param sourceConfigs - Map of source name to configuration data
   * @param namespaces - Optional list of namespaces to organize configuration
   * @returns Array of configuration factories organized by namespace
   */
  createFactoriesFromSources(
    sourceConfigs: Map<string, Record<string, any>>,
    namespaces?: string[]
  ): ConfigFactory[];

  /**
   * Create configuration factories from sources with precedence rules.
   * @param sources - Array of configuration sources
   * @param precedenceRule - Precedence rule to apply
   * @param namespaces - Optional list of namespaces to organize configuration
   * @returns Array of configuration factories
   */
  createFactoriesWithPrecedence(
    sources: ConfigurationSource[],
    precedenceRule: PrecedenceRule,
    namespaces?: string[]
  ): ConfigFactory[];

  /**
   * Merge configuration with explicit precedence rule.
   * @param sources - Configuration sources
   * @param precedenceRule - Precedence rule to apply
   * @returns Merged configuration data
   */
  mergeWithPrecedence(
    sources: ConfigurationSource[],
    precedenceRule: PrecedenceRule
  ): Record<string, any>;
}