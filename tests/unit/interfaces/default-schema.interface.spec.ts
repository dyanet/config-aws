import {
  defaultConfigSchema,
  DefaultConfigSchema,
  environmentSchemas,
  getSchemaForEnvironment,
  appEnvSchema,
  AppEnv
} from '../../../src/interfaces/default-schema.interface';

describe('Default Schema Interface', () => {
  describe('defaultConfigSchema', () => {
    it('should validate valid configuration', () => {
      const validConfig = {
        NODE_ENV: 'development' as const,
        APP_ENV: 'local' as const,
        AWS_REGION: 'us-east-1',
        PORT: 3000,
        HOST: 'localhost',
        LOG_LEVEL: 'info' as const
      };

      const result = defaultConfigSchema.parse(validConfig);
      expect(result).toEqual(validConfig);
    });

    it('should apply default values', () => {
      const minimalConfig = {};
      const result = defaultConfigSchema.parse(minimalConfig);
      expect(result.APP_ENV).toBe('local');
    });

    it('should coerce PORT to number', () => {
      const config = { PORT: '3000' };
      const result = defaultConfigSchema.parse(config);
      expect(result.PORT).toBe(3000);
      expect(typeof result.PORT).toBe('number');
    });

    it('should validate enum values', () => {
      expect(() => {
        defaultConfigSchema.parse({ NODE_ENV: 'invalid' });
      }).toThrow();

      expect(() => {
        defaultConfigSchema.parse({ APP_ENV: 'invalid' });
      }).toThrow();

      expect(() => {
        defaultConfigSchema.parse({ LOG_LEVEL: 'invalid' });
      }).toThrow();
    });

    it('should validate URL format for optional URLs', () => {
      expect(() => {
        defaultConfigSchema.parse({ DATABASE_URL: 'not-a-url' });
      }).toThrow();

      const validConfig = { DATABASE_URL: 'postgresql://user:pass@localhost:5432/db' };
      const result = defaultConfigSchema.parse(validConfig);
      expect(result.DATABASE_URL).toBe(validConfig.DATABASE_URL);
    });
  });

  describe('environmentSchemas', () => {
    it('should have schemas for all environments', () => {
      expect(environmentSchemas.local).toBeDefined();
      expect(environmentSchemas.development).toBeDefined();
      expect(environmentSchemas.test).toBeDefined();
      expect(environmentSchemas.production).toBeDefined();
    });

    it('should require AWS_REGION in non-local environments', () => {
      const config = { APP_ENV: 'development' as const };

      // Should fail without AWS_REGION
      expect(() => {
        environmentSchemas.development.parse(config);
      }).toThrow();

      // Should pass with AWS_REGION
      const configWithRegion = { ...config, AWS_REGION: 'us-east-1' };
      const result = environmentSchemas.development.parse(configWithRegion);
      expect(result.AWS_REGION).toBe('us-east-1');
    });

    it('should allow optional AWS_REGION in local environment', () => {
      const config = { APP_ENV: 'local' as const };
      const result = environmentSchemas.local.parse(config);
      expect(result.APP_ENV).toBe('local');
    });

    it('should set default LOG_LEVEL in production', () => {
      const config = { APP_ENV: 'production' as const, AWS_REGION: 'us-east-1' };
      const result = environmentSchemas.production.parse(config);
      expect(result.LOG_LEVEL).toBe('info');
    });
  });

  describe('getSchemaForEnvironment', () => {
    it('should return correct schema for valid environments', () => {
      expect(getSchemaForEnvironment('local')).toBe(environmentSchemas.local);
      expect(getSchemaForEnvironment('development')).toBe(environmentSchemas.development);
      expect(getSchemaForEnvironment('test')).toBe(environmentSchemas.test);
      expect(getSchemaForEnvironment('production')).toBe(environmentSchemas.production);
    });

    it('should return default schema for invalid environments', () => {
      expect(getSchemaForEnvironment('invalid')).toBe(defaultConfigSchema);
    });
  });

  describe('appEnvSchema', () => {
    it('should validate valid APP_ENV values', () => {
      const validValues: AppEnv[] = ['local', 'development', 'test', 'production'];
      
      validValues.forEach(value => {
        expect(() => appEnvSchema.parse(value)).not.toThrow();
      });
    });

    it('should reject invalid APP_ENV values', () => {
      expect(() => appEnvSchema.parse('invalid')).toThrow();
    });
  });

  describe('TypeScript types', () => {
    it('should provide proper type inference', () => {
      // This test ensures TypeScript compilation works correctly
      const config: DefaultConfigSchema = {
        APP_ENV: 'local',
        NODE_ENV: 'development',
        AWS_REGION: 'us-east-1',
        PORT: 3000
      };

      expect(config.APP_ENV).toBe('local');
      expect(config.PORT).toBe(3000);
    });
  });
});