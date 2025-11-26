import { Injectable } from '@nestjs/common';
import { ConfigService } from 'nest-config-aws';
import { AppConfig } from './config/schema';

@Injectable()
export class AppService {
  constructor(
    // Type-safe configuration service with custom schema
    private configService: ConfigService<AppConfig>
  ) {}

  getHello(): string {
    const env = this.configService.get('APP_ENV');
    const debug = this.configService.get('DEBUG_MODE');
    
    return `Hello from nest-config-aws custom schema example! Running in ${env} mode ${debug ? '(debug enabled)' : ''}`;
  }

  getApplicationInfo() {
    return {
      name: 'nest-config-aws Custom Schema Example',
      environment: this.configService.get('APP_ENV'),
      version: '1.0.0',
      features: {
        debug: this.configService.get('DEBUG_MODE'),
        swagger: this.configService.get('ENABLE_SWAGGER'),
        metrics: this.configService.get('ENABLE_METRICS'),
        logging: this.configService.get('ENABLE_LOGGING'),
      },
      server: {
        port: this.configService.get('PORT'),
        host: this.configService.get('HOST'),
      },
    };
  }

  getSecurityConfig() {
    return {
      jwtExpiresIn: this.configService.get('JWT_EXPIRES_IN'),
      bcryptRounds: this.configService.get('BCRYPT_ROUNDS'),
      corsOrigins: this.configService.get('CORS_ORIGINS'),
      rateLimiting: {
        window: this.configService.get('RATE_LIMIT_WINDOW'),
        maxRequests: this.configService.get('RATE_LIMIT_MAX_REQUESTS'),
      },
    };
  }

  getDatabaseConfig() {
    return {
      url: this.maskSensitiveValue(this.configService.get('DATABASE_URL')),
      poolSize: this.configService.get('DATABASE_POOL_SIZE'),
      timeout: this.configService.get('DATABASE_TIMEOUT'),
      ssl: this.configService.get('DATABASE_SSL'),
    };
  }

  getExternalServicesConfig() {
    const redisUrl = this.configService.get('REDIS_URL');
    
    return {
      api: {
        baseUrl: this.configService.get('API_BASE_URL'),
        timeout: this.configService.get('API_TIMEOUT'),
        retryAttempts: this.configService.get('API_RETRY_ATTEMPTS'),
        hasApiKey: !!this.configService.get('API_KEY'),
      },
      redis: {
        enabled: !!redisUrl,
        url: redisUrl ? this.maskSensitiveValue(redisUrl) : null,
        ttl: this.configService.get('REDIS_TTL'),
      },
      aws: {
        region: this.configService.get('AWS_REGION'),
        s3Bucket: this.configService.get('AWS_S3_BUCKET'),
      },
    };
  }

  getLoggingConfig() {
    return {
      enabled: this.configService.get('ENABLE_LOGGING'),
      level: this.configService.get('LOG_LEVEL'),
      format: this.configService.get('LOG_FORMAT'),
    };
  }

  getFileUploadConfig() {
    return {
      maxSize: this.configService.get('MAX_FILE_SIZE'),
      allowedTypes: this.configService.get('ALLOWED_FILE_TYPES'),
    };
  }

  // Utility methods demonstrating type-safe configuration access

  isProduction(): boolean {
    return this.configService.get('APP_ENV') === 'production';
  }

  isDevelopment(): boolean {
    return this.configService.get('APP_ENV') === 'development';
  }

  isDebugEnabled(): boolean {
    return this.configService.get('DEBUG_MODE');
  }

  getPort(): number {
    return this.configService.get('PORT'); // TypeScript knows this is a number
  }

  getApiTimeout(): number {
    return this.configService.get('API_TIMEOUT'); // TypeScript knows this is a number
  }

  getCorsOrigins(): string[] {
    return this.configService.get('CORS_ORIGINS'); // TypeScript knows this is string[]
  }

  getTags(): string[] {
    return this.configService.get('TAGS'); // TypeScript knows this is string[]
  }

  // Example of conditional configuration based on environment
  getEnvironmentSpecificSettings() {
    const env = this.configService.get('APP_ENV');
    
    switch (env) {
      case 'production':
        return {
          logLevel: 'warn',
          enableSwagger: false,
          enableMetrics: true,
          databaseSsl: true,
        };
      case 'development':
        return {
          logLevel: 'debug',
          enableSwagger: true,
          enableMetrics: true,
          databaseSsl: false,
        };
      case 'test':
        return {
          logLevel: 'error',
          enableSwagger: false,
          enableMetrics: false,
          databaseSsl: false,
        };
      default:
        return {
          logLevel: 'info',
          enableSwagger: false,
          enableMetrics: false,
          databaseSsl: false,
        };
    }
  }

  // Helper method to mask sensitive configuration values for logging
  private maskSensitiveValue(value: string): string {
    if (!value) return value;
    
    // For URLs, mask the password/credentials part
    try {
      const url = new URL(value);
      if (url.password) {
        url.password = '***';
      }
      if (url.username && url.password) {
        url.username = url.username.substring(0, 2) + '***';
      }
      return url.toString();
    } catch {
      // If not a URL, mask the middle part
      if (value.length > 8) {
        return value.substring(0, 4) + '***' + value.substring(value.length - 4);
      }
      return '***';
    }
  }
}