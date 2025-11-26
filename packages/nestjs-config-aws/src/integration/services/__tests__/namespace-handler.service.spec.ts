import { Test, TestingModule } from '@nestjs/testing';
import { NamespaceHandlerService } from '../namespace-handler.service';
import { ConfigurationSource } from '../../interfaces/configuration-source.interface';

describe('NamespaceHandlerService', () => {
  let service: NamespaceHandlerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NamespaceHandlerService],
    }).compile();

    service = module.get<NamespaceHandlerService>(NamespaceHandlerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createNamespaceFactory', () => {
    it('should create a registerAs factory for a namespace', () => {
      const namespace = 'database';
      const config = { host: 'localhost', port: 5432 };

      const factory = service.createNamespaceFactory(namespace, config);

      expect(factory).toBeDefined();
      expect(typeof factory).toBe('function');
      expect((factory as any).__namespace).toBe(namespace);
      expect((factory as any).__isAwsNamespaceFactory).toBe(true);
    });

    it('should throw error for invalid namespace', () => {
      const invalidNamespace = '';
      const config = { host: 'localhost' };

      expect(() => {
        service.createNamespaceFactory(invalidNamespace, config);
      }).toThrow('Invalid namespace');
    });

    it('should process configuration values correctly', () => {
      const namespace = 'app';
      const config = { 
        debug: 'true', 
        port: '3000',
        timeout: '30.5',
        features: '["auth", "logging"]'
      };

      const factory = service.createNamespaceFactory(namespace, config);
      const result = factory() as any;

      expect(result.debug).toBe(true);
      expect(result.port).toBe(3000);
      expect(result.timeout).toBe(30.5);
      expect(result.features).toEqual(['auth', 'logging']);
    });
  });

  describe('extractNamespaceConfig', () => {
    it('should extract config using direct namespace key', () => {
      const config = {
        database: { host: 'localhost', port: 5432 },
        app: { name: 'test-app' }
      };

      const result = service.extractNamespaceConfig(config, 'database');

      expect(result).toEqual({ host: 'localhost', port: 5432 });
    });

    it('should extract config using prefixed keys', () => {
      const config = {
        DATABASE_HOST: 'localhost',
        DATABASE_PORT: '5432',
        DATABASE_USER_NAME: 'admin',
        APP_NAME: 'test-app'
      };

      const result = service.extractNamespaceConfig(config, 'database');

      expect(result).toEqual({
        host: 'localhost',
        port: '5432',
        userName: 'admin'
      });
    });

    it('should extract config using path-based keys', () => {
      const config = {
        '/app/database/host': 'localhost',
        '/app/database/connection/timeout': '30',
        '/app/cache/redis/url': 'redis://localhost'
      };

      const result = service.extractNamespaceConfig(config, 'database');

      expect(result).toEqual({
        host: 'localhost',
        connection: { timeout: '30' }
      });
    });

    it('should combine multiple extraction strategies', () => {
      const config = {
        database: { ssl: true },
        DATABASE_HOST: 'localhost',
        '/app/database/port': '5432'
      };

      const result = service.extractNamespaceConfig(config, 'database');

      expect(result).toEqual({
        ssl: true,
        host: 'localhost',
        port: '5432'
      });
    });
  });

  describe('organizeConfigByNamespaces', () => {
    it('should organize flat config into namespaces', () => {
      const config = {
        DATABASE_HOST: 'localhost',
        DATABASE_PORT: '5432',
        REDIS_URL: 'redis://localhost',
        REDIS_TTL: '3600',
        APP_NAME: 'test-app'
      };
      const namespaces = ['database', 'redis'];

      const result = service.organizeConfigByNamespaces(config, namespaces);

      expect(result).toEqual({
        database: { host: 'localhost', port: '5432' },
        redis: { url: 'redis://localhost', ttl: '3600' },
        default: { APP_NAME: 'test-app' }
      });
    });

    it('should handle empty namespaces', () => {
      const config = { APP_NAME: 'test-app' };
      const namespaces: string[] = [];

      const result = service.organizeConfigByNamespaces(config, namespaces);

      expect(result).toEqual({
        default: { APP_NAME: 'test-app' }
      });
    });
  });

  describe('validateNamespaceAccess', () => {
    it('should validate valid namespace configuration', () => {
      const namespace = 'database';
      const config = { host: 'localhost', port: 5432 };

      const result = service.validateNamespaceAccess(namespace, config);

      expect(result.isValid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should detect invalid namespace name', () => {
      const namespace = '123invalid';
      const config = { host: 'localhost' };

      const result = service.validateNamespaceAccess(namespace, config);

      expect(result.isValid).toBe(false);
      expect(result.issues).toContain('Invalid namespace name: 123invalid');
    });

    it('should detect reserved namespace names', () => {
      const namespace = 'config';
      const config = { host: 'localhost' };

      const result = service.validateNamespaceAccess(namespace, config);

      expect(result.isValid).toBe(false);
      expect(result.issues).toContain('Reserved namespace name: config');
    });

    it('should provide suggestions for issues', () => {
      const namespace = '';
      const config = {};

      const result = service.validateNamespaceAccess(namespace, config);

      expect(result.suggestions.length).toBeGreaterThan(0);
      expect(result.suggestions).toContain('Use alphanumeric characters and underscores only');
    });
  });

  describe('generateAccessPatterns', () => {
    it('should generate access patterns for a namespace', () => {
      const namespace = 'database';
      const config = { host: 'localhost', port: 5432 };

      const result = service.generateAccessPatterns(namespace, config);

      expect(result.namespace).toBe(namespace);
      expect(result.patterns.injection).toContain(namespace);
      expect(result.patterns.service).toContain(namespace);
      expect(result.patterns.direct).toContain(namespace);
      expect(result.examples.length).toBeGreaterThan(0);
    });

    it('should include usage examples', () => {
      const namespace = 'app';
      const config = { name: 'test-app', version: '1.0.0' };

      const result = service.generateAccessPatterns(namespace, config);

      expect(result.examples).toContain('// Inject the entire app configuration');
      expect(result.examples.some(example => example.includes('ConfigService'))).toBe(true);
    });
  });

  describe('createMultipleNamespaceFactories', () => {
    it('should create factories for multiple namespaces', () => {
      const namespacedConfig = {
        database: { host: 'localhost', port: 5432 },
        redis: { url: 'redis://localhost', ttl: 3600 }
      };

      const sources: ConfigurationSource[] = [
        {
          name: 'test-source',
          type: 'environment',
          priority: 1,
          data: namespacedConfig,
          loadedAt: new Date()
        }
      ];

      const factories = service.createMultipleNamespaceFactories(namespacedConfig, sources);

      expect(factories).toHaveLength(2);
      expect((factories[0] as any).__namespace).toBeDefined();
      expect((factories[1] as any).__namespace).toBeDefined();
    });

    it('should skip invalid namespace configurations', () => {
      const namespacedConfig: Record<string, Record<string, any>> = {
        database: { host: 'localhost' },
        empty: {}
      };

      const factories = service.createMultipleNamespaceFactories(namespacedConfig);

      expect(factories).toHaveLength(1); // Only 'database' should be valid
      expect((factories[0] as any).__namespace).toBe('database');
    });
  });
});