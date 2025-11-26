/**
 * Basic Integration Example
 * 
 * This file demonstrates the simplest possible integration between
 * nest-config-aws and @nestjs/config.
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NestConfigAwsIntegrationModule } from 'nest-config-aws';

// ============================================================================
// BASIC INTEGRATION SETUP
// ============================================================================

/**
 * The simplest integration setup - just add the integration module
 * before the standard ConfigModule.
 */
@Module({
  imports: [
    // Step 1: Add AWS integration (must be first)
    NestConfigAwsIntegrationModule.forRoot({
      secretsManagerConfig: {
        enabled: true, // Enable AWS Secrets Manager
      },
      precedence: 'aws-first', // AWS values override local values
    }),
    
    // Step 2: Add standard @nestjs/config (must be after integration)
    ConfigModule.forRoot({
      isGlobal: true,
    }),
  ],
})
export class BasicIntegrationModule {}

// ============================================================================
// USAGE IN SERVICES
// ============================================================================

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config'; // Standard @nestjs/config import

/**
 * Service demonstrating how to use configuration after integration.
 * No changes needed from standard @nestjs/config usage!
 */
@Injectable()
export class BasicIntegrationService {
  constructor(
    private readonly configService: ConfigService, // Standard ConfigService
  ) {}

  /**
   * Get configuration values - these can now come from AWS sources
   * but the usage pattern is identical to standard @nestjs/config.
   */
  getExampleConfig() {
    return {
      // These values can come from environment variables OR AWS sources
      port: this.configService.get<number>('PORT', 3000),
      databaseUrl: this.configService.get<string>('DATABASE_URL'),
      apiKey: this.configService.get<string>('API_KEY'), // Likely from AWS Secrets Manager
      
      // Standard @nestjs/config patterns work unchanged
      nodeEnv: this.configService.get('NODE_ENV', 'development'),
      debugMode: this.configService.get<boolean>('DEBUG_MODE', false),
    };
  }

  /**
   * Check if sensitive configuration is available.
   * Useful for health checks and startup validation.
   */
  validateConfiguration(): { isValid: boolean; missing: string[] } {
    const requiredKeys = ['DATABASE_URL', 'API_KEY'];
    const missing: string[] = [];

    for (const key of requiredKeys) {
      const value = this.configService.get(key);
      if (!value) {
        missing.push(key);
      }
    }

    return {
      isValid: missing.length === 0,
      missing,
    };
  }
}

// ============================================================================
// ENVIRONMENT-AWARE SETUP
// ============================================================================

/**
 * More advanced setup that adapts to different environments.
 * This shows how to enable AWS integration only in certain environments.
 */
@Module({
  imports: [
    NestConfigAwsIntegrationModule.forRoot({
      secretsManagerConfig: {
        // Only use AWS in non-local environments
        enabled: process.env.APP_ENV !== 'local',
        paths: {
          development: '/myapp/dev/secrets',
          test: '/myapp/test/secrets',
          production: '/myapp/prod/secrets',
        },
      },
      ssmConfig: {
        enabled: process.env.APP_ENV !== 'local',
        paths: {
          development: '/myapp/dev/config/',
          test: '/myapp/test/config/',
          production: '/myapp/prod/config/',
        },
      },
      // Use local values in development, AWS values in production
      precedence: process.env.NODE_ENV === 'production' ? 'aws-first' : 'local-first',
      
      // Enable detailed logging in development
      enableLogging: process.env.NODE_ENV === 'development',
      
      // Don't fail if AWS is unavailable (graceful degradation)
      failOnAwsError: false,
      fallbackToLocal: true,
    }),
    
    ConfigModule.forRoot({
      isGlobal: true,
      // Standard @nestjs/config options work normally
      cache: true,
      expandVariables: true,
    }),
  ],
})
export class EnvironmentAwareIntegrationModule {}

// ============================================================================
// ASYNC INTEGRATION SETUP
// ============================================================================

/**
 * Async integration setup for when you need to load configuration
 * dynamically or depend on other services.
 */
@Module({
  imports: [
    NestConfigAwsIntegrationModule.forRootAsync({
      useFactory: async () => {
        // You can load configuration dynamically here
        // For example, from a database, external API, etc.
        
        const isDevelopment = process.env.NODE_ENV === 'development';
        const region = process.env.AWS_REGION || 'us-east-1';
        
        return {
          secretsManagerConfig: {
            enabled: !isDevelopment,
            region,
            paths: {
              production: `/myapp/${process.env.DEPLOYMENT_STAGE || 'prod'}/secrets`,
            },
          },
          precedence: 'aws-first',
          enableLogging: isDevelopment,
        };
      },
    }),
    
    ConfigModule.forRootAsync({
      useFactory: async () => ({
        isGlobal: true,
        cache: true,
      }),
    }),
  ],
})
export class AsyncIntegrationModule {}

// ============================================================================
// MIGRATION HELPERS
// ============================================================================

/**
 * Helper functions for migrating from different configuration setups.
 */
export class IntegrationMigrationHelpers {
  /**
   * Validate that all expected configuration is available after migration.
   * Useful for ensuring migration was successful.
   */
  static validateMigration(configService: ConfigService, expectedKeys: string[]): void {
    const missing: string[] = [];
    
    for (const key of expectedKeys) {
      const value = configService.get(key);
      if (value === undefined || value === null) {
        missing.push(key);
      }
    }
    
    if (missing.length > 0) {
      throw new Error(`Migration validation failed. Missing configuration keys: ${missing.join(', ')}`);
    }
    
    console.log('✅ Migration validation passed. All expected configuration keys are available.');
  }

  /**
   * Compare configuration values before and after migration.
   * Useful for ensuring values are loaded correctly from new sources.
   */
  static compareConfiguration(
    configService: ConfigService,
    expectedValues: Record<string, any>,
  ): { matches: string[]; differences: Array<{ key: string; expected: any; actual: any }> } {
    const matches: string[] = [];
    const differences: Array<{ key: string; expected: any; actual: any }> = [];
    
    for (const [key, expectedValue] of Object.entries(expectedValues)) {
      const actualValue = configService.get(key);
      
      if (actualValue === expectedValue) {
        matches.push(key);
      } else {
        differences.push({
          key,
          expected: expectedValue,
          actual: actualValue,
        });
      }
    }
    
    return { matches, differences };
  }
}

// ============================================================================
// USAGE EXAMPLES
// ============================================================================

/**
 * Example showing how to use the basic integration in a real application.
 */
export function createBasicIntegrationExample() {
  return {
    // Module setup
    module: BasicIntegrationModule,
    
    // Service usage
    service: BasicIntegrationService,
    
    // Environment variables needed
    environmentVariables: {
      // Local fallbacks
      PORT: '3000',
      NODE_ENV: 'development',
      
      // These can come from AWS Secrets Manager
      DATABASE_URL: 'postgresql://localhost:5432/myapp',
      API_KEY: 'local-api-key-for-development',
      
      // AWS configuration (optional for local development)
      AWS_REGION: 'us-east-1',
      APP_ENV: 'development', // or 'local' to disable AWS
    },
    
    // AWS resources needed (optional)
    awsResources: {
      secretsManager: {
        '/myapp/dev/secrets': {
          DATABASE_URL: 'postgresql://prod-db:5432/myapp',
          API_KEY: 'prod-api-key-from-aws',
        },
      },
      ssmParameterStore: {
        '/myapp/dev/config/PORT': '8080',
        '/myapp/dev/config/DEBUG_MODE': 'true',
      },
    },
    
    // Expected behavior
    behavior: {
      local: 'Uses environment variables and .env file only',
      development: 'Uses environment variables + AWS sources (AWS takes precedence)',
      production: 'Uses AWS sources with environment variable fallbacks',
    },
  };
}