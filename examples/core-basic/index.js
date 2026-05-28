// Minimal example for @dyanet/config-aws (framework-agnostic core).
//
// Run:  npm install && npm start
// Try:  APP_NAME="my service" PORT=8080 npm start
//
// Configuration is merged from a local .env file and process.env, validated with a
// Zod schema. AWS sources are shown but commented out — add them when you need them;
// the AWS SDK clients are optional and only loaded if you use those loaders.

import { ConfigManager, EnvFileLoader, EnvironmentLoader } from '@dyanet/config-aws';
// import { SecretsManagerLoader, SSMParameterStoreLoader } from '@dyanet/config-aws';
import { z } from 'zod';

const schema = z.object({
  APP_NAME: z.string().default('config-aws-demo'),
  PORT: z.coerce.number().int().positive().default(3000),
  FEATURE_FLAG: z.coerce.boolean().default(false),
});

const config = new ConfigManager({
  loaders: [
    new EnvFileLoader({ paths: ['.env'] }), // optional local file
    new EnvironmentLoader(), // process.env

    // AWS sources (uncomment + `npm install @aws-sdk/client-secrets-manager`):
    //   Credentials are auto-detected via the AWS SDK's default Node provider
    //   chain (env vars, shared profile, SSO, container, EC2 IMDS).
    // new SecretsManagerLoader({ secretName: process.env.SECRET_NAME }),
    // new SSMParameterStoreLoader({ parameterPath: process.env.SSM_PREFIX }),
  ],
  schema,
  precedence: 'aws-first', // AWS sources (when present) override local ones
});

await config.load();

console.log('Loaded configuration:');
console.log(JSON.stringify(config.getAll(), null, 2));
console.log(`\nAPP_NAME = ${config.get('APP_NAME')}`);
console.log(`PORT     = ${config.get('PORT')} (typeof ${typeof config.get('PORT')})`);
