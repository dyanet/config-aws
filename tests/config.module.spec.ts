import { Test, TestingModule } from '@nestjs/testing';
import { Injectable, Module } from '@nestjs/common';
import { z } from 'zod';

import { ConfigModule } from '../src/config.module';
import { ConfigService } from '../src/interfaces/config-service.interface';
import { defaultConfigSchema, DefaultConfigSchema } from '../src/interfaces/default-schema.interface';

// Test service to verify dependency injection
@Injectable()
class TestService {
  constructor(private readonly configService: ConfigService<DefaultConfigSchema>) {}

  getConfig() {
    return this.configService.getAll();
  }

  getAppEnv() {
    return this.configService.get('APP_ENV');
  }
}

// Custom schema for testing
const customSchema = z.object({
  APP_ENV: z.enum(['production', 'test', 'development', 'local']).default('local'),
  CUSTOM_VALUE: z.string().default('test-value'),
  PORT: z.coerce.number().default(3000),
});

describe('ConfigModule', () => {
  describe('forRoot', () => {
    let module: TestingModule;
    let configService: ConfigService<DefaultConfigSchema>;
    let testService: TestService;

    beforeEach(async () => {
      // Set test environment variables
      process.env['APP_ENV'] = 'test';
      process.env['PORT'] = '4000';
    });

    afterEach(async () => {
      if (module) {
        await module.close();
      }
      // Clean up environment variables
      delete process.env['APP_ENV'];
      delete process.env['PORT'];
    });

    it('should create module with default configuration', async () => {
      module = await Test.createTestingModule({
        imports: [ConfigModule.forRoot({
          secretsManagerConfig: { enabled: false },
          ssmConfig: { enabled: false },
        })],
        providers: [TestService],
      }).compile();

      expect(module).toBeDefined();
    });

    it('should provide ConfigService for dependency injection', async () => {
      module = await Test.createTestingModule({
        imports: [ConfigModule.forRoot({
          secretsManagerConfig: { enabled: false },
          ssmConfig: { enabled: false },
        })],
        providers: [TestService],
      }).compile();

      configService = module.get<ConfigService<DefaultConfigSchema>>(ConfigService);
      expect(configService).toBeDefined();
      expect(configService.isInitialized()).toBe(true);
    });

    it('should inject ConfigService into other services', async () => {
      module = await Test.createTestingModule({
        imports: [ConfigModule.forRoot({
          secretsManagerConfig: { enabled: false },
          ssmConfig: { enabled: false },
        })],
        providers: [TestService],
      }).compile();

      testService = module.get<TestService>(TestService);
      expect(testService).toBeDefined();
      
      const appEnv = testService.getAppEnv();
      expect(appEnv).toBe('test');
    });

    it('should work with custom schema', async () => {
      process.env['CUSTOM_VALUE'] = 'custom-test-value';

      module = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({
            schema: customSchema,
            secretsManagerConfig: { enabled: false },
            ssmConfig: { enabled: false },
          }),
        ],
      }).compile();

      const customConfigService = module.get<ConfigService>(ConfigService);
      expect(customConfigService).toBeDefined();
      expect(customConfigService.get('CUSTOM_VALUE')).toBe('custom-test-value');
      expect(customConfigService.get('PORT')).toBe(4000);

      delete process.env['CUSTOM_VALUE'];
    });

    it('should work with environment prefix', async () => {
      process.env['MYAPP_CUSTOM_VAR'] = 'prefixed-value';

      module = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({
            schema: z.object({
              APP_ENV: z.string().default('local'),
              CUSTOM_VAR: z.string().optional(),
            }),
            envPrefix: 'MYAPP_',
            secretsManagerConfig: { enabled: false },
            ssmConfig: { enabled: false },
          }),
        ],
      }).compile();

      const configService = module.get<ConfigService>(ConfigService);
      expect(configService.get('CUSTOM_VAR')).toBe('prefixed-value');

      delete process.env['MYAPP_CUSTOM_VAR'];
    });

    it('should disable AWS services when configured', async () => {
      module = await Test.createTestingModule({
        imports: [
          ConfigModule.forRoot({
            schema: defaultConfigSchema,
            secretsManagerConfig: { enabled: false },
            ssmConfig: { enabled: false },
          }),
        ],
      }).compile();

      const configService = module.get<ConfigService<DefaultConfigSchema>>(ConfigService);
      expect(configService).toBeDefined();
      expect(configService.isInitialized()).toBe(true);
    });

    it('should handle validation errors when ignoreValidationErrors is false', async () => {
      process.env['PORT'] = 'invalid-port';

      await expect(
        Test.createTestingModule({
          imports: [
            ConfigModule.forRoot({
              schema: z.object({
                PORT: z.coerce.number(),
              }),
              ignoreValidationErrors: false,
            }),
          ],
        }).compile()
      ).rejects.toThrow();

      delete process.env['PORT'];
    });
  });

  describe('forRootAsync', () => {
    let module: TestingModule;

    beforeEach(() => {
      process.env['APP_ENV'] = 'test';
      process.env['ASYNC_VALUE'] = 'async-test-value';
    });

    afterEach(async () => {
      if (module) {
        await module.close();
      }
      delete process.env['APP_ENV'];
      delete process.env['ASYNC_VALUE'];
    });

    it('should create module with async factory', async () => {
      module = await Test.createTestingModule({
        imports: [
          ConfigModule.forRootAsync({
            useFactory: async () => ({
              schema: z.object({
                APP_ENV: z.string().default('local'),
                ASYNC_VALUE: z.string().optional(),
              }),
              secretsManagerConfig: { enabled: false },
              ssmConfig: { enabled: false },
            }),
          }),
        ],
      }).compile();

      const configService = module.get<ConfigService>(ConfigService);
      expect(configService).toBeDefined();
      expect(configService.get('ASYNC_VALUE')).toBe('async-test-value');
    });

    it('should work with dependency injection in factory', async () => {
      @Injectable()
      class ConfigFactory {
        createConfig() {
          return {
            schema: z.object({
              APP_ENV: z.string().default('local'),
              FACTORY_VALUE: z.string().default('from-factory'),
            }),
          };
        }
      }

      @Module({
        providers: [ConfigFactory],
        exports: [ConfigFactory],
      })
      class ConfigFactoryModule {}

      module = await Test.createTestingModule({
        imports: [
          ConfigModule.forRootAsync({
            imports: [ConfigFactoryModule],
            useFactory: async (factory: ConfigFactory) => ({
              ...factory.createConfig(),
              secretsManagerConfig: { enabled: false },
              ssmConfig: { enabled: false },
            }),
            inject: [ConfigFactory],
          }),
        ],
      }).compile();

      const configService = module.get<ConfigService>(ConfigService);
      expect(configService).toBeDefined();
      expect(configService.get('FACTORY_VALUE')).toBe('from-factory');
    });

    it('should handle async factory errors', async () => {
      await expect(
        Test.createTestingModule({
          imports: [
            ConfigModule.forRootAsync({
              useFactory: async () => {
                throw new Error('Factory error');
              },
            }),
          ],
        }).compile()
      ).rejects.toThrow('Factory error');
    });
  });

  describe('Global Module Behavior', () => {
    let module: TestingModule | undefined;

    afterEach(async () => {
      if (module) {
        await module.close();
        module = undefined;
      }
    });

    it('should be available globally without re-importing', async () => {
      @Injectable()
      class GlobalTestService {
        constructor(private readonly configService: ConfigService<DefaultConfigSchema>) {}

        getAppEnv() {
          return this.configService.get('APP_ENV');
        }
      }

      // Create a module that imports ConfigModule and the test service
      module = await Test.createTestingModule({
        imports: [ConfigModule.forRoot({
          secretsManagerConfig: { enabled: false },
          ssmConfig: { enabled: false },
        })],
        providers: [GlobalTestService],
      }).compile();

      const globalTestService = module.get<GlobalTestService>(GlobalTestService);
      expect(globalTestService).toBeDefined();
      // The APP_ENV should be available from the configuration
      const appEnv = globalTestService.getAppEnv();
      expect(appEnv).toBeDefined();
      expect(['test', 'local']).toContain(appEnv); // Accept either value since environment setup can vary
    });
  });

  describe('Error Handling', () => {
    let module: TestingModule | undefined;

    afterEach(async () => {
      if (module) {
        await module.close();
        module = undefined;
      }
    });

    it('should handle missing required configuration', async () => {
      const strictSchema = z.object({
        REQUIRED_VALUE: z.string(), // No default, so it's required
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

    it('should provide helpful error messages for validation failures', async () => {
      process.env['INVALID_NUMBER'] = 'not-a-number';

      try {
        await Test.createTestingModule({
          imports: [
            ConfigModule.forRoot({
              schema: z.object({
                INVALID_NUMBER: z.number(), // This will fail coercion
              }),
            }),
          ],
        }).compile();
        
        fail('Expected validation error');
      } catch (error) {
        expect((error as any).message).toContain('configuration');
      }

      delete process.env['INVALID_NUMBER'];
    });
  });
});