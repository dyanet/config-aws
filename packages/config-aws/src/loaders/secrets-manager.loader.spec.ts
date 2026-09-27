/**
 * Unit tests for SecretsManagerLoader: environment-aware naming, secret
 * parsing, AWS error mapping and availability checks.
 */

import { SecretsManagerLoader } from './secrets-manager.loader';
import { AWSServiceError, ConfigurationLoadError } from '../errors';

jest.mock('@aws-sdk/client-secrets-manager', () => {
  const mockSend = jest.fn();
  const mockCredentials = jest.fn();
  return {
    SecretsManagerClient: jest.fn().mockImplementation(() => ({
      send: mockSend,
      config: { credentials: mockCredentials },
    })),
    GetSecretValueCommand: jest.fn().mockImplementation((input) => input),
    __mockSend: mockSend,
    __mockCredentials: mockCredentials,
  };
});

const sdk = () => require('@aws-sdk/client-secrets-manager');
const mockSend = () => sdk().__mockSend as jest.Mock;
const mockCredentials = () => sdk().__mockCredentials as jest.Mock;

function awsError(name: string, message = name): Error {
  const e = new Error(message);
  e.name = name;
  return e;
}

describe('SecretsManagerLoader', () => {
  const saved = { ...process.env };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env['APP_ENV'] = 'production';
    delete process.env['AWS_REGION'];
  });

  afterAll(() => {
    process.env = saved;
  });

  describe('naming', () => {
    it('prefixes the secret with the mapped environment', () => {
      const loader = new SecretsManagerLoader({ secretName: '/app/config' });
      expect(loader.buildSecretName()).toBe('/production/app/config');
      expect(loader.getName()).toBe('SecretsManagerLoader(/production/app/config)');
    });

    it('uses a custom environment mapping', () => {
      process.env['APP_ENV'] = 'staging';
      const loader = new SecretsManagerLoader({
        secretName: '/app',
        environmentMapping: { staging: 'stg' },
      });
      expect(loader.buildSecretName()).toBe('/stg/app');
      expect(loader.getEnvironmentMapping()).toEqual({ staging: 'stg' });
    });

    it('falls back to NODE_ENV, then "local"', () => {
      delete process.env['APP_ENV'];
      process.env['NODE_ENV'] = 'test';
      expect(new SecretsManagerLoader().getAppEnv()).toBe('test');
      delete process.env['NODE_ENV'];
      expect(new SecretsManagerLoader().getAppEnv()).toBe('local');
    });

    it('throws a ConfigurationLoadError (without recursing) for an unmapped environment', () => {
      process.env['APP_ENV'] = 'qa';
      const loader = new SecretsManagerLoader({ secretName: '/app' });
      expect(loader.getName()).toBe('SecretsManagerLoader(/app)');
      expect(() => loader.buildSecretName()).toThrow(ConfigurationLoadError);
      expect(() => loader.buildSecretName()).toThrow(/No environment mapping found for APP_ENV 'qa'/);
    });

    it('returns a copy of the mapping, not the internal object', () => {
      const loader = new SecretsManagerLoader();
      loader.getEnvironmentMapping()['production'] = 'tampered';
      expect(loader.buildSecretName()).toBe('/production/nestjs-config-aws');
    });
  });

  describe('load()', () => {
    it('returns {} in the local environment without calling AWS', async () => {
      process.env['APP_ENV'] = 'local';
      await expect(new SecretsManagerLoader().load()).resolves.toEqual({});
      expect(mockSend()).not.toHaveBeenCalled();
    });

    it('requests the environment-prefixed SecretId in the configured region', async () => {
      mockSend().mockResolvedValue({ SecretString: '{"A":"1"}' });
      await new SecretsManagerLoader({ secretName: '/svc', region: 'eu-west-1' }).load();
      expect(mockSend().mock.calls[0][0]).toEqual({ SecretId: '/production/svc' });
      expect(sdk().SecretsManagerClient).toHaveBeenCalledWith({ region: 'eu-west-1' });
    });

    it('reuses one client across calls', async () => {
      mockSend().mockResolvedValue({ SecretString: '{}' });
      const loader = new SecretsManagerLoader();
      await loader.load();
      await loader.load();
      expect(sdk().SecretsManagerClient).toHaveBeenCalledTimes(1);
    });

    it.each([
      ['a JSON object', '{"DB_HOST":"db","PORT":5432}', { DB_HOST: 'db', PORT: 5432 }],
      ['a JSON array', '[1,2]', { SECRET_VALUE: [1, 2] }],
      ['a JSON scalar', '42', { SECRET_VALUE: 42 }],
      ['JSON null', 'null', { SECRET_VALUE: null }],
      ['a plain string', 'hunter2', { SECRET_VALUE: 'hunter2' }],
    ])('parses %s', async (_label, secret, expected) => {
      mockSend().mockResolvedValue({ SecretString: secret });
      await expect(new SecretsManagerLoader().load()).resolves.toEqual(expected);
    });

    it('returns {} for a binary-only secret (no SecretString)', async () => {
      mockSend().mockResolvedValue({ SecretBinary: new Uint8Array([1]) });
      await expect(new SecretsManagerLoader().load()).resolves.toEqual({});
    });

    it('treats a missing secret as empty configuration', async () => {
      mockSend().mockRejectedValue(awsError('ResourceNotFoundException'));
      await expect(new SecretsManagerLoader().load()).resolves.toEqual({});
    });

    it.each([
      ['AccessDeniedException', /Access denied when retrieving secret '\/production\/nestjs-config-aws'/],
      ['InvalidRequestException', /Invalid request when retrieving secret/],
      ['ThrottlingException', /Failed to retrieve secret .* Rate exceeded/],
    ])('maps %s to an AWSServiceError', async (name, message) => {
      mockSend().mockRejectedValue(awsError(name, name === 'ThrottlingException' ? 'Rate exceeded' : name));
      const err = await new SecretsManagerLoader().load().catch((e) => e);
      expect(err).toBeInstanceOf(AWSServiceError);
      expect(err.message).toMatch(message);
    });

    it('wraps non-Error rejections too', async () => {
      mockSend().mockRejectedValue('socket hang up');
      await expect(new SecretsManagerLoader().load()).rejects.toThrow(/socket hang up/);
    });

    it('fails with ConfigurationLoadError before calling AWS when the environment is unmapped', async () => {
      process.env['APP_ENV'] = 'qa';
      await expect(new SecretsManagerLoader().load()).rejects.toBeInstanceOf(ConfigurationLoadError);
      expect(mockSend()).not.toHaveBeenCalled();
    });
  });

  describe('isAvailable()', () => {
    it('is false locally without touching the SDK', async () => {
      process.env['APP_ENV'] = 'local';
      await expect(new SecretsManagerLoader().isAvailable()).resolves.toBe(false);
      expect(mockCredentials()).not.toHaveBeenCalled();
    });

    it('is true when the credential chain resolves', async () => {
      mockCredentials().mockResolvedValue({ accessKeyId: 'x' });
      await expect(new SecretsManagerLoader().isAvailable()).resolves.toBe(true);
    });

    it('is false when the credential chain rejects', async () => {
      mockCredentials().mockRejectedValue(new Error('no creds'));
      await expect(new SecretsManagerLoader().isAvailable()).resolves.toBe(false);
    });
  });
});
