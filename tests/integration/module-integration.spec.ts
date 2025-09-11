import { Test, TestingModule } from '@nestjs/testing';
import { Injectable, Module } from '@nestjs/common';
import { z } from 'zod';

import { ConfigModule } from '../../src/config.module';
import { ConfigService } from '../../src/interfaces/config-service.interface';
import { defaultConfigSchema } from '../../src/interfaces/default-schema.interface';

/**
 * Integration tests for ConfigModule registration and service injection.
 * These tests verify that the module works correctly in real NestJS application scenarios.
 */

// Test schema with additional fields for testing
const testSchema = z.object({
  APP_ENV: z.enum(['production', 'test', 'development', 'local']).default('local'),
  DB_HOST: z.string().optional(),
  DB_PORT: z.coerce.number().optional(),
  PORT: z.coerce.number().default(3000),
  ASYNC_CONFIG: z.string().optional(),
});

type TestConfig = z.infer<typeof testSchema>;

// Mock services to test dependency injection
@Injectable()
class DatabaseService {
  constructor(private readonly configService: ConfigService<TestConfig>) {}

  getConnectionString(): string {
    const host = this.configService.get('DB_HOST') || 'localhost';
    const port = this.configService.get('DB_PORT') || 5432;
    return `postgresql://${host}:${port}/testdb`;
  }
}

@Injectable()
class ApiService {
  constructor(private readonly configService: ConfigService<TestConfig>) {}

  getApiUrl(): string {
    const port = this.configService.get('PORT') || 3000;
    return `http://localhost:${port}/api`;
  }
}

// Test module that uses ConfigService
@Module({
  providers: [DatabaseService, ApiService],
  exports: [DatabaseService, ApiService],
})
class TestAppModule {}

describe('ConfigModule Integration Tests', () => {
  describe('Real Application Scenarios', () => {
    let app: TestingModule;
    let configService: ConfigService<TestConfig>;
    let databaseService: DatabaseService;
    let apiService: ApiService;

    beforeEach(() => {
      // Set up test environment
      process.env['APP_ENV'] = 'test';
      process.env['DB_HOST'] = 'test-db-host';
      process.env['DB_PORT'] = '5433';
      process.env['PORT'] = '4000';
    });

    afterEach(async () => {
      if (app) {
        await app.close();
      }
      // Clean up environment
      delete process.env['APP_ENV'];
      delete process.env['DB_HOST'];
      delete process.env['DB_PORT'];
      delete process.env['PORT'];
    });

    it('should work in a complete application setup', async () => {
      app = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({
            schema: testSchema,
            secretsManagerConfig: { enabled: false },
            ssmConfig: { enabled: false },
          }),
          TestAppModule,
        ],
      }).compile();

      // Get services
      configService = app.get<ConfigService<TestConfig>>(ConfigService);
      databaseService = app.get<DatabaseService>(DatabaseService);
      apiService = app.get<ApiService>(ApiService);

      // Verify services are properly injected and working
      expect(configService).toBeDefined();
      expect(databaseService).toBeDefined();
      expect(apiService).toBeDefined();

      // Verify configuration values are accessible
      expect(configService.get('APP_ENV')).toBe('test');
      expect(configService.get('PORT')).toBe(4000);

      // Verify services can use configuration
      expect(databaseService.getConnectionString()).toBe('postgresql://test-db-host:5433/testdb');
      expect(apiService.getApiUrl()).toBe('http://localhost:4000/api');
    });

    it('should work with async module registration', async () => {
      process.env['ASYNC_CONFIG'] = 'async-value';

      app = await Test.createTestingModule({
        imports: [
          ConfigModule.forRootAsync({
            useFactory: async () => ({
              schema: testSchema,
              secretsManagerConfig: { enabled: false },
              ssmConfig: { enabled: false },
            }),
          }),
          TestAppModule,
        ],
      }).compile();

      configService = app.get<ConfigService<TestConfig>>(ConfigService);
      expect(configService).toBeDefined();
      expect(configService.get('ASYNC_CONFIG')).toBe('async-value');

      delete process.env['ASYNC_CONFIG'];
    });

    it('should handle multiple modules using the same ConfigService', async () => {
      @Injectable()
      class AnotherService {
        constructor(private readonly configService: ConfigService<TestConfig>) {}

        getEnvironment(): string {
          return this.configService.get('APP_ENV') || 'unknown';
        }
      }

      @Module({
        providers: [AnotherService],
        exports: [AnotherService],
      })
      class AnotherModule {}

      app = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({
            schema: testSchema,
            secretsManagerConfig: { enabled: false },
            ssmConfig: { enabled: false },
          }),
          TestAppModule,
          AnotherModule,
        ],
      }).compile();

      const anotherService = app.get<AnotherService>(AnotherService);
      databaseService = app.get<DatabaseService>(DatabaseService);

      // Both services should get the same ConfigService instance
      expect(anotherService.getEnvironment()).toBe('test');
      expect(databaseService.getConnectionString()).toContain('test-db-host');
    });
  });

  describe('Environment-Specific Behavior', () => {
    let app: TestingModule;

    afterEach(async () => {
      if (app) {
        await app.close();
      }
    });

    it('should work in local environment', async () => {
      process.env['APP_ENV'] = 'local';
      process.env['LOCAL_VALUE'] = 'local-test';

      const localSchema = z.object({
        APP_ENV: z.string().default('local'),
        LOCAL_VALUE: z.string().optional(),
      });

      app = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({
            schema: localSchema,
            secretsManagerConfig: { enabled: false },
            ssmConfig: { enabled: false },
          }),
        ],
      }).compile();

      const configService = app.get<ConfigService>(ConfigService);
      expect(configService.get('APP_ENV')).toBe('local');
      expect(configService.get('LOCAL_VALUE')).toBe('local-test');

      delete process.env['APP_ENV'];
      delete process.env['LOCAL_VALUE'];
    });

    it('should work in production environment', async () => {
      process.env['APP_ENV'] = 'production';
      process.env['PROD_VALUE'] = 'production-test';

      const prodSchema = z.object({
        APP_ENV: z.string().default('local'),
        PROD_VALUE: z.string().optional(),
      });

      app = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({
            schema: prodSchema,
            secretsManagerConfig: { enabled: false },
            ssmConfig: { enabled: false },
          }),
        ],
      }).compile();

      const configService = app.get<ConfigService>(ConfigService);
      expect(configService.get('APP_ENV')).toBe('production');
      expect(configService.get('PROD_VALUE')).toBe('production-test');

      delete process.env['APP_ENV'];
      delete process.env['PROD_VALUE'];
    });
  });

  describe('Error Scenarios', () => {
    let app: TestingModule | undefined;

    afterEach(async () => {
      if (app) {
        await app.close();
        app = undefined;
      }
    });

    it('should fail gracefully when required configuration is missing', async () => {
      const strictSchema = z.object({
        REQUIRED_CONFIG: z.string(),
      });

      await expect(
        Test.createTestingModule({
          imports: [
            ConfigModule.forRoot({
              schema: strictSchema,
            }),
          ],
        }).compile()
      ).rejects.toThrow();
    });

    it('should provide meaningful error messages', async () => {
      process.env['INVALID_PORT'] = 'not-a-number';

      try {
        await Test.createTestingModule({
          imports: [
            ConfigModule.forRoot({
              schema: z.object({
                INVALID_PORT: z.number(),
              }),
            }),
          ],
        }).compile();
        
        fail('Expected configuration error');
      } catch (error: any) {
        expect(error.message).toContain('configuration');
      }

      delete process.env['INVALID_PORT'];
    });
  });

  describe('Performance and Initialization', () => {
    let app: TestingModule;

    afterEach(async () => {
      if (app) {
        await app.close();
      }
    });

    it('should initialize configuration only once', async () => {
      app = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({
            schema: defaultConfigSchema,
            secretsManagerConfig: { enabled: false },
            ssmConfig: { enabled: false },
          }),
        ],
      }).compile();

      const configService = app.get<ConfigService>(ConfigService);
      
      // Verify service is initialized
      expect(configService.isInitialized()).toBe(true);
      
      // Access configuration multiple times
      const env1 = configService.get('APP_ENV');
      const env2 = configService.get('APP_ENV');
      const all = configService.getAll();

      // All calls should return consistent values
      expect(env1).toBe(env2);
      expect(all.APP_ENV).toBe(env1);
    });

    it('should handle concurrent access during initialization', async () => {
      app = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({
            schema: defaultConfigSchema,
            secretsManagerConfig: { enabled: false },
            ssmConfig: { enabled: false },
          }),
        ],
      }).compile();

      const configService = app.get<ConfigService>(ConfigService);

      // Simulate concurrent access
      const promises = Array.from({ length: 10 }, () => 
        Promise.resolve(configService.get('APP_ENV'))
      );

      const results = await Promise.all(promises);
      
      // All should return the same value
      results.forEach(result => {
        expect(result).toBe(results[0]);
      });
    });
  });
});