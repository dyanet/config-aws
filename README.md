# config-aws

[![CI](https://github.com/dyanet/config-aws/actions/workflows/ci.yml/badge.svg)](https://github.com/dyanet/config-aws/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/dyanet/config-aws/branch/main/graph/badge.svg)](https://codecov.io/gh/dyanet/config-aws)
[![npm version](https://img.shields.io/npm/v/@dyanet/config-aws.svg)](https://www.npmjs.com/package/@dyanet/config-aws)
[![npm version](https://img.shields.io/npm/v/@dyanet/nestjs-config-aws.svg)](https://www.npmjs.com/package/@dyanet/nestjs-config-aws)
[![npm version](https://img.shields.io/npm/v/@dyanet/nextjs-config-aws.svg)](https://www.npmjs.com/package/@dyanet/nextjs-config-aws)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Type-safe configuration management for Node.js, backed by environment variables, `.env`
files, AWS Secrets Manager, AWS SSM Parameter Store, and S3 — with a framework-agnostic
core and thin, idiomatic adapters for NestJS and Next.js.

## Packages

This is a monorepo of three published packages:

| Package | Purpose |
| --- | --- |
| [`@dyanet/config-aws`](packages/config-aws) | **Core.** Framework-agnostic `ConfigManager` + pluggable loaders (environment, `.env`, S3, Secrets Manager, SSM) with Zod validation and configurable precedence. |
| [`@dyanet/nestjs-config-aws`](packages/nestjs-config-aws) | **NestJS adapter.** An injectable `ConfigService` via `ConfigModule.forRoot()`, plus an `awsConfigLoader` factory for `@nestjs/config`. |
| [`@dyanet/nextjs-config-aws`](packages/nextjs-config-aws) | **Next.js adapter.** A cached `getConfig()` for server components, plus `PublicEnvScript` / `env()` for runtime client variables. |

The adapters depend on the core and re-export it, so you can always drop down to
`ConfigManager` and the raw loaders for full control.

```
@dyanet/config-aws  ◄──  @dyanet/nestjs-config-aws
        ▲
        └────────────────  @dyanet/nextjs-config-aws
```

## Installation

Install the package for your framework (the core is pulled in automatically):

```bash
# Framework-agnostic core
npm install @dyanet/config-aws

# NestJS
npm install @dyanet/nestjs-config-aws @nestjs/common @nestjs/core zod

# Next.js
npm install @dyanet/nextjs-config-aws
```

### AWS SDK clients are optional

The AWS-backed loaders import their SDK **lazily**, so you only install the clients for
the sources you actually use. An environment-variables-only or `.env`-only setup needs no
AWS SDK at all.

```bash
npm install @aws-sdk/client-secrets-manager   # Secrets Manager
npm install @aws-sdk/client-ssm               # SSM Parameter Store
npm install @aws-sdk/client-s3                # S3
```

Credentials are resolved through the AWS SDK's default Node provider chain (environment,
shared config/profile, SSO, container, and IMDS) — no extra credential package required.

## Quick start

### Core (`@dyanet/config-aws`)

```typescript
import { ConfigManager, EnvironmentLoader, SecretsManagerLoader } from '@dyanet/config-aws';
import { z } from 'zod';

const schema = z.object({
  DATABASE_URL: z.string(),
  API_KEY: z.string(),
  PORT: z.coerce.number().default(3000),
});

const config = new ConfigManager({
  loaders: [
    new EnvironmentLoader({ prefix: 'APP_' }),
    new SecretsManagerLoader({ secretName: '/my-app/config' }),
  ],
  schema,
  precedence: 'aws-first', // AWS sources override local ones
});

await config.load();
const dbUrl = config.get('DATABASE_URL');
```

### NestJS (`@dyanet/nestjs-config-aws`)

Use the injectable `ConfigService`:

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@dyanet/nestjs-config-aws';
import { z } from 'zod';

@Module({
  imports: [
    ConfigModule.forRoot({
      schema: z.object({ DATABASE_URL: z.string(), PORT: z.coerce.number().default(3000) }),
      // Simple flat AWS option — identical in shape to the Next.js getConfig({ aws }):
      aws: { secretName: '/my-app/config', region: 'us-east-1' },
    }),
  ],
})
export class AppModule {}
```

…or feed AWS-sourced values into the standard `@nestjs/config` with the `awsConfigLoader`
factory (here `@nestjs/config` is an optional peer dependency):

```typescript
import { ConfigModule } from '@nestjs/config';
import { awsConfigLoader } from '@dyanet/nestjs-config-aws';

ConfigModule.forRoot({
  isGlobal: true,
  load: [awsConfigLoader({ aws: { secretName: '/my-app/config' } })],
});
```

See the [NestJS package README](packages/nestjs-config-aws/README.md) for the full API.

### Next.js (`@dyanet/nextjs-config-aws`)

```typescript
// Server component
import { getConfig } from '@dyanet/nextjs-config-aws';
import { z } from 'zod';

const config = await getConfig({
  schema: z.object({ DATABASE_URL: z.string() }),
  aws: { secretName: '/my-app/config' },
});
```

See the [Next.js package README](packages/nextjs-config-aws/README.md) for runtime client
variables (`PublicEnvScript` / `env`).

## How configuration is loaded

### Loaders and precedence

A `ConfigManager` runs a list of loaders, skips any that are unavailable, and merges their
output. Precedence decides who wins on key conflicts:

- **`aws-first`** (default): environment → `.env` → S3 → Secrets Manager → SSM (AWS wins).
- **`local-first`**: the reverse (local sources win).
- **Custom**: pass `LoaderPrecedence[]` (`{ loader, priority }`) to order loaders explicitly.

### `APP_ENV` behavior

The AWS loaders are environment-aware via `APP_ENV` (falling back to `NODE_ENV`, then
`local`):

- **`local`**: Secrets Manager and SSM skip themselves; only environment variables and
  `.env` files are used.
- **`development` / `test` / `production`**: AWS loaders run when credentials are available,
  using their environment-mapped paths.

### Environment variables

| Variable | Description | Default |
| --- | --- | --- |
| `APP_ENV` | Application environment | `local` |
| `NODE_ENV` | Node.js environment (fallback for `APP_ENV`) | — |
| `AWS_REGION` | AWS region for the SDK clients | Auto-detected |
| `AWS_PROFILE` | AWS profile for local development | — |

## AWS setup

### Example resources

```bash
# Secrets Manager: a JSON secret becomes a set of config keys
aws secretsmanager create-secret \
  --name "/prod/my-app/config" \
  --secret-string '{"DATABASE_PASSWORD":"secure-password","API_KEY":"prod-api-key"}'

# SSM Parameter Store: nested paths become UPPER_SNAKE_CASE keys
aws ssm put-parameter --name "/prod/my-app/DATABASE_HOST" --value "db.example.com" --type String
```

### IAM permissions

Grant only what the loaders you use require.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["secretsmanager:GetSecretValue", "secretsmanager:DescribeSecret"],
      "Resource": "arn:aws:secretsmanager:*:*:secret:/my-app/*"
    },
    {
      "Effect": "Allow",
      "Action": ["ssm:GetParameter", "ssm:GetParameters", "ssm:GetParametersByPath"],
      "Resource": "arn:aws:ssm:*:*:parameter/my-app/*"
    }
  ]
}
```

## Troubleshooting

**`CredentialsProviderError: Could not load credentials`** — Configure credentials via the
AWS CLI, environment variables, or an IAM role. For local development, `aws configure
--profile myprofile` and set `AWS_PROFILE`.

**`The optional dependency "@aws-sdk/client-…" is required … but is not installed`** — Install
the SDK client for the loader you're using (see [AWS SDK clients are optional](#aws-sdk-clients-are-optional)).

**`ValidationError: Configuration validation failed`** — A loaded value doesn't match your
Zod schema, or a required key is missing. Confirm the source actually provides the key and
that types coerce (e.g. `z.coerce.number()` for numeric env vars).

**`AccessDenied`** on Secrets Manager / SSM — Your credentials lack permission; see
[IAM permissions](#iam-permissions).

**Values are empty in `local`** — That's expected: AWS loaders skip in `local`. Set
`APP_ENV=development` (or higher) with valid credentials, or, for the NestJS / Next.js
adapters, force AWS loading per their options.

## Examples

Runnable example apps live under [`packages/nestjs-config-aws/examples/`](packages/nestjs-config-aws/examples/):

- [`basic-usage/`](packages/nestjs-config-aws/examples/basic-usage/) — simple `ConfigModule` setup
- [`custom-schema/`](packages/nestjs-config-aws/examples/custom-schema/) — typed Zod schema and validation
- [`aws-integration/`](packages/nestjs-config-aws/examples/aws-integration/) — AWS service integration
- [`docker-compose/`](packages/nestjs-config-aws/examples/docker-compose/) — LocalStack-based local environment

```bash
cd packages/nestjs-config-aws/examples/basic-usage
npm install && cp .env.example .env && npm run start:dev
```

## Development

```bash
npm install            # install workspace dependencies
npm run build          # build all packages
npm test               # run all test suites
npm run lint           # lint all packages
npm run typecheck      # type-check all packages
```

Per-package scripts are available via `npm run <script> --workspace=@dyanet/<package>`.

## Contributing

Contributions are welcome — see the [Contributing Guide](CONTRIBUTING.md).

## License

MIT © Dyanet. See [LICENSE](LICENSE). Per-package release notes live in each package's
`CHANGELOG.md`.
