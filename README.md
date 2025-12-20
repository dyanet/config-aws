# nestjs-config-aws

[![CI](https://github.com/dyanet/config-aws/actions/workflows/ci.yml/badge.svg)](https://github.com/dyanet/config-aws/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/dyanet/config-aws/branch/main/graph/badge.svg)](https://codecov.io/gh/dyanet/config-aws)
[![npm version](https://img.shields.io/npm/v/@dyanet/config-aws.svg)](https://www.npmjs.com/package/@dyanet/config-aws)
[![npm version](https://img.shields.io/npm/v/@dyanet/nestjs-config-aws.svg)](https://www.npmjs.com/package/@dyanet/nestjs-config-aws)
[![npm version](https://img.shields.io/npm/v/@dyanet/nextjs-config-aws.svg)](https://www.npmjs.com/package/@dyanet/nextjs-config-aws)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

AWS-integrated configuration management for NestJS applications with support for environment variables, AWS Secrets Manager, and AWS Systems Manager Parameter Store. **Includes seamless @nestjs/config integration for maximum compatibility.**

## Features

- 🔧 **Environment Variable Loading**: Automatic loading from `process.env`
- 🔐 **AWS Secrets Manager Integration**: Secure secret management with environment-aware paths
- 📋 **AWS Systems Manager Parameter Store**: Hierarchical parameter management
- 🛡️ **Type-Safe Configuration**: Full TypeScript support with Zod validation
- 🌍 **Environment-Aware Loading**: Automatic configuration based on `APP_ENV`
- 📦 **Zero-Configuration Setup**: Works out of the box with sensible defaults
- 🔄 **Configuration Merging**: Intelligent precedence handling across sources
- ⚡ **Performance Optimized**: Efficient loading with caching and pagination support
- 🤝 **@nestjs/config Integration**: Use AWS-sourced values through standard @nestjs/config patterns
- 🔀 **Flexible Precedence Rules**: aws-first, local-first, or merge strategies for configuration conflicts

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Environment Variables](#environment-variables)
- [Usage Examples](#usage-examples)
- [@nestjs/config Integration](#nestjsconfig-integration)
- [API Reference](#api-reference)
- [Troubleshooting](#troubleshooting)
- [Examples](#examples)
- [Contributing](#contributing)
- [License](#license)

## Installation

### Standalone Usage

```bash
npm install nestjs-config-aws
```

### @nestjs/config Integration

For seamless integration with the standard @nestjs/config module:

```bash
npm install nestjs-config-aws @nestjs/config
```

### Peer Dependencies

Make sure you have the following peer dependencies installed:

```bash
npm install @nestjs/common @nestjs/core zod
```

For @nestjs/config integration, `@nestjs/config` is also required as a peer dependency.

### AWS Dependencies

The module automatically includes the necessary AWS SDK dependencies:
- `@aws-sdk/client-secrets-manager`
- `@aws-sdk/client-ssm`
- `@aws-sdk/credential-providers`

## Quick Start

Choose your preferred integration approach:

### Option 1: Standalone Usage

Use nestjs-config-aws as your primary configuration module:

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from 'nestjs-config-aws';

@Module({
  imports: [
    ConfigModule.forRoot(), // Uses default configuration
  ],
})
export class AppModule {}
```

### Option 2: @nestjs/config Integration (Recommended)

Integrate with the standard @nestjs/config for maximum compatibility:

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NestConfigAwsIntegrationModule } from 'nestjs-config-aws';

@Module({
  imports: [
    // Step 1: AWS Integration (must be first)
    NestConfigAwsIntegrationModule.forRoot({
      secretsManagerConfig: { enabled: true },
      precedence: 'aws-first'
    }),
    
    // Step 2: Standard @nestjs/config (must be after)
    ConfigModule.forRoot({ isGlobal: true })
  ],
})
export class AppModule {}
```

### With Custom Schema (Standalone)

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from 'nestjs-config-aws';
import { z } from 'zod';

const configSchema = z.object({
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string(),
  API_KEY: z.string(),
  DEBUG: z.coerce.boolean().default(false),
});

@Module({
  imports: [
    ConfigModule.forRoot({
      schema: configSchema,
    }),
  ],
})
export class AppModule {}
```

### Service Usage

Both approaches use the same service patterns:

```typescript
import { Injectable } from '@nestjs/common';
// For standalone: import { ConfigService } from 'nestjs-config-aws';
// For integration: import { ConfigService } from '@nestjs/config';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppService {
  constructor(private configService: ConfigService) {}

  getPort(): number {
    return this.configService.get('PORT'); // Values can come from AWS
  }
  
  getDatabaseUrl(): string {
    // This value can come from AWS Secrets Manager
    return this.configService.get('DATABASE_URL');
  }
}
```

## Configuration

### Module Options

The `ConfigModule.forRoot()` method accepts the following options:

```typescript
interface NestConfigAwsModuleOptions<T = any> {
  schema?: ZodType<T>;
  secretsManagerConfig?: SecretsManagerConfig;
  ssmConfig?: SSMConfig;
  envPrefix?: string;
  ignoreValidationErrors?: boolean;
  appEnvVariable?: string;
  loadSync?: boolean;
}
```

### AWS Secrets Manager Configuration

```typescript
interface SecretsManagerConfig {
  region?: string;
  paths?: {
    development?: string;
    test?: string;
    production?: string;
  };
  enabled?: boolean;
}
```

### AWS SSM Parameter Store Configuration

```typescript
interface SSMConfig {
  region?: string;
  paths?: {
    development?: string;
    test?: string;
    production?: string;
  };
  enabled?: boolean;
  decrypt?: boolean;
}
```

## Environment Variables

### Core Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `APP_ENV` | Application environment | `local` | No |
| `NODE_ENV` | Node.js environment | - | No |
| `AWS_REGION` | AWS region for services | Auto-detected | No |
| `AWS_PROFILE` | AWS profile for local development | - | No |

### APP_ENV Behavior

The `APP_ENV` variable controls configuration loading behavior:

- **`local`**: Only loads environment variables. AWS services are used only if valid AWS credentials are found.
- **`development`**: Loads from environment variables, AWS Secrets Manager, and SSM Parameter Store using development paths.
- **`test`**: Loads from environment variables, AWS Secrets Manager, and SSM Parameter Store using test paths.
- **`production`**: Loads from environment variables, AWS Secrets Manager, and SSM Parameter Store using production paths.

### Environment Variable Precedence

Configuration values are loaded in the following order (later sources override earlier ones):

1. **Environment Variables** (`process.env`)
2. **AWS Secrets Manager** (if enabled and not in local mode)
3. **AWS SSM Parameter Store** (if enabled and not in local mode)
4. **Local .env file** (in local mode only, overrides AWS sources)

### AWS Path Construction

By default, the module constructs AWS resource paths using the following patterns:

**Secrets Manager:**
- Development: `/myapp/development/secrets`
- Test: `/myapp/test/secrets`
- Production: `/myapp/production/secrets`

**SSM Parameter Store:**
- Development: `/myapp/development/`
- Test: `/myapp/test/`
- Production: `/myapp/production/`

## Usage Examples

### Basic Configuration

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from 'nestjs-config-aws';

@Module({
  imports: [ConfigModule.forRoot()],
})
export class AppModule {}

// app.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from 'nestjs-config-aws';

@Injectable()
export class AppService {
  constructor(private configService: ConfigService) {}

  getDatabaseUrl(): string {
    return this.configService.get('DATABASE_URL');
  }
}
```

### Custom Schema with Validation

```typescript
import { z } from 'zod';

const appConfigSchema = z.object({
  // Server configuration
  PORT: z.coerce.number().min(1).max(65535).default(3000),
  HOST: z.string().default('localhost'),
  
  // Database configuration
  DATABASE_URL: z.string().url(),
  DATABASE_POOL_SIZE: z.coerce.number().min(1).default(10),
  
  // External services
  REDIS_URL: z.string().url().optional(),
  API_KEY: z.string().min(1),
  
  // Feature flags
  ENABLE_LOGGING: z.coerce.boolean().default(true),
  DEBUG_MODE: z.coerce.boolean().default(false),
});

type AppConfig = z.infer<typeof appConfigSchema>;

@Module({
  imports: [
    ConfigModule.forRoot({
      schema: appConfigSchema,
    }),
  ],
})
export class AppModule {}
```

### Advanced AWS Configuration

```typescript
@Module({
  imports: [
    ConfigModule.forRoot({
      schema: appConfigSchema,
      secretsManagerConfig: {
        region: 'us-east-1',
        paths: {
          development: '/myapp/dev/secrets',
          test: '/myapp/test/secrets',
          production: '/myapp/prod/secrets',
        },
        enabled: true,
      },
      ssmConfig: {
        region: 'us-east-1',
        paths: {
          development: '/myapp/dev/config/',
          test: '/myapp/test/config/',
          production: '/myapp/prod/config/',
        },
        enabled: true,
        decrypt: true,
      },
      envPrefix: 'MYAPP_',
    }),
  ],
})
export class AppModule {}
```

### Async Configuration

```typescript
@Module({
  imports: [
    ConfigModule.forRootAsync({
      useFactory: async () => {
        // Load schema or configuration dynamically
        const schema = await loadSchemaFromFile();
        return {
          schema,
          secretsManagerConfig: {
            enabled: process.env.NODE_ENV !== 'test',
          },
        };
      },
    }),
  ],
})
export class AppModule {}
```

### Environment-Specific Configuration

```typescript
// Different configurations based on APP_ENV
const getConfigForEnvironment = () => {
  const baseConfig = {
    schema: appConfigSchema,
  };

  switch (process.env.APP_ENV) {
    case 'local':
      return {
        ...baseConfig,
        secretsManagerConfig: { enabled: false },
        ssmConfig: { enabled: false },
      };
    
    case 'development':
      return {
        ...baseConfig,
        secretsManagerConfig: {
          enabled: true,
          paths: { development: '/myapp/dev/secrets' },
        },
      };
    
    case 'production':
      return {
        ...baseConfig,
        secretsManagerConfig: {
          enabled: true,
          paths: { production: '/myapp/prod/secrets' },
        },
        ssmConfig: {
          enabled: true,
          decrypt: true,
        },
      };
    
    default:
      return baseConfig;
  }
};

@Module({
  imports: [ConfigModule.forRoot(getConfigForEnvironment())],
})
export class AppModule {}
```

## @nestjs/config Integration

nestjs-config-aws provides seamless integration with the standard `@nestjs/config` module, allowing you to use AWS-sourced configuration values through the familiar `@nestjs/config` patterns. This integration maintains backward compatibility while adding AWS capabilities.

### Installation for Integration

When using the integration, install both packages:

```bash
npm install nestjs-config-aws @nestjs/config
```

### Basic Integration Setup

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NestConfigAwsIntegrationModule } from 'nestjs-config-aws';

@Module({
  imports: [
    // Initialize AWS integration first
    NestConfigAwsIntegrationModule.forRoot({
      secretsManagerConfig: {
        enabled: true,
        paths: {
          production: '/myapp/prod/secrets'
        }
      },
      precedence: 'aws-first'
    }),
    
    // Standard @nestjs/config setup
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true
    })
  ]
})
export class AppModule {}
```

### Using Standard ConfigService

With the integration, you can use the standard `@nestjs/config` `ConfigService` to access AWS-sourced values:

```typescript
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppService {
  constructor(private configService: ConfigService) {}

  getDatabaseUrl(): string {
    // This value can come from AWS Secrets Manager
    return this.configService.get<string>('DATABASE_URL');
  }

  getPort(): number {
    // This value can come from SSM Parameter Store
    return this.configService.get<number>('PORT', 3000);
  }
}
```

### Integration Configuration Options

The `NestConfigAwsIntegrationModule` accepts the following options:

```typescript
interface IntegrationOptions {
  // AWS Configuration
  secretsManagerConfig?: SecretsManagerConfig;
  ssmConfig?: SSMConfig;
  
  // Integration Settings
  precedence?: 'aws-first' | 'local-first' | 'merge';
  namespaces?: string[];
  enableLogging?: boolean;
  
  // @nestjs/config compatibility
  registerGlobally?: boolean;
  factoryOptions?: {
    cache?: boolean;
    expandVariables?: boolean;
  };
  
  // Error handling
  failOnAwsError?: boolean;
  fallbackToLocal?: boolean;
}
```

### Precedence Rules

The integration supports three precedence strategies:

#### 1. AWS-First (Default)
AWS values override local values when both exist:
```typescript
NestConfigAwsIntegrationModule.forRoot({
  precedence: 'aws-first' // AWS values take priority
})
```

#### 2. Local-First
Local values override AWS values when both exist:
```typescript
NestConfigAwsIntegrationModule.forRoot({
  precedence: 'local-first' // Local .env values take priority
})
```

#### 3. Merge
Combines values from all sources intelligently:
```typescript
NestConfigAwsIntegrationModule.forRoot({
  precedence: 'merge' // Merge all sources with smart conflict resolution
})
```

### Async Configuration Integration

For complex setups, use async configuration:

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NestConfigAwsIntegrationModule } from 'nestjs-config-aws';

@Module({
  imports: [
    NestConfigAwsIntegrationModule.forRootAsync({
      useFactory: async () => ({
        secretsManagerConfig: {
          enabled: process.env.NODE_ENV === 'production',
          region: process.env.AWS_REGION,
          paths: {
            production: `/myapp/${process.env.DEPLOYMENT_STAGE}/secrets`
          }
        },
        precedence: 'aws-first',
        failOnAwsError: false
      })
    }),
    
    ConfigModule.forRootAsync({
      useFactory: async (configService: ConfigService) => ({
        isGlobal: true,
        validate: (config) => {
          // Validate AWS-sourced configuration
          if (!config.DATABASE_URL) {
            throw new Error('DATABASE_URL is required');
          }
          return config;
        }
      }),
      inject: [ConfigService]
    })
  ]
})
export class AppModule {}
```

### Namespaced Configuration

The integration supports @nestjs/config's `registerAs` pattern for namespaced configuration:

```typescript
// config/database.config.ts
import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  host: process.env.DATABASE_HOST,     // Can come from AWS
  port: parseInt(process.env.DATABASE_PORT, 10),
  username: process.env.DATABASE_USERNAME, // From AWS Secrets Manager
  password: process.env.DATABASE_PASSWORD, // From AWS Secrets Manager
}));

// app.module.ts
@Module({
  imports: [
    NestConfigAwsIntegrationModule.forRoot({
      namespaces: ['database'],
      secretsManagerConfig: {
        enabled: true,
        paths: {
          production: '/myapp/prod/database'
        }
      }
    }),
    
    ConfigModule.forRoot({
      load: [databaseConfig],
      isGlobal: true
    })
  ]
})
export class AppModule {}

// database.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class DatabaseService {
  constructor(private configService: ConfigService) {}

  getConnectionConfig() {
    // Access namespaced configuration
    return this.configService.get('database');
  }
}
```

### Validation Integration

The integration works seamlessly with @nestjs/config validation:

#### Using Joi Validation

```typescript
import * as Joi from 'joi';

@Module({
  imports: [
    NestConfigAwsIntegrationModule.forRoot({
      secretsManagerConfig: { enabled: true }
    }),
    
    ConfigModule.forRoot({
      validationSchema: Joi.object({
        NODE_ENV: Joi.string()
          .valid('development', 'production', 'test')
          .default('development'),
        PORT: Joi.number().default(3000),
        DATABASE_URL: Joi.string().required(), // Can come from AWS
        API_KEY: Joi.string().required(),      // Can come from AWS
      }),
      validationOptions: {
        allowUnknown: true,
        abortEarly: false,
      }
    })
  ]
})
export class AppModule {}
```

#### Using Class Validator

```typescript
import { IsString, IsNumber, IsUrl } from 'class-validator';
import { Transform } from 'class-transformer';

class EnvironmentVariables {
  @IsString()
  NODE_ENV: string;

  @IsNumber()
  @Transform(({ value }) => parseInt(value, 10))
  PORT: number;

  @IsUrl()
  DATABASE_URL: string; // Can come from AWS

  @IsString()
  API_KEY: string; // Can come from AWS
}

@Module({
  imports: [
    NestConfigAwsIntegrationModule.forRoot({
      secretsManagerConfig: { enabled: true }
    }),
    
    ConfigModule.forRoot({
      validate: (config: Record<string, unknown>) => {
        const validatedConfig = plainToClass(EnvironmentVariables, config, {
          enableImplicitConversion: true,
        });
        const errors = validateSync(validatedConfig, {
          skipMissingProperties: false,
        });

        if (errors.length > 0) {
          throw new Error(errors.toString());
        }
        return validatedConfig;
      },
    })
  ]
})
export class AppModule {}
```

### Error Handling and Graceful Degradation

The integration provides robust error handling:

```typescript
NestConfigAwsIntegrationModule.forRoot({
  secretsManagerConfig: {
    enabled: true,
    paths: { production: '/myapp/prod/secrets' }
  },
  
  // Error handling options
  failOnAwsError: false,        // Don't fail if AWS is unavailable
  fallbackToLocal: true,        // Use local config if AWS fails
  enableLogging: true,          // Enable detailed logging
  
  // Graceful degradation
  precedence: 'local-first'     // Prefer local values as fallback
})
```

### Migration Guide

#### From @nestjs/config Only

If you're currently using only `@nestjs/config`:

1. **Install nestjs-config-aws**:
   ```bash
   npm install nestjs-config-aws
   ```

2. **Add integration module** before your existing ConfigModule:
   ```typescript
   @Module({
     imports: [
       // Add this before ConfigModule
       NestConfigAwsIntegrationModule.forRoot({
         secretsManagerConfig: { enabled: true }
       }),
       
       // Your existing ConfigModule setup
       ConfigModule.forRoot({
         isGlobal: true
       })
     ]
   })
   ```

3. **No code changes needed** - your existing ConfigService usage continues to work

4. **Configure AWS resources** - add secrets to AWS Secrets Manager or SSM Parameter Store

#### From nestjs-config-aws Only

If you're currently using only `nestjs-config-aws`:

1. **Install @nestjs/config**:
   ```bash
   npm install @nestjs/config
   ```

2. **Replace ConfigModule import**:
   ```typescript
   // Before
   import { ConfigModule } from 'nestjs-config-aws';
   
   // After
   import { ConfigModule } from '@nestjs/config';
   import { NestConfigAwsIntegrationModule } from 'nestjs-config-aws';
   ```

3. **Update module imports**:
   ```typescript
   @Module({
     imports: [
       // Add integration module
       NestConfigAwsIntegrationModule.forRoot({
         // Your existing nestjs-config-aws options
       }),
       
       // Add standard ConfigModule
       ConfigModule.forRoot({
         isGlobal: true
       })
     ]
   })
   ```

4. **Update service injection**:
   ```typescript
   // Before
   import { ConfigService } from 'nestjs-config-aws';
   
   // After
   import { ConfigService } from '@nestjs/config';
   ```

### Integration Troubleshooting

#### Common Integration Issues

**1. Configuration Not Loading from AWS**

Check that the integration module is imported before ConfigModule:
```typescript
@Module({
  imports: [
    NestConfigAwsIntegrationModule.forRoot({}), // Must be first
    ConfigModule.forRoot({})                    // Then ConfigModule
  ]
})
```

**2. Values Not Available in ConfigService**

Ensure AWS loading completes before ConfigModule initialization:
```typescript
NestConfigAwsIntegrationModule.forRootAsync({
  useFactory: async () => {
    // Async setup ensures proper initialization order
    return { secretsManagerConfig: { enabled: true } };
  }
})
```

**3. Precedence Rules Not Working**

Verify precedence configuration:
```typescript
NestConfigAwsIntegrationModule.forRoot({
  precedence: 'aws-first', // or 'local-first' or 'merge'
  enableLogging: true      // Enable to see precedence decisions
})
```

**4. Validation Errors with AWS Values**

Check that AWS values match validation schema:
```typescript
// Enable detailed logging to see loaded values
NestConfigAwsIntegrationModule.forRoot({
  enableLogging: true,
  failOnAwsError: false // Don't fail on AWS errors during debugging
})
```

**5. Namespace Issues**

Ensure namespace configuration matches registerAs usage:
```typescript
// In integration config
NestConfigAwsIntegrationModule.forRoot({
  namespaces: ['database', 'redis'] // Must match registerAs names
})

// In config files
export default registerAs('database', () => ({ /* config */ }));
```

#### Debug Integration Issues

Enable debug logging:
```bash
DEBUG=nestjs-config-aws:integration* npm start
```

This provides detailed logs about:
- AWS configuration loading
- Factory registration with @nestjs/config
- Precedence rule application
- Namespace handling
- Error scenarios

## API Reference

### ConfigModule

#### `ConfigModule.forRoot(options?: NestConfigAwsModuleOptions)`

Configures the module with the provided options.

**Parameters:**
- `options` - Configuration options for the module

**Returns:** `DynamicModule`

#### `ConfigModule.forRootAsync(options: NestConfigAwsModuleAsyncOptions)`

Configures the module asynchronously using a factory function.

**Parameters:**
- `options` - Async configuration options

**Returns:** `DynamicModule`

### ConfigService

#### `get<K extends keyof T>(key: K): T[K]`

Retrieves a configuration value by key with type safety.

**Parameters:**
- `key` - The configuration key to retrieve

**Returns:** The configuration value with proper typing

#### `getAll(): T`

Retrieves all configuration values.

**Returns:** The complete configuration object

#### `isInitialized(): boolean`

Checks if the configuration service has been initialized.

**Returns:** `true` if the service is ready to serve configuration values

### Configuration Loaders

#### EnvironmentLoader

Loads configuration from `process.env`.

#### SecretsManagerLoader

Loads configuration from AWS Secrets Manager with environment-aware path construction.

#### SSMParameterStoreLoader

Loads configuration from AWS Systems Manager Parameter Store with recursive parameter fetching.

## Troubleshooting

### Common Issues

#### 1. AWS Credentials Not Found

**Error:** `CredentialsProviderError: Could not load credentials`

**Solution:**
- Ensure AWS credentials are configured via AWS CLI, environment variables, or IAM roles
- For local development, set up an AWS profile: `aws configure --profile myprofile`
- Set `AWS_PROFILE` environment variable to use a specific profile

#### 2. Configuration Validation Errors

**Error:** `ValidationError: Configuration validation failed`

**Solution:**
- Check that all required environment variables are set
- Verify that configuration values match the expected types in your Zod schema
- Use `ignoreValidationErrors: true` for debugging (not recommended for production)

#### 3. AWS Region Not Detected

**Error:** `ConfigurationError: AWS region could not be determined`

**Solution:**
- Set the `AWS_REGION` environment variable
- Configure region in AWS credentials file
- Specify region in module configuration

#### 4. Secrets Manager Access Denied

**Error:** `AccessDenied: User is not authorized to perform secretsmanager:GetSecretValue`

**Solution:**
- Ensure your AWS credentials have the necessary permissions
- Add the following IAM policy to your user/role:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue",
        "secretsmanager:DescribeSecret"
      ],
      "Resource": "arn:aws:secretsmanager:*:*:secret:/myapp/*"
    }
  ]
}
```

#### 5. SSM Parameter Store Access Denied

**Error:** `AccessDenied: User is not authorized to perform ssm:GetParameters`

**Solution:**
- Add the following IAM policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ssm:GetParameter",
        "ssm:GetParameters",
        "ssm:GetParametersByPath"
      ],
      "Resource": "arn:aws:ssm:*:*:parameter/myapp/*"
    }
  ]
}
```

#### 6. Module Not Loading Configuration

**Problem:** Configuration service returns undefined values

**Solution:**
- Ensure the module is imported in your root module
- Check that the configuration service is properly injected
- Verify that `APP_ENV` is set correctly
- Check AWS credentials and permissions

#### 7. Type Safety Issues

**Problem:** TypeScript errors when accessing configuration

**Solution:**
- Ensure you're using the correct generic type for `ConfigService<T>`
- Verify your Zod schema matches your configuration interface
- Use type assertion if necessary: `configService.get('KEY' as keyof T)`

#### 8. @nestjs/config Integration Issues

**Problem:** Configuration not loading from AWS when using integration

**Solution:**
- Ensure `NestConfigAwsIntegrationModule` is imported before `ConfigModule`
- Check that AWS credentials are properly configured
- Verify precedence rules are set correctly
- Enable logging to debug configuration loading: `enableLogging: true`

**Problem:** Precedence rules not working as expected

**Solution:**
- Check precedence configuration: `'aws-first'`, `'local-first'`, or `'merge'`
- Verify that both local and AWS sources have the same configuration keys
- Use debug logging to see which values are being used

**Problem:** Namespaced configuration not working with integration

**Solution:**
- Ensure namespace names in integration config match `registerAs` names
- Check that AWS sources contain the expected namespace structure
- Verify that `registerAs` factories are properly loaded by `ConfigModule`

### Debug Mode

Enable debug logging by setting the `DEBUG` environment variable:

```bash
DEBUG=nestjs-config-aws* npm start
```

This will provide detailed logs about:
- Configuration loading steps
- AWS service calls
- Validation results
- Error details

### Performance Considerations

#### Configuration Caching

The module caches configuration after the initial load. To force a reload:

```typescript
// This is not exposed in the public API but handled internally
// Configuration is loaded once during module initialization
```

#### AWS Service Optimization

- **Connection Pooling**: AWS SDK clients are reused across requests
- **Pagination**: SSM Parameter Store queries use efficient pagination
- **Regional Optimization**: Specify regions explicitly to avoid auto-detection overhead

## Examples

The `packages/nestjs-config-aws/examples/` directory contains complete working examples:

- **[basic-usage/](./packages/nestjs-config-aws/examples/basic-usage/)**: Simple setup with default configuration
- **[custom-schema/](./packages/nestjs-config-aws/examples/custom-schema/)**: Advanced usage with custom Zod schema and AWS integration
- **[aws-integration/](./packages/nestjs-config-aws/examples/aws-integration/)**: Production-ready AWS service integration
- **[nestjs-config-integration/](./packages/nestjs-config-aws/examples/nestjs-config-integration/)**: Seamless integration with @nestjs/config
- **[docker-compose/](./packages/nestjs-config-aws/examples/docker-compose/)**: Complete local development environment

To run the examples:

```bash
cd packages/nestjs-config-aws/examples/nestjs-config-integration
npm install
cp .env.example .env
npm start
```

For a complete local environment with AWS service emulation:

```bash
cd examples/docker-compose
docker-compose up -d
```

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup

```bash
# Clone the repository
git clone <repository-url>
cd nestjs-config-aws

# Install dependencies
npm install

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Build the package
npm run build

# Run linting
npm run lint
```

### Running Tests

```bash
# Unit tests
npm run test:unit

# Integration tests (requires AWS credentials)
npm run test:integration

# Coverage report
npm run test:coverage
```

## License

MIT © Dyanet

---

## Changelog

### v1.0.0 - First Public Release 🎉
- **Core Features**: Environment variable loading, AWS Secrets Manager, and SSM Parameter Store integration
- **@nestjs/config Integration**: Seamless compatibility with standard NestJS configuration patterns
- **Type Safety**: Full TypeScript support with Zod validation and generic types
- **Environment Awareness**: Automatic configuration based on APP_ENV (local, development, test, production)
- **Flexible Precedence**: aws-first, local-first, and merge strategies for configuration conflicts
- **Performance Optimized**: Efficient loading with caching and pagination support
- **Comprehensive Documentation**: Complete API reference, troubleshooting guide, and multiple examples
- **Production Ready**: Robust error handling, security best practices, and monitoring support

See [CHANGELOG.md](CHANGELOG.md) for detailed release notes.
