import { ConfigFactory, ConfigModuleOptions } from '@nestjs/config';
import { DynamicModule } from '@nestjs/common';
import { IntegrationOptions } from '../interfaces/integration-options.interface';
import { NestConfigAwsIntegrationModule } from '../nestjs-config-integration.module';

/**
 * Utility functions for integrating nestjs-config-aws with @nestjs/config.
 * These functions provide convenient ways to set up AWS configuration integration.
 */

/**
 * Create a configuration factory that loads from AWS sources.
 * This factory can be used directly in @nestjs/config's load array.
 * 
 * @param options - Integration options for AWS configuration
 * @returns Promise resolving to configuration factory
 */
export async function createAwsConfigFactory(options: IntegrationOptions = {}): Promise<ConfigFactory> {
  // Import services dynamically to avoid circular dependencies
  const { AsyncConfigHelperService } = await import('../services/async-config-helper.service');
  const { FactoryRegistrationService } = await import('../services/factory-registration.service');
  const { ConfigurationFactoryProviderImpl } = await import('../providers/configuration-factory.provider');
  const { AwsConfigurationLoaderService } = await import('../providers/aws-configuration-loader.service');
  const { PrecedenceHandlerService } = await import('../services/precedence-handler.service');
  const { NamespaceHandlerService } = await import('../services/namespace-handler.service');
  const { ValidationIntegrationService } = await import('../services/validation-integration.service');

  // Create service instances
  const precedenceHandler = new PrecedenceHandlerService();
  const configFactoryProvider = new ConfigurationFactoryProviderImpl(precedenceHandler);
  const awsLoader = new AwsConfigurationLoaderService(options);
  const namespaceHandler = new NamespaceHandlerService();
  const validationService = new ValidationIntegrationService();
  const factoryRegistration = new FactoryRegistrationService(
    configFactoryProvider,
    awsLoader,
    namespaceHandler,
    validationService,
    options
  );
  const asyncHelper = new AsyncConfigHelperService(factoryRegistration, options);

  // Create and return the async factory
  return await asyncHelper.createAsyncConfigFactory();
}

/**
 * Create configuration factories for specific namespaces.
 * This function creates separate factories for each namespace.
 * 
 * @param namespaces - Array of namespace names
 * @param options - Integration options for AWS configuration
 * @returns Promise resolving to array of namespaced configuration factories
 */
export async function createAwsNamespacedFactories(
  namespaces: string[],
  options: IntegrationOptions = {}
): Promise<ConfigFactory[]> {
  // Import services dynamically
  const { AsyncConfigHelperService } = await import('../services/async-config-helper.service');
  const { FactoryRegistrationService } = await import('../services/factory-registration.service');
  const { ConfigurationFactoryProviderImpl } = await import('../providers/configuration-factory.provider');
  const { AwsConfigurationLoaderService } = await import('../providers/aws-configuration-loader.service');
  const { PrecedenceHandlerService } = await import('../services/precedence-handler.service');
  const { NamespaceHandlerService } = await import('../services/namespace-handler.service');
  const { ValidationIntegrationService } = await import('../services/validation-integration.service');

  // Create service instances
  const precedenceHandler = new PrecedenceHandlerService();
  const configFactoryProvider = new ConfigurationFactoryProviderImpl(precedenceHandler);
  const awsLoader = new AwsConfigurationLoaderService(options);
  const namespaceHandler = new NamespaceHandlerService();
  const validationService = new ValidationIntegrationService();
  const factoryRegistration = new FactoryRegistrationService(
    configFactoryProvider,
    awsLoader,
    namespaceHandler,
    validationService,
    options
  );
  const asyncHelper = new AsyncConfigHelperService(factoryRegistration, options);

  // Create and return the namespaced factories
  return await asyncHelper.createAsyncNamespacedFactories(namespaces);
}

/**
 * Create enhanced ConfigModule options with AWS integration.
 * This function enhances existing ConfigModule options with AWS-sourced configuration.
 * 
 * @param baseOptions - Base ConfigModule options to enhance
 * @param integrationOptions - Integration options for AWS configuration
 * @returns Promise resolving to enhanced ConfigModule options
 */
export async function createEnhancedConfigOptions(
  baseOptions: ConfigModuleOptions = {},
  integrationOptions: IntegrationOptions = {}
): Promise<ConfigModuleOptions> {
  // Import services dynamically
  const { AsyncConfigHelperService } = await import('../services/async-config-helper.service');
  const { FactoryRegistrationService } = await import('../services/factory-registration.service');
  const { ConfigurationFactoryProviderImpl } = await import('../providers/configuration-factory.provider');
  const { AwsConfigurationLoaderService } = await import('../providers/aws-configuration-loader.service');
  const { PrecedenceHandlerService } = await import('../services/precedence-handler.service');
  const { NamespaceHandlerService } = await import('../services/namespace-handler.service');
  const { ValidationIntegrationService } = await import('../services/validation-integration.service');

  // Create service instances
  const precedenceHandler = new PrecedenceHandlerService();
  const configFactoryProvider = new ConfigurationFactoryProviderImpl(precedenceHandler);
  const awsLoader = new AwsConfigurationLoaderService(integrationOptions);
  const namespaceHandler = new NamespaceHandlerService();
  const validationService = new ValidationIntegrationService();
  const factoryRegistration = new FactoryRegistrationService(
    configFactoryProvider,
    awsLoader,
    namespaceHandler,
    validationService,
    integrationOptions
  );
  const asyncHelper = new AsyncConfigHelperService(factoryRegistration, integrationOptions);

  // Create and return enhanced options
  return await asyncHelper.createAsyncConfigOptions(baseOptions);
}

/**
 * Create a complete integration module for use with @nestjs/config.
 * This function returns a module that can be imported alongside ConfigModule.
 * 
 * @param options - Integration options for AWS configuration
 * @returns Dynamic module for AWS integration
 */
export function createAwsIntegrationModule(options: IntegrationOptions = {}): DynamicModule {
  return NestConfigAwsIntegrationModule.forRoot(options);
}

/**
 * Create an async integration module for use with @nestjs/config.
 * This function returns a module that can be imported alongside ConfigModule for async scenarios.
 * 
 * @param useFactory - Factory function to create integration options
 * @param inject - Dependencies to inject into the factory function
 * @param imports - Modules to import for the factory function
 * @returns Dynamic module for async AWS integration
 */
export function createAsyncAwsIntegrationModule(
  useFactory: (...args: any[]) => Promise<IntegrationOptions> | IntegrationOptions,
  inject: any[] = [],
  imports: any[] = []
): DynamicModule {
  return NestConfigAwsIntegrationModule.forRootAsync({
    useFactory,
    inject,
    imports,
  });
}

/**
 * Create a factory function that can be used with ConfigModule.forRoot().
 * This factory function loads AWS configuration and merges it with local configuration.
 * 
 * @param integrationOptions - Integration options for AWS configuration
 * @returns Factory function for use with ConfigModule
 */
export function createConfigModuleFactory(
  integrationOptions: IntegrationOptions = {}
): () => Promise<ConfigModuleOptions> {
  return async (): Promise<ConfigModuleOptions> => {
    try {
      // Create AWS configuration factory
      const awsFactory = await createAwsConfigFactory(integrationOptions);
      
      // Return ConfigModule options with AWS factory
      return {
        load: [awsFactory],
        isGlobal: integrationOptions.registerGlobally ?? true,
        cache: integrationOptions.factoryOptions?.cache ?? true,
        expandVariables: integrationOptions.factoryOptions?.expandVariables ?? true,
      };
    } catch (error) {
      // Handle error based on integration options
      if (integrationOptions.failOnAwsError) {
        throw error;
      }
      
      // Return basic options as fallback
      if (integrationOptions.fallbackToLocal) {
        return {
          load: [],
          isGlobal: integrationOptions.registerGlobally ?? true,
          cache: integrationOptions.factoryOptions?.cache ?? true,
          expandVariables: integrationOptions.factoryOptions?.expandVariables ?? true,
        };
      }
      
      throw error;
    }
  };
}

/**
 * Create a factory function with dependency injection support.
 * This factory function can receive injected dependencies and use them to configure AWS integration.
 * 
 * @param integrationOptions - Integration options for AWS configuration
 * @param dependencies - Array of dependency tokens to inject
 * @returns Factory function with dependency injection support
 */
export function createConfigModuleFactoryWithDependencies(
  integrationOptions: IntegrationOptions = {},
  dependencies: any[] = []
): (...args: any[]) => Promise<ConfigModuleOptions> {
  return async (...injectedDependencies: any[]): Promise<ConfigModuleOptions> => {
    try {
      // Import services dynamically
      const { AsyncConfigHelperService } = await import('../services/async-config-helper.service');
      const { FactoryRegistrationService } = await import('../services/factory-registration.service');
      const { ConfigurationFactoryProviderImpl } = await import('../providers/configuration-factory.provider');
      const { AwsConfigurationLoaderService } = await import('../providers/aws-configuration-loader.service');
      const { PrecedenceHandlerService } = await import('../services/precedence-handler.service');
      const { NamespaceHandlerService } = await import('../services/namespace-handler.service');
      const { ValidationIntegrationService } = await import('../services/validation-integration.service');

      // Create service instances
      const precedenceHandler = new PrecedenceHandlerService();
      const configFactoryProvider = new ConfigurationFactoryProviderImpl(precedenceHandler);
      const awsLoader = new AwsConfigurationLoaderService(integrationOptions);
      const namespaceHandler = new NamespaceHandlerService();
      const validationService = new ValidationIntegrationService();
      const factoryRegistration = new FactoryRegistrationService(
        configFactoryProvider,
        awsLoader,
        namespaceHandler,
        validationService,
        integrationOptions
      );
      const asyncHelper = new AsyncConfigHelperService(factoryRegistration, integrationOptions);

      // Create factory with dependencies
      const factoryWithDeps = asyncHelper.createAsyncFactoryWithDependencies(dependencies);
      
      // Execute factory with injected dependencies
      return await factoryWithDeps(...injectedDependencies);
    } catch (error) {
      // Handle error based on integration options
      if (integrationOptions.failOnAwsError) {
        throw error;
      }
      
      // Return basic options as fallback
      if (integrationOptions.fallbackToLocal) {
        return {
          load: [],
          isGlobal: integrationOptions.registerGlobally ?? true,
          cache: integrationOptions.factoryOptions?.cache ?? true,
          expandVariables: integrationOptions.factoryOptions?.expandVariables ?? true,
        };
      }
      
      throw error;
    }
  };
}

/**
 * Check if AWS configuration is available for integration.
 * This function can be used to determine if AWS integration should be enabled.
 * 
 * @param options - Integration options for AWS configuration
 * @returns Promise resolving to availability status
 */
export async function checkAwsConfigAvailability(
  options: IntegrationOptions = {}
): Promise<{
  isAvailable: boolean;
  factoriesCount: number;
  errors: string[];
}> {
  try {
    // Import services dynamically
    const { AsyncConfigHelperService } = await import('../services/async-config-helper.service');
    const { FactoryRegistrationService } = await import('../services/factory-registration.service');
    const { ConfigurationFactoryProviderImpl } = await import('../providers/configuration-factory.provider');
    const { AwsConfigurationLoaderService } = await import('../providers/aws-configuration-loader.service');
    const { PrecedenceHandlerService } = await import('../services/precedence-handler.service');
    const { NamespaceHandlerService } = await import('../services/namespace-handler.service');
    const { ValidationIntegrationService } = await import('../services/validation-integration.service');

    // Create service instances
    const precedenceHandler = new PrecedenceHandlerService();
    const configFactoryProvider = new ConfigurationFactoryProviderImpl(precedenceHandler);
    const awsLoader = new AwsConfigurationLoaderService(options);
    const namespaceHandler = new NamespaceHandlerService();
    const validationService = new ValidationIntegrationService();
    const factoryRegistration = new FactoryRegistrationService(
      configFactoryProvider,
      awsLoader,
      namespaceHandler,
      validationService,
      options
    );
    const asyncHelper = new AsyncConfigHelperService(factoryRegistration, options);

    // Check availability
    return await asyncHelper.checkAsyncAvailability();
  } catch (error) {
    const availabilityError = error instanceof Error ? error : new Error(String(error));
    
    return {
      isAvailable: false,
      factoriesCount: 0,
      errors: [availabilityError.message],
    };
  }
}