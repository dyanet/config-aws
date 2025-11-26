import { Injectable, Logger, Inject, Optional } from '@nestjs/common';
import { ConfigFactory, ConfigModule, ConfigModuleOptions } from '@nestjs/config';
import { DynamicModule } from '@nestjs/common';
import { FactoryRegistrationService } from './factory-registration.service';
import { IntegrationOptions } from '../interfaces/integration-options.interface';
import { NESTJS_CONFIG_AWS_INTEGRATION_OPTIONS } from '../nestjs-config-integration.module';

/**
 * Service that provides integration utilities for working with @nestjs/config.
 * This service creates ConfigModule configurations that include AWS-sourced factories.
 */
@Injectable()
export class NestjsConfigIntegrationService {
  private readonly logger = new Logger(NestjsConfigIntegrationService.name);

  constructor(
    private readonly factoryRegistrationService: FactoryRegistrationService,
    @Optional() @Inject(NESTJS_CONFIG_AWS_INTEGRATION_OPTIONS) 
    private readonly options: IntegrationOptions = {}
  ) {}

  /**
   * Create a ConfigModule configuration with AWS-sourced factories.
   * This method can be used to enhance existing @nestjs/config setups.
   * 
   * @param baseOptions - Base ConfigModule options to enhance
   * @returns Promise resolving to enhanced ConfigModule options
   */
  async createConfigModuleOptions(baseOptions: ConfigModuleOptions = {}): Promise<ConfigModuleOptions> {
    this.logger.debug('Creating ConfigModule options with AWS integration');
    
    try {
      // Register AWS configuration factories
      const awsFactories = await this.factoryRegistrationService.registerFactories();
      
      // Merge AWS factories with existing load array
      const existingLoad = baseOptions.load || [];
      const enhancedLoad = [...existingLoad, ...awsFactories];
      
      // Create enhanced options
      const enhancedOptions: ConfigModuleOptions = {
        ...baseOptions,
        load: enhancedLoad,
        // Apply integration-specific options with proper precedence
        isGlobal: baseOptions.isGlobal !== undefined ? baseOptions.isGlobal : (this.options.registerGlobally ?? true),
        cache: baseOptions.cache !== undefined ? baseOptions.cache : (this.options.factoryOptions?.cache ?? true),
        expandVariables: baseOptions.expandVariables !== undefined ? baseOptions.expandVariables : (this.options.factoryOptions?.expandVariables ?? true),
      };
      
      this.logger.log(`Enhanced ConfigModule options with ${awsFactories.length} AWS factories`);
      return enhancedOptions;
    } catch (error) {
      const enhancementError = error instanceof Error ? error : new Error(String(error));
      this.logger.error('Failed to create enhanced ConfigModule options:', enhancementError);
      
      // Handle enhancement failure based on options
      if (this.options.failOnAwsError) {
        throw enhancementError;
      }
      
      // Return base options if fallback is enabled
      if (this.options.fallbackToLocal) {
        this.logger.warn('Falling back to base ConfigModule options due to AWS error');
        return baseOptions;
      }
      
      throw enhancementError;
    }
  }

  /**
   * Create a ConfigModule configuration for async setup.
   * This method works with ConfigModule.forRootAsync() pattern.
   * 
   * @param baseOptions - Base async ConfigModule options to enhance
   * @returns Promise resolving to enhanced async ConfigModule options
   */
  async createAsyncConfigModuleOptions(baseOptions: any = {}): Promise<any> {
    this.logger.debug('Creating async ConfigModule options with AWS integration');
    
    try {
      // Create a factory function that includes AWS configuration
      const enhancedUseFactory = async (...args: any[]) => {
        // Call original factory if it exists
        let baseConfig: ConfigModuleOptions = {};
        if (baseOptions.useFactory) {
          baseConfig = await baseOptions.useFactory(...args);
        }
        
        // Enhance with AWS configuration
        return await this.createConfigModuleOptions(baseConfig);
      };
      
      // Create enhanced async options
      const enhancedAsyncOptions = {
        ...baseOptions,
        useFactory: enhancedUseFactory,
        // Ensure our service is injected
        inject: [...(baseOptions.inject || []), FactoryRegistrationService],
      };
      
      this.logger.debug('Created enhanced async ConfigModule options');
      return enhancedAsyncOptions;
    } catch (error) {
      const asyncError = error instanceof Error ? error : new Error(String(error));
      this.logger.error('Failed to create async ConfigModule options:', asyncError);
      
      if (this.options.failOnAwsError) {
        throw asyncError;
      }
      
      // Return base options if fallback is enabled
      if (this.options.fallbackToLocal) {
        this.logger.warn('Falling back to base async ConfigModule options due to AWS error');
        return baseOptions;
      }
      
      throw asyncError;
    }
  }

  /**
   * Create a complete ConfigModule with AWS integration.
   * This method returns a ready-to-use DynamicModule.
   * 
   * @param baseOptions - Base ConfigModule options
   * @returns Promise resolving to DynamicModule with AWS integration
   */
  async createIntegratedConfigModule(baseOptions: ConfigModuleOptions = {}): Promise<DynamicModule> {
    this.logger.debug('Creating integrated ConfigModule with AWS support');
    
    try {
      // Create enhanced options
      const enhancedOptions = await this.createConfigModuleOptions(baseOptions);
      
      // Create the ConfigModule with enhanced options
      const configModule = await ConfigModule.forRoot(enhancedOptions);
      
      this.logger.log('Created integrated ConfigModule with AWS support');
      return configModule;
    } catch (error) {
      const moduleError = error instanceof Error ? error : new Error(String(error));
      this.logger.error('Failed to create integrated ConfigModule:', moduleError);
      
      if (this.options.failOnAwsError) {
        throw moduleError;
      }
      
      // Return basic ConfigModule if fallback is enabled
      if (this.options.fallbackToLocal) {
        this.logger.warn('Falling back to basic ConfigModule due to AWS error');
        return await ConfigModule.forRoot(baseOptions);
      }
      
      throw moduleError;
    }
  }

  /**
   * Create an async integrated ConfigModule.
   * This method returns a ready-to-use async DynamicModule.
   * 
   * @param baseOptions - Base async ConfigModule options
   * @returns Promise resolving to DynamicModule with async AWS integration
   */
  async createAsyncIntegratedConfigModule(baseOptions: ConfigModuleOptions = {}): Promise<DynamicModule> {
    this.logger.debug('Creating async integrated ConfigModule with AWS support');
    
    try {
      // Create enhanced options with AWS integration
      const enhancedOptions = await this.createConfigModuleOptions(baseOptions);
      
      // Create the ConfigModule with enhanced options
      const asyncConfigModule = await ConfigModule.forRoot(enhancedOptions);
      
      this.logger.log('Created async integrated ConfigModule with AWS support');
      return asyncConfigModule;
    } catch (error) {
      const asyncModuleError = error instanceof Error ? error : new Error(String(error));
      this.logger.error('Failed to create async integrated ConfigModule:', asyncModuleError);
      
      if (this.options.failOnAwsError) {
        throw asyncModuleError;
      }
      
      // Return basic async ConfigModule if fallback is enabled
      if (this.options.fallbackToLocal) {
        this.logger.warn('Falling back to basic async ConfigModule due to AWS error');
        return await ConfigModule.forRoot(baseOptions);
      }
      
      throw asyncModuleError;
    }
  }

  /**
   * Get configuration factories for manual registration.
   * This method allows developers to manually register AWS factories with their own ConfigModule setup.
   * 
   * @returns Promise resolving to array of configuration factories
   */
  async getConfigurationFactories(): Promise<ConfigFactory[]> {
    this.logger.debug('Getting configuration factories for manual registration');
    
    try {
      const factories = await this.factoryRegistrationService.registerFactories();
      this.logger.debug(`Retrieved ${factories.length} configuration factories`);
      return factories;
    } catch (error) {
      const factoryError = error instanceof Error ? error : new Error(String(error));
      this.logger.error('Failed to get configuration factories:', factoryError);
      
      if (this.options.failOnAwsError) {
        throw factoryError;
      }
      
      // Return empty array if fallback is enabled
      if (this.options.fallbackToLocal) {
        this.logger.warn('Returning empty factories array due to AWS error');
        return [];
      }
      
      throw factoryError;
    }
  }

  /**
   * Get namespaced configuration factories.
   * This method returns factories for specific namespaces only.
   * 
   * @param namespaces - Array of namespace names to get factories for
   * @returns Promise resolving to array of namespaced configuration factories
   */
  async getNamespacedFactories(namespaces: string[]): Promise<ConfigFactory[]> {
    this.logger.debug(`Getting namespaced factories for: ${namespaces.join(', ')}`);
    
    try {
      const factories = await this.factoryRegistrationService.registerNamespacedFactories(namespaces);
      this.logger.debug(`Retrieved ${factories.length} namespaced factories`);
      return factories;
    } catch (error) {
      const namespacedError = error instanceof Error ? error : new Error(String(error));
      this.logger.error('Failed to get namespaced factories:', namespacedError);
      
      if (this.options.failOnAwsError) {
        throw namespacedError;
      }
      
      // Return empty array if fallback is enabled
      if (this.options.fallbackToLocal) {
        this.logger.warn('Returning empty namespaced factories array due to AWS error');
        return [];
      }
      
      throw namespacedError;
    }
  }

  /**
   * Create a configuration factory for immediate use.
   * This method creates a single factory that can be used directly with @nestjs/config.
   * 
   * @param namespace - Optional namespace for the factory
   * @param config - Optional configuration data to use
   * @returns Configuration factory
   */
  createImmediateFactory(namespace?: string, config?: Record<string, any>): ConfigFactory {
    this.logger.debug(`Creating immediate factory for namespace: ${namespace || 'default'}`);
    
    try {
      const factory = this.factoryRegistrationService.createSyncFactory(namespace, config);
      this.logger.debug(`Created immediate factory: ${namespace || 'default'}`);
      return factory;
    } catch (error) {
      const immediateError = error instanceof Error ? error : new Error(String(error));
      this.logger.error('Failed to create immediate factory:', immediateError);
      
      if (this.options.failOnAwsError) {
        throw immediateError;
      }
      
      // Return empty factory if fallback is enabled
      if (this.options.fallbackToLocal) {
        this.logger.warn('Creating empty factory due to error');
        return () => config || {};
      }
      
      throw immediateError;
    }
  }

  /**
   * Check if AWS integration is available and working.
   * This method can be used to verify the integration status.
   * 
   * @returns Promise resolving to integration status
   */
  async checkIntegrationStatus(): Promise<{
    isAvailable: boolean;
    factoriesRegistered: number;
    errors: string[];
  }> {
    this.logger.debug('Checking AWS integration status');
    
    const status = {
      isAvailable: false,
      factoriesRegistered: 0,
      errors: [] as string[]
    };

    try {
      // Check if factories are initialized
      const isInitialized = this.factoryRegistrationService.isFactoriesInitialized();
      
      if (isInitialized) {
        const registeredFactories = this.factoryRegistrationService.getRegisteredFactories();
        status.factoriesRegistered = registeredFactories.size;
        status.isAvailable = true;
      } else {
        // Try to register factories to check availability
        const factories = await this.factoryRegistrationService.registerFactories();
        status.factoriesRegistered = factories.length;
        status.isAvailable = true;
      }
      
      this.logger.debug(`Integration status: available=${status.isAvailable}, factories=${status.factoriesRegistered}`);
    } catch (error) {
      const statusError = error instanceof Error ? error : new Error(String(error));
      status.errors.push(statusError.message);
      this.logger.error('Integration status check failed:', statusError);
    }

    return status;
  }

  /**
   * Reset the integration state.
   * This method clears all registered factories and resets the integration.
   */
  resetIntegration(): void {
    this.logger.debug('Resetting AWS integration state');
    this.factoryRegistrationService.reset();
    this.logger.debug('AWS integration state reset complete');
  }
}