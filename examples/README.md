# Examples

Small, self-contained sample applications — one per installable adapter. Each runs in
under a minute and shows the smallest useful surface of its package.

| Sample | Package | Highlights |
| --- | --- | --- |
| [core-basic/](./core-basic) | `@dyanet/config-aws` | `.env` + env vars + Zod, AWS sources commented in. **Verified runnable.** |
| [nestjs-basic/](./nestjs-basic) | `@dyanet/nestjs-config-aws` | `ConfigModule.forRoot()` + injectable `ConfigService`, using the new flat `aws: { secretName, ssmPrefix, region }` option. |
| [nextjs-basic/](./nextjs-basic) | `@dyanet/nextjs-config-aws` | App Router page using `getConfig`, plus `PublicEnvScript` + `env()` for runtime client vars. |

All three samples follow the same shape: a tiny Zod schema, a simple `aws` option
(`{ secretName, ssmPrefix, region }`), and AWS sources that are off by default and
opt-in via env or code.

## AWS credentials & optional SDKs (applies to all samples)

The AWS-backed loaders import their SDK **lazily**, so install only what you use:

```bash
npm install @aws-sdk/client-secrets-manager   # for SecretsManagerLoader / aws.secretName
npm install @aws-sdk/client-ssm               # for SSMParameterStoreLoader / aws.ssmPrefix
npm install @aws-sdk/client-s3                # for S3Loader
```

Credentials are **auto-detected and chained** through the AWS SDK's default Node
provider chain — environment variables → shared config/profile → SSO → web identity →
ECS/EKS container → EC2 IMDS — in that order. Set `AWS_REGION` (or rely on your
profile/role) and no credential code is needed.
