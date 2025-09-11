import { Test, TestingModule } from '@nestjs/testing';
import { PrecedenceHandlerService } from '../../../src/integration/services/precedence-handler.service';
import { ConfigurationSource } from '../../../src/integration/interfaces/configuration-source.interface';

describe('PrecedenceHandlerService', () => {
  let service: PrecedenceHandlerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PrecedenceHandlerService],
    }).compile();

    service = module.get<PrecedenceHandlerService>(PrecedenceHandlerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('applyPrecedenceRules', () => {
    const createSource = (
      name: string,
      type: 'environment' | 'secrets-manager' | 'ssm' | 'local-file',
      data: Record<string, any>,
      priority = 1
    ): ConfigurationSource => ({
      name,
      type,
      priority,
      data,
      loadedAt: new Date(),
    });

    it('should return empty object for empty sources', () => {
      const result = service.applyPrecedenceRules([], 'aws-first');
      expect(result).toEqual({});
    });

    it('should return single source data for single source', () => {
      const source = createSource('test', 'environment', { key: 'value' });
      const result = service.applyPrecedenceRules([source], 'aws-first');
      expect(result).toEqual({ key: 'value' });
    });

    describe('aws-first precedence', () => {
      it('should prioritize AWS Secrets Manager over local files', () => {
        const sources = [
          createSource('local', 'local-file', { key: 'local-value', local: true }),
          createSource('secrets', 'secrets-manager', { key: 'aws-value', aws: true }),
        ];

        const result = service.applyPrecedenceRules(sources, 'aws-first');
        
        expect(result['key']).toBe('aws-value');
        expect(result['aws']).toBe(true);
        expect(result['local']).toBe(true);
      });

      it('should prioritize SSM over environment variables', () => {
        const sources = [
          createSource('env', 'environment', { key: 'env-value', env: true }),
          createSource('ssm', 'ssm', { key: 'ssm-value', ssm: true }),
        ];

        const result = service.applyPrecedenceRules(sources, 'aws-first');
        
        expect(result['key']).toBe('ssm-value');
        expect(result['ssm']).toBe(true);
        expect(result['env']).toBe(true);
      });

      it('should handle complex nested objects', () => {
        const sources = [
          createSource('local', 'local-file', {
            database: { host: 'localhost', port: 5432 },
            app: { name: 'local-app' }
          }),
          createSource('secrets', 'secrets-manager', {
            database: { password: 'secret-password' },
            app: { version: '1.0.0' }
          }),
        ];

        const result = service.applyPrecedenceRules(sources, 'aws-first');
        
        expect(result['database']['host']).toBe('localhost');
        expect(result['database']['port']).toBe(5432);
        expect(result['database']['password']).toBe('secret-password');
        expect(result['app']['name']).toBe('local-app');
        expect(result['app']['version']).toBe('1.0.0');
      });
    });

    describe('local-first precedence', () => {
      it('should prioritize local files over AWS Secrets Manager', () => {
        const sources = [
          createSource('secrets', 'secrets-manager', { key: 'aws-value', aws: true }),
          createSource('local', 'local-file', { key: 'local-value', local: true }),
        ];

        const result = service.applyPrecedenceRules(sources, 'local-first');
        
        expect(result['key']).toBe('local-value');
        expect(result['local']).toBe(true);
        expect(result['aws']).toBe(true);
      });

      it('should prioritize environment variables over SSM', () => {
        const sources = [
          createSource('ssm', 'ssm', { key: 'ssm-value', ssm: true }),
          createSource('env', 'environment', { key: 'env-value', env: true }),
        ];

        const result = service.applyPrecedenceRules(sources, 'local-first');
        
        expect(result['key']).toBe('env-value');
        expect(result['env']).toBe(true);
        expect(result['ssm']).toBe(true);
      });
    });

    describe('merge precedence', () => {
      it('should merge all sources with balanced priority', () => {
        const sources = [
          createSource('local', 'local-file', { key1: 'local', shared: 'local-shared' }),
          createSource('env', 'environment', { key2: 'env', shared: 'env-shared' }),
          createSource('ssm', 'ssm', { key3: 'ssm', shared: 'ssm-shared' }),
          createSource('secrets', 'secrets-manager', { key4: 'secrets', shared: 'secrets-shared' }),
        ];

        const result = service.applyPrecedenceRules(sources, 'merge');
        
        expect(result['key1']).toBe('local');
        expect(result['key2']).toBe('env');
        expect(result['key3']).toBe('ssm');
        expect(result['key4']).toBe('secrets');
        expect(result['shared']).toBe('secrets-shared'); // Last in merge order wins
      });
    });

    it('should handle unknown precedence rule by defaulting to aws-first', () => {
      const sources = [
        createSource('local', 'local-file', { key: 'local-value' }),
        createSource('secrets', 'secrets-manager', { key: 'aws-value' }),
      ];

      const result = service.applyPrecedenceRules(sources, 'unknown' as any);
      expect(result['key']).toBe('aws-value');
    });
  });

  describe('validateSources', () => {
    it('should validate correct sources', () => {
      const sources: ConfigurationSource[] = [
        {
          name: 'test-source',
          type: 'environment',
          priority: 1,
          data: { key: 'value' },
          loadedAt: new Date(),
        },
      ];

      const result = service.validateSources(sources);
      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should detect invalid sources array', () => {
      const result = service.validateSources(null as any);
      expect(result.valid).toBe(false);
      expect(result.issues).toContain('Sources must be an array');
    });

    it('should detect missing name', () => {
      const sources = [
        {
          name: '', // Invalid name
          type: 'environment',
          priority: 1,
          data: { key: 'value' },
          loadedAt: new Date(),
        },
      ] as any[];

      const result = service.validateSources(sources);
      expect(result.valid).toBe(false);
      expect(result.issues).toContain('Source at index 0 must have a valid name');
    });

    it('should detect invalid type', () => {
      const sources = [
        {
          name: 'test',
          type: 'invalid-type',
          priority: 1,
          data: { key: 'value' },
          loadedAt: new Date(),
        },
      ] as any[];

      const result = service.validateSources(sources);
      expect(result.valid).toBe(false);
      expect(result.issues).toContain('Source at index 0 must have a valid type');
    });

    it('should detect invalid priority', () => {
      const sources = [
        {
          name: 'test',
          type: 'environment',
          priority: 'invalid',
          data: { key: 'value' },
          loadedAt: new Date(),
        },
      ] as any[];

      const result = service.validateSources(sources);
      expect(result.valid).toBe(false);
      expect(result.issues).toContain('Source at index 0 must have a numeric priority');
    });

    it('should detect invalid data', () => {
      const sources = [
        {
          name: 'test',
          type: 'environment',
          priority: 1,
          data: null,
          loadedAt: new Date(),
        },
      ] as any[];

      const result = service.validateSources(sources);
      expect(result.valid).toBe(false);
      expect(result.issues).toContain('Source at index 0 must have valid data object');
    });

    it('should detect invalid loadedAt', () => {
      const sources = [
        {
          name: 'test',
          type: 'environment',
          priority: 1,
          data: { key: 'value' },
          loadedAt: 'invalid-date',
        },
      ] as any[];

      const result = service.validateSources(sources);
      expect(result.valid).toBe(false);
      expect(result.issues).toContain('Source at index 0 must have a valid loadedAt date');
    });
  });

  describe('getEffectivePriority', () => {
    const createSource = (type: 'environment' | 'secrets-manager' | 'ssm' | 'local-file', priority = 100): ConfigurationSource => ({
      name: 'test',
      type,
      priority,
      data: {},
      loadedAt: new Date(),
    });

    it('should boost AWS sources for aws-first precedence', () => {
      const secretsSource = createSource('secrets-manager', 100);
      const ssmSource = createSource('ssm', 100);
      const envSource = createSource('environment', 100);

      expect(service.getEffectivePriority(secretsSource, 'aws-first')).toBe(1100);
      expect(service.getEffectivePriority(ssmSource, 'aws-first')).toBe(600);
      expect(service.getEffectivePriority(envSource, 'aws-first')).toBe(100);
    });

    it('should boost local sources for local-first precedence', () => {
      const localSource = createSource('local-file', 100);
      const envSource = createSource('environment', 100);
      const secretsSource = createSource('secrets-manager', 100);

      expect(service.getEffectivePriority(localSource, 'local-first')).toBe(1100);
      expect(service.getEffectivePriority(envSource, 'local-first')).toBe(600);
      expect(service.getEffectivePriority(secretsSource, 'local-first')).toBe(100);
    });

    it('should not modify priority for merge precedence', () => {
      const source = createSource('environment', 100);
      expect(service.getEffectivePriority(source, 'merge')).toBe(100);
    });
  });
});