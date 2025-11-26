import { DynamicModule, Global, Module, Provider } from '@nestjs/common';
import { IntegrationOptions, AsyncIntegrationOptions } from './interfaces/integration-options.interface';
import { ConfigurationFactoryProviderImpl } from './providers/configuration-factory.provider';
import { AwsConfigurationLoaderService } from './providers/aws-configuration-loader.service';
import { IntegrationStateService } from './services/integration-state.service';
import { FactoryRegistrationService } from './services/factory-registration.service';
import { NestjsConfigIntegrationService } from './services/nestjs-config-integration.service';
import { PrecedenceHandlerService } from './services/precedence-handler.service';
import { AsyncConfigHelperService } from './services/async-config-helper.service';
import { NamespaceHandlerService } from './services/namespace-handler.service';
import { ValidationIntegrationService } from './services/validation-integration.service';

/**
 * Token for injecting integration options
 */
export const NESTJS_CONFIG_AWS_INTEGRATION_OPTIONS = 'NESTJS_CONFIG_AWS_INTEGRATION_OPTIONS';

/**
 * NestJS module for integrating nestjs-config-aws with @nestjs/config.
 * This module provides AWS-sourced configuration values to the standard @nestjs/config module.
 */
@Global()
@Module({})
export class NestConfigAwsIntegrationModule {
  /**
   * Create a synchronous integration module with provided options.
   * 
   * @param options - Integration options for the module
   * @returns Dynamic module configuration
   */
  static forRoot(options: IntegrationOptions = {}): DynamicModule {
    const providers = this.createProviders(options);

    return {
      module: NestConfigAwsIntegrationModule,
      providers: [
        {
          provide: NESTJS_CONFIG_AWS_INTEGRATION_OPTIONS,
          useValue: options,
        },
        ...providers,
      ],
      exports: [
        ConfigurationFactoryProviderImpl,
        AwsConfigurationLoaderService,
        IntegrationStateService,
        FactoryRegistrationService,
        NestjsConfigIntegrationService,
        AsyncConfigHelperService,
        NamespaceHandlerService,
        ValidationIntegrationService,
      ],
      global: options.registerGlobally !== false,
    };
  }

  /**
   * Create an asynchronous integration module with factory-based options.
   * Useful when integration options depend on other services or async operations.
   * 
   * @param options - Async integration options with factory function
   * @returns Dynamic module configuration
   */
  static forRootAsync(options: AsyncIntegrationOptions): DynamicModule {
    const asyncProviders = this.createAsyncProviders(options);
    const providers = this.createProviders();

    return {
      module: NestConfigAwsIntegrationModule,
      imports: options.imports || [],
      providers: [
        ...asyncProviders,
        ...providers,
      ],
      exports: [
        ConfigurationFactoryProviderImpl,
        AwsConfigurationLoaderService,
        IntegrationStateService,
        FactoryRegistrationService,
        NestjsConfigIntegrationService,
        AsyncConfigHelperService,
        NamespaceHandlerService,
        ValidationIntegrationService,
      ],
      global: true, // Default to global for async modules
    };
  }

  /**
   * Create the standard providers for the integration module.
   */
  private static createProviders(_options?: IntegrationOptions): Provider[] {
    return [
      ConfigurationFactoryProviderImpl,
      AwsConfigurationLoaderService,
      IntegrationStateService,
      PrecedenceHandlerService,
      FactoryRegistrationService,
      NestjsConfigIntegrationService,
      AsyncConfigHelperService,
      NamespaceHandlerService,
      ValidationIntegrationService,
    ];
  }

  /**
   * Create providers for asynchronous module registration.
   */
  private static createAsyncProviders(options: AsyncIntegrationOptions): Provider[] {
    return [
      {
        provide: NESTJS_CONFIG_AWS_INTEGRATION_OPTIONS,
        useFactory: options.useFactory,
        inject: options.inject || [],
      },
    ];
  }
}