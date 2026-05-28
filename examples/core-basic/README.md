# core-basic — `@dyanet/config-aws`

A minimal, framework-agnostic example: load configuration from a `.env` file and
environment variables, validate it with a Zod schema, and read typed values.

## Run

```bash
npm install
cp .env.example .env
npm start
# or override at the CLI:
APP_NAME="my service" PORT=8080 npm start
```

## What it shows

- Composing loaders (`EnvFileLoader`, `EnvironmentLoader`) with a `ConfigManager`.
- Zod validation + coercion (`PORT` becomes a `number`).
- Where AWS sources plug in (commented in [`index.mjs`](./index.mjs)).

## AWS credentials & optional SDKs

The AWS-backed loaders (`SecretsManagerLoader`, `SSMParameterStoreLoader`, `S3Loader`)
import their SDK **lazily**, so install only what you use:

```bash
npm install @aws-sdk/client-secrets-manager   # for SecretsManagerLoader
```

Credentials are **auto-detected and chained** through the AWS SDK's default Node
provider chain — environment variables, shared config/profile, SSO, web identity,
ECS/EKS container, and EC2 IMDS — in that order. Set `AWS_REGION` (or a profile/role)
and nothing else is required in code.
