import { DynamicModule, Global, Module, Provider } from '@nestjs/common';

import { ConfigService } from './interfaces/config-service.interface';
import { NestConfigAwsModuleOptions, NestConfigAwsModuleAsyncOptions } from './interfaces/module-options.interface';
import { ConfigServiceImpl, ConfigServiceOptions } from './services/config.service';
import { buildAwsLoaders } from './build-loaders';

/**
 * Token for injecting module options
 */
export const NEST_CONFIG_AWS_OPTIONS = 'NEST_CONFIG_AWS_OPTIONS';

/**
 * NestJS module for AWS-integrated configuration management.
 * Provides global configuration service with support for environment variables,
 * AWS Secrets Manager, and AWS Systems Manager Parameter Store.
 */
@Global()
@Module({})
export class ConfigModule {
  /**
   * Create a synchronous configuration module with provided options.
   * 
   * @param options - Configuration options for the module
   * @returns Dynamic module configuration
   */
  static forRoot<T = Record<string, unknown>>(
    options: NestConfigAwsModuleOptions<T> = {}
  ): DynamicModule {
    const configServiceProvider = this.createConfigServiceProvider(options);

    return {
      module: ConfigModule,
      providers: [
        {
          provide: NEST_CONFIG_AWS_OPTIONS,
          useValue: options,
        },
        configServiceProvider,
      ],
      exports: [ConfigService],
      global: true,
    };
  }

  /**
   * Create an asynchronous configuration module with factory-based options.
   * Useful when configuration options depend on other services or async operations.
   * 
   * @param options - Async configuration options with factory function
   * @returns Dynamic module configuration
   */
  static forRootAsync<T = Record<string, unknown>>(
    options: NestConfigAwsModuleAsyncOptions<T>
  ): DynamicModule {
    const asyncProviders = this.createAsyncProviders(options);

    return {
      module: ConfigModule,
      imports: options.imports || [],
      providers: [
        ...asyncProviders,
        this.createAsyncConfigServiceProvider(),
      ],
      exports: [ConfigService],
      global: true,
    };
  }

  /**
   * Create the ConfigService provider for synchronous module registration.
   */
  private static createConfigServiceProvider<T>(
    options: NestConfigAwsModuleOptions<T>
  ): Provider {
    return {
      provide: ConfigService,
      useFactory: async (): Promise<ConfigService<T>> => {
        // Create loaders based on configuration
        const loaders = buildAwsLoaders(options);

        // Create ConfigService options. No schema => values are returned as-is
        // (ConfigManager only validates when a schema is provided).
        const serviceOptions: ConfigServiceOptions<T> = {
          schema: options.schema,
          loaders,
          validateOnLoad: !options.ignoreValidationErrors,
          enableLogging: true,
        };

        // Create and initialize the service
        const configService = new ConfigServiceImpl<T>(serviceOptions);

        // Initialize configuration loading if not in sync mode
        if (!options.loadSync) {
          await configService.initialize();
        }

        return configService as ConfigService<T>;
      },
    };
  }

  /**
   * Create providers for asynchronous module registration.
   */
  private static createAsyncProviders<T>(
    options: NestConfigAwsModuleAsyncOptions<T>
  ): Provider[] {
    return [
      {
        provide: NEST_CONFIG_AWS_OPTIONS,
        useFactory: options.useFactory,
        inject: options.inject || [],
      },
    ];
  }

  /**
   * Create the ConfigService provider for asynchronous module registration.
   */
  private static createAsyncConfigServiceProvider(): Provider {
    return {
      provide: ConfigService,
      useFactory: async (options: NestConfigAwsModuleOptions): Promise<ConfigService> => {
        // Create loaders based on configuration
        const loaders = buildAwsLoaders(options);

        // Create ConfigService options. No schema => values are returned as-is.
        const serviceOptions: ConfigServiceOptions = {
          schema: options.schema,
          loaders,
          validateOnLoad: !options.ignoreValidationErrors,
          enableLogging: true,
        };

        // Create and initialize the service
        const configService = new ConfigServiceImpl(serviceOptions);

        // Initialize configuration loading if not in sync mode
        if (!options.loadSync) {
          await configService.initialize();
        }

        return configService as ConfigService;
      },
      inject: [NEST_CONFIG_AWS_OPTIONS],
    };
  }
}
