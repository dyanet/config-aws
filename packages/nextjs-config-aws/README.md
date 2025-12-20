# @dyanet/nextjs-config-aws

[![npm version](https://img.shields.io/npm/v/@dyanet/nextjs-config-aws.svg)](https://www.npmjs.com/package/@dyanet/nextjs-config-aws)
[![CI](https://github.com/dyanet/config-aws/actions/workflows/ci.yml/badge.svg)](https://github.com/dyanet/config-aws/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/dyanet/config-aws/flag/nextjs-config-aws/graph/badge.svg)](https://codecov.io/gh/dyanet/config-aws)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Next.js adapter for AWS configuration management. A thin wrapper around [@dyanet/config-aws](../config-aws) that provides server-side configuration loading, runtime environment variables, and automatic environment detection.

## Features

- **Simplified API** - Just `getConfig()`, `PublicEnvScript`, and `env()` - no loader complexity
- **Automatic Environment Detection** - Configures itself based on NODE_ENV
- **Runtime Environment Variables** - Deploy the same build to different environments
- **Caching** - Avoid repeated AWS API calls during request handling
- **Type Safety** - Full TypeScript support with Zod schema validation
- **AWS Services** - Load configuration from Secrets Manager and SSM Parameter Store

## Installation

```bash
npm install @dyanet/nextjs-config-aws
```

### Peer Dependencies

```bash
npm install next react
```

For AWS services, install the SDK clients you need:

```bash
# For Secrets Manager
npm install @aws-sdk/client-secrets-manager

# For SSM Parameter Store
npm install @aws-sdk/client-ssm

# For schema validation
npm install zod
```

## Quick Start

### Server-Side Configuration

```typescript
// app/page.tsx (Server Component)
import { getConfig } from '@dyanet/nextjs-config-aws';
import { z } from 'zod';

const schema = z.object({
  DATABASE_URL: z.string(),
  API_KEY: z.string(),
});

export default async function Page() {
  // Minimal usage - auto-detects environment
  const config = await getConfig({ schema });

  return <div>Connected to: {config.DATABASE_URL}</div>;
}
```

### With AWS Secrets Manager

```typescript
// app/page.tsx
import { getConfig } from '@dyanet/nextjs-config-aws';
import { z } from 'zod';

const schema = z.object({
  DATABASE_URL: z.string(),
  API_KEY: z.string(),
});

export default async function Page() {
  const config = await getConfig({
    schema,
    aws: { 
      secretName: '/my-app/config',
      region: 'us-east-1'  // Optional, defaults to AWS_REGION env var
    },
  });

  return <div>Connected to: {config.DATABASE_URL}</div>;
}
```

### Runtime Environment Variables

```tsx
// app/layout.tsx
import { PublicEnvScript } from '@dyanet/nextjs-config-aws';

export default function RootLayout({ children }) {
  return (
    <html>
      <head>
        <PublicEnvScript
          publicVars={['API_URL', 'APP_NAME', 'FEATURE_FLAGS']}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
```

```tsx
// app/components/client-component.tsx
'use client';

import { env } from '@dyanet/nextjs-config-aws';

export function ClientComponent() {
  const apiUrl = env('API_URL');
  const appName = env('APP_NAME', 'My App');

  return <div>API: {apiUrl}, App: {appName}</div>;
}
```

## Environment Detection

The library automatically configures itself based on `NODE_ENV`:

| Environment | Env Vars | .env Files | AWS Sources |
|-------------|----------|------------|-------------|
| development | ✓ | .env.local, .env | Only if `forceAwsInDev: true` |
| production  | ✓ | .env | ✓ (if configured) |
| test        | ✓ | ✗ | ✗ |

### Override Environment Detection

```typescript
const config = await getConfig({
  schema,
  environment: 'production',  // Force production behavior
});
```

### Force AWS in Development

```typescript
const config = await getConfig({
  schema,
  aws: { secretName: '/my-app/config' },
  forceAwsInDev: true,  // Load from AWS even in development
});
```

## API Reference

### getConfig()

Load configuration in Server Components, API routes, or server actions.

```typescript
import { getConfig } from '@dyanet/nextjs-config-aws';
```

#### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `schema` | `ZodType<T>` | `undefined` | Zod schema for validation |
| `aws.secretName` | `string` | `undefined` | AWS Secrets Manager secret name |
| `aws.ssmPrefix` | `string` | `undefined` | AWS SSM Parameter Store path prefix |
| `aws.region` | `string` | `AWS_REGION` | AWS region for all service calls |
| `environment` | `'development' \| 'production' \| 'test'` | auto-detect | Override environment detection |
| `forceAwsInDev` | `boolean` | `false` | Load from AWS in development mode |
| `cache` | `boolean` | `true` | Enable caching |
| `cacheTTL` | `number` | `60000` | Cache TTL in milliseconds |

#### Examples

```typescript
// Minimal - just schema
const config = await getConfig({ schema });

// With AWS Secrets Manager
const config = await getConfig({
  schema,
  aws: { secretName: '/my-app/secrets' }
});

// With SSM Parameter Store
const config = await getConfig({
  schema,
  aws: { ssmPrefix: '/my-app/config' }
});

// Both AWS sources
const config = await getConfig({
  schema,
  aws: { 
    secretName: '/my-app/secrets',
    ssmPrefix: '/my-app/config',
    region: 'us-west-2'
  }
});

// Disable caching
const config = await getConfig({
  schema,
  cache: false
});
```

### PublicEnvScript

Server component that injects environment variables into the client.

```tsx
import { PublicEnvScript } from '@dyanet/nextjs-config-aws';
```

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `publicVars` | `string[]` | `undefined` | Explicit list of variables to expose |
| `publicPrefix` | `string` | `undefined` | Prefix to filter variables |
| `variableName` | `string` | `'__ENV'` | Global variable name on window |
| `nonce` | `string` | `undefined` | CSP nonce for script tag |

**Security Note:** Only expose variables that are safe for public access. Never expose secrets, API keys, or sensitive data.

```tsx
// Explicit allowlist
<PublicEnvScript publicVars={['API_URL', 'APP_NAME']} />

// Prefix filtering
<PublicEnvScript publicPrefix="PUBLIC_" />

// With CSP nonce
<PublicEnvScript publicVars={['API_URL']} nonce={cspNonce} />
```

### env()

Access runtime environment variables on the client.

```typescript
'use client';

import { env } from '@dyanet/nextjs-config-aws';
```

```typescript
// Get a variable (returns undefined if not found)
const apiUrl = env('API_URL');

// Get with default value
const appName = env('APP_NAME', 'My App');
```

### Error Handling

```typescript
import { ConfigurationError, ValidationError } from '@dyanet/nextjs-config-aws';

try {
  const config = await getConfig({ schema });
} catch (error) {
  if (error instanceof ValidationError) {
    console.error('Validation failed:', error.message);
    // error.message includes the invalid/missing key names
  }
}
```

## App Router Examples

### Server Component

```tsx
// app/dashboard/page.tsx
import { getConfig } from '@dyanet/nextjs-config-aws';
import { z } from 'zod';

const schema = z.object({
  DATABASE_URL: z.string(),
  FEATURE_FLAGS: z.string().transform(s => JSON.parse(s)),
});

export default async function DashboardPage() {
  const config = await getConfig({
    schema,
    aws: { ssmPrefix: '/app/config' },
  });

  return (
    <div>
      <h1>Dashboard</h1>
      <p>Features: {JSON.stringify(config.FEATURE_FLAGS)}</p>
    </div>
  );
}
```

### API Route

```typescript
// app/api/config/route.ts
import { NextResponse } from 'next/server';
import { getConfig } from '@dyanet/nextjs-config-aws';
import { z } from 'zod';

const schema = z.object({
  API_VERSION: z.string(),
  MAX_REQUESTS: z.coerce.number(),
});

export async function GET() {
  const config = await getConfig({ schema });

  return NextResponse.json({
    version: config.API_VERSION,
    maxRequests: config.MAX_REQUESTS,
  });
}
```

### Server Action

```typescript
// app/actions.ts
'use server';

import { getConfig } from '@dyanet/nextjs-config-aws';
import { z } from 'zod';

const schema = z.object({
  API_KEY: z.string(),
});

export async function fetchData() {
  const config = await getConfig({
    schema,
    aws: { secretName: '/app/secrets' },
  });

  const response = await fetch('https://api.example.com/data', {
    headers: { 'Authorization': `Bearer ${config.API_KEY}` },
  });

  return response.json();
}
```

## Pages Router Examples

### getServerSideProps

```typescript
// pages/dashboard.tsx
import { getConfig } from '@dyanet/nextjs-config-aws';
import { z } from 'zod';
import type { GetServerSideProps } from 'next';

const schema = z.object({
  API_URL: z.string(),
});

export const getServerSideProps: GetServerSideProps = async () => {
  const config = await getConfig({ schema });

  return {
    props: {
      apiUrl: config.API_URL,
    },
  };
};

export default function Dashboard({ apiUrl }: { apiUrl: string }) {
  return <div>API URL: {apiUrl}</div>;
}
```

### API Route (Pages Router)

```typescript
// pages/api/config.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { getConfig } from '@dyanet/nextjs-config-aws';
import { z } from 'zod';

const schema = z.object({
  APP_VERSION: z.string(),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const config = await getConfig({ schema });

  res.json({ version: config.APP_VERSION });
}
```

## Advanced Usage

For advanced use cases such as custom loaders, direct AWS SDK integration, or fine-grained control over configuration loading, import from `@dyanet/config-aws` directly:

```typescript
import {
  ConfigManager,
  EnvironmentLoader,
  EnvFileLoader,
  SecretsManagerLoader,
  SSMParameterStoreLoader,
  S3Loader,
} from '@dyanet/config-aws';

const manager = new ConfigManager({
  loaders: [
    new EnvironmentLoader({ prefix: 'APP_' }),
    new EnvFileLoader({ paths: ['.env.local', '.env'] }),
    new SecretsManagerLoader({ secretName: '/my-app/config' }),
  ],
  schema: mySchema,
  precedence: 'aws-first',
});

await manager.load();
const config = manager.getAll();
```

## Related Packages

- **[@dyanet/config-aws](../config-aws)** - Framework-agnostic core library
- **[@dyanet/nestjs-config-aws](../nestjs-config-aws)** - NestJS adapter

## License

MIT
