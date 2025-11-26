import { Module } from '@nestjs/common';
import { ConfigModule } from 'nest-config-aws';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseService } from './services/database.service';
import { ApiService } from './services/api.service';
import { appConfigSchema } from './config/schema';

@Module({
  imports: [
    ConfigModule.forRoot({
      // Use custom Zod schema for type safety and validation
      schema: appConfigSchema,
      
      // Configure AWS Secrets Manager
      secretsManagerConfig: {
        enabled: process.env.APP_ENV !== 'local',
        region: process.env.AWS_REGION || 'us-east-1',
        paths: {
          development: '/myapp/dev/secrets',
          test: '/myapp/test/secrets',
          production: '/myapp/prod/secrets',
        },
      },
      
      // Configure AWS SSM Parameter Store
      ssmConfig: {
        enabled: process.env.APP_ENV !== 'local',
        region: process.env.AWS_REGION || 'us-east-1',
        decrypt: true, // Decrypt SecureString parameters
        paths: {
          development: '/myapp/dev/config/',
          test: '/myapp/test/config/',
          production: '/myapp/prod/config/',
        },
      },
      
      // Optional: Add environment variable prefix
      envPrefix: 'MYAPP_',
      
      // Optional: Custom APP_ENV variable name
      appEnvVariable: 'APP_ENV',
    }),
  ],
  controllers: [AppController],
  providers: [AppService, DatabaseService, ApiService],
})
export class AppModule {}