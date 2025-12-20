# @dyanet/nestjs-config-aws

[![npm version](https://img.shields.io/npm/v/@dyanet/nestjs-config-aws.svg)](https://www.npmjs.com/package/@dyanet/nestjs-config-aws)
[![CI](https://github.com/dyanet/config-aws/actions/workflows/ci.yml/badge.svg)](https://github.com/dyanet/config-aws/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/dyanet/config-aws/flag/nestjs-config-aws/graph/badge.svg)](https://codecov.io/gh/dyanet/config-aws)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

NestJS adapter for AWS configuration management. A thin wrapper around [@dyanet/config-aws](../config-aws) that provides NestJS dependency injection and module patterns.

## Features

- **NestJS Integration** - Full dependency injection support with `ConfigModule` and `ConfigService`
- **@nestjs/config Compatibility** - Seamless integration with the standard NestJS config module
- **Type Safety** - Full TypeScript support with Zod schema validation
- **AWS Services** - Load configuration from Secrets Manager, SSM Parameter Store, S3
- **Thin Adapter** - Minimal overhead, delegates to `@dyanet/config-aws` for all heavy lifting

## Installation

```bash
npm install @dyanet/nestjs-config-aws
```

### Peer Dependencies

```bash
npm install @nestjs/common @nestjs/core @nestjs/config zod
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
      envPrefix: 'APP_',
      secretsManagerConfig: {
        enabled: true,
        region: 'us-east-1',
      },
    }),
  ],
})
export class AppModule {}
```

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

Use `NestConfigAwsIntegrationModule` for seamless integration with `@nestjs/config`:

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { NestConfigAwsIntegrationModule } from '@dyanet/nestjs-config-aws';

@Module({
  imports: [
    NestConfigModule.forRoot(),
    NestConfigAwsIntegrationModule.forRoot({
      registerGlobally: true,
    }),
  ],
})
export class AppModule {}
```

### Async Integration

```typescript
import { NestConfigAwsIntegrationModule } from '@dyanet/nestjs-config-aws';

@Module({
  imports: [
    NestConfigAwsIntegrationModule.forRootAsync({
      imports: [SomeModule],
      inject: [SomeService],
      useFactory: async (someService: SomeService) => ({
        registerGlobally: true,
        // Additional options from someService
      }),
    }),
  ],
})
export class AppModule {}
```

## Migration from Monolithic Package

If you're upgrading from an older version of `@dyanet/nestjs-config-aws` that included all functionality in one package:

### What Changed

1. **Core functionality moved to `@dyanet/config-aws`** - All loaders, ConfigManager, and utilities are now in the core package
2. **This package is now a thin adapter** - It re-exports everything from `@dyanet/config-aws` and adds NestJS-specific integration
3. **Same API surface** - The public API remains the same for backward compatibility

### Migration Steps

1. **No code changes required** - The package re-exports all types and classes from `@dyanet/config-aws`
2. **Optional: Use core package directly** - For non-NestJS code, you can import from `@dyanet/config-aws` directly

```typescript
// Before (still works)
import { EnvironmentLoader, ConfigManager } from '@dyanet/nestjs-config-aws';

// After (optional, for non-NestJS code)
import { EnvironmentLoader, ConfigManager } from '@dyanet/config-aws';
```

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
