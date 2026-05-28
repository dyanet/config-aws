# Getting Started with config-aws

This guide gets you up and running with `config-aws` — type-safe configuration backed by
environment variables, `.env` files, and AWS (Secrets Manager, SSM Parameter Store, S3).

Pick the package that matches your stack:

- **Plain Node.js / any framework** → [`@dyanet/config-aws`](#core-dyanetconfig-aws)
- **NestJS** → [`@dyanet/nestjs-config-aws`](#nestjs-dyanetnestjs-config-aws)
- **Next.js** → [`@dyanet/nextjs-config-aws`](#nextjs-dyanetnextjs-config-aws)

> **AWS SDK clients are optional.** The AWS-backed loaders import their SDK lazily, so you
> only install the clients you use (`@aws-sdk/client-secrets-manager`, `@aws-sdk/client-ssm`,
> `@aws-sdk/client-s3`). An env-only or `.env`-only setup needs no AWS SDK. Credentials are
> resolved through the AWS SDK's default Node provider chain.

## Core (`@dyanet/config-aws`)

### Install

```bash
npm install @dyanet/config-aws zod
npm install @aws-sdk/client-secrets-manager   # only if you use Secrets Manager
```

### Use

```typescript
import { ConfigManager, EnvironmentLoader, SecretsManagerLoader } from '@dyanet/config-aws';
import { z } from 'zod';

const schema = z.object({
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string(),
});

const config = new ConfigManager({
  loaders: [
    new EnvironmentLoader(),
    new SecretsManagerLoader({ secretName: '/my-app/config' }),
  ],
  schema,
  precedence: 'aws-first',
});

await config.load();
config.get('DATABASE_URL');
```

## NestJS (`@dyanet/nestjs-config-aws`)

There are two ways to use it. Both read from environment variables, Secrets Manager and SSM.

### Install

```bash
npm install @dyanet/nestjs-config-aws @nestjs/common @nestjs/core zod
```

### Option 1 — Injectable `ConfigService`

Use this package's own module and service.

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@dyanet/nestjs-config-aws';

@Module({
  imports: [
    ConfigModule.forRoot({
      secretsManagerConfig: { enabled: process.env.APP_ENV !== 'local' },
    }),
  ],
})
export class AppModule {}
```

```typescript
// app.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@dyanet/nestjs-config-aws';

@Injectable()
export class AppService {
  constructor(private readonly config: ConfigService) {}

  getDatabaseUrl(): string {
    return this.config.get('DATABASE_URL'); // may come from AWS
  }
}
```

### Option 2 — `@nestjs/config` with `awsConfigLoader`

If you already use `@nestjs/config` (an **optional** peer dependency), drop the
`awsConfigLoader` factory into its `load` array and keep reading values through the standard
`ConfigService`.

```bash
npm install @nestjs/config
```

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { awsConfigLoader } from '@dyanet/nestjs-config-aws';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [
        awsConfigLoader({
          secretsManagerConfig: {
            enabled: process.env.APP_ENV !== 'local',
            paths: { development: '/my-app/dev/secrets', production: '/my-app/prod/secrets' },
          },
          precedence: 'aws-first',
        }),
      ],
    }),
  ],
})
export class AppModule {}
```

```typescript
// app.service.ts — standard @nestjs/config, no special imports
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppService {
  constructor(private readonly config: ConfigService) {}

  getDatabaseUrl(): string {
    return this.config.get<string>('DATABASE_URL'); // may come from AWS
  }
}
```

For namespaced config, compose with `@nestjs/config`'s own `registerAs`:

```typescript
import { registerAs } from '@nestjs/config';

ConfigModule.forRoot({
  load: [registerAs('database', awsConfigLoader({ ssmConfig: { paths: { production: '/db' } } }))],
});
```

## Next.js (`@dyanet/nextjs-config-aws`)

### Install

```bash
npm install @dyanet/nextjs-config-aws
```

### Server-side config

```typescript
import { getConfig } from '@dyanet/nextjs-config-aws';
import { z } from 'zod';

const config = await getConfig({
  schema: z.object({ DATABASE_URL: z.string() }),
  aws: { secretName: '/my-app/config' },
});
```

### Runtime client variables

```tsx
// layout.tsx (server component)
import { PublicEnvScript } from '@dyanet/nextjs-config-aws';
<PublicEnvScript publicVars={['API_URL', 'APP_NAME']} />;

// client component
'use client';
import { env } from '@dyanet/nextjs-config-aws';
const apiUrl = env('API_URL');
```

## Environment configuration

```bash
APP_ENV=local          # env vars + .env only; AWS loaders skip themselves
APP_ENV=development     # + AWS Secrets Manager / SSM with dev paths
APP_ENV=production      # + AWS Secrets Manager / SSM with prod paths

AWS_REGION=us-east-1
AWS_PROFILE=myprofile   # for local development
```

### Configuration precedence

Values are merged across sources; the strategy decides who wins on conflicts:

- **`aws-first`** (default) — AWS sources override local ones.
- **`local-first`** — local sources (env, `.env`) override AWS.
- **Custom** — pass an explicit `LoaderPrecedence[]` order to the core `ConfigManager`.

## AWS resources (optional)

```bash
# Secrets Manager — JSON keys become config keys
aws secretsmanager create-secret \
  --name "/prod/my-app/config" \
  --secret-string '{"DATABASE_PASSWORD":"secure-password","API_KEY":"prod-api-key"}'

# SSM Parameter Store — nested paths become UPPER_SNAKE_CASE keys
aws ssm put-parameter --name "/prod/my-app/DATABASE_HOST" --value "db.example.com" --type String
```

## Next steps

- **Examples**: [`packages/nestjs-config-aws/examples/`](packages/nestjs-config-aws/examples/)
- **Core API**: [`packages/config-aws/README.md`](packages/config-aws/README.md)
- **NestJS API**: [`packages/nestjs-config-aws/README.md`](packages/nestjs-config-aws/README.md)
- **Next.js API**: [`packages/nextjs-config-aws/README.md`](packages/nextjs-config-aws/README.md)
- **Troubleshooting**: see the [main README](README.md#troubleshooting)

## Need help?

- **Issues**: [GitHub Issues](https://github.com/dyanet/config-aws/issues)
- **Discussions**: [GitHub Discussions](https://github.com/dyanet/config-aws/discussions)
