import {
  ConfigLoader,
  EnvironmentLoader,
  SecretsManagerLoader,
  SSMParameterStoreLoader,
} from '@dyanet/config-aws';

import { AwsOptions, SecretsManagerConfig, SSMConfig } from './interfaces/module-options.interface';

/**
 * The AWS configuration sources used to build a set of loaders.
 * Shared by {@link ConfigModule} and {@link awsConfigLoader} so both produce an
 * identical loader chain.
 */
export interface AwsLoaderSources {
  /** Prefix for environment variables (e.g. `APP_`). */
  envPrefix?: string;
  /**
   * Simple AWS options (`{ secretName, ssmPrefix, region }`) — mirrors the Next.js
   * adapter. When set, exactly the named sources are added and the granular
   * `secretsManagerConfig` / `ssmConfig` options below are ignored.
   */
  aws?: AwsOptions;
  /** AWS Secrets Manager configuration (advanced). Omit or set `enabled: false` to skip. */
  secretsManagerConfig?: SecretsManagerConfig;
  /** AWS SSM Parameter Store configuration (advanced). Omit or set `enabled: false` to skip. */
  ssmConfig?: SSMConfig;
}

/**
 * Map an optional `{ development, test, production }` path config to the
 * environment mapping expected by the AWS loaders, falling back to sensible
 * defaults. Returns `undefined` when no paths are supplied so the loader uses
 * its own defaults.
 */
function toEnvironmentMapping(
  paths?: { development?: string; test?: string; production?: string },
): Record<string, string> | undefined {
  if (!paths) {
    return undefined;
  }
  return {
    development: paths.development || 'dev',
    test: paths.test || 'test',
    production: paths.production || 'production',
  };
}

/**
 * Build the configuration loader chain from AWS source options.
 *
 * Order (lowest precedence first): environment variables, then Secrets Manager,
 * then SSM Parameter Store. The AWS loaders skip themselves automatically when
 * unavailable (e.g. in a local environment or without credentials).
 */
export function buildAwsLoaders(options: AwsLoaderSources): ConfigLoader[] {
  const loaders: ConfigLoader[] = [];

  // Always add environment loader first (lowest precedence)
  loaders.push(new EnvironmentLoader({ prefix: options.envPrefix }));

  // Simple, Next.js-style `aws` option: add exactly the named sources.
  if (options.aws) {
    const { secretName, ssmPrefix, region } = options.aws;
    if (secretName) {
      loaders.push(new SecretsManagerLoader({ secretName, region }));
    }
    if (ssmPrefix) {
      loaders.push(new SSMParameterStoreLoader({ parameterPath: ssmPrefix, region }));
    }
    return loaders;
  }

  if (options.secretsManagerConfig?.enabled !== false) {
    loaders.push(
      new SecretsManagerLoader({
        region: options.secretsManagerConfig?.region,
        environmentMapping: toEnvironmentMapping(options.secretsManagerConfig?.paths),
      }),
    );
  }

  if (options.ssmConfig?.enabled !== false) {
    loaders.push(
      new SSMParameterStoreLoader({
        region: options.ssmConfig?.region,
        withDecryption: options.ssmConfig?.decrypt,
        environmentMapping: toEnvironmentMapping(options.ssmConfig?.paths),
      }),
    );
  }

  return loaders;
}
