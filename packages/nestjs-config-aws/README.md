# @dyanet/nestjs-config-aws

[![npm version](https://img.shields.io/npm/v/@dyanet/nestjs-config-aws.svg)](https://www.npmjs.com/package/@dyanet/nestjs-config-aws)
[![CI](https://github.com/dyanet/config-aws/actions/workflows/ci.yml/badge.svg)](https://github.com/dyanet/config-aws/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/dyanet/config-aws/flag/nestjs-config-aws/graph/badge.svg)](https://codecov.io/gh/dyanet/config-aws)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

NestJS adapter for AWS configuration management. A thin wrapper around [@dyanet/config-aws](../config-aws) that provides NestJS dependency injection and module patterns.

## Features

- **NestJS Integration** - Full dependency injection support with `ConfigModule` and `ConfigService`
- **@nestjs/config Compatibility** - Drop the `awsConfigLoader` factory into `@nestjs/config`'s `load` array
- **Type Safety** - Full TypeScript support with Zod schema validation
- **AWS Services** - Load configuration from Secrets Manager, SSM Parameter Store, S3
- **Thin Adapter** - Minimal overhead, delegates to `@dyanet/config-aws` for all heavy lifting

## Installation

```bash
npm install @dyanet/nestjs-config-aws
```

### Peer Dependencies

```bash
npm install @nestjs/common @nestjs/core zod
```

`@nestjs/config` is an **optional** peer dependency — install it only if you use the
`awsConfigLoader` factory with `@nestjs/config`'s `ConfigModule`:

```bash
npm install @nestjs/config
```

For AWS services, install the SDK clients you need:

```bash
# For Secrets Manager
npm install @aws-sdk/client-secrets-manager

# For SSM Parameter Store
npm install @aws-sdk/client-ssm

# For S3
npm install @aws-sdk/client-s3
```

## Quick Start

### Basic Usage

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@dyanet/nestjs-config-aws';
import { z } from 'zod';

const configSchema = z.object({
  DATABASE_URL: z.string(),
  API_KEY: z.string(),
  PORT: z.coerce.number().default(3000),
});

@Module({
  imports: [
    ConfigModule.forRoot({
      schema: configSchema,
      // Simple flat AWS option — the same shape as the Next.js adapter's getConfig:
      aws: { secretName: '/my-app/config', region: 'us-east-1' },
    }),
  ],
})
export class AppModule {}
```

> `aws` is the recommended ergonomic shape. The verbose `secretsManagerConfig` /
> `ssmConfig` options (with per-environment `paths`) remain available for advanced
> control. When `schema` is omitted, values pass through unvalidated.

### Using ConfigService

```typescript
// app.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@dyanet/nestjs-config-aws';

@Injectable()
export class AppService {
  constructor(private readonly config: ConfigService) {}

  getDatabaseUrl(): string {
    return this.config.get('DATABASE_URL');
  }

  getPort(): number {
    return this.config.get('PORT');
  }
}
```

## ConfigModule

### forRoot()

Synchronous module registration with static options:

```typescript
import { ConfigModule } from '@dyanet/nestjs-config-aws';
import { z } from 'zod';

const schema = z.object({
  DATABASE_URL: z.string(),
  PORT: z.coerce.number().default(3000),
});

@Module({
  imports: [
    ConfigModule.forRoot({
      schema,
      envPrefix: 'APP_',
      secretsManagerConfig: {
        enabled: true,
        region: 'us-east-1',
        paths: {
          development: 'dev/',
          production: 'prod/',
        },
      },
      ssmConfig: {
        enabled: true,
        region: 'us-east-1',
        decrypt: true,
        paths: {
          development: '/app/dev',
          production: '/app/prod',
        },
      },
    }),
  ],
})
export class AppModule {}
```

### forRootAsync()

Asynchronous module registration with factory function:

```typescript
import { ConfigModule } from '@dyanet/nestjs-config-aws';
import { SomeService } from './some.service';

@Module({
  imports: [
    ConfigModule.forRootAsync({
      imports: [SomeModule],
      inject: [SomeService],
      useFactory: async (someService: SomeService) => ({
        schema: someService.getConfigSchema(),
        envPrefix: 'APP_',
        secretsManagerConfig: {
          enabled: true,
          region: await someService.getAwsRegion(),
        },
      }),
    }),
  ],
})
export class AppModule {}
```

### Module Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `schema` | `ZodType<T>` | Default schema | Zod schema for validation |
| `envPrefix` | `string` | `undefined` | Prefix for environment variables |
| `secretsManagerConfig` | `SecretsManagerConfig` | `undefined` | Secrets Manager configuration |
| `ssmConfig` | `SSMConfig` | `undefined` | SSM Parameter Store configuration |
| `ignoreValidationErrors` | `boolean` | `false` | Continue with partial config on validation errors |
| `loadSync` | `boolean` | `false` | Load configuration synchronously |

#### SecretsManagerConfig

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enabled` | `boolean` | `true` | Enable Secrets Manager integration |
| `region` | `string` | `undefined` | AWS region |
| `paths` | `object` | `undefined` | Environment-specific path prefixes |

#### SSMConfig

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enabled` | `boolean` | `true` | Enable SSM Parameter Store integration |
| `region` | `string` | `undefined` | AWS region |
| `decrypt` | `boolean` | `true` | Decrypt SecureString parameters |
| `paths` | `object` | `undefined` | Environment-specific path prefixes |

## ConfigService

The `ConfigService` is automatically registered as a global provider:

```typescript
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@dyanet/nestjs-config-aws';

@Injectable()
export class MyService {
  constructor(private readonly config: ConfigService) {}

  // Get a specific value
  getValue(): string {
    return this.config.get('MY_KEY');
  }

  // Get all configuration
  getAllConfig() {
    return this.config.getAll();
  }

  // Check if initialized
  isReady(): boolean {
    return this.config.isInitialized();
  }

  // Get current environment
  getEnvironment(): string {
    return this.config.getAppEnv();
  }
}
```

## @nestjs/config Integration

To feed AWS-sourced values into the standard `@nestjs/config` `ConfigModule`, use the
`awsConfigLoader` factory. It builds the loader chain, loads from environment variables,
Secrets Manager and SSM, and returns a plain config object — exactly the `ConfigFactory`
shape `@nestjs/config` expects in its `load` array. There is no extra module to import,
and `@nestjs/config` stays an **optional** peer dependency.

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { awsConfigLoader } from '@dyanet/nestjs-config-aws';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [
        awsConfigLoader({
          schema: myConfigSchema, // optional Zod schema
          aws: { secretName: '/my-app/config', region: 'us-east-1' },
        }),
      ],
    }),
  ],
})
export class AppModule {}
```

Then read values through the standard `@nestjs/config` `ConfigService` as usual.

### Namespaced configuration

Compose `awsConfigLoader` with `@nestjs/config`'s own `registerAs`:

```typescript
import { ConfigModule, registerAs } from '@nestjs/config';
import { awsConfigLoader } from '@dyanet/nestjs-config-aws';

ConfigModule.forRoot({
  load: [
    registerAs('database', awsConfigLoader({ ssmConfig: { paths: { production: '/db' } } })),
  ],
});
```

### Async / dependency-injected options

`awsConfigLoader` is a plain function, so build its options however you like — including
inside `ConfigModule.forRootAsync`'s `useFactory` — and pass the resulting factory to `load`.

`awsConfigLoader` accepts: `schema`, `secretsManagerConfig`, `ssmConfig`, `envPrefix`,
`precedence` (`'aws-first'` | `'local-first'` | custom; default `'aws-first'`), `validate`
(default: on when a `schema` is given), and `enableLogging`.

## Migrating from v1.x

v2.0.0 streamlines the `@nestjs/config` integration to the single `awsConfigLoader`
factory shown above. Use the table below to map v1.x usage to v2.x.

| v1.x | v2.x |
| --- | --- |
| `NestConfigAwsIntegrationModule.forRoot(opts)` alongside `ConfigModule` | `ConfigModule.forRoot({ load: [awsConfigLoader(opts)] })` |
| `NestConfigAwsIntegrationModule.forRootAsync({ useFactory })` | build options in your own `useFactory` and pass `awsConfigLoader(opts)` to `load` |
| `namespaces: ['db']` option | `registerAs('db', awsConfigLoader(opts))` |
| `createAwsConfigFactory` / `createConfigModuleFactory` / `createEnhancedConfigOptions` | `awsConfigLoader(opts)` |
| Configuration decorators / typed-config registries | `@nestjs/config`'s `ConfigService` / `ConfigType` |

The standalone `ConfigModule.forRoot()` / `forRootAsync()` and the injectable
`ConfigService` from this package are unchanged. All core re-exports (loaders,
`ConfigManager`, errors, utilities) are unchanged.

## Advanced Usage

### Custom Loaders

Use loaders from `@dyanet/config-aws` directly:

```typescript
import { ConfigModule } from '@dyanet/nestjs-config-aws';
import { 
  EnvironmentLoader, 
  EnvFileLoader, 
  S3Loader,
  SecretsManagerLoader,
  SSMParameterStoreLoader,
  ConfigManager 
} from '@dyanet/nestjs-config-aws';

// Create custom ConfigManager
const configManager = new ConfigManager({
  loaders: [
    new EnvironmentLoader({ prefix: 'APP_' }),
    new EnvFileLoader({ paths: ['.env', '.env.local'] }),
    new S3Loader({ bucket: 'my-bucket', key: 'config.json' }),
    new SecretsManagerLoader({ secretName: '/my-app/secrets' }),
    new SSMParameterStoreLoader({ parameterPath: '/my-app/params' }),
  ],
  precedence: 'aws-first',
  verbose: true,
});
```

### Accessing ConfigManager

Get the underlying `ConfigManager` for advanced use cases:

```typescript
import { Injectable } from '@nestjs/common';
import { ConfigService, ConfigServiceImpl } from '@dyanet/nestjs-config-aws';

@Injectable()
export class MyService {
  constructor(private readonly config: ConfigService) {}

  getLoadResult() {
    // Access ConfigManager directly
    const impl = this.config as ConfigServiceImpl;
    return impl.getConfigManager().getLoadResult();
  }
}
```

## Re-exported Types

All types from `@dyanet/config-aws` are re-exported for convenience:

```typescript
import {
  // Loaders
  EnvironmentLoader,
  EnvFileLoader,
  S3Loader,
  SecretsManagerLoader,
  SSMParameterStoreLoader,
  
  // ConfigManager
  ConfigManager,
  
  // Error classes
  ConfigurationError,
  ValidationError,
  AWSServiceError,
  ConfigurationLoadError,
  MissingConfigurationError,
  
  // Utilities
  ConfigValidationUtil,
  EnvFileParser,
  
  // Types
  ConfigLoader,
  ConfigManagerOptions,
  LoaderPrecedence,
  VerboseOptions,
} from '@dyanet/nestjs-config-aws';
```

## Related Packages

- **[@dyanet/config-aws](../config-aws)** - Framework-agnostic core library
- **[@dyanet/nextjs-config-aws](../nextjs-config-aws)** - Next.js adapter

## License

MIT
