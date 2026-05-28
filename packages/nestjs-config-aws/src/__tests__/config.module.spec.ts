/**
 * Tests for ConfigModule.forRoot / forRootAsync, including the v2 behavior that no
 * default schema is imposed when `schema` is omitted (values pass through unvalidated).
 *
 * AWS sources are disabled so these tests need no AWS SDK / network access.
 */

import { z } from 'zod';
import type { Provider } from '@nestjs/common';
import { ConfigModule } from '../config.module';
import { ConfigService } from '../interfaces/config-service.interface';
import { ValidationError } from '@dyanet/config-aws';

const NO_AWS = { secretsManagerConfig: { enabled: false }, ssmConfig: { enabled: false } } as const;

// Pull the ConfigService provider's factory out of a DynamicModule and invoke it.
async function instantiateService(dynamicModule: {
  providers?: Provider[];
}): Promise<ConfigService> {
  const provider = (dynamicModule.providers ?? []).find(
    (p): p is Extract<Provider, { provide: unknown; useFactory: unknown }> =>
      typeof p === 'object' && p !== null && 'provide' in p && p.provide === ConfigService,
  );
  if (!provider || typeof (provider as { useFactory?: unknown }).useFactory !== 'function') {
    throw new Error('ConfigService provider with a useFactory was not found');
  }
  const useFactory = (provider as { useFactory: (...args: unknown[]) => Promise<ConfigService> }).useFactory;
  const inject = (provider as { inject?: unknown[] }).inject ?? [];
  // For forRootAsync the factory expects the resolved options as its first arg.
  return useFactory(...inject.map(() => undefined));
}

describe('ConfigModule', () => {
  const added: string[] = [];
  const setEnv = (key: string, value: string) => {
    process.env[key] = value;
    added.push(key);
  };

  afterEach(() => {
    for (const key of added) delete process.env[key];
    added.length = 0;
  });

  it('forRoot returns a global DynamicModule', () => {
    const dm = ConfigModule.forRoot();
    expect(dm.module).toBe(ConfigModule);
    expect(dm.global).toBe(true);
    expect(dm.exports).toContain(ConfigService);
  });

  it('does not impose any built-in schema when `schema` is not provided', async () => {
    // With no schema, arbitrary APP_ENV values (and any other env vars) must pass
    // through untouched rather than being validated against any built-in shape.
    setEnv('APP_ENV', 'staging');
    setEnv('CONFIGMODULE_TEST_KEY', 'hello');

    const service = await instantiateService(ConfigModule.forRoot(NO_AWS));

    expect(service.isInitialized()).toBe(true);
    expect((service.getAll() as Record<string, unknown>).APP_ENV).toBe('staging');
    expect((service.getAll() as Record<string, unknown>).CONFIGMODULE_TEST_KEY).toBe('hello');
  });

  it('validates against a provided schema and coerces values', async () => {
    setEnv('CONFIGMODULE_PORT', '8080');

    const schema = z.object({ CONFIGMODULE_PORT: z.coerce.number() });
    const service = await instantiateService(
      ConfigModule.forRoot({ ...NO_AWS, schema }),
    );

    expect(service.get('CONFIGMODULE_PORT' as never)).toBe(8080);
  });

  it('throws ValidationError when a provided schema is not satisfied', async () => {
    const schema = z.object({ CONFIGMODULE_REQUIRED: z.string() });

    await expect(
      instantiateService(ConfigModule.forRoot({ ...NO_AWS, schema })),
    ).rejects.toThrow(ValidationError);
  });

  it('forRootAsync returns a DynamicModule with async providers', () => {
    const dm = ConfigModule.forRootAsync({ useFactory: () => ({ ...NO_AWS }) });
    expect(dm.module).toBe(ConfigModule);
    expect(dm.global).toBe(true);
  });
});
