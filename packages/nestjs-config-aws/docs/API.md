# API Documentation

## Table of Contents

- [ConfigModule](#configmodule)
- [ConfigService](#configservice)
- [Interfaces](#interfaces)
- [Configuration Loaders](#configuration-loaders)
- [Utilities](#utilities)
- [Error Classes](#error-classes)

## ConfigModule

The main module that provides AWS-integrated configuration management for NestJS applications.

### Static Methods

#### `forRoot(options?: NestConfigAwsModuleOptions): DynamicModule`

Configures the module synchronously with the provided options.

**Parameters:**
- `options` (optional): Configuration options for the module

**Returns:** `DynamicModule` - A configured NestJS dynamic module

**Example:**
```typescript
import { ConfigModule } from 'nest-config-aws';
import { z } from 'zod';

const schema = z.object({
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string(),
});

@Module({
  imports: [
    ConfigModule.forRoot({
      schema,
      secretsManagerConfig: {
        enabled: true,
        region: 'us-east-1',
      },
    }),
  ],
})
export class AppModule {}
```

#### `forRootAsync(options: NestConfigAwsModuleAsyncOptions): DynamicModule`

Configures the module asynchronously using a factory function.

**Parameters:**
- `options`: Async configuration options

**Returns:** `DynamicModule` - A configured NestJS dynamic module

**Example:**
```typescript
@Module({
  imports: [
    ConfigModule.forRootAsync({
      useFactory: async (httpService: HttpService) => {
        const schema = await loadSchemaFromRemote(httpService);
        return { schema };
      },
      inject: [HttpService],
      imports: [HttpModule],
    }),
  ],
})
export class AppModule {}
```

## ConfigService

Abstract service class that provides type-safe access to configuration values.

### Type Parameters

- `T` - The configuration schema type (defaults to `any`)

### Methods

#### `get<K extends keyof T>(key: K): T[K]`

Retrieves a configuration value by key with full type safety.

**Type Parameters:**
- `K` - The key type, constrained to keys of `T`

**Parameters:**
- `key`: The configuration key to retrieve

**Returns:** The configuration value with proper typing

**Example:**
```typescript
@Injectable()
export class AppService {
  constructor(private configService: ConfigService<AppConfig>) {}

  getPort(): number {
    return this.configService.get('PORT'); // Returns number
  }

  getDatabaseUrl(): string {
    return this.configService.get('DATABASE_URL'); // Returns string
  }
}
```

#### `getAll(): T`

Retrieves the complete configuration object.

**Returns:** The entire configuration object with proper typing

**Example:**
```typescript
const allConfig = this.configService.getAll();
console.log(allConfig.PORT, allConfig.DATABASE_URL);
```

#### `isInitialized(): boolean`

Checks if the configuration service has been initialized and is ready to serve values.

**Returns:** `true` if the service is initialized, `false` otherwise

**Example:**
```typescript
if (this.configService.isInitialized()) {
  const port = this.configService.get('PORT');
}
```

## Interfaces

### NestConfigAwsModuleOptions<T>

Configuration options for the ConfigModule.

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

**Properties:**

- `schema` (optional): Zod schema for configuration validation
- `secretsManagerConfig` (optional): AWS Secrets Manager configuration
- `ssmConfig` (optional): AWS SSM Parameter Store configuration
- `envPrefix` (optional): Prefix for environment variables (e.g., 'APP_')
- `ignoreValidationErrors` (optional): Whether to ignore validation errors and continue with partial config
- `appEnvVariable` (optional): Custom environment variable name for APP_ENV (defaults to 'APP_ENV')
- `loadSync` (optional): Whether to load configuration synchronously during module initialization

### NestConfigAwsModuleAsyncOptions<T>

Async factory options for dynamic module configuration.

```typescript
interface NestConfigAwsModuleAsyncOptions<T = any> {
  useFactory: (...args: any[]) => Promise<NestConfigAwsModuleOptions<T>> | NestConfigAwsModuleOptions<T>;
  inject?: any[];
  imports?: any[];
}
```

**Properties:**

- `useFactory`: Factory function to create module options
- `inject` (optional): Dependencies to inject into the factory function
- `imports` (optional): Modules to import for the factory function

### SecretsManagerConfig

Configuration for AWS Secrets Manager integration.

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

**Properties:**

- `region` (optional): AWS region for Secrets Manager (defaults to AWS_REGION or auto-detected)
- `paths` (optional): Environment-specific secret paths
- `enabled` (optional): Whether to enable Secrets Manager integration (defaults to `true`)

**Default Paths:**
- Development: `/myapp/development/secrets`
- Test: `/myapp/test/secrets`
- Production: `/myapp/production/secrets`

### SSMConfig

Configuration for AWS Systems Manager Parameter Store integration.

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

**Properties:**

- `region` (optional): AWS region for SSM Parameter Store
- `paths` (optional): Environment-specific parameter paths
- `enabled` (optional): Whether to enable SSM Parameter Store integration (defaults to `true`)
- `decrypt` (optional): Whether to decrypt SecureString parameters (defaults to `true`)

**Default Paths:**
- Development: `/myapp/development/`
- Test: `/myapp/test/`
- Production: `/myapp/production/`

### ConfigLoader

Interface for configuration source loaders.

```typescript
interface ConfigLoader {
  load(): Promise<Record<string, any>>;
}
```

**Methods:**

- `load()`: Asynchronously loads configuration from the source

## Configuration Loaders

### EnvironmentLoader

Loads configuration from environment variables (`process.env`).

```typescript
class EnvironmentLoader implements ConfigLoader {
  constructor(private envPrefix?: string);
  async load(): Promise<Record<string, any>>;
}
```

**Constructor Parameters:**
- `envPrefix` (optional): Prefix to filter environment variables

**Behavior:**
- Always executed first in the loading chain
- Filters variables by prefix if provided
- Converts all values to strings (as per Node.js environment variable behavior)

### SecretsManagerLoader

Loads configuration from AWS Secrets Manager.

```typescript
class SecretsManagerLoader implements ConfigLoader {
  constructor(
    private config: SecretsManagerConfig,
    private appEnv: string,
    private region?: string
  );
  async load(): Promise<Record<string, any>>;
}
```

**Constructor Parameters:**
- `config`: Secrets Manager configuration
- `appEnv`: Current application environment
- `region` (optional): AWS region override

**Behavior:**
- Skipped when `appEnv` is 'local'
- Constructs secret path based on environment
- Parses JSON secret values automatically
- Falls back to string values for non-JSON secrets

### SSMParameterStoreLoader

Loads configuration from AWS Systems Manager Parameter Store.

```typescript
class SSMParameterStoreLoader implements ConfigLoader {
  constructor(
    private config: SSMConfig,
    private appEnv: string,
    private region?: string
  );
  async load(): Promise<Record<string, any>>;
}
```

**Constructor Parameters:**
- `config`: SSM Parameter Store configuration
- `appEnv`: Current application environment
- `region` (optional): AWS region override

**Behavior:**
- Skipped when `appEnv` is 'local'
- Uses recursive parameter fetching with pagination
- Transforms parameter names (removes path prefix, converts to uppercase)
- Supports parameter decryption for SecureString types

## Utilities

### ZodValidationPipe

Utility for validating configuration objects against Zod schemas.

```typescript
class ZodValidationPipe<T> {
  constructor(private schema: ZodType<T>);
  transform(value: any): T;
}
```

**Methods:**

- `transform(value)`: Validates and transforms the input value according to the schema

**Usage:**
```typescript
import { z } from 'zod';
import { ZodValidationPipe } from 'nest-config-aws';

const schema = z.object({
  PORT: z.coerce.number(),
  DEBUG: z.coerce.boolean(),
});

const pipe = new ZodValidationPipe(schema);
const validatedConfig = pipe.transform(rawConfig);
```

## Error Classes

### ConfigurationError

Base error class for configuration-related errors.

```typescript
class ConfigurationError extends Error {
  constructor(message: string, public readonly cause?: Error);
}
```

**Properties:**
- `message`: Error description
- `cause` (optional): Original error that caused this error

### ValidationError

Error thrown when configuration validation fails.

```typescript
class ValidationError extends ConfigurationError {
  constructor(message: string, public readonly validationErrors: any);
}
```

**Properties:**
- `message`: Error description
- `validationErrors`: Detailed validation error information from Zod

**Example:**
```typescript
try {
  const config = configService.getAll();
} catch (error) {
  if (error instanceof ValidationError) {
    console.log('Validation errors:', error.validationErrors);
  }
}
```

## Type Definitions

### Default Configuration Schema

The module provides a default configuration schema:

```typescript
const defaultConfigSchema = z.object({
  NODE_ENV: z.enum(['production', 'development', 'test']).optional(),
  APP_ENV: z.enum(['production', 'test', 'development', 'local']).default('local'),
  AWS_REGION: z.string().optional(),
  PORT: z.coerce.number().optional(),
});

type DefaultConfigSchema = z.infer<typeof defaultConfigSchema>;
```

### Environment Types

```typescript
type AppEnvironment = 'local' | 'development' | 'test' | 'production';
type NodeEnvironment = 'development' | 'test' | 'production';
```

## Usage Patterns

### Dependency Injection

The ConfigService is automatically registered as a provider and can be injected into any service:

```typescript
@Injectable()
export class DatabaseService {
  constructor(
    private configService: ConfigService<DatabaseConfig>
  ) {}

  async connect() {
    const url = this.configService.get('DATABASE_URL');
    const poolSize = this.configService.get('DATABASE_POOL_SIZE');
    // Connect to database...
  }
}
```

### Custom Configuration Schemas

Define custom schemas for type safety:

```typescript
const databaseConfigSchema = z.object({
  DATABASE_URL: z.string().url(),
  DATABASE_POOL_SIZE: z.coerce.number().min(1).max(100).default(10),
  DATABASE_TIMEOUT: z.coerce.number().default(30000),
  DATABASE_SSL: z.coerce.boolean().default(false),
});

type DatabaseConfig = z.infer<typeof databaseConfigSchema>;

// Use with ConfigService
@Injectable()
export class DatabaseService {
  constructor(
    private configService: ConfigService<DatabaseConfig>
  ) {}
}
```

### Environment-Specific Configuration

Handle different environments with conditional configuration:

```typescript
const getConfigSchema = () => {
  const baseSchema = z.object({
    PORT: z.coerce.number().default(3000),
    API_KEY: z.string(),
  });

  if (process.env.APP_ENV === 'production') {
    return baseSchema.extend({
      HTTPS_ENABLED: z.coerce.boolean().default(true),
      SSL_CERT_PATH: z.string(),
      SSL_KEY_PATH: z.string(),
    });
  }

  return baseSchema.extend({
    DEBUG: z.coerce.boolean().default(true),
    LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('debug'),
  });
};
```