import { z } from 'zod';

/**
 * Default configuration schema using Zod.
 * Provides a flexible base schema that can be extended by applications.
 */
export const defaultConfigSchema = z.object({
  /** Node.js environment */
  NODE_ENV: z.enum(['production', 'development', 'test']).optional(),
  
  /** Application environment (mirrors NODE_ENV with 'local' default) */
  APP_ENV: z.enum(['production', 'test', 'development', 'local']).default('local'),
  
  /** AWS region for services */
  AWS_REGION: z.string().optional(),
  
  /** AWS profile for local development */
  AWS_PROFILE: z.string().optional(),
  
  /** Application port */
  PORT: z.coerce.number().positive().optional(),
  
  /** Application host */
  HOST: z.string().optional(),
  
  /** Log level */
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug', 'verbose']).optional(),
  
  /** Database URL */
  DATABASE_URL: z.string().url().optional(),
  
  /** Redis URL */
  REDIS_URL: z.string().url().optional(),
});

/**
 * Type inference for the default configuration schema.
 */
export type DefaultConfigSchema = z.infer<typeof defaultConfigSchema>;

/**
 * Environment-specific validation schemas.
 */
export const environmentSchemas = {
  local: defaultConfigSchema.extend({
    // Local environment may have fewer required fields
    AWS_REGION: z.string().optional(),
  }),
  
  development: defaultConfigSchema.extend({
    // Development environment requirements
    AWS_REGION: z.string().min(1, 'AWS_REGION is required in development'),
  }),
  
  test: defaultConfigSchema.extend({
    // Test environment requirements
    AWS_REGION: z.string().min(1, 'AWS_REGION is required in test'),
  }),
  
  production: defaultConfigSchema.extend({
    // Production environment requirements
    AWS_REGION: z.string().min(1, 'AWS_REGION is required in production'),
    LOG_LEVEL: z.enum(['error', 'warn', 'info']).default('info'),
  }),
};

/**
 * Helper function to get the appropriate schema for the current environment.
 */
export function getSchemaForEnvironment(appEnv: string): z.ZodSchema {
  const env = appEnv as keyof typeof environmentSchemas;
  return environmentSchemas[env] || defaultConfigSchema;
}

/**
 * Validation helper for APP_ENV values.
 */
export const appEnvSchema = z.enum(['production', 'test', 'development', 'local']);

/**
 * Type for valid APP_ENV values.
 */
export type AppEnv = z.infer<typeof appEnvSchema>;