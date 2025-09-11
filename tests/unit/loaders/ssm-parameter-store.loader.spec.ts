import { GetParametersByPathCommand, SSMClient } from '@aws-sdk/client-ssm';
import { mockClient } from 'aws-sdk-client-mock';

import { SSMParameterStoreLoader, SSMParameterStoreLoaderConfig } from '../../../src/loaders/ssm-parameter-store.loader';
import { ConfigurationError } from '../../../src/interfaces/errors.interface';

// Create mock for SSM client
const ssmMock = mockClient(SSMClient);

describe('SSMParameterStoreLoader', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };
    
    // Reset all mocks
    ssmMock.reset();
    
    // Set default test environment
    process.env['APP_ENV'] = 'development';
    process.env['AWS_REGION'] = 'us-east-1';
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('constructor', () => {
    it('should create instance with default configuration', () => {
      const loader = new SSMParameterStoreLoader();
      expect(loader).toBeInstanceOf(SSMParameterStoreLoader);
    });

    it('should create instance with custom configuration', () => {
      const config: SSMParameterStoreLoaderConfig = {
        parameterPath: '/custom-app',
        region: 'us-west-2',
        environmentMapping: { dev: 'development' },
        withDecryption: false
      };
      
      const loader = new SSMParameterStoreLoader(config);
      expect(loader).toBeInstanceOf(SSMParameterStoreLoader);
    });

    it('should use NODE_ENV as fallback for APP_ENV', () => {
      delete process.env['APP_ENV'];
      process.env['NODE_ENV'] = 'production';
      
      const loader = new SSMParameterStoreLoader();
      expect(loader).toBeInstanceOf(SSMParameterStoreLoader);
    });

    it('should default to local environment when neither APP_ENV nor NODE_ENV is set', () => {
      delete process.env['APP_ENV'];
      delete process.env['NODE_ENV'];
      
      const loader = new SSMParameterStoreLoader();
      expect(loader).toBeInstanceOf(SSMParameterStoreLoader);
    });
  });

  describe('getName', () => {
    it('should return loader name with default parameter path', () => {
      const loader = new SSMParameterStoreLoader();
      expect(loader.getName()).toBe('SSMParameterStoreLoader(/dev/nestjs-config-aws)');
    });

    it('should return loader name with custom parameter path', () => {
      const config: SSMParameterStoreLoaderConfig = {
        parameterPath: '/custom-app',
        environmentMapping: { development: 'staging' }
      };
      
      const loader = new SSMParameterStoreLoader(config);
      expect(loader.getName()).toBe('SSMParameterStoreLoader(/staging/custom-app)');
    });

    it('should throw error for unmapped environment', () => {
      process.env['APP_ENV'] = 'unknown';
      
      const loader = new SSMParameterStoreLoader();
      expect(() => loader.getName()).toThrow(ConfigurationError);
      expect(() => loader.getName()).toThrow('No environment mapping found for APP_ENV \'unknown\'');
    });
  });

  describe('isAvailable', () => {
    it('should return false in local environment', async () => {
      process.env['APP_ENV'] = 'local';
      
      const loader = new SSMParameterStoreLoader();
      const result = await loader.isAvailable();
      
      expect(result).toBe(false);
    });

    it('should return false when AWS_REGION is not set', async () => {
      delete process.env['AWS_REGION'];
      
      const loader = new SSMParameterStoreLoader();
      const result = await loader.isAvailable();
      
      expect(result).toBe(false);
    });

    it('should return true when credentials are available', async () => {
      // Mock successful credential resolution
      ssmMock.on(GetParametersByPathCommand).resolves({});
      
      const loader = new SSMParameterStoreLoader();
      const result = await loader.isAvailable();
      
      expect(result).toBe(true);
    });

    it('should return false when credentials are not available', async () => {
      // Mock credential failure by making the client throw
      const loader = new SSMParameterStoreLoader();
      
      // Mock the credentials method to throw
      jest.spyOn(loader['client'].config, 'credentials').mockRejectedValue(new Error('No credentials'));
      
      const result = await loader.isAvailable();
      
      expect(result).toBe(false);
    });
  });

  describe('load', () => {
    it('should return empty object in local environment', async () => {
      process.env['APP_ENV'] = 'local';
      
      const loader = new SSMParameterStoreLoader();
      const result = await loader.load();
      
      expect(result).toEqual({});
      expect(ssmMock.calls()).toHaveLength(0);
    });

    it('should return empty object when AWS_REGION is not set', async () => {
      delete process.env['AWS_REGION'];
      
      const loader = new SSMParameterStoreLoader();
      const result = await loader.load();
      
      expect(result).toEqual({});
      expect(ssmMock.calls()).toHaveLength(0);
    });

    it('should load parameters successfully', async () => {
      const mockParameters = [
        { Name: '/dev/nestjs-config-aws/database/host', Value: 'localhost' },
        { Name: '/dev/nestjs-config-aws/database/port', Value: '5432' },
        { Name: '/dev/nestjs-config-aws/api/key', Value: 'secret-key' }
      ];

      ssmMock.on(GetParametersByPathCommand).resolves({
        Parameters: mockParameters
      });

      const loader = new SSMParameterStoreLoader();
      const result = await loader.load();

      expect(result).toEqual({
        'DATABASEHOST': 'localhost',
        'DATABASEPORT': '5432',
        'APIKEY': 'secret-key'
      });

      expect(ssmMock.calls()).toHaveLength(1);
      const firstCall = ssmMock.calls()[0];
      expect(firstCall?.args[0].input).toEqual({
        Path: '/dev/nestjs-config-aws',
        Recursive: true,
        WithDecryption: true,
        NextToken: undefined
      });
    });

    it('should handle pagination with NextToken', async () => {
      // Reset mock to ensure clean state
      ssmMock.reset();
      
      // Set up mock to return different responses based on call count
      let callCount = 0;
      ssmMock.on(GetParametersByPathCommand).callsFake(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({
            Parameters: [
              { Name: '/dev/nestjs-config-aws/page1/param1', Value: 'value1' },
              { Name: '/dev/nestjs-config-aws/page1/param2', Value: 'value2' }
            ],
            NextToken: 'next-token-123'
          });
        } else {
          return Promise.resolve({
            Parameters: [
              { Name: '/dev/nestjs-config-aws/page2/param3', Value: 'value3' },
              { Name: '/dev/nestjs-config-aws/page2/param4', Value: 'value4' }
            ]
            // No NextToken means end of pagination
          });
        }
      });

      const loader = new SSMParameterStoreLoader();
      const result = await loader.load();

      expect(result).toEqual({
        'PAGE1PARAM1': 'value1',
        'PAGE1PARAM2': 'value2',
        'PAGE2PARAM3': 'value3',
        'PAGE2PARAM4': 'value4'
      });

      expect(ssmMock.calls()).toHaveLength(2);
      
      // First call should not have NextToken
      const firstCall = ssmMock.calls()[0];
      const secondCall = ssmMock.calls()[1];
      expect((firstCall?.args[0].input as any).NextToken).toBeUndefined();
      
      // Second call should have NextToken from first response
      expect((secondCall?.args[0].input as any).NextToken).toBe('next-token-123');
    });

    it('should handle empty parameters response', async () => {
      ssmMock.on(GetParametersByPathCommand).resolves({
        Parameters: []
      });

      const loader = new SSMParameterStoreLoader();
      const result = await loader.load();

      expect(result).toEqual({});
    });

    it('should handle undefined parameters response', async () => {
      ssmMock.on(GetParametersByPathCommand).resolves({});

      const loader = new SSMParameterStoreLoader();
      const result = await loader.load();

      expect(result).toEqual({});
    });

    it('should skip parameters with undefined names or values', async () => {
      const mockParameters = [
        { Name: '/dev/nestjs-config-aws/valid', Value: 'valid-value' },
        { Name: undefined, Value: 'invalid-name' },
        { Name: '/dev/nestjs-config-aws/invalid', Value: undefined },
        { Name: '/dev/nestjs-config-aws/another-valid', Value: 'another-value' }
      ];

      ssmMock.on(GetParametersByPathCommand).resolves({
        Parameters: mockParameters
      });

      const loader = new SSMParameterStoreLoader();
      const result = await loader.load();

      expect(result).toEqual({
        'VALID': 'valid-value',
        'ANOTHER-VALID': 'another-value'
      });
    });

    it('should use custom configuration options', async () => {
      const config: SSMParameterStoreLoaderConfig = {
        parameterPath: '/custom-app',
        withDecryption: false,
        environmentMapping: { development: 'staging' }
      };

      ssmMock.on(GetParametersByPathCommand).resolves({
        Parameters: [
          { Name: '/staging/custom-app/test', Value: 'test-value' }
        ]
      });

      const loader = new SSMParameterStoreLoader(config);
      const result = await loader.load();

      expect(result).toEqual({
        'TEST': 'test-value'
      });

      const firstCall = ssmMock.calls()[0];
      expect(firstCall?.args[0].input).toEqual({
        Path: '/staging/custom-app',
        Recursive: true,
        WithDecryption: false,
        NextToken: undefined
      });
    });

    it('should handle AccessDeniedException', async () => {
      const error = new Error('Access denied');
      error.name = 'AccessDeniedException';
      
      ssmMock.on(GetParametersByPathCommand).rejects(error);

      const loader = new SSMParameterStoreLoader();
      
      await expect(loader.load()).rejects.toThrow(ConfigurationError);
      await expect(loader.load()).rejects.toThrow('Access denied when retrieving parameters');
    });

    it('should handle InvalidFilterKey error', async () => {
      const error = new Error('Invalid filter key');
      error.name = 'InvalidFilterKey';
      
      ssmMock.on(GetParametersByPathCommand).rejects(error);

      const loader = new SSMParameterStoreLoader();
      
      await expect(loader.load()).rejects.toThrow(ConfigurationError);
      await expect(loader.load()).rejects.toThrow('Invalid parameter path');
    });

    it('should handle ParameterNotFound error gracefully', async () => {
      const error = new Error('Parameter not found');
      error.name = 'ParameterNotFound';
      
      ssmMock.on(GetParametersByPathCommand).rejects(error);

      const loader = new SSMParameterStoreLoader();
      const result = await loader.load();
      
      expect(result).toEqual({});
    });

    it('should handle generic errors', async () => {
      const error = new Error('Generic AWS error');
      
      ssmMock.on(GetParametersByPathCommand).rejects(error);

      const loader = new SSMParameterStoreLoader();
      
      await expect(loader.load()).rejects.toThrow(ConfigurationError);
      await expect(loader.load()).rejects.toThrow('Failed to retrieve parameters from path');
    });

    it('should handle non-Error objects', async () => {
      ssmMock.on(GetParametersByPathCommand).rejects('String error');

      const loader = new SSMParameterStoreLoader();
      
      await expect(loader.load()).rejects.toThrow(ConfigurationError);
    });
  });

  describe('parameter name transformation', () => {
    it('should transform nested parameter paths correctly', async () => {
      const mockParameters = [
        { Name: '/dev/nestjs-config-aws/database/connection/host', Value: 'db-host' },
        { Name: '/dev/nestjs-config-aws/api/auth/secret', Value: 'auth-secret' },
        { Name: '/dev/nestjs-config-aws/cache/redis/url', Value: 'redis://localhost' }
      ];

      ssmMock.on(GetParametersByPathCommand).resolves({
        Parameters: mockParameters
      });

      const loader = new SSMParameterStoreLoader();
      const result = await loader.load();

      expect(result).toEqual({
        'DATABASECONNECTIONHOST': 'db-host',
        'APIAUTHSECRET': 'auth-secret',
        'CACHEREDISURL': 'redis://localhost'
      });
    });

    it('should handle parameters with trailing slashes', async () => {
      const mockParameters = [
        { Name: '/dev/nestjs-config-aws/test/', Value: 'trailing-slash' },
        { Name: '/dev/nestjs-config-aws/normal', Value: 'normal-value' }
      ];

      ssmMock.on(GetParametersByPathCommand).resolves({
        Parameters: mockParameters
      });

      const loader = new SSMParameterStoreLoader();
      const result = await loader.load();

      expect(result).toEqual({
        'TEST': 'trailing-slash',
        'NORMAL': 'normal-value'
      });
    });

    it('should skip parameters that result in empty keys', async () => {
      const mockParameters = [
        { Name: '/dev/nestjs-config-aws/', Value: 'empty-key' },
        { Name: '/dev/nestjs-config-aws', Value: 'exact-match' },
        { Name: '/dev/nestjs-config-aws/valid', Value: 'valid-value' }
      ];

      ssmMock.on(GetParametersByPathCommand).resolves({
        Parameters: mockParameters
      });

      const loader = new SSMParameterStoreLoader();
      const result = await loader.load();

      expect(result).toEqual({
        'VALID': 'valid-value'
      });
    });
  });

  describe('environment mapping', () => {
    it('should work with production environment', async () => {
      process.env['APP_ENV'] = 'production';

      ssmMock.on(GetParametersByPathCommand).resolves({
        Parameters: [
          { Name: '/production/nestjs-config-aws/prod-param', Value: 'prod-value' }
        ]
      });

      const loader = new SSMParameterStoreLoader();
      const result = await loader.load();

      expect(result).toEqual({
        'PROD-PARAM': 'prod-value'
      });

      const firstCall = ssmMock.calls()[0];
      expect((firstCall?.args[0].input as any).Path).toBe('/production/nestjs-config-aws');
    });

    it('should work with test environment', async () => {
      process.env['APP_ENV'] = 'test';

      ssmMock.on(GetParametersByPathCommand).resolves({
        Parameters: [
          { Name: '/test/nestjs-config-aws/test-param', Value: 'test-value' }
        ]
      });

      const loader = new SSMParameterStoreLoader();
      const result = await loader.load();

      expect(result).toEqual({
        'TEST-PARAM': 'test-value'
      });

      const firstCall = ssmMock.calls()[0];
      expect((firstCall?.args[0].input as any).Path).toBe('/test/nestjs-config-aws');
    });

    it('should work with custom environment mapping', async () => {
      process.env['APP_ENV'] = 'staging';

      const config: SSMParameterStoreLoaderConfig = {
        environmentMapping: {
          staging: 'stage',
          development: 'dev'
        }
      };

      ssmMock.on(GetParametersByPathCommand).resolves({
        Parameters: [
          { Name: '/stage/nestjs-config-aws/stage-param', Value: 'stage-value' }
        ]
      });

      const loader = new SSMParameterStoreLoader(config);
      const result = await loader.load();

      expect(result).toEqual({
        'STAGE-PARAM': 'stage-value'
      });

      const firstCall = ssmMock.calls()[0];
      expect((firstCall?.args[0].input as any).Path).toBe('/stage/nestjs-config-aws');
    });
  });

  describe('edge cases', () => {
    it('should handle very long parameter names', async () => {
      const longPath = 'very/long/nested/path/with/many/segments/that/goes/on/and/on';
      const mockParameters = [
        { Name: `/dev/nestjs-config-aws/${longPath}/param`, Value: 'long-path-value' }
      ];

      ssmMock.on(GetParametersByPathCommand).resolves({
        Parameters: mockParameters
      });

      const loader = new SSMParameterStoreLoader();
      const result = await loader.load();

      const expectedKey = longPath.replace(/\//g, '').toUpperCase() + 'PARAM';
      expect(result[expectedKey]).toBe('long-path-value');
    });

    it('should handle special characters in parameter values', async () => {
      const mockParameters = [
        { Name: '/dev/nestjs-config-aws/special', Value: '🚀 Special chars: @#$%^&*()' },
        { Name: '/dev/nestjs-config-aws/unicode', Value: 'Hello 世界' },
        { Name: '/dev/nestjs-config-aws/json-like', Value: '{"key": "value"}' }
      ];

      ssmMock.on(GetParametersByPathCommand).resolves({
        Parameters: mockParameters
      });

      const loader = new SSMParameterStoreLoader();
      const result = await loader.load();

      expect(result).toEqual({
        'SPECIAL': '🚀 Special chars: @#$%^&*()',
        'UNICODE': 'Hello 世界',
        'JSON-LIKE': '{"key": "value"}'
      });
    });

    it('should handle empty parameter values', async () => {
      const mockParameters = [
        { Name: '/dev/nestjs-config-aws/empty', Value: '' },
        { Name: '/dev/nestjs-config-aws/whitespace', Value: '   ' },
        { Name: '/dev/nestjs-config-aws/normal', Value: 'normal-value' }
      ];

      ssmMock.on(GetParametersByPathCommand).resolves({
        Parameters: mockParameters
      });

      const loader = new SSMParameterStoreLoader();
      const result = await loader.load();

      expect(result).toEqual({
        'EMPTY': '',
        'WHITESPACE': '   ',
        'NORMAL': 'normal-value'
      });
    });
  });
});