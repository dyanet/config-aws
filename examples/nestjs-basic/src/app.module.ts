import { Module } from '@nestjs/common';
import { ConfigModule } from '@dyanet/nestjs-config-aws';
import { configSchema } from './config.schema';
import { AppController } from './app.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      schema: configSchema,
      // Simple `aws` option — mirrors the Next.js adapter's `getConfig({ aws })`.
      // The AWS loaders automatically skip themselves when APP_ENV is 'local' (the
      // default), so this is safe to leave on for local dev; set APP_ENV to
      // development / test / production to actually load from AWS.
      //
      // Credentials are auto-detected and chained via the AWS SDK's default Node
      // provider chain (env vars, shared profile, SSO, container, EC2 IMDS).
      aws: {
        secretName: process.env.SECRET_NAME ?? '/my-app/config',
        // ssmPrefix: process.env.SSM_PREFIX,
        region: process.env.AWS_REGION,
      },
    }),
  ],
  controllers: [AppController],
})
export class AppModule {}
