/**
 * Unit tests for SSMParameterStoreLoader
 *
 * Tests pagination, parameter transformation, and error handling.
 * **Validates: Requirements 1.1, 1.5**
 */

import { SSMParameterStoreLoader } from './ssm-parameter-store.loader';
import { AWSServiceError, ConfigurationLoadError } from '../errors';

// Mock the AWS SDK
jest.mock('@aws-sdk/client-ssm', () => {
  const mockSend = jest.fn();
  return {
    SSMClient: jest.fn().mockImplementation(() => ({
      send: mockSend,
      config: {
        credentials: jest.fn().mockResolvedValue({}),
      },
    })),
    GetParametersByPathCommand: jest.fn().mockImplementation((input) => input),
    __mockSend: mockSend,
  };
});

jest.mock('@aws-sdk/credential-providers', () => ({
  fromNodeProviderChain: jest.fn().mockReturnValue({}),
}));

// Get the mock send function
const getMockSend = () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@aws-sdk/client-ssm').__mockSend as jest.Mock;
};

describe('SSMParameterStoreLoader', () => {
  // Store original env values
  const originalAppEnv = process.env['APP_ENV'];
  const originalNodeEnv = process.env['NODE_ENV'];
  const originalAwsRegion = process.env['AWS_REGION'];

  beforeEach(() => {
    jest.clearAllMocks();
    // Set up default environment
    process.env['APP_ENV'] = 'production';
    process.env['AWS_REGION'] = 'us-east-1';
  });

  afterEach(() => {
    // Restore original env values
    if (originalAppEnv !== undefined) {
      process.env['APP_ENV'] = originalAppEnv;
    } else {
      delete process.env['APP_ENV'];
    }
    if (originalNodeEnv !== undefined) {
      process.env['NODE_ENV'] = originalNodeEnv;
    } else {
      delete process.env['NODE_ENV'];
    }
    if (originalAwsRegion !== undefined) {
      process.env['AWS_REGION'] = originalAwsRegion;
    } else {
      delete process.env['AWS_REGION'];
    }
  });


  describe('getName', () => {
    it('should return loader name with parameter path', () => {
      const loader = new SSMParameterStoreLoader({
        parameterPath: '/my-app/config',
        environmentMapping: { production: 'prod' },
      });

      expect(loader.getName()).toBe('SSMParameterStoreLoader(/prod/my-app/config)');
    });

    it('should use default path when not specified', () => {
      const loader = new SSMParameterStoreLoader({
        environmentMapping: { production: 'prod' },
      });

      expect(loader.getName()).toBe('SSMParameterStoreLoader(/prod/config-aws)');
    });
  });

  describe('isAvailable', () => {
    it('should return false in local environment', async () => {
      process.env['APP_ENV'] = 'local';
      const loader = new SSMParameterStoreLoader();

      expect(await loader.isAvailable()).toBe(false);
    });

    it('should return true when credentials are available', async () => {
      process.env['APP_ENV'] = 'production';
      const loader = new SSMParameterStoreLoader({
        environmentMapping: { production: 'prod' },
      });

      expect(await loader.isAvailable()).toBe(true);
    });
  });

  describe('load', () => {
    it('should return empty object in local environment', async () => {
      process.env['APP_ENV'] = 'local';
      const loader = new SSMParameterStoreLoader();

      const result = await loader.load();

      expect(result).toEqual({});
    });

    it('should load parameters from SSM', async () => {
      const mockSend = getMockSend();
      mockSend.mockResolvedValueOnce({
        Parameters: [
          { Name: '/prod/config-aws/database/host', Value: 'localhost' },
          { Name: '/prod/config-aws/database/port', Value: '5432' },
        ],
        NextToken: undefined,
      });

      const loader = new SSMParameterStoreLoader({
        environmentMapping: { production: 'prod' },
      });

      const result = await loader.load();

      expect(result).toEqual({
        DATABASE_HOST: 'localhost',
        DATABASE_PORT: '5432',
      });
    });

    it('should return empty object when no parameters found', async () => {
      const mockSend = getMockSend();
      mockSend.mockResolvedValueOnce({
        Parameters: undefined,
        NextToken: undefined,
      });

      const loader = new SSMParameterStoreLoader({
        environmentMapping: { production: 'prod' },
      });

      const result = await loader.load();

      expect(result).toEqual({});
    });
  });


  describe('pagination', () => {
    it('should handle pagination with NextToken', async () => {
      const mockSend = getMockSend();

      // First page
      mockSend.mockResolvedValueOnce({
        Parameters: [
          { Name: '/prod/config-aws/key1', Value: 'value1' },
          { Name: '/prod/config-aws/key2', Value: 'value2' },
        ],
        NextToken: 'token123',
      });

      // Second page
      mockSend.mockResolvedValueOnce({
        Parameters: [
          { Name: '/prod/config-aws/key3', Value: 'value3' },
        ],
        NextToken: undefined,
      });

      const loader = new SSMParameterStoreLoader({
        environmentMapping: { production: 'prod' },
      });

      const result = await loader.load();

      expect(result).toEqual({
        KEY1: 'value1',
        KEY2: 'value2',
        KEY3: 'value3',
      });

      // Verify pagination was used
      expect(mockSend).toHaveBeenCalledTimes(2);
    });

    it('should handle multiple pages of pagination', async () => {
      const mockSend = getMockSend();

      // First page
      mockSend.mockResolvedValueOnce({
        Parameters: [{ Name: '/prod/config-aws/key1', Value: 'value1' }],
        NextToken: 'token1',
      });

      // Second page
      mockSend.mockResolvedValueOnce({
        Parameters: [{ Name: '/prod/config-aws/key2', Value: 'value2' }],
        NextToken: 'token2',
      });

      // Third page
      mockSend.mockResolvedValueOnce({
        Parameters: [{ Name: '/prod/config-aws/key3', Value: 'value3' }],
        NextToken: undefined,
      });

      const loader = new SSMParameterStoreLoader({
        environmentMapping: { production: 'prod' },
      });

      const result = await loader.load();

      expect(result).toEqual({
        KEY1: 'value1',
        KEY2: 'value2',
        KEY3: 'value3',
      });

      expect(mockSend).toHaveBeenCalledTimes(3);
    });
  });

  describe('parameter transformation', () => {
    it('should transform nested paths to uppercase with underscores', async () => {
      const mockSend = getMockSend();
      mockSend.mockResolvedValueOnce({
        Parameters: [
          { Name: '/prod/config-aws/database/connection/host', Value: 'localhost' },
        ],
        NextToken: undefined,
      });

      const loader = new SSMParameterStoreLoader({
        environmentMapping: { production: 'prod' },
      });

      const result = await loader.load();

      expect(result).toEqual({
        DATABASE_CONNECTION_HOST: 'localhost',
      });
    });

    it('should skip parameters with undefined values', async () => {
      const mockSend = getMockSend();
      mockSend.mockResolvedValueOnce({
        Parameters: [
          { Name: '/prod/config-aws/key1', Value: 'value1' },
          { Name: '/prod/config-aws/key2', Value: undefined },
          { Name: '/prod/config-aws/key3', Value: 'value3' },
        ],
        NextToken: undefined,
      });

      const loader = new SSMParameterStoreLoader({
        environmentMapping: { production: 'prod' },
      });

      const result = await loader.load();

      expect(result).toEqual({
        KEY1: 'value1',
        KEY3: 'value3',
      });
    });

    it('should skip parameters with undefined names', async () => {
      const mockSend = getMockSend();
      mockSend.mockResolvedValueOnce({
        Parameters: [
          { Name: '/prod/config-aws/key1', Value: 'value1' },
          { Name: undefined, Value: 'orphan' },
        ],
        NextToken: undefined,
      });

      const loader = new SSMParameterStoreLoader({
        environmentMapping: { production: 'prod' },
      });

      const result = await loader.load();

      expect(result).toEqual({
        KEY1: 'value1',
      });
    });
  });


  describe('error handling', () => {
    it('should return empty object for ResourceNotFoundException', async () => {
      const mockSend = getMockSend();
      const error = new Error('Parameter not found');
      error.name = 'ResourceNotFoundException';
      mockSend.mockRejectedValueOnce(error);

      const loader = new SSMParameterStoreLoader({
        environmentMapping: { production: 'prod' },
      });

      const result = await loader.load();

      expect(result).toEqual({});
    });

    it('should return empty object for ParameterNotFound', async () => {
      const mockSend = getMockSend();
      const error = new Error('Parameter not found');
      error.name = 'ParameterNotFound';
      mockSend.mockRejectedValueOnce(error);

      const loader = new SSMParameterStoreLoader({
        environmentMapping: { production: 'prod' },
      });

      const result = await loader.load();

      expect(result).toEqual({});
    });

    it('should throw AWSServiceError for AccessDeniedException', async () => {
      const mockSend = getMockSend();
      const error = new Error('Access denied');
      error.name = 'AccessDeniedException';
      mockSend.mockRejectedValueOnce(error);

      const loader = new SSMParameterStoreLoader({
        environmentMapping: { production: 'prod' },
      });

      try {
        await loader.load();
        fail('Expected error to be thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(AWSServiceError);
        expect((e as Error).message).toContain('Access denied');
      }
    });

    it('should throw AWSServiceError for InvalidFilterKey', async () => {
      const mockSend = getMockSend();
      const error = new Error('Invalid filter');
      error.name = 'InvalidFilterKey';
      mockSend.mockRejectedValueOnce(error);

      const loader = new SSMParameterStoreLoader({
        environmentMapping: { production: 'prod' },
      });

      try {
        await loader.load();
        fail('Expected error to be thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(AWSServiceError);
        expect((e as Error).message).toContain('Invalid parameter path');
      }
    });

    it('should throw AWSServiceError for generic errors', async () => {
      const mockSend = getMockSend();
      mockSend.mockRejectedValueOnce(new Error('Network error'));

      const loader = new SSMParameterStoreLoader({
        environmentMapping: { production: 'prod' },
      });

      await expect(loader.load()).rejects.toThrow(AWSServiceError);
      await expect(loader.load()).rejects.toThrow('Failed to retrieve parameters');
    });

    it('should throw ConfigurationLoadError for missing environment mapping', () => {
      process.env['APP_ENV'] = 'unknown';

      const loader = new SSMParameterStoreLoader({
        environmentMapping: { production: 'prod' },
      });

      try {
        loader.buildParameterPath();
        fail('Expected error to be thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(ConfigurationLoadError);
        expect((e as Error).message).toContain('No environment mapping found');
      }
    });
  });

  describe('decryption options', () => {
    it('should use withDecryption=true by default', async () => {
      const mockSend = getMockSend();
      mockSend.mockResolvedValueOnce({
        Parameters: [],
        NextToken: undefined,
      });

      const loader = new SSMParameterStoreLoader({
        environmentMapping: { production: 'prod' },
      });

      await loader.load();

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          WithDecryption: true,
        }),
      );
    });

    it('should respect withDecryption=false', async () => {
      const mockSend = getMockSend();
      mockSend.mockResolvedValueOnce({
        Parameters: [],
        NextToken: undefined,
      });

      const loader = new SSMParameterStoreLoader({
        environmentMapping: { production: 'prod' },
        withDecryption: false,
      });

      await loader.load();

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          WithDecryption: false,
        }),
      );
    });
  });


  describe('environment handling', () => {
    it('should use APP_ENV over NODE_ENV', () => {
      process.env['APP_ENV'] = 'production';
      process.env['NODE_ENV'] = 'development';

      const loader = new SSMParameterStoreLoader({
        environmentMapping: {
          production: 'prod',
          development: 'dev',
        },
      });

      expect(loader.getAppEnv()).toBe('production');
      expect(loader.buildParameterPath()).toBe('/prod/config-aws');
    });

    it('should fall back to NODE_ENV when APP_ENV is not set', () => {
      delete process.env['APP_ENV'];
      process.env['NODE_ENV'] = 'development';

      const loader = new SSMParameterStoreLoader({
        environmentMapping: { development: 'dev' },
      });

      expect(loader.getAppEnv()).toBe('development');
      expect(loader.buildParameterPath()).toBe('/dev/config-aws');
    });

    it('should default to local when neither APP_ENV nor NODE_ENV is set', () => {
      delete process.env['APP_ENV'];
      delete process.env['NODE_ENV'];

      const loader = new SSMParameterStoreLoader({
        environmentMapping: { local: 'local' },
      });

      expect(loader.getAppEnv()).toBe('local');
    });
  });

  describe('path construction', () => {
    it('should construct path with custom parameter path', () => {
      const loader = new SSMParameterStoreLoader({
        parameterPath: '/my-app/settings',
        environmentMapping: { production: 'prod' },
      });

      expect(loader.buildParameterPath()).toBe('/prod/my-app/settings');
    });

    it('should return a copy of environment mapping', () => {
      const mapping = { production: 'prod', development: 'dev' };
      const loader = new SSMParameterStoreLoader({
        environmentMapping: mapping,
      });

      const returnedMapping = loader.getEnvironmentMapping();

      expect(returnedMapping).toEqual(mapping);
      expect(returnedMapping).not.toBe(mapping);
    });
  });
});
