import { ConfigManager } from '@dyanet/config-aws';
import type { PrecedenceStrategy } from '@dyanet/config-aws';
import type { ZodType } from 'zod';

import { AwsOptions, SecretsManagerConfig, SSMConfig } from './interfaces/module-options.interface';
import { buildAwsLoaders } from './build-loaders';

/**
 * Options for {@link awsConfigLoader}.
 */
export interface AwsConfigLoaderOptions<T extends Record<string, unknown> = Record<string, unknown>> {
  /** Zod schema for validation. When provided, the merged config is validated. */
  schema?: ZodType<T>;
  /**
   * Simple AWS options (`{ secretName, ssmPrefix, region }`) — the same shape as the
   * Next.js adapter's `getConfig`. When set, takes precedence over the granular
   * `secretsManagerConfig` / `ssmConfig` options.
   */
  aws?: AwsOptions;
  /** AWS Secrets Manager configuration (advanced). Omit or set `enabled: false` to skip. */
  secretsManagerConfig?: SecretsManagerConfig;
  /** AWS SSM Parameter Store configuration (advanced). Omit or set `enabled: false` to skip. */
  ssmConfig?: SSMConfig;
  /** Prefix for environment variables (e.g. `APP_`). */
  envPrefix?: string;
  /**
   * Precedence strategy for merging sources.
   * @default 'aws-first'
   */
  precedence?: PrecedenceStrategy;
  /**
   * Whether to validate the merged config against `schema`.
   * @default true when a schema is provided, otherwise false
   */
  validate?: boolean;
  /** Enable verbose loader logging. @default false */
  enableLogging?: boolean;
}

/**
 * Create a configuration factory that loads from AWS sources (Secrets Manager,
 * SSM Parameter Store) and environment variables, for use with the standard
 * `@nestjs/config` `ConfigModule`.
 *
 * The returned function matches `@nestjs/config`'s `ConfigFactory` shape, so drop
 * it straight into the `load` array — no extra module to import, and
 * `@nestjs/config` stays an optional peer dependency of this package.
 *
 * @example
 * ```typescript
 * import { ConfigModule } from '@nestjs/config';
 * import { awsConfigLoader } from '@dyanet/nestjs-config-aws';
 *
 * @Module({
 *   imports: [
 *     ConfigModule.forRoot({
 *       isGlobal: true,
 *       // Simple `aws` shape — same as the Next.js adapter's getConfig:
 *       load: [awsConfigLoader({ aws: { secretName: '/my-app/config' } })],
 *     }),
 *   ],
 * })
 * export class AppModule {}
 * ```
 *
 * @example Namespaced (compose with `@nestjs/config`'s `registerAs`):
 * ```typescript
 * import { ConfigModule, registerAs } from '@nestjs/config';
 *
 * ConfigModule.forRoot({
 *   load: [registerAs('database', awsConfigLoader({ ssmConfig: { paths: { production: '/db' } } }))],
 * });
 * ```
 *
 * @param options Loader options.
 * @returns A factory `() => Promise<T>` suitable for `ConfigModule`'s `load` array.
 */
export function awsConfigLoader<T extends Record<string, unknown> = Record<string, unknown>>(
  options: AwsConfigLoaderOptions<T> = {},
): () => Promise<T> {
  return async (): Promise<T> => {
    const manager = new ConfigManager<T>({
      loaders: buildAwsLoaders(options),
      schema: options.schema,
      precedence: options.precedence ?? 'aws-first',
      validateOnLoad: options.validate ?? Boolean(options.schema),
      enableLogging: options.enableLogging ?? false,
    });

    await manager.load();
    return manager.getAll();
  };
}
