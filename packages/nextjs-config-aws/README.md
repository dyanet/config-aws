# @dyanet/nextjs-config-aws

Next.js adapter for AWS configuration management. A thin wrapper around [@dyanet/config-aws](../config-aws) that provides server-side configuration loading, React context providers, and runtime environment variable support.

## Features

- **Server Components** - Load configuration in Server Components and API routes
- **Runtime Environment Variables** - Deploy the same build to different environments
- **Caching** - Avoid repeated AWS API calls during request handling
- **React Context** - Share configuration across your component tree
- **Type Safety** - Full TypeScript support with Zod schema validation
- **AWS Services** - Load configuration from Secrets Manager, SSM Parameter Store, S3

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

# For S3
npm install @aws-sdk/client-s3

# For schema validation
npm install zod
```

## Quick Start

### Server-Side Configuration

```typescript
// app/page.tsx (Server Component)
import { getConfig, EnvironmentLoader, SecretsManagerLoader } from '@dyanet/nextjs-config-aws';
import { z } from 'zod';

const schema = z.object({
  DATABASE_URL: z.string(),
  API_KEY: z.string(),
});

export default async function Page() {
  const config = await getConfig({
    schema,
    loaders: [
      new EnvironmentLoader(),
      new SecretsManagerLoader({ secretName: '/my-app/config' }),
    ],
    precedence: 'aws-first',
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

## Server-Side API

### getConfig()

Load configuration in Server Components, API routes, or server actions:

```typescript
import { getConfig, EnvironmentLoader, SecretsManagerLoader } from '@dyanet/nextjs-config-aws';
import { z } from 'zod';

const schema = z.object({
  DATABASE_URL: z.string(),
  API_KEY: z.string(),
  PORT: z.coerce.number().default(3000),
});

// In a Server Component
export default async function Page() {
  const config = await getConfig({
    schema,
    loaders: [
      new EnvironmentLoader({ prefix: 'APP_' }),
      new SecretsManagerLoader({ secretName: '/my-app/secrets' }),
    ],
    precedence: 'aws-first',
    cache: true,        // Enable caching (default: true)
    cacheTTL: 60000,    // Cache for 1 minute (default)
  });

  return <div>{config.DATABASE_URL}</div>;
}
```

#### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `schema` | `ZodType<T>` | `undefined` | Zod schema for validation |
| `loaders` | `ConfigLoader[]` | `[]` | Array of configuration loaders |
| `precedence` | `PrecedenceStrategy` | `'aws-first'` | Precedence strategy |
| `cache` | `boolean` | `true` | Enable caching |
| `cacheTTL` | `number` | `60000` | Cache TTL in milliseconds |
| `enableLogging` | `boolean` | `false` | Enable logging |

### Cache Management

```typescript
import { clearConfigCache, getConfigCacheSize, invalidateConfig } from '@dyanet/nextjs-config-aws';

// Clear all cached configurations
clearConfigCache();

// Get number of cached configurations
const size = getConfigCacheSize();

// Invalidate a specific configuration
invalidateConfig({ loaders: [...], precedence: 'aws-first' });
```

### createConfigProvider()

Create a typed React context provider for sharing configuration:

```typescript
// lib/config.ts
import { createConfigProvider, getConfig } from '@dyanet/nextjs-config-aws';
import { z } from 'zod';

const schema = z.object({
  DATABASE_URL: z.string(),
  API_KEY: z.string(),
});

export type AppConfig = z.infer<typeof schema>;

// Create typed provider and hook
export const { ConfigProvider, useConfig } = createConfigProvider<AppConfig>();
export { schema };
```

```tsx
// app/layout.tsx
import { ConfigProvider, schema } from '@/lib/config';
import { getConfig, EnvironmentLoader } from '@dyanet/nextjs-config-aws';

export default async function RootLayout({ children }) {
  const config = await getConfig({
    schema,
    loaders: [new EnvironmentLoader()],
  });

  return (
    <html>
      <body>
        <ConfigProvider config={config}>
          {children}
        </ConfigProvider>
      </body>
    </html>
  );
}
```

```tsx
// app/components/my-component.tsx
'use client';

import { useConfig } from '@/lib/config';

export function MyComponent() {
  const config = useConfig();
  return <div>API Key: {config.API_KEY}</div>;
}
```

## Runtime Environment Variables

### PublicEnvScript

Server component that injects environment variables into the client:

```tsx
import { PublicEnvScript } from '@dyanet/nextjs-config-aws';

// In your root layout
<PublicEnvScript
  publicVars={['API_URL', 'APP_NAME']}  // Explicit allowlist
  variableName="__ENV"                   // Global variable name (default)
  nonce={cspNonce}                       // CSP nonce (optional)
/>

// Or use prefix filtering
<PublicEnvScript
  publicPrefix="PUBLIC_"                 // Include all PUBLIC_* vars
/>
```

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `publicVars` | `string[]` | `undefined` | Explicit list of variables to expose |
| `publicPrefix` | `string` | `undefined` | Prefix to filter variables |
| `variableName` | `string` | `'__ENV'` | Global variable name on window |
| `nonce` | `string` | `undefined` | CSP nonce for script tag |

**Security Note:** Only expose variables that are safe for public access. Never expose secrets, API keys, or sensitive data.

### Client-Side Access

```typescript
'use client';

import { env, envFrom, getAllEnv, hasEnv } from '@dyanet/nextjs-config-aws';

// Get a variable (returns undefined if not found)
const apiUrl = env('API_URL');

// Get with default value
const appName = env('APP_NAME', 'My App');

// Get from custom variable name
const customVar = envFrom('__MY_ENV', 'API_URL');

// Get all variables
const allEnv = getAllEnv();

// Check if variable exists
if (hasEnv('FEATURE_FLAG')) {
  // Feature is enabled
}
```

## App Router Examples

### Server Component

```tsx
// app/dashboard/page.tsx
import { getConfig, EnvironmentLoader, SSMParameterStoreLoader } from '@dyanet/nextjs-config-aws';
import { z } from 'zod';

const schema = z.object({
  DATABASE_URL: z.string(),
  FEATURE_FLAGS: z.string().transform(s => JSON.parse(s)),
});

export default async function DashboardPage() {
  const config = await getConfig({
    schema,
    loaders: [
      new EnvironmentLoader(),
      new SSMParameterStoreLoader({ parameterPath: '/app/config' }),
    ],
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
import { getConfig, EnvironmentLoader } from '@dyanet/nextjs-config-aws';
import { z } from 'zod';

const schema = z.object({
  API_VERSION: z.string(),
  MAX_REQUESTS: z.coerce.number(),
});

export async function GET() {
  const config = await getConfig({
    schema,
    loaders: [new EnvironmentLoader()],
  });

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

import { getConfig, SecretsManagerLoader } from '@dyanet/nextjs-config-aws';
import { z } from 'zod';

const schema = z.object({
  API_KEY: z.string(),
});

export async function fetchData() {
  const config = await getConfig({
    schema,
    loaders: [new SecretsManagerLoader({ secretName: '/app/secrets' })],
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
import { getConfig, EnvironmentLoader } from '@dyanet/nextjs-config-aws';
import { z } from 'zod';
import type { GetServerSideProps } from 'next';

const schema = z.object({
  API_URL: z.string(),
});

export const getServerSideProps: GetServerSideProps = async () => {
  const config = await getConfig({
    schema,
    loaders: [new EnvironmentLoader()],
  });

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
import { getConfig, EnvironmentLoader } from '@dyanet/nextjs-config-aws';
import { z } from 'zod';

const schema = z.object({
  APP_VERSION: z.string(),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const config = await getConfig({
    schema,
    loaders: [new EnvironmentLoader()],
  });

  res.json({ version: config.APP_VERSION });
}
```

## Re-exported Types

All types from `@dyanet/config-aws` are re-exported:

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
} from '@dyanet/nextjs-config-aws';
```

## Related Packages

- **[@dyanet/config-aws](../config-aws)** - Framework-agnostic core library
- **[@dyanet/nestjs-config-aws](../nestjs-config-aws)** - NestJS adapter

## License

MIT
