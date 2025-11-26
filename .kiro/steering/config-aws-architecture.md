# Config-AWS Architecture & Design Principles

This steering document captures the core architecture and design principles for the config-aws package ecosystem.

## Package Structure

The monolithic `@dyanet/nestjs-config-aws` package is being extracted into three focused npm packages:

1. **@dyanet/config-aws** - Framework-agnostic core library
2. **@dyanet/nestjs-config-aws** - Thin NestJS adapter layer
3. **@dyanet/nextjs-config-aws** - Thin Next.js adapter layer

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    Application Layer                             │
├─────────────────────────┬───────────────────────────────────────┤
│   nestjs-config-aws     │        nextjs-config-aws              │
│   ┌─────────────────┐   │   ┌─────────────────────────────┐     │
│   │ ConfigModule    │   │   │ getConfig()                 │     │
│   │ ConfigService   │   │   │ createConfigProvider()      │     │
│   │ Integration     │   │   │ PublicEnvScript             │     │
│   │ Module          │   │   │ env() client function       │     │
│   └────────┬────────┘   │   └──────────────┬──────────────┘     │
│            │            │                  │                     │
├────────────┴────────────┴──────────────────┴─────────────────────┤
│                        config-aws (Core)                         │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────────┐  │
│  │ ConfigManager│ │   Loaders    │ │    Utilities             │  │
│  │              │ │              │ │                          │  │
│  │ - load()     │ │ Environment  │ │ - ConfigValidationUtil   │  │
│  │ - get()      │ │ EnvFile      │ │ - Error classes          │  │
│  │ - getAll()   │ │ S3           │ │ - Type definitions       │  │
│  │ - merge()    │ │ SecretsManager│ │                         │  │
│  │              │ │ SSMParameter │ │                          │  │
│  └──────────────┘ └──────────────┘ └──────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Core Design Principles

### 1. Framework Agnostic Core
The `config-aws` package must have zero framework dependencies. It should work in:
- Plain Node.js applications
- NestJS applications (via adapter)
- Next.js applications (via adapter)
- Any other JavaScript/TypeScript runtime

### 2. Peer Dependencies for AWS SDKs
AWS SDK packages are peer dependencies, not bundled:
- `@aws-sdk/client-secrets-manager`
- `@aws-sdk/client-ssm`
- `@aws-sdk/client-s3`
- `zod` (for validation)

This keeps bundle sizes small and avoids version conflicts.

### 3. Thin Adapter Layers
Framework adapters should be minimal wrappers that:
- Depend on `config-aws` as a runtime dependency
- Provide framework-specific integration patterns
- Re-export all types from the core package
- Add no significant logic beyond framework binding

## Configuration Loading

### Loaders
Five configuration loaders, each implementing the `ConfigLoader` interface:

1. **EnvironmentLoader** - Scans `process.env` with optional prefix filtering
2. **EnvFileLoader** - Reads `.env` files from filesystem (AWS ECS format)
3. **S3Loader** - Fetches config from S3 buckets (JSON or .env format)
4. **SecretsManagerLoader** - Loads from AWS Secrets Manager
5. **SSMParameterStoreLoader** - Loads from AWS SSM Parameter Store

### Precedence Strategies
- **aws-first**: env → envFile → s3 → secretsManager → ssm (AWS wins)
- **local-first**: secretsManager → ssm → s3 → envFile → env (local wins)
- **custom**: User-defined order via `LoaderPrecedence[]`

## AWS ECS Environment File Format

When parsing `.env` files (filesystem or S3), follow [AWS ECS environment file format](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/use-environment-file.html):

```
# Lines beginning with # are comments and ignored
# Blank lines are ignored

# Format: VARIABLE=VALUE (no spaces around =)
DATABASE_URL=postgres://localhost:5432/db

# Values can contain = signs
CONNECTION_STRING=host=localhost;port=5432

# No quotes needed - quotes are literal
MESSAGE=Hello World
QUOTED="This includes the quotes"

# No variable interpolation - ${VAR} is literal
TEMPLATE=${NOT_INTERPOLATED}
```

**Parsing Rules:**
1. Lines beginning with `#` are comments (ignored)
2. Blank lines are ignored
3. Format: `VARIABLE=VALUE` (no spaces around `=`)
4. Variable names: `/^[a-zA-Z_][a-zA-Z0-9_]*$/`
5. Values are literal (no quote processing, no interpolation)
6. One variable per line
7. Lines without `=` are ignored
8. Maximum line length: 32KB

## Verbose Logging

ConfigManager supports verbose output for debugging:

```typescript
interface VerboseOptions {
  logKeys?: boolean;        // Log variable names
  logValues?: boolean;      // Log values (WARNING: may expose secrets)
  logOverrides?: boolean;   // Log when variables are overridden
  logTiming?: boolean;      // Log loader timing
  maskValues?: boolean;     // Mask sensitive values
  sensitiveKeys?: string[]; // Keys to always mask
}
```

Example output:
```
[config-aws] Loading configuration...
[config-aws] EnvironmentLoader: loaded 15 keys in 2ms
[config-aws]   - DATABASE_URL
[config-aws]   - API_KEY
[config-aws] SecretsManagerLoader: loaded 3 keys in 145ms
[config-aws]   - DATABASE_URL (overrides EnvironmentLoader)
[config-aws]   - API_SECRET
[config-aws] Configuration loaded: 18 total keys, 2 overrides, 236ms total
```

## Next.js Runtime Environment Variables

The Next.js adapter eliminates build-time `NEXT_PUBLIC_*` variables:

- **PublicEnvScript**: Server component injecting env vars as `<script>` tag
- **env()**: Client function reading from `window.__ENV`
- Configurable allowlist for public exposure
- CSP nonce support

This enables deploying the same build artifact to different environments.

## Framework Version Compatibility

### NestJS Adapter
- **Target Version**: NestJS 11.x
- **Peer Dependencies**: `@nestjs/common ^11.0.0`, `@nestjs/core ^11.0.0`, `@nestjs/config ^4.0.0`

### Next.js Adapter
- **Target Version**: Next.js 16.x
- **Peer Dependencies**: `next ^16.0.0`, `react ^19.0.0`
- **Features**: Full App Router support, Server Components, Server Actions

## Backward Compatibility

The refactored `nestjs-config-aws` must maintain:
- Same public API surface for `ConfigModule` and `ConfigService`
- Same options interfaces
- Same `NestConfigAwsIntegrationModule` behavior
- All previously exported types and interfaces
