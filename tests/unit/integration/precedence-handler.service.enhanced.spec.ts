import { Test, TestingModule } from '@nestjs/testing';
import { PrecedenceHandlerService } from '../../../src/integration/services/precedence-handler.service';
import { ConfigurationSource } from '../../../src/integration/interfaces/configuration-source.interface';

describe('PrecedenceHandlerService - Enhanced Tests', () => {
  let service: PrecedenceHandlerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PrecedenceHandlerService],
    }).compile();

    service = module.get<PrecedenceHandlerService>(PrecedenceHandlerService);
  });

  describe('complex precedence scenarios', () => {
    it('should handle nested object merging with aws-first precedence', () => {
      // Arrange
      const sources: ConfigurationSource[] = [
        {
          name: 'local-config',
          type: 'local-file',
          priority: 1,
          data: {
            database: {
              host: 'localhost',
              port: 5432,
              ssl: { enabled: false, cert: 'local-cert' }
            },
            api: { version: 'v1' }
          },
          loadedAt: new Date()
        },
        {
          name: 'secrets-manager',
          type: 'secrets-manager',
          priority: 2,
          data: {
            database: {
              password: 'secret-password',
              ssl: { enabled: true }
            },
            api: { timeout: 5000 }
          },
          loadedAt: new Date()
        }
      ];

      // Act
      const result = service.applyPrecedenceRules(sources, 'aws-first');

      // Assert
      expect(result).toEqual({
        database: {
          host: 'localhost',
          port: 5432,
          password: 'secret-password',
          ssl: { enabled: true, cert: 'local-cert' }
        },
        api: { version: 'v1', timeout: 5000 }
      });
    });

    it('should handle array values correctly in precedence', () => {
      // Arrange
      const sources: ConfigurationSource[] = [
        {
          name: 'local-config',
          type: 'local-file',
          priority: 1,
          data: {
            servers: ['localhost:3000', 'localhost:3001'],
            features: ['auth', 'logging']
          },
          loadedAt: new Date()
        },
        {
          name: 'ssm-config',
          type: 'ssm',
          priority: 2,
          data: {
            servers: ['prod-server-1:3000', 'prod-server-2:3000'],
            features: ['auth', 'monitoring', 'metrics']
          },
          loadedAt: new Date()
        }
      ];

      // Act
      const result = service.applyPrecedenceRules(sources, 'aws-first');

      // Assert
      expect(result.servers).toEqual(['prod-server-1:3000', 'prod-server-2:3000']);
      expect(result.features).toEqual(['auth', 'monitoring', 'metrics']);
    });

    it('should handle null and undefined values in precedence', () => {
      // Arrange
      const sources: ConfigurationSource[] = [
        {
          name: 'local-config',
          type: 'local-file',
          priority: 1,
          data: {
            setting1: 'local-value',
            setting2: null,
            setting3: undefined,
            setting4: 'keep-this'
          },
          loadedAt: new Date()
        },
        {
          name: 'aws-config',
          type: 'secrets-manager',
          priority: 2,
          data: {
            setting1: null,
            setting2: 'aws-value',
            setting3: 'aws-value-3',
            setting5: 'new-setting'
          },
          loadedAt: new Date()
        }
      ];

      // Act
      const result = service.applyPrecedenceRules(sources, 'aws-first');

      // Assert
      expect(result.setting1).toBeNull();
      expect(result.setting2).toBe('aws-value');
      expect(result.setting3).toBe('aws-value-3');
      expect(result.setting4).toBe('keep-this');
      expect(result.setting5).toBe('new-setting');
    });
  });

  describe('local-first precedence', () => {
    it('should prioritize local sources over AWS sources', () => {
      // Arrange
      const sources: ConfigurationSource[] = [
        {
          name: 'secrets-manager',
          type: 'secrets-manager',
          priority: 2,
          data: { key: 'aws-value', awsOnly: 'aws-specific' },
          loadedAt: new Date()
        },
        {
          name: 'local-file',
          type: 'local-file',
          priority: 1,
          data: { key: 'local-value', localOnly: 'local-specific' },
          loadedAt: new Date()
        }
      ];

      // Act
      const result = service.applyPrecedenceRules(sources, 'local-first');

      // Assert
      expect(result.key).toBe('local-value');
      expect(result.awsOnly).toBe('aws-specific');
      expect(result.localOnly).toBe('local-specific');
    });

    it('should handle complex nested objects with local-first', () => {
      // Arrange
      const sources: ConfigurationSource[] = [
        {
          name: 'ssm',
          type: 'ssm',
          priority: 1,
          data: {
            database: { host: 'aws-host', port: 5432 },
            cache: { redis: 'aws-redis' }
          },
          loadedAt: new Date()
        },
        {
          name: 'environment',
          type: 'environment',
          priority: 2,
          data: {
            database: { host: 'env-host' },
            api: { port: 3000 }
          },
          loadedAt: new Date()
        },
        {
          name: 'local-file',
          type: 'local-file',
          priority: 3,
          data: {
            database: { ssl: true },
            cache: { ttl: 300 }
          },
          loadedAt: new Date()
        }
      ];

      // Act
      const result = service.applyPrecedenceRules(sources, 'local-first');

      // Assert
      expect(result.database).toEqual({
        host: 'env-host',
        port: 5432,
        ssl: true
      });
      expect(result.cache).toEqual({
        redis: 'aws-redis',
        ttl: 300
      });
      expect(result.api).toEqual({ port: 3000 });
    });
  });

  describe('merge precedence', () => {
    it('should apply balanced merging strategy', () => {
      // Arrange
      const sources: ConfigurationSource[] = [
        {
          name: 'local-file',
          type: 'local-file',
          priority: 1,
          data: { local: 'value', shared: 'local-shared' },
          loadedAt: new Date()
        },
        {
          name: 'environment',
          type: 'environment',
          priority: 2,
          data: { env: 'value', shared: 'env-shared' },
          loadedAt: new Date()
        },
        {
          name: 'ssm',
          type: 'ssm',
          priority: 3,
          data: { ssm: 'value', shared: 'ssm-shared' },
          loadedAt: new Date()
        },
        {
          name: 'secrets-manager',
          type: 'secrets-manager',
          priority: 4,
          data: { secrets: 'value', shared: 'secrets-shared' },
          loadedAt: new Date()
        }
      ];

      // Act
      const result = service.applyPrecedenceRules(sources, 'merge');

      // Assert
      expect(result.local).toBe('value');
      expect(result.env).toBe('value');
      expect(result.ssm).toBe('value');
      expect(result.secrets).toBe('value');
      expect(result.shared).toBe('secrets-shared'); // Highest priority in merge order
    });

    it('should handle missing source types in merge', () => {
      // Arrange
      const sources: ConfigurationSource[] = [
        {
          name: 'local-file',
          type: 'local-file',
          priority: 1,
          data: { local: 'value' },
          loadedAt: new Date()
        },
        {
          name: 'secrets-manager',
          type: 'secrets-manager',
          priority: 2,
          data: { secrets: 'value' },
          loadedAt: new Date()
        }
        // Missing environment and ssm sources
      ];

      // Act
      const result = service.applyPrecedenceRules(sources, 'merge');

      // Assert
      expect(result.local).toBe('value');
      expect(result.secrets).toBe('value');
    });
  });

  describe('source validation', () => {
    it('should validate valid sources', () => {
      // Arrange
      const sources: ConfigurationSource[] = [
        {
          name: 'valid-source',
          type: 'secrets-manager',
          priority: 1,
          data: { key: 'value' },
          loadedAt: new Date()
        }
      ];

      // Act
      const result = service.validateSources(sources);

      // Assert
      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should detect invalid source names', () => {
      // Arrange
      const sources: ConfigurationSource[] = [
        {
          name: '',
          type: 'secrets-manager',
          priority: 1,
          data: { key: 'value' },
          loadedAt: new Date()
        },
        {
          name: null as any,
          type: 'ssm',
          priority: 2,
          data: { key: 'value' },
          loadedAt: new Date()
        }
      ];

      // Act
      const result = service.validateSources(sources);

      // Assert
      expect(result.valid).toBe(false);
      expect(result.issues).toContain('Source at index 0 must have a valid name');
      expect(result.issues).toContain('Source at index 1 must have a valid name');
    });

    it('should detect invalid source types', () => {
      // Arrange
      const sources: ConfigurationSource[] = [
        {
          name: 'invalid-type',
          type: 'invalid-type' as any,
          priority: 1,
          data: { key: 'value' },
          loadedAt: new Date()
        }
      ];

      // Act
      const result = service.validateSources(sources);

      // Assert
      expect(result.valid).toBe(false);
      expect(result.issues).toContain('Source at index 0 must have a valid type');
    });

    it('should detect invalid priorities', () => {
      // Arrange
      const sources: ConfigurationSource[] = [
        {
          name: 'invalid-priority',
          type: 'secrets-manager',
          priority: 'high' as any,
          data: { key: 'value' },
          loadedAt: new Date()
        }
      ];

      // Act
      const result = service.validateSources(sources);

      // Assert
      expect(result.valid).toBe(false);
      expect(result.issues).toContain('Source at index 0 must have a numeric priority');
    });

    it('should detect invalid data objects', () => {
      // Arrange
      const sources: ConfigurationSource[] = [
        {
          name: 'invalid-data',
          type: 'secrets-manager',
          priority: 1,
          data: null as any,
          loadedAt: new Date()
        },
        {
          name: 'invalid-data-2',
          type: 'ssm',
          priority: 2,
          data: 'not-an-object' as any,
          loadedAt: new Date()
        }
      ];

      // Act
      const result = service.validateSources(sources);

      // Assert
      expect(result.valid).toBe(false);
      expect(result.issues).toContain('Source at index 0 must have valid data object');
      expect(result.issues).toContain('Source at index 1 must have valid data object');
    });

    it('should detect invalid loadedAt dates', () => {
      // Arrange
      const sources: ConfigurationSource[] = [
        {
          name: 'invalid-date',
          type: 'secrets-manager',
          priority: 1,
          data: { key: 'value' },
          loadedAt: 'not-a-date' as any
        }
      ];

      // Act
      const result = service.validateSources(sources);

      // Assert
      expect(result.valid).toBe(false);
      expect(result.issues).toContain('Source at index 0 must have a valid loadedAt date');
    });

    it('should handle null or undefined sources', () => {
      // Arrange
      const sources: ConfigurationSource[] = [
        null as any,
        undefined as any,
        {
          name: 'valid-source',
          type: 'secrets-manager',
          priority: 1,
          data: { key: 'value' },
          loadedAt: new Date()
        }
      ];

      // Act
      const result = service.validateSources(sources);

      // Assert
      expect(result.valid).toBe(false);
      expect(result.issues).toContain('Source at index 0 is null or undefined');
      expect(result.issues).toContain('Source at index 1 is null or undefined');
    });

    it('should handle non-array input', () => {
      // Act
      const result = service.validateSources('not-an-array' as any);

      // Assert
      expect(result.valid).toBe(false);
      expect(result.issues).toContain('Sources must be an array');
    });
  });

  describe('effective priority calculation', () => {
    it('should calculate correct priority for aws-first precedence', () => {
      // Arrange
      const secretsSource: ConfigurationSource = {
        name: 'secrets',
        type: 'secrets-manager',
        priority: 10,
        data: {},
        loadedAt: new Date()
      };

      const ssmSource: ConfigurationSource = {
        name: 'ssm',
        type: 'ssm',
        priority: 10,
        data: {},
        loadedAt: new Date()
      };

      const localSource: ConfigurationSource = {
        name: 'local',
        type: 'local-file',
        priority: 10,
        data: {},
        loadedAt: new Date()
      };

      // Act
      const secretsPriority = service.getEffectivePriority(secretsSource, 'aws-first');
      const ssmPriority = service.getEffectivePriority(ssmSource, 'aws-first');
      const localPriority = service.getEffectivePriority(localSource, 'aws-first');

      // Assert
      expect(secretsPriority).toBeGreaterThan(ssmPriority);
      expect(ssmPriority).toBeGreaterThan(localPriority);
    });

    it('should calculate correct priority for local-first precedence', () => {
      // Arrange
      const secretsSource: ConfigurationSource = {
        name: 'secrets',
        type: 'secrets-manager',
        priority: 10,
        data: {},
        loadedAt: new Date()
      };

      const localSource: ConfigurationSource = {
        name: 'local',
        type: 'local-file',
        priority: 10,
        data: {},
        loadedAt: new Date()
      };

      const envSource: ConfigurationSource = {
        name: 'env',
        type: 'environment',
        priority: 10,
        data: {},
        loadedAt: new Date()
      };

      // Act
      const secretsPriority = service.getEffectivePriority(secretsSource, 'local-first');
      const localPriority = service.getEffectivePriority(localSource, 'local-first');
      const envPriority = service.getEffectivePriority(envSource, 'local-first');

      // Assert
      expect(localPriority).toBeGreaterThan(envPriority);
      expect(envPriority).toBeGreaterThan(secretsPriority);
    });

    it('should maintain base priority for merge precedence', () => {
      // Arrange
      const source: ConfigurationSource = {
        name: 'test',
        type: 'secrets-manager',
        priority: 42,
        data: {},
        loadedAt: new Date()
      };

      // Act
      const priority = service.getEffectivePriority(source, 'merge');

      // Assert
      expect(priority).toBe(42);
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle empty sources array', () => {
      // Act
      const result = service.applyPrecedenceRules([], 'aws-first');

      // Assert
      expect(result).toEqual({});
    });

    it('should handle single source', () => {
      // Arrange
      const sources: ConfigurationSource[] = [
        {
          name: 'single-source',
          type: 'secrets-manager',
          priority: 1,
          data: { key: 'value' },
          loadedAt: new Date()
        }
      ];

      // Act
      const result = service.applyPrecedenceRules(sources, 'aws-first');

      // Assert
      expect(result).toEqual({ key: 'value' });
    });

    it('should handle unknown precedence rule', () => {
      // Arrange
      const sources: ConfigurationSource[] = [
        {
          name: 'test',
          type: 'secrets-manager',
          priority: 1,
          data: { key: 'value' },
          loadedAt: new Date()
        }
      ];

      // Act
      const result = service.applyPrecedenceRules(sources, 'unknown-rule' as any);

      // Assert
      expect(result).toEqual({ key: 'value' }); // Should default to aws-first
    });

    it('should handle sources with empty data', () => {
      // Arrange
      const sources: ConfigurationSource[] = [
        {
          name: 'empty-source',
          type: 'secrets-manager',
          priority: 1,
          data: {},
          loadedAt: new Date()
        },
        {
          name: 'valid-source',
          type: 'local-file',
          priority: 2,
          data: { key: 'value' },
          loadedAt: new Date()
        }
      ];

      // Act
      const result = service.applyPrecedenceRules(sources, 'aws-first');

      // Assert
      expect(result).toEqual({ key: 'value' });
    });

    it('should handle deeply nested objects', () => {
      // Arrange
      const sources: ConfigurationSource[] = [
        {
          name: 'deep-source-1',
          type: 'local-file',
          priority: 1,
          data: {
            level1: {
              level2: {
                level3: {
                  level4: { value: 'deep-local' }
                }
              }
            }
          },
          loadedAt: new Date()
        },
        {
          name: 'deep-source-2',
          type: 'secrets-manager',
          priority: 2,
          data: {
            level1: {
              level2: {
                level3: {
                  level4: { value: 'deep-aws', newKey: 'aws-only' }
                }
              }
            }
          },
          loadedAt: new Date()
        }
      ];

      // Act
      const result = service.applyPrecedenceRules(sources, 'aws-first');

      // Assert
      expect(result.level1.level2.level3.level4.value).toBe('deep-aws');
      expect(result.level1.level2.level3.level4.newKey).toBe('aws-only');
    });
  });
});