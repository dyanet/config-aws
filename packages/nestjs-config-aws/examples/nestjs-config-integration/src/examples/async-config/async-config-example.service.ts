import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AsyncConfigExampleService {
  constructor(private readonly configService: ConfigService) {}

  getAsyncLoadedConfig() {
    return {
      // These values could come from AWS or local sources
      // depending on the async configuration setup
      nodeEnv: this.configService.get('NODE_ENV'),
      port: this.configService.get('PORT'),
      hasApiKey: !!this.configService.get('API_KEY'),
      hasJwtSecret: !!this.configService.get('JWT_SECRET'),
      awsRegion: this.configService.get('AWS_REGION'),
      
      // Example of accessing configuration that might be loaded asynchronously
      dynamicConfig: {
        featureFlag: this.configService.get('ENABLE_NEW_FEATURE'),
        experimentalFlag: this.configService.get('ENABLE_EXPERIMENTAL_FEATURE'),
        logLevel: this.configService.get('LOG_LEVEL'),
      },
    };
  }

  getConfigurationStatus() {
    const requiredKeys = [
      'NODE_ENV',
      'PORT',
      'DATABASE_PASSWORD',
      'API_KEY',
    ];

    const optionalKeys = [
      'REDIS_URL',
      'JWT_SECRET',
      'ENCRYPTION_KEY',
    ];

    const status = {
      required: {},
      optional: {},
      summary: {
        allRequiredPresent: true,
        totalRequired: requiredKeys.length,
        presentRequired: 0,
        totalOptional: optionalKeys.length,
        presentOptional: 0,
      },
    };

    // Check required configuration
    for (const key of requiredKeys) {
      const value = this.configService.get(key);
      const isPresent = value !== undefined && value !== null && value !== '';
      
      status.required[key] = {
        present: isPresent,
        hasValue: !!value,
      };

      if (isPresent) {
        status.summary.presentRequired++;
      } else {
        status.summary.allRequiredPresent = false;
      }
    }

    // Check optional configuration
    for (const key of optionalKeys) {
      const value = this.configService.get(key);
      const isPresent = value !== undefined && value !== null && value !== '';
      
      status.optional[key] = {
        present: isPresent,
        hasValue: !!value,
      };

      if (isPresent) {
        status.summary.presentOptional++;
      }
    }

    return status;
  }
}