/**
 * Tests for the `awsConfigLoader` factory helper used with `@nestjs/config`.
 *
 * AWS sources are disabled in these tests so no AWS SDK / network access is
 * required; the environment loader exercises the merge + validation path.
 */

import { z } from 'zod';
import { awsConfigLoader } from '../aws-config-loader';
import { buildAwsLoaders } from '../build-loaders';
import { ValidationError } from '@dyanet/config-aws';

// Disable AWS loaders so the factory only reads environment variables.
const NO_AWS = {
  secretsManagerConfig: { enabled: false },
  ssmConfig: { enabled: false },
} as const;

describe('awsConfigLoader', () => {
  const added: string[] = [];
  const setEnv = (key: string, value: string) => {
    process.env[key] = value;
    added.push(key);
  };

  afterEach(() => {
    for (const key of added) {
      delete process.env[key];
    }
    added.length = 0;
  });

  it('returns a factory function (ConfigFactory shape)', () => {
    const factory = awsConfigLoader(NO_AWS);
    expect(typeof factory).toBe('function');
  });

  it('loads prefixed environment variables when the factory is invoked', async () => {
    setEnv('AWSLOADER_TEST_FOO', 'bar');

    const factory = awsConfigLoader({ ...NO_AWS, envPrefix: 'AWSLOADER_TEST_' });
    const config = await factory();

    expect(config.FOO).toBe('bar');
  });

  it('validates and coerces against a provided schema', async () => {
    setEnv('AWSLOADER_PORT', '3000');

    const schema = z.object({ PORT: z.coerce.number() });
    const factory = awsConfigLoader({ ...NO_AWS, envPrefix: 'AWSLOADER_', schema });
    const config = await factory();

    expect(config.PORT).toBe(3000);
  });

  it('throws ValidationError when schema validation fails', async () => {
    const schema = z.object({ REQUIRED_KEY: z.string() });
    const factory = awsConfigLoader({
      ...NO_AWS,
      envPrefix: 'AWSLOADER_NONEXISTENT_PREFIX_',
      schema,
    });

    await expect(factory()).rejects.toThrow(ValidationError);
  });

  it('does not validate when no schema is provided', async () => {
    setEnv('AWSLOADER_ANY', 'value');

    const factory = awsConfigLoader({ ...NO_AWS, envPrefix: 'AWSLOADER_' });
    await expect(factory()).resolves.toBeDefined();
  });
});

describe('buildAwsLoaders', () => {
  it('builds only the environment loader when AWS sources are disabled', () => {
    const loaders = buildAwsLoaders(NO_AWS);
    expect(loaders).toHaveLength(1);
    expect(loaders[0]!.getName()).toBe('EnvironmentLoader');
  });

  it('includes Secrets Manager and SSM loaders by default', () => {
    const loaders = buildAwsLoaders({});
    const names = loaders.map((l) => l.getName());
    expect(names).toHaveLength(3);
    expect(names[0]).toBe('EnvironmentLoader');
    expect(names[1]).toMatch(/^SecretsManagerLoader/);
    expect(names[2]).toMatch(/^SSMParameterStoreLoader/);
  });

  describe('simple `aws` option (mirrors the Next.js adapter)', () => {
    it('adds only a Secrets Manager loader for `aws.secretName`', () => {
      const loaders = buildAwsLoaders({ aws: { secretName: '/my-app/config' } });
      const names = loaders.map((l) => l.getName());
      expect(names).toHaveLength(2);
      expect(names[0]).toBe('EnvironmentLoader');
      expect(names[1]).toMatch(/^SecretsManagerLoader/);
    });

    it('adds only an SSM loader for `aws.ssmPrefix`', () => {
      const loaders = buildAwsLoaders({ aws: { ssmPrefix: '/my-app' } });
      const names = loaders.map((l) => l.getName());
      expect(names).toHaveLength(2);
      expect(names[0]).toBe('EnvironmentLoader');
      expect(names[1]).toMatch(/^SSMParameterStoreLoader/);
    });

    it('adds both AWS loaders when both are named', () => {
      const loaders = buildAwsLoaders({ aws: { secretName: '/s', ssmPrefix: '/p' } });
      expect(loaders.map((l) => l.getName())).toHaveLength(3);
    });

    it('takes precedence over secretsManagerConfig/ssmConfig', () => {
      // Only the `aws`-named source (secrets) is added; the granular ssmConfig is ignored.
      const loaders = buildAwsLoaders({
        aws: { secretName: '/s' },
        ssmConfig: { enabled: true },
      });
      const names = loaders.map((l) => l.getName());
      expect(names).toHaveLength(2);
      expect(names[1]).toMatch(/^SecretsManagerLoader/);
    });
  });
});
