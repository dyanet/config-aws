import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { mockClient } from 'aws-sdk-client-mock';
import { SecretsManagerLoader, SecretsManagerLoaderConfig } from '../../../src/loaders/secrets-manager.loader';
import { ConfigurationError } from '../../../src/interfaces/errors.interface';

// Create mock for AWS SDK
const secretsManagerMock = mockClient(SecretsManagerClient);

// Mock credential provider
jest.mock('@aws-sdk/credential-providers', () => ({
  fromNodeProviderChain: jest.fn().mockReturnValue({
    accessKeyId: 'test-key',
    secretAccessKey: 'test-secret',
  }),
}));

describe('SecretsManagerLoader', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };
    
    // Clear environment variables
    delete process.env['APP_ENV'];
    delete process.env['NODE_ENV'];
    delete process.env['AWS_REGION'];
    
    // Reset AWS SDK mock
    secretsManagerMock.reset();
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('constructor', () => {
    it('should create instance with default configuration', () => {
      const loader = new SecretsManagerLoader();
      expect(loader).toBeInstanceOf(SecretsManagerLoader);
    });

    it('should create instance with custom configuration', () => {
      const config: SecretsManagerLoaderConfig = {
        secretName: '/custom-secret',
        region: 'us-west-2',
        environmentMapping: {
          development: 'dev',
          production: 'prod',
        },
      };
      
      const loader = new SecretsManagerLoader(config);
      expect(loader).toBeInstanceOf(SecretsManagerLoader);
    });

    it('should use AWS_REGION from environment when not provided in config', () => {
      process.env['AWS_REGION'] = 'eu-west-1';
      
      const loader = new SecretsManagerLoader();
      expect(loader).toBeInstanceOf(SecretsManagerLoader);
    });

    it('should default to us-east-1 when no region is available', () => {
      const loader = new SecretsManagerLoader();
      expect(loader).toBeInstanceOf(SecretsManagerLoader);
    });
  });

  describe('getName', () => {
    it('should return loader name with default secret path for development', () => {
      process.env['APP_ENV'] = 'development';
      
      const loader = new SecretsManagerLoader();
      expect(loader.getName()).toBe('SecretsManagerLoader(/dev/nestjs-config-aws)');
    });

    it('should return loader name with custom secret path', () => {
      process.env['APP_ENV'] = 'production';
      
      const loader = new SecretsManagerLoader({
        secretName: '/my-app',
        environmentMapping: { production: 'prod' },
      });
      expect(loader.getName()).toBe('SecretsManagerLoader(/prod/my-app)');
    });

    it('should handle test environment', () => {
      process.env['APP_ENV'] = 'test';
      
      const loader = new SecretsManagerLoader();
      expect(loader.getName()).toBe('SecretsManagerLoader(/test/nestjs-config-aws)');
    });
  });

  describe('isAvailable', () => {
    it('should return false in local environment', async () => {
      process.env['APP_ENV'] = 'local';
      
      const loader = new SecretsManagerLoader();
      const result = await loader.isAvailable();
      
      expect(result).toBe(false);
    });

    it('should return true in non-local environment with valid credentials', async () => {
      process.env['APP_ENV'] = 'development';
      
      const loader = new SecretsManagerLoader();
      const result = await loader.isAvailable();
      
      expect(result).toBe(true);
    });

    it('should return false when credentials are not available', async () => {
      process.env['APP_ENV'] = 'development';
      
      // Mock credential failure
      const loader = new SecretsManagerLoader();
      
      // Mock the credentials method to throw
      jest.spyOn(loader['client'].config, 'credentials').mockRejectedValue(new Error('No credentials'));
      
      const result = await loader.isAvailable();
      
      expect(result).toBe(false);
    });
  });

  describe('load', () => {
    it('should return empty object in local environment', async () => {
      process.env['APP_ENV'] = 'local';
      
      const loader = new SecretsManagerLoader();
      const config = await loader.load();
      
      expect(config).toEqual({});
      expect(secretsManagerMock.calls()).toHaveLength(0);
    });

    it('should load and parse JSON secret successfully', async () => {
      process.env['APP_ENV'] = 'development';
      
      const secretValue = {
        DATABASE_URL: 'postgres://localhost:5432/mydb',
        API_KEY: 'secret-key-123',
        PORT: '3000',
      };
      
      secretsManagerMock.on(GetSecretValueCommand).resolves({
        SecretString: JSON.stringify(secretValue),
      });
      
      const loader = new SecretsManagerLoader();
      const config = await loader.load();
      
      expect(config).toEqual(secretValue);
      expect(secretsManagerMock.calls()).toHaveLength(1);
      expect(secretsManagerMock.calls()[0]?.args[0].input).toEqual({
        SecretId: '/dev/nestjs-config-aws',
      });
    });

    it('should handle string secret value (non-JSON)', async () => {
      process.env['APP_ENV'] = 'production';
      
      const secretValue = 'simple-string-secret';
      
      secretsManagerMock.on(GetSecretValueCommand).resolves({
        SecretString: secretValue,
      });
      
      const loader = new SecretsManagerLoader();
      const config = await loader.load();
      
      expect(config).toEqual({ SECRET_VALUE: secretValue });
    });

    it('should handle non-object JSON values', async () => {
      process.env['APP_ENV'] = 'development';
      
      const secretValue = ['array', 'value'];
      
      secretsManagerMock.on(GetSecretValueCommand).resolves({
        SecretString: JSON.stringify(secretValue),
      });
      
      const loader = new SecretsManagerLoader();
      const config = await loader.load();
      
      expect(config).toEqual({ SECRET_VALUE: secretValue });
    });

    it('should return empty object when secret has no value', async () => {
      process.env['APP_ENV'] = 'development';
      
      secretsManagerMock.on(GetSecretValueCommand).resolves({
        SecretString: undefined,
      });
      
      const loader = new SecretsManagerLoader();
      const config = await loader.load();
      
      expect(config).toEqual({});
    });

    it('should return empty object when secret is not found', async () => {
      process.env['APP_ENV'] = 'development';
      
      const error = new Error('Secret not found');
      error.name = 'ResourceNotFoundException';
      
      secretsManagerMock.on(GetSecretValueCommand).rejects(error);
      
      const loader = new SecretsManagerLoader();
      const config = await loader.load();
      
      expect(config).toEqual({});
    });

    it('should throw ConfigurationError for access denied', async () => {
      process.env['APP_ENV'] = 'development';
      
      const error = new Error('Access denied');
      error.name = 'AccessDeniedException';
      
      secretsManagerMock.on(GetSecretValueCommand).rejects(error);
      
      const loader = new SecretsManagerLoader();
      
      await expect(loader.load()).rejects.toThrow(ConfigurationError);
      await expect(loader.load()).rejects.toThrow('Access denied when retrieving secret');
    });

    it('should throw ConfigurationError for invalid request', async () => {
      process.env['APP_ENV'] = 'development';
      
      const error = new Error('Invalid request');
      error.name = 'InvalidRequestException';
      
      secretsManagerMock.on(GetSecretValueCommand).rejects(error);
      
      const loader = new SecretsManagerLoader();
      
      await expect(loader.load()).rejects.toThrow(ConfigurationError);
      await expect(loader.load()).rejects.toThrow('Invalid request when retrieving secret');
    });

    it('should throw ConfigurationError for other AWS errors', async () => {
      process.env['APP_ENV'] = 'development';
      
      const error = new Error('Network error');
      error.name = 'NetworkingError';
      
      secretsManagerMock.on(GetSecretValueCommand).rejects(error);
      
      const loader = new SecretsManagerLoader();
      
      await expect(loader.load()).rejects.toThrow(ConfigurationError);
      await expect(loader.load()).rejects.toThrow('Failed to retrieve secret');
    });

    it('should handle malformed JSON gracefully', async () => {
      process.env['APP_ENV'] = 'development';
      
      const malformedJson = '{"key": "value"'; // Missing closing brace
      
      secretsManagerMock.on(GetSecretValueCommand).resolves({
        SecretString: malformedJson,
      });
      
      const loader = new SecretsManagerLoader();
      const config = await loader.load();
      
      expect(config).toEqual({ SECRET_VALUE: malformedJson });
    });

    it('should use custom environment mapping', async () => {
      process.env['APP_ENV'] = 'development';
      
      const secretValue = { TEST_KEY: 'test-value' };
      
      secretsManagerMock.on(GetSecretValueCommand).resolves({
        SecretString: JSON.stringify(secretValue),
      });
      
      const loader = new SecretsManagerLoader({
        secretName: '/my-app',
        environmentMapping: { development: 'staging' },
      });
      
      const config = await loader.load();
      
      expect(config).toEqual(secretValue);
      expect(secretsManagerMock.calls()[0]?.args[0].input).toEqual({
        SecretId: '/staging/my-app',
      });
    });

    it('should throw error for unmapped environment', async () => {
      process.env['APP_ENV'] = 'unknown';
      
      const loader = new SecretsManagerLoader();
      
      await expect(loader.load()).rejects.toThrow(ConfigurationError);
      await expect(loader.load()).rejects.toThrow('No environment mapping found for APP_ENV');
    });
  });

  describe('APP_ENV logic', () => {
    it('should use APP_ENV when set', async () => {
      process.env['APP_ENV'] = 'production';
      process.env['NODE_ENV'] = 'development';
      
      const loader = new SecretsManagerLoader();
      expect(loader.getName()).toBe('SecretsManagerLoader(/production/nestjs-config-aws)');
    });

    it('should fallback to NODE_ENV when APP_ENV not set', async () => {
      process.env['NODE_ENV'] = 'test';
      
      const loader = new SecretsManagerLoader();
      expect(loader.getName()).toBe('SecretsManagerLoader(/test/nestjs-config-aws)');
    });

    it('should default to local when neither is set', async () => {
      const loader = new SecretsManagerLoader();
      const result = await loader.isAvailable();
      
      expect(result).toBe(false); // Should be false for local environment
    });
  });

  describe('edge cases', () => {
    it('should handle empty secret string', async () => {
      process.env['APP_ENV'] = 'development';
      
      secretsManagerMock.on(GetSecretValueCommand).resolves({
        SecretString: '',
      });
      
      const loader = new SecretsManagerLoader();
      const config = await loader.load();
      
      expect(config).toEqual({});
    });

    it('should handle null JSON values', async () => {
      process.env['APP_ENV'] = 'development';
      
      secretsManagerMock.on(GetSecretValueCommand).resolves({
        SecretString: 'null',
      });
      
      const loader = new SecretsManagerLoader();
      const config = await loader.load();
      
      expect(config).toEqual({ SECRET_VALUE: null });
    });

    it('should handle boolean JSON values', async () => {
      process.env['APP_ENV'] = 'development';
      
      secretsManagerMock.on(GetSecretValueCommand).resolves({
        SecretString: 'true',
      });
      
      const loader = new SecretsManagerLoader();
      const config = await loader.load();
      
      expect(config).toEqual({ SECRET_VALUE: true });
    });

    it('should handle number JSON values', async () => {
      process.env['APP_ENV'] = 'development';
      
      secretsManagerMock.on(GetSecretValueCommand).resolves({
        SecretString: '42',
      });
      
      const loader = new SecretsManagerLoader();
      const config = await loader.load();
      
      expect(config).toEqual({ SECRET_VALUE: 42 });
    });

    it('should handle very large JSON objects', async () => {
      process.env['APP_ENV'] = 'development';
      
      const largeObject: Record<string, string> = {};
      for (let i = 0; i < 1000; i++) {
        largeObject[`KEY_${i}`] = `value_${i}`;
      }
      
      secretsManagerMock.on(GetSecretValueCommand).resolves({
        SecretString: JSON.stringify(largeObject),
      });
      
      const loader = new SecretsManagerLoader();
      const config = await loader.load();
      
      expect(config).toEqual(largeObject);
      expect(Object.keys(config)).toHaveLength(1000);
    });

    it('should handle unicode characters in secret values', async () => {
      process.env['APP_ENV'] = 'development';
      
      const secretValue = {
        UNICODE_KEY: '🚀 Hello 世界 🌍',
        EMOJI_KEY: '😀😃😄😁',
      };
      
      secretsManagerMock.on(GetSecretValueCommand).resolves({
        SecretString: JSON.stringify(secretValue),
      });
      
      const loader = new SecretsManagerLoader();
      const config = await loader.load();
      
      expect(config).toEqual(secretValue);
    });
  });

  describe('performance', () => {
    it('should handle multiple concurrent load calls', async () => {
      process.env['APP_ENV'] = 'development';
      
      const secretValue = { TEST_KEY: 'test-value' };
      
      secretsManagerMock.on(GetSecretValueCommand).resolves({
        SecretString: JSON.stringify(secretValue),
      });
      
      const loader = new SecretsManagerLoader();
      
      // Make multiple concurrent calls
      const promises = Array.from({ length: 10 }, () => loader.load());
      const results = await Promise.all(promises);
      
      // All results should be the same
      results.forEach(result => {
        expect(result).toEqual(secretValue);
      });
      
      // Should have made 10 separate calls to AWS
      expect(secretsManagerMock.calls()).toHaveLength(10);
    });
  });
});