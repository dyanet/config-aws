import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NestConfigAwsIntegrationModule } from 'nest-config-aws';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { ExamplesModule } from './examples/examples.module';
import databaseConfig from './config/database.config';
import appConfig from './config/app.config';
import { validateConfig } from './config/validation';

@Module({
  imports: [
    // AWS Integration - must be imported first
    NestConfigAwsIntegrationModule.forRoot({
      secretsManagerConfig: {
        enabled: process.env.ENABLE_AWS_INTEGRATION === 'true',
        region: process.env.AWS_REGION,
        paths: {
          development: '/myapp/development/secrets',
          test: '/myapp/test/secrets',
          production: '/myapp/production/secrets',
        },
      },
      ssmConfig: {
        enabled: process.env.ENABLE_AWS_INTEGRATION === 'true',
        region: process.env.AWS_REGION,
        paths: {
          development: '/myapp/development/',
          test: '/myapp/test/',
          production: '/myapp/production/',
        },
        decrypt: true,
      },
      precedence: (process.env.PRECEDENCE_RULE as any) || 'aws-first',
      namespaces: ['database', 'app'],
      enableLogging: process.env.NODE_ENV === 'development',
      failOnAwsError: process.env.FAIL_ON_AWS_ERROR === 'true',
      fallbackToLocal: true,
    }),
    
    // Standard @nestjs/config setup
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [databaseConfig, appConfig],
      validate: validateConfig,
      validationOptions: {
        allowUnknown: true,
        abortEarly: false,
      },
    }),
    
    DatabaseModule,
    ExamplesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}