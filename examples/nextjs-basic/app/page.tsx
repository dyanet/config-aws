import { getConfig } from '@dyanet/nextjs-config-aws';
import { z } from 'zod';
import { ClientInfo } from './components/client-info';

// Server-side schema — these are loaded from env/AWS, never sent to the client.
const serverSchema = z.object({
  APP_NAME: z.string().default('nextjs-config-aws-demo'),
  DATABASE_URL: z.string().optional(),
});

export default async function Page() {
  // `getConfig` auto-detects the environment from NODE_ENV:
  //   - development: env vars + .env.local/.env files
  //   - production:  env vars + .env file + AWS sources (if `aws` provided)
  //   - test:        env vars only
  //
  // Credentials are auto-detected and chained via the AWS SDK's default Node
  // provider chain (env, shared profile, SSO, container, EC2 IMDS).
  const config = await getConfig({
    schema: serverSchema,
    aws: {
      // Uncomment and `npm install @aws-sdk/client-secrets-manager` to use:
      // secretName: process.env.SECRET_NAME,
      region: process.env.AWS_REGION,
    },
  });

  return (
    <main style={{ fontFamily: 'system-ui, sans-serif', padding: 24 }}>
      <h1>@dyanet/nextjs-config-aws — basic example</h1>

      <h2>Server-side config (from getConfig)</h2>
      <pre>{JSON.stringify(config, null, 2)}</pre>

      <h2>Client-side runtime env (from PublicEnvScript + env())</h2>
      <ClientInfo />
    </main>
  );
}
