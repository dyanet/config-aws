import { Test, TestingModule } from '@nestjs/testing';
import { ValidationIntegrationService } from '../validation-integration.service';
import { ConfigurationSource } from '../../interfaces/configuration-source.interface';

// Mock Joi for testing
const mockJoi = {
  object: jest.fn().mockReturnThis(),
  string: jest.fn().mockReturnThis(),
  number: jest.fn().mockReturnThis(),
  boolean: jest.fn().mockReturnThis(),
  validate: jest.fn()
};

// Mock class-validator for testing
const mockClassValidator = {
  validateSync: jest.fn()
};

const mockClassTransformer = {
  plainToClass: jest.fn()
};

// Mock require function
jest.mock('joi', () => mockJoi, { virtual: true });
jest.mock('class-validator', () => mockClassValidator, { virtual: true });
jest.mock('class-transformer', () => mockClassTransformer, { virtual: true });

describe('ValidationIntegrationService', () => {
  let service: ValidationIntegrationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ValidationIntegrationService],
    }).compile();

    service = module.get<ValidationIntegrationService>(ValidationIntegrationService);

    // Reset mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createValidatedFactory', () => {
    it('should create a validated factory that passes validation', () => {
      const namespace = 'database';
      const config = { host: 'localhost', port: 5432 };
      const validationSchema = jest.fn().mockReturnValue([]);
      
      const factory = service.createValidatedFactory(
        namespace,
        config,
        validationSchema,
        'custom'
      );

      expect(factory).toBeDefined();
      expect(typeof factory).toBe('function');
      expect((factory as any).__isValidatedFactory).toBe(true);
      expect((factory as any).__validationType).toBe('custom');
      expect((factory as any).__namespace).toBe(namespace);

      // Test factory execution
      const result = factory();
      expect(result).toEqual(config);
    });

    it('should create a factory that throws on validation failure', () => {
      const namespace = 'database';
      const config = { host: 'localhost', port: 'invalid' };
      const validationSchema = jest.fn().mockReturnValue(['port must be a number']);
      
      const factory = service.createValidatedFactory(
        namespace,
        config,
        validationSchema,
        'custom'
      );

      expect(() => factory()).toThrow('Configuration validation failed');
    });

    it('should include source information in validation errors', () => {
      const namespace = 'database';
      const config = { host: 'localhost' };
      const validationSchema = jest.fn().mockReturnValue(['port is required']);
      const sources: ConfigurationSource[] = [
        {
          name: 'AWS Secrets Manager',
          type: 'secrets-manager',
          priority: 1,
          data: config,
          loadedAt: new Date()
        }
      ];
      
      const factory = service.createValidatedFactory(
        namespace,
        config,
        validationSchema,
        'custom',
        sources
      );

      expect(() => factory()).toThrow(/AWS Secrets Manager/);
    });
  });

  describe('validateConfiguration', () => {
    it('should validate configuration with custom validation function', () => {
      const config = { host: 'localhost', port: 5432 };
      const validationFn = jest.fn().mockReturnValue([]);

      const result = service.validateConfiguration(config, validationFn, 'custom');

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(validationFn).toHaveBeenCalledWith(config);
    });

    it('should handle custom validation errors', () => {
      const config = { host: 'localhost', port: 'invalid' };
      const validationFn = jest.fn().mockReturnValue(['port must be a number']);

      const result = service.validateConfiguration(config, validationFn, 'custom');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('port must be a number');
    });

    it('should handle validation function exceptions', () => {
      const config = { host: 'localhost' };
      const validationFn = jest.fn().mockImplementation(() => {
        throw new Error('Validation function error');
      });

      const result = service.validateConfiguration(config, validationFn, 'custom');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Validation function error');
    });

    it('should return error for unavailable validation provider', () => {
      const config = { host: 'localhost' };
      const schema = {};

      const result = service.validateConfiguration(config, schema, 'joi');

      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('not available');
    });
  });

  describe('createValidatedFactoryWithFallback', () => {
    it('should use primary config when validation passes', () => {
      const namespace = 'database';
      const config = { host: 'localhost', port: 5432 };
      const fallbackConfig = { host: 'fallback', port: 3306 };
      const validationSchema = jest.fn().mockReturnValue([]);
      
      const factory = service.createValidatedFactoryWithFallback(
        namespace,
        config,
        validationSchema,
        'custom',
        fallbackConfig
      );

      const result = factory();
      expect(result).toEqual(config);
      expect((factory as any).__hasFallback).toBe(true);
    });

    it('should use fallback config when primary validation fails', () => {
      const namespace = 'database';
      const config = { host: 'localhost', port: 'invalid' };
      const fallbackConfig = { host: 'fallback', port: 3306 };
      const validationSchema = jest.fn()
        .mockReturnValueOnce(['port must be a number']) // Primary fails
        .mockReturnValueOnce([]); // Fallback passes
      
      const factory = service.createValidatedFactoryWithFallback(
        namespace,
        config,
        validationSchema,
        'custom',
        fallbackConfig
      );

      const result = factory();
      expect(result).toEqual(fallbackConfig);
    });

    it('should throw when both primary and fallback fail validation', () => {
      const namespace = 'database';
      const config = { host: 'localhost', port: 'invalid' };
      const fallbackConfig = { host: 'fallback', port: 'also-invalid' };
      const validationSchema = jest.fn().mockReturnValue(['port must be a number']);
      
      const factory = service.createValidatedFactoryWithFallback(
        namespace,
        config,
        validationSchema,
        'custom',
        fallbackConfig
      );

      expect(() => factory()).toThrow('Both primary and fallback configuration validation failed');
    });
  });

  describe('validateNamespacedConfiguration', () => {
    it('should validate multiple namespace configurations', () => {
      const namespacedConfig = {
        database: { host: 'localhost', port: 5432 },
        redis: { url: 'redis://localhost', ttl: 3600 }
      };
      const validationSchemas = {
        database: jest.fn().mockReturnValue([]),
        redis: jest.fn().mockReturnValue(['ttl must be string'])
      };

      const results = service.validateNamespacedConfiguration(
        namespacedConfig,
        validationSchemas,
        'custom'
      );

      expect(results['database'].isValid).toBe(true);
      expect(results['redis'].isValid).toBe(false);
      expect(results['redis'].errors).toContain('ttl must be string');
    });

    it('should handle missing validation schemas', () => {
      const namespacedConfig = {
        database: { host: 'localhost' },
        cache: { ttl: 3600 }
      };
      const validationSchemas = {
        database: jest.fn().mockReturnValue([])
      };

      const results = service.validateNamespacedConfiguration(
        namespacedConfig,
        validationSchemas,
        'custom'
      );

      expect(results['database'].isValid).toBe(true);
      expect(results['cache'].isValid).toBe(true);
      expect(results['cache'].warnings).toContain('No validation schema provided for namespace: cache');
    });
  });

  describe('getAvailableValidationProviders', () => {
    it('should return availability status of validation providers', () => {
      const availability = service.getAvailableValidationProviders();

      expect(availability).toHaveProperty('joi');
      expect(availability).toHaveProperty('class-validator');
      expect(availability).toHaveProperty('custom');
      expect(availability['custom']).toBe(true); // Custom is always available
    });
  });

  describe('getValidationRecommendations', () => {
    it('should recommend validation provider based on config structure', () => {
      const simpleConfig = { host: 'localhost', port: 5432 };
      
      const recommendations = service.getValidationRecommendations(simpleConfig);

      expect(recommendations).toHaveProperty('recommendedProvider');
      expect(recommendations).toHaveProperty('reasons');
      expect(recommendations).toHaveProperty('examples');
      expect(recommendations.examples).toHaveProperty('custom');
    });

    it('should provide examples for recommended validation', () => {
      const config = { 
        host: 'localhost', 
        port: 5432,
        nested: { timeout: 30 },
        features: ['auth', 'logging']
      };
      
      const recommendations = service.getValidationRecommendations(config);

      expect(recommendations.examples['custom']).toContain('validateConfig');
      expect(recommendations.examples['custom']).toContain('const errors = []');
    });

    it('should detect complex nested structures', () => {
      const complexConfig = {
        database: {
          primary: { host: 'localhost', port: 5432 },
          replica: { host: 'replica', port: 5433 }
        },
        cache: {
          redis: { url: 'redis://localhost' }
        }
      };
      
      const recommendations = service.getValidationRecommendations(complexConfig);

      expect(recommendations.reasons.some(reason => 
        reason.includes('nested') || reason.includes('complex')
      )).toBe(true);
    });

    it('should detect typed values', () => {
      const typedConfig = {
        port: 5432,
        timeout: 30.5,
        enabled: true,
        retries: 3
      };
      
      const recommendations = service.getValidationRecommendations(typedConfig);

      expect(recommendations.reasons.some(reason => 
        reason.includes('type') || reason.includes('typed')
      )).toBe(true);
    });
  });
});