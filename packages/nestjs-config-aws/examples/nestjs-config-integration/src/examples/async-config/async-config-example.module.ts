import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NestConfigAwsIntegrationModule } from 'nest-config-aws';
import { AsyncConfigExampleController } from './async-config-example.controller';
import { AsyncConfigExampleService } from './async-config-example.service';

// This module demonstrates async configuration setup
// In a real application, you would typically do this at the root level
@Module({
  imports: [
    // Example of async AWS integration setup
    NestConfigAwsIntegrationModule.forRootAsync({
      useFactory: async () => {
        // Simulate loading configuration from external source
        await new Promise(resolve => setTimeout(resolve, 100));
        
        return {
          secretsManagerConfig: {
            enabled: process.env.NODE_ENV !== 'test',
            region: process.env.AWS_REGION || 'us-east-1',
            paths: {
              development: '/myapp/async-example/dev/secrets',
              production: '/myapp/async-example/prod/secrets',
            },
          },
          ssmConfig: {
            enabled: process.env.NODE_ENV !== 'test',
            region: process.env.AWS_REGION || 'us-east-1',
            paths: {
              development: '/myapp/async-example/dev/',
              production: '/myapp/async-example/prod/',
            },
          },
          precedence: 'aws-first',
          enableLogging: true,
          failOnAwsError: false,
        };
      },
    }),
    
    // Example of async @nestjs/config setup
    ConfigModule.forRootAsync({
      useFactory: async (configService: ConfigService) => {
        // You can use the ConfigService here if needed
        // Note: AWS configuration would already be loaded at this point
        
        return {
          cache: true,
          validate: (config) => {
            // Custom validation logic
            if (process.env.NODE_ENV === 'production' && !config.API_KEY) {
              throw new Error('API_KEY is required in production');
            }
            return config;
          },
        };
      },
      inject: [ConfigService],
    }),
  ],
  controllers: [AsyncConfigExampleController],
  providers: [AsyncConfigExampleService],
})
export class AsyncConfigExampleModule {}