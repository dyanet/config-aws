# Changelog

All notable changes to `@dyanet/nextjs-config-aws` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-12-20

### Added

- **Simplified API**: New opinionated interface that hides loader complexity
  - `getConfig()` with automatic environment detection
  - `aws` option object for AWS configuration (`secretName`, `ssmPrefix`, `region`)
  - `environment` option to override auto-detection
  - `forceAwsInDev` option to enable AWS loading in development mode

- **Automatic Environment Detection**: Library configures itself based on `NODE_ENV`
  - `development`: env vars + .env.local/.env files, AWS only if `forceAwsInDev: true`
  - `production`: env vars + .env file + AWS sources (if configured)
  - `test`: env vars only (no file or AWS access)

- **AWS Region Propagation**: Single `aws.region` option applies to all AWS loaders

- **Improved Caching**: Cache key generation based on aws options, environment, and forceAwsInDev

### Changed

- **Minimal Public API**: Package now exports only essential items:
  - Functions/Components: `getConfig`, `PublicEnvScript`, `env`
  - Types: `NextConfigOptions`, `PublicEnvScriptProps`
  - Errors: `ConfigurationError`, `ValidationError`

### Removed

- **BREAKING**: Removed direct loader exports from public API
  - `EnvironmentLoader`, `EnvFileLoader`, `SecretsManagerLoader`, `SSMParameterStoreLoader`, `S3Loader`
  - For advanced loader access, import from `@dyanet/config-aws` directly

- **BREAKING**: Removed `loaders` option from `NextConfigOptions`
  - Use `aws.secretName` and `aws.ssmPrefix` instead
  - For custom loader configurations, use `@dyanet/config-aws` directly

- **BREAKING**: Removed `precedence` option from `NextConfigOptions`
  - Library now uses `aws-first` precedence internally

- **BREAKING**: Removed internal utilities and implementation details from exports
  - `ConfigManager`, `ConfigValidationUtil`, `EnvFileParser`
  - `createConfigProvider`, `clearConfigCache`, `getConfigCacheSize`, `invalidateConfig`
  - For advanced usage, import from `@dyanet/config-aws` directly

### Bundle Size

**Package Size:**
- Total dist size: ~93 KB (including source maps and type definitions)
- ESM bundle: ~21 KB (JavaScript only)
- CJS bundle: ~27 KB (JavaScript only)
- Type definitions: ~20 KB

**Peer Dependencies (installed separately):**
- `@dyanet/config-aws`: ~221 KB
- `@aws-sdk/client-secrets-manager`: ~597 KB (only if using Secrets Manager)
- `@aws-sdk/client-ssm`: ~3.3 MB (only if using SSM Parameter Store)
- `@aws-sdk/client-s3`: ~3.1 MB (only if using S3)
- `zod`: ~4.0 MB (required for schema validation)

**Notes on AWS SDK sizes:**
- AWS SDK v3 uses modular architecture at the service level, not command level
- The loaders use only specific commands (`GetSecretValueCommand`, `GetParametersByPathCommand`, `GetObjectCommand`) but the full client packages are required
- AWS SDK packages share common dependencies (`@smithy/*`), so actual installed size is smaller when using multiple clients
- Tree-shaking in bundlers like webpack/esbuild can reduce final bundle size significantly
- The simplified API results in a smaller public surface area with fewer exports

### Migration Guide

#### Before (v1.0.0-beta.x)

```typescript
import { 
  getConfig, 
  EnvironmentLoader, 
  SecretsManagerLoader 
} from '@dyanet/nextjs-config-aws';

const config = await getConfig({
  schema,
  loaders: [
    new EnvironmentLoader(),
    new SecretsManagerLoader({ secretName: '/my-app/config' }),
  ],
  precedence: 'aws-first',
});
```

#### After (v1.0.0)

```typescript
import { getConfig } from '@dyanet/nextjs-config-aws';

const config = await getConfig({
  schema,
  aws: { secretName: '/my-app/config' },
});
```

#### Advanced Usage

For custom loaders or fine-grained control, import from `@dyanet/config-aws`:

```typescript
import { 
  ConfigManager, 
  EnvironmentLoader, 
  SecretsManagerLoader 
} from '@dyanet/config-aws';

const manager = new ConfigManager({
  loaders: [
    new EnvironmentLoader({ prefix: 'APP_' }),
    new SecretsManagerLoader({ secretName: '/my-app/config' }),
  ],
  schema,
});
await manager.load();
const config = manager.getAll();
```

## [1.0.0-beta.1] - 2024-11-01

### Added

- Initial beta release
- Server-side configuration loading with `getConfig()`
- Runtime environment variables with `PublicEnvScript` and `env()`
- React context provider with `createConfigProvider()`
- Full re-export of `@dyanet/config-aws` loaders and utilities
- Support for Next.js 16 App Router and Pages Router
