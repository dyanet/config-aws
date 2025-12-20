/**
 * @dyanet/nextjs-config-aws
 *
 * Next.js adapter for AWS configuration management.
 * Provides a simplified, opinionated API for loading configuration
 * with automatic environment detection and AWS integration.
 *
 * @example
 * ```typescript
 * // Server-side configuration loading
 * import { getConfig } from '@dyanet/nextjs-config-aws';
 *
 * const config = await getConfig({
 *   schema: mySchema,
 *   aws: { secretName: '/myapp/config' }
 * });
 * ```
 *
 * @example
 * ```typescript
 * // Runtime environment variables for client
 * // In layout.tsx (server component)
 * import { PublicEnvScript } from '@dyanet/nextjs-config-aws';
 *
 * <PublicEnvScript publicVars={['API_URL', 'APP_NAME']} />
 *
 * // In client component
 * import { env } from '@dyanet/nextjs-config-aws';
 *
 * const apiUrl = env('API_URL');
 * ```
 *
 * @remarks
 * For advanced loader access, custom loaders, or direct AWS SDK integration,
 * import from `@dyanet/config-aws` directly:
 *
 * ```typescript
 * import {
 *   ConfigManager,
 *   EnvironmentLoader,
 *   SecretsManagerLoader,
 *   SSMParameterStoreLoader,
 * } from '@dyanet/config-aws';
 * ```
 *
 * @packageDocumentation
 */

// Error classes for error handling
export { ConfigurationError, ValidationError } from '@dyanet/config-aws';

// Server-side configuration loading
export { getConfig, type NextConfigOptions } from './server';

// Component for runtime environment variables
export { PublicEnvScript, type PublicEnvScriptProps } from './components';

// Client-side environment variable access
export { env } from './client';
