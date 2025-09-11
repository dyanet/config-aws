import { Test, TestingModule } from '@nestjs/testing';
import { ConfigurationFactoryProviderImpl } from '../../../src/integration/providers/configuration-factory.provider';
import { PrecedenceHandlerService } from '../../../src/integration/services/precedence-handler.service';
import { ConfigurationSource } from '../../../src/integration/interfaces/configuration-source.interface';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';

describe('ConfigurationFactoryProviderImpl', () => {
  let provider: ConfigurationFactoryProviderImpl;
  let precedenceHandler: PrecedenceHandlerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConfigurationFactoryProviderImpl,
        PrecedenceHandlerService,
      ],
    }).compile();

    provider = module.get<ConfigurationFactoryProviderImpl>(ConfigurationFactoryProviderImpl);
    precedenceHandler = module.get<PrecedenceHandlerService>(PrecedenceHandlerService);
  });

  it('should be defined', () => {
    expect(provider).toBeDefined();
  });

  describe('createFactory', () => {
    it('should create a basic configuration factory', () => {
      const config = { key: 'value', nested: { prop: 'test' } };
      const factory = provider.createFactory('', config);
      
      expect(typeof factory).toBe('function');
      const result = factory();
      expect((result as any).key).toBe('value');
      expect((result as any).nested.prop).toBe('test');
    });

    it('should create a namespaced configuration factory', () => {
      const config = { database: { host: 'localhost' } };
      const factory = provider.createFactory('database', config);
      
      expect(typeof factory).toBe('function');
      // The factory should be wrapped with registerAs for namespacing
      expect((factory as any).KEY).toBe('CONFIGURATION(database)');
    });

    it('should process configuration values correctly', () => {
      const config = {
        stringNumber: '123',
        stringFloat: '45.67',
        stringBoolean: 'true',
        stringFalse: 'false',
        jsonString: '{"nested": "value"}',
        arrayString: '[1, 2, 3]',
        regularString: 'just a string'
      };
      
      const factory = provider.createFactory('', config);
      const result = factory();
      
      expect((result as any).stringNumber).toBe(123);
      expect((result as any).stringFloat).toBe(45.67);
      expect((result as any).stringBoolean).toBe(true);
      expect((result as any).stringFalse).toBe(false);
      expect((result as any).jsonString).toEqual({ nested: 'value' });
      expect((result as any).arrayString).toEqual([1, 2, 3]);
      expect((result as any).regularString).toBe('just a string');
    });
  });

  describe('createNamespacedFactories', () => {
    it('should create multiple namespaced factories', () => {
      const config = {
        database: { host: 'localhost', port: 5432 },
        redis: { host: 'redis-host', port: 6379 },
        app: { name: 'test-app', version: '1.0.0' }
      };

      const factories = provider.createNamespacedFactories(config);
      
      expect(factories).toHaveLength(3);
      
      // Check that each factory is properly namespaced
      const factoryKeys = factories.map(f => (f as any).KEY).sort();
      expect(factoryKeys).toEqual(['CONFIGURATION(app)', 'CONFIGURATION(database)', 'CONFIGURATION(redis)']);
    });

    it('should skip invalid namespace configurations', () => {
      const config = {
        validNamespace: { key: 'value' },
        nullNamespace: null,
        arrayNamespace: [1, 2, 3],
        stringNamespace: 'not an object',
        emptyNamespace: ''
      };

      const factories = provider.createNamespacedFactories(config);
      
      expect(factories).toHaveLength(1);
      expect((factories[0] as any).KEY).toBe('CONFIGURATION(validNamespace)');
    });
  });

  describe('mergeWithExisting', () => {
    it('should merge AWS and local configuration using precedence handler', () => {
      const awsConfig = { key1: 'aws-value', shared: 'aws-shared' };
      const localConfig = { key2: 'local-value', shared: 'local-shared' };

      jest.spyOn(precedenceHandler, 'applyPrecedenceRules').mockReturnValue({
        key1: 'aws-value',
        key2: 'local-value',
        shared: 'aws-shared'
      });

      const result = provider.mergeWithExisting(awsConfig, localConfig);

      expect(precedenceHandler.applyPrecedenceRules).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'local-config',
            type: 'local-file',
            data: localConfig
          }),
          expect.objectContaining({
            name: 'aws-config',
            type: 'secrets-manager',
            data: awsConfig
          })
        ]),
        'aws-first'
      );

      expect(result).toEqual({
        key1: 'aws-value',
        key2: 'local-value',
        shared: 'aws-shared'
      });
    });
  });

  describe('createAwsConfigurationFactory', () => {
    it('should create enhanced AWS configuration factory with metadata', () => {
      const config = { key: 'value' };
      const sources: ConfigurationSource[] = [
        {
          name: 'test-source',
          type: 'secrets-manager',
          priority: 1,
          data: config,
          loadedAt: new Date()
        }
      ];

      const factory = provider.createAwsConfigurationFactory(
        'test-namespace',
        config,
        sources,
        'aws-first'
      );

      expect(factory.namespace).toBe('test-namespace');
      expect(factory.sources).toBe(sources);
      expect(factory.precedenceRule).toBe('aws-first');
      expect(typeof factory).toBe('function');
    });
  });

  describe('createFactoriesFromSources', () => {
    it('should create factories from source map without namespaces', () => {
      const sourceConfigs = new Map([
        ['source1', { key1: 'value1' }],
        ['source2', { key2: 'value2' }]
      ]);

      const factories = provider.createFactoriesFromSources(sourceConfigs);
      
      expect(factories).toHaveLength(1);
      const result = factories[0]!();
      expect((result as any).key1).toBe('value1');
      expect((result as any).key2).toBe('value2');
    });

    it('should create namespaced factories from source map', () => {
      const sourceConfigs = new Map([
        ['source1', { 
          database: { host: 'localhost' },
          redis: { host: 'redis-host' }
        }],
        ['source2', { 
          database: { port: 5432 },
          app: { name: 'test-app' }
        }]
      ]);

      const factories = provider.createFactoriesFromSources(sourceConfigs, ['database', 'redis', 'app']);
      
      expect(factories).toHaveLength(3);
      
      const factoryKeys = factories.map(f => (f as any).KEY).sort();
      expect(factoryKeys).toEqual(['CONFIGURATION(app)', 'CONFIGURATION(database)', 'CONFIGURATION(redis)']);
    });
  });

  describe('createFactoriesWithPrecedence', () => {
    it('should create factories with precedence rules', () => {
      const sources: ConfigurationSource[] = [
        {
          name: 'local-source',
          type: 'local-file',
          priority: 1,
          data: { key: 'local-value' },
          loadedAt: new Date()
        },
        {
          name: 'aws-source',
          type: 'secrets-manager',
          priority: 2,
          data: { key: 'aws-value' },
          loadedAt: new Date()
        }
      ];

      jest.spyOn(precedenceHandler, 'validateSources').mockReturnValue({ valid: true, issues: [] });
      jest.spyOn(precedenceHandler, 'applyPrecedenceRules').mockReturnValue({ key: 'aws-value' });

      const factories = provider.createFactoriesWithPrecedence(sources, 'aws-first');
      
      expect(factories).toHaveLength(1);
      expect(precedenceHandler.validateSources).toHaveBeenCalledWith(sources);
      expect(precedenceHandler.applyPrecedenceRules).toHaveBeenCalledWith(sources, 'aws-first');
    });

    it('should throw error for invalid sources', () => {
      const sources: ConfigurationSource[] = [
        {
          name: '',
          type: 'environment',
          priority: 1,
          data: {},
          loadedAt: new Date()
        }
      ];

      jest.spyOn(precedenceHandler, 'validateSources').mockReturnValue({
        valid: false,
        issues: ['Source must have a valid name']
      });

      expect(() => {
        provider.createFactoriesWithPrecedence(sources, 'aws-first');
      }).toThrow('Invalid configuration sources: Source must have a valid name');
    });

    it('should create namespaced factories with precedence', () => {
      const sources: ConfigurationSource[] = [
        {
          name: 'source1',
          type: 'local-file',
          priority: 1,
          data: { database: { host: 'localhost' } },
          loadedAt: new Date()
        },
        {
          name: 'source2',
          type: 'secrets-manager',
          priority: 2,
          data: { database: { password: 'secret' } },
          loadedAt: new Date()
        }
      ];

      jest.spyOn(precedenceHandler, 'validateSources').mockReturnValue({ valid: true, issues: [] });
      jest.spyOn(precedenceHandler, 'applyPrecedenceRules').mockReturnValue({
        host: 'localhost',
        password: 'secret'
      });

      const factories = provider.createFactoriesWithPrecedence(sources, 'aws-first', ['database']);
      
      expect(factories).toHaveLength(1);
      expect((factories[0] as any).namespace).toBe('database');
    });
  });

  describe('mergeWithPrecedence', () => {
    it('should merge sources with precedence rules', () => {
      const sources: ConfigurationSource[] = [
        {
          name: 'source1',
          type: 'local-file',
          priority: 1,
          data: { key: 'local-value' },
          loadedAt: new Date()
        }
      ];

      jest.spyOn(precedenceHandler, 'validateSources').mockReturnValue({ valid: true, issues: [] });
      jest.spyOn(precedenceHandler, 'applyPrecedenceRules').mockReturnValue({ key: 'merged-value' });

      const result = provider.mergeWithPrecedence(sources, 'merge');
      
      expect(result).toEqual({ key: 'merged-value' });
      expect(precedenceHandler.validateSources).toHaveBeenCalledWith(sources);
      expect(precedenceHandler.applyPrecedenceRules).toHaveBeenCalledWith(sources, 'merge');
    });

    it('should throw error for invalid sources', () => {
      const sources: ConfigurationSource[] = [];

      jest.spyOn(precedenceHandler, 'validateSources').mockReturnValue({
        valid: false,
        issues: ['No sources provided']
      });

      expect(() => {
        provider.mergeWithPrecedence(sources, 'merge');
      }).toThrow('Invalid configuration sources: No sources provided');
    });
  });
});