import { DynamicModule, Global, Module, Provider } from '@nestjs/common';
import { ConfigLoader, EnvironmentLoader, SecretsManagerLoader, SSMParameterStoreLoader } from '@dyanet/config-aws';

import { ConfigService } from './interfaces/config-service.interface';
import { NestConfigAwsModuleOptions, NestConfigAwsModuleAsyncOptions } from './interfaces/module-options.interface';
import { DefaultConfigSchema, defaultConfigSchema } from './interfaces/default-schema.interface';
import { ConfigServiceImpl, ConfigServiceOptions } from './services/config.service';

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
  static forRoot<T = DefaultConfigSchema>(
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
  static forRootAsync<T = DefaultConfigSchema>(
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
        const loaders = this.createLoaders(options);

        // Create ConfigService options
        const serviceOptions: ConfigServiceOptions<T> = {
          schema: options.schema || (defaultConfigSchema as any),
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
        const loaders = this.createLoaders(options);

        // Create ConfigService options
        const serviceOptions: ConfigServiceOptions = {
          schema: options.schema || defaultConfigSchema,
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

  /**
   * Create configuration loaders based on module options.
   * Uses loaders from @dyanet/config-aws core package.
   */
  private static createLoaders<T>(options: NestConfigAwsModuleOptions<T>): ConfigLoader[] {
    const loaders: ConfigLoader[] = [];

    // Always add environment loader first (lowest precedence)
    loaders.push(new EnvironmentLoader({ prefix: options.envPrefix }));

    // Add Secrets Manager loader if enabled
    if (options.secretsManagerConfig?.enabled !== false) {
      const secretsConfig = {
        region: options.secretsManagerConfig?.region,
        // Map paths to environment mapping if provided
        environmentMapping: options.secretsManagerConfig?.paths ? {
          development: options.secretsManagerConfig.paths.development || 'dev',
          test: options.secretsManagerConfig.paths.test || 'test',
          production: options.secretsManagerConfig.paths.production || 'production',
        } : undefined,
      };

      loaders.push(new SecretsManagerLoader(secretsConfig));
    }

    // Add SSM Parameter Store loader if enabled
    if (options.ssmConfig?.enabled !== false) {
      const ssmConfig = {
        region: options.ssmConfig?.region,
        withDecryption: options.ssmConfig?.decrypt,
        // Map paths to environment mapping if provided
        environmentMapping: options.ssmConfig?.paths ? {
          development: options.ssmConfig.paths.development || 'dev',
          test: options.ssmConfig.paths.test || 'test',
          production: options.ssmConfig.paths.production || 'production',
        } : undefined,
      };

      loaders.push(new SSMParameterStoreLoader(ssmConfig));
    }

    return loaders;
  }
}
