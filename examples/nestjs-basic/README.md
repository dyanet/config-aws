# nestjs-basic — `@dyanet/nestjs-config-aws`

A minimal NestJS app using `ConfigModule.forRoot()` + the injectable `ConfigService`.

## Run

```bash
npm install
cp .env.example .env
npm start
# then:
curl http://localhost:3000/
curl http://localhost:3000/config
```

## What it shows

- The new simple `aws: { secretName, ssmPrefix, region }` option, identical in shape to
  the Next.js adapter's `getConfig({ aws })`.
- Typed `ConfigService<AppConfig>` driven by a Zod schema.
- `.env` loading via `dotenv/config` at the top of [`src/main.ts`](./src/main.ts).
- The AWS loaders auto-skip when `APP_ENV` is `'local'` (the default), so the app runs
  locally with zero AWS setup. Set `APP_ENV=development` (or higher) to actually load
  from AWS.

## Use `@nestjs/config` instead?

Swap `ConfigModule` for `@nestjs/config`'s standard `ConfigModule` and drop the factory:

```typescript
import { ConfigModule } from '@nestjs/config';
import { awsConfigLoader } from '@dyanet/nestjs-config-aws';

ConfigModule.forRoot({
  isGlobal: true,
  load: [awsConfigLoader({ schema: configSchema, aws: { secretName: '/my-app/config' } })],
});
```

`@nestjs/config` is an **optional** peer dependency.

## AWS credentials & optional SDKs

Install only the SDK clients you use:

```bash
npm install @aws-sdk/client-secrets-manager   # for the aws.secretName loader
npm install @aws-sdk/client-ssm               # for the aws.ssmPrefix loader
```

Credentials are **auto-detected and chained** through the AWS SDK's default Node
provider chain — environment variables → shared config/profile → SSO → web identity →
ECS/EKS container → EC2 IMDS — in that order. Just set `AWS_REGION` (or rely on your
profile/role) and nothing else is required in code.
