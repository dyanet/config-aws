import { Module } from '@nestjs/common';
import { ConfigModule } from 'nest-config-aws';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AwsService } from './services/aws.service';
import { MonitoringService } from './services/monitoring.service';
import { awsConfigSchema } from './config/aws-schema';

@Module({
  imports: [
    // AWS-focused configuration with comprehensive AWS service integration
    ConfigModule.forRoot({
      schema: awsConfigSchema,
      secretsManagerConfig: {
        enabled: process.env.APP_ENV !== 'local',
        region: process.env.AWS_REGION || 'us-east-1',
        paths: {
          development: '/myapp/development/secrets',
          test: '/myapp/test/secrets',
          production: '/myapp/production/secrets',
        },
      },
      ssmConfig: {
        enabled: process.env.APP_ENV !== 'local',
        region: process.env.AWS_REGION || 'us-east-1',
        decrypt: true,
        paths: {
          development: '/myapp/development/config/',
          test: '/myapp/test/config/',
          production: '/myapp/production/config/',
        },
      },
    }),
  ],
  controllers: [AppController],
  providers: [AppService, AwsService, MonitoringService],
})
export class AppModule {}