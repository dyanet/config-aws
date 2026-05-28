# nextjs-basic — `@dyanet/nextjs-config-aws`

A minimal Next.js (App Router) app using:

- `getConfig` — server-side config loading with optional AWS sources
- `PublicEnvScript` — runtime env vars exposed to the client
- `env` — client-side accessor for those runtime vars

## Run

```bash
npm install
cp .env.example .env.local
npm run dev
# open http://localhost:3000
```

## What it shows

- Server-only secrets and config loaded by `getConfig()` in [`app/page.tsx`](./app/page.tsx).
- Runtime client variables (no `NEXT_PUBLIC_` build-time inlining required) via
  `<PublicEnvScript />` in [`app/layout.tsx`](./app/layout.tsx) and `env()` in
  [`app/components/client-info.tsx`](./app/components/client-info.tsx).
- The simple, flat `aws: { secretName, ssmPrefix, region }` option — the same shape
  the NestJS adapter now uses for consistency.

## AWS credentials & optional SDKs

Install only the SDK clients you use:

```bash
npm install @aws-sdk/client-secrets-manager   # for aws.secretName
npm install @aws-sdk/client-ssm               # for aws.ssmPrefix
```

Credentials are **auto-detected and chained** through the AWS SDK's default Node
provider chain — environment variables → shared config/profile → SSO → web identity →
ECS/EKS container → EC2 IMDS — in that order. In a typical Next.js deployment (Vercel
with the AWS integration, ECS/EKS, EC2, or a server with an AWS profile), no
credential code is required: just set `AWS_REGION` (or rely on your profile/role).
