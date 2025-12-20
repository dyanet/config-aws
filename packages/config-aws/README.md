# @dyanet/config-aws

[![npm version](https://img.shields.io/npm/v/@dyanet/config-aws.svg)](https://www.npmjs.com/package/@dyanet/config-aws)
[![CI](https://github.com/dyanet/config-aws/actions/workflows/ci.yml/badge.svg)](https://github.com/dyanet/config-aws/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/dyanet/config-aws/flag/config-aws/graph/badge.svg)](https://codecov.io/gh/dyanet/config-aws)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Framework-agnostic AWS configuration management library for Node.js applications. Load configuration from environment variables, AWS Secrets Manager, SSM Parameter Store, S3, and `.env` files with configurable precedence.

## Features

- **Framework Agnostic** - Works with any JavaScript/TypeScript application
- **Multiple Sources** - Environment variables, `.env` files, S3, Secrets Manager, SSM Parameter Store
- **Configurable Precedence** - Control which sources override others
- **Schema Validation** - Validate configuration with Zod schemas
- **TypeScript First** - Full type safety and IntelliSense support
- **Verbose Logging** - Debug configuration loading with detailed output
- **Tree-Shakeable** - ESM and CommonJS builds with tree-shaking support

## Installation

```bash
npm install @dyanet/config-aws
```

### Peer Dependencies

Install the AWS SDK clients you need:

```bash
# For Secrets Manager
npm install @aws-sdk/client-secrets-manager

# For SSM Parameter Store
npm install @aws-sdk/client-ssm

# For S3
npm install @aws-sdk/client-s3

# For schema validation
npm install zod
```

## Quick Start

```typescript
import { ConfigManager, EnvironmentLoader, SecretsManagerLoader } from '@dyanet/config-aws';
import { z } from 'zod';

// Define your configuration schema
const schema = z.object({
  DATABASE_URL: z.string(),
  API_KEY: z.string(),
  PORT: z.coerce.number().default(3000),
});

// Create and load configuration
const config = new ConfigManager({
  loaders: [
    new EnvironmentLoader({ prefix: 'APP_' }),
    new SecretsManagerLoader({ secretName: '/my-app/config' }),
  ],
  schema,
  precedence: 'aws-first', // AWS sources override local
});

await config.load();

// Access configuration values
const dbUrl = config.get('DATABASE_URL');
const allConfig = config.getAll();
```

## Loaders

### EnvironmentLoader

Loads configuration from `process.env` with optional prefix filtering.

```typescript
import { EnvironmentLoader } from '@dyanet/config-aws';

const loader = new EnvironmentLoader({
  prefix: 'APP_',           // Only load vars starting with APP_
  exclude: ['APP_SECRET'],  // Exclude specific variables
});
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `prefix` | `string` | `undefined` | Only load variables starting with this prefix (prefix is stripped from keys) |
| `exclude` | `string[]` | `[]` | Variable names to exclude from loading |

### EnvFileLoader

Loads configuration from `.env` files using [AWS ECS environment file format](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/use-environment-file.html).

```typescript
import { EnvFileLoader } from '@dyanet/config-aws';

const loader = new EnvFileLoader({
  paths: ['.env', '.env.local', '.env.production'],
  override: true,
});
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `paths` | `string[]` | `['.env', '.env.local']` | Paths to `.env` files to load |
| `encoding` | `BufferEncoding` | `'utf-8'` | File encoding |
| `override` | `boolean` | `true` | Whether later files override earlier ones |

**Environment File Format:**
```bash
# Lines beginning with # are comments
DATABASE_URL=postgres://localhost:5432/db
API_KEY=sk-1234567890

# Values can contain = signs
CONNECTION_STRING=host=localhost;port=5432

# No quotes needed - quotes are literal
MESSAGE=Hello World
```

### S3Loader

Loads configuration from S3 buckets. Supports JSON and `.env` formats with auto-detection.

```typescript
import { S3Loader } from '@dyanet/config-aws';

const loader = new S3Loader({
  bucket: 'my-config-bucket',
  key: 'config/production.json',
  region: 'us-east-1',
  format: 'auto', // or 'json' | 'env'
});
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `bucket` | `string` | **required** | S3 bucket name |
| `key` | `string` | **required** | S3 object key |
| `region` | `string` | `undefined` | AWS region (uses default if not specified) |
| `format` | `'json' \| 'env' \| 'auto'` | `'auto'` | Configuration file format |

### SecretsManagerLoader

Loads configuration from AWS Secrets Manager.

```typescript
import { SecretsManagerLoader } from '@dyanet/config-aws';

const loader = new SecretsManagerLoader({
  secretName: '/my-app/database',
  region: 'us-east-1',
  environmentMapping: {
    development: 'dev/',
    production: 'prod/',
  },
});
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `secretName` | `string` | `undefined` | Name or ARN of the secret |
| `region` | `string` | `undefined` | AWS region |
| `environmentMapping` | `Record<string, string>` | `undefined` | Map environment names to path prefixes |

### SSMParameterStoreLoader

Loads configuration from AWS SSM Parameter Store with pagination support.

```typescript
import { SSMParameterStoreLoader } from '@dyanet/config-aws';

const loader = new SSMParameterStoreLoader({
  parameterPath: '/my-app/config',
  region: 'us-east-1',
  withDecryption: true,
  environmentMapping: {
    development: '/dev',
    production: '/prod',
  },
});
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `parameterPath` | `string` | `undefined` | Path prefix for parameters |
| `region` | `string` | `undefined` | AWS region |
| `withDecryption` | `boolean` | `true` | Decrypt SecureString parameters |
| `environmentMapping` | `Record<string, string>` | `undefined` | Map environment names to path prefixes |

## ConfigManager

The `ConfigManager` orchestrates loading from multiple sources with configurable precedence.

### Options

```typescript
interface ConfigManagerOptions<T> {
  loaders?: ConfigLoader[];
  schema?: ZodType<T>;
  precedence?: 'aws-first' | 'local-first' | LoaderPrecedence[];
  validateOnLoad?: boolean;
  enableLogging?: boolean;
  logger?: Logger;
  verbose?: VerboseOptions | boolean;
}
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `loaders` | `ConfigLoader[]` | `[]` | Array of configuration loaders |
| `schema` | `ZodType<T>` | `undefined` | Zod schema for validation |
| `precedence` | `string \| LoaderPrecedence[]` | `'aws-first'` | Precedence strategy |
| `validateOnLoad` | `boolean` | `true` | Validate configuration after loading |
| `enableLogging` | `boolean` | `false` | Enable basic logging |
| `logger` | `Logger` | `console` | Custom logger implementation |
| `verbose` | `VerboseOptions \| boolean` | `false` | Enable verbose debugging output |

### Precedence Strategies

**`aws-first`** (default): Local sources load first, AWS sources override
```
EnvironmentLoader → EnvFileLoader → S3Loader → SecretsManagerLoader → SSMParameterStoreLoader
```

**`local-first`**: AWS sources load first, local sources override
```
SSMParameterStoreLoader → SecretsManagerLoader → S3Loader → EnvFileLoader → EnvironmentLoader
```

**Custom precedence**: Define your own order
```typescript
const config = new ConfigManager({
  loaders: [envLoader, secretsLoader, ssmLoader],
  precedence: [
    { loader: 'EnvironmentLoader', priority: 1 },
    { loader: 'SSMParameterStoreLoader', priority: 2 },
    { loader: 'SecretsManagerLoader', priority: 3 }, // Highest priority wins
  ],
});
```

### Methods

```typescript
// Load configuration from all sources
await config.load();

// Get a specific value
const value = config.get('DATABASE_URL');

// Get all configuration
const all = config.getAll();

// Check if loaded
const loaded = config.isLoaded();

// Get current environment
const env = config.getAppEnv(); // reads APP_ENV or defaults to 'development'

// Get load result with source info
const result = config.getLoadResult();

// Serialize to JSON
const json = config.serialize();

// Deserialize from JSON
const restored = ConfigManager.deserialize(json, { schema });
```

## Verbose Logging

Enable detailed logging to debug configuration loading:

```typescript
const config = new ConfigManager({
  loaders: [...],
  verbose: true, // Enable all verbose options
});

// Or customize verbose options
const config = new ConfigManager({
  loaders: [...],
  verbose: {
    logKeys: true,        // Log variable names
    logValues: false,     // Log values (WARNING: may expose secrets)
    logOverrides: true,   // Log when variables are overridden
    logTiming: true,      // Log loader timing
    maskValues: true,     // Mask sensitive values
    sensitiveKeys: ['password', 'secret', 'key', 'token'],
  },
});
```

**Example output:**
```
[config-aws] Loading configuration...
[config-aws] EnvironmentLoader: loaded 15 keys in 2ms
[config-aws]   - DATABASE_URL
[config-aws]   - API_KEY
[config-aws]   - PORT
[config-aws] SecretsManagerLoader: loaded 3 keys in 145ms
[config-aws]   - DATABASE_URL (overrides EnvironmentLoader)
[config-aws]   - API_SECRET
[config-aws]   - JWT_KEY
[config-aws] Configuration loaded: 18 total keys, 2 overrides, 236ms total
```

## Error Handling

The library provides specific error classes for different failure scenarios:

```typescript
import {
  ConfigurationError,      // Base error class
  ValidationError,         // Schema validation failed
  AWSServiceError,         // AWS API call failed
  ConfigurationLoadError,  // Loader failed to load
  MissingConfigurationError, // Required keys missing
} from '@dyanet/config-aws';

try {
  await config.load();
} catch (error) {
  if (error instanceof ValidationError) {
    console.error('Validation failed:', error.validationErrors);
  } else if (error instanceof AWSServiceError) {
    console.error(`AWS ${error.service} failed:`, error.operation);
  } else if (error instanceof ConfigurationLoadError) {
    console.error(`Loader ${error.loader} failed:`, error.message);
  }
}
```

## Schema Validation

Use Zod schemas to validate and transform configuration:

```typescript
import { z } from 'zod';

const schema = z.object({
  // Required string
  DATABASE_URL: z.string().url(),
  
  // Number with coercion and default
  PORT: z.coerce.number().default(3000),
  
  // Boolean with coercion
  DEBUG: z.coerce.boolean().default(false),
  
  // Enum
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  
  // Optional with default
  LOG_LEVEL: z.string().default('info'),
});

type Config = z.infer<typeof schema>;

const config = new ConfigManager<Config>({
  loaders: [...],
  schema,
  validateOnLoad: true,
});
```

## Custom Loaders

Implement the `ConfigLoader` interface to create custom loaders:

```typescript
import { ConfigLoader } from '@dyanet/config-aws';

class CustomLoader implements ConfigLoader {
  getName(): string {
    return 'CustomLoader';
  }

  async isAvailable(): Promise<boolean> {
    // Return true if this loader can load configuration
    return true;
  }

  async load(): Promise<Record<string, unknown>> {
    // Load and return configuration
    return {
      CUSTOM_KEY: 'custom_value',
    };
  }
}
```

## Utilities

### EnvFileParser

Parse `.env` file content directly:

```typescript
import { EnvFileParser } from '@dyanet/config-aws';

const content = `
# Database config
DATABASE_URL=postgres://localhost:5432/db
API_KEY=sk-1234567890
`;

const parsed = EnvFileParser.parse(content);
// { DATABASE_URL: 'postgres://localhost:5432/db', API_KEY: 'sk-1234567890' }
```

### ConfigValidationUtil

Validate configuration objects:

```typescript
import { ConfigValidationUtil } from '@dyanet/config-aws';
import { z } from 'zod';

const schema = z.object({
  PORT: z.coerce.number(),
});

const result = ConfigValidationUtil.validate({ PORT: '3000' }, schema);
// { PORT: 3000 }
```

## TypeScript Support

Full TypeScript support with type inference from Zod schemas:

```typescript
import { ConfigManager } from '@dyanet/config-aws';
import { z } from 'zod';

const schema = z.object({
  DATABASE_URL: z.string(),
  PORT: z.coerce.number(),
});

type Config = z.infer<typeof schema>;

const config = new ConfigManager<Config>({ schema, loaders: [...] });
await config.load();

// Fully typed
const port: number = config.get('PORT');
const all: Config = config.getAll();
```

## Related Packages

- **[@dyanet/nestjs-config-aws](../nestjs-config-aws)** - NestJS adapter for this library
- **[@dyanet/nextjs-config-aws](../nextjs-config-aws)** - Next.js adapter for this library

## License

MIT
