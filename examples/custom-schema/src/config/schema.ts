import { z } from 'zod';

/**
 * Comprehensive configuration schema demonstrating various Zod features
 * and real-world configuration patterns.
 */
export const appConfigSchema = z.object({
  // Environment Configuration
  APP_ENV: z.enum(['local', 'development', 'test', 'production']).default('local'),
  NODE_ENV: z.enum(['development', 'test', 'production']).optional(),
  
  // Server Configuration
  PORT: z.coerce.number().min(1).max(65535).default(3000),
  HOST: z.string().default('localhost'),
  
  // Database Configuration
  DATABASE_URL: z.string().url('Invalid database URL format'),
  DATABASE_POOL_SIZE: z.coerce.number().min(1).max(100).default(10),
  DATABASE_TIMEOUT: z.coerce.number().min(1000).default(30000),
  DATABASE_SSL: z.coerce.boolean().default(false),
  
  // Redis Configuration (optional)
  REDIS_URL: z.string().url().optional(),
  REDIS_TTL: z.coerce.number().min(60).default(3600),
  
  // External API Configuration
  API_KEY: z.string().min(1, 'API key is required'),
  API_BASE_URL: z.string().url().default('https://api.example.com'),
  API_TIMEOUT: z.coerce.number().min(1000).default(10000),
  API_RETRY_ATTEMPTS: z.coerce.number().min(0).max(10).default(3),
  
  // Security Configuration
  JWT_SECRET: z.string().min(32, 'JWT secret must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('1h'),
  BCRYPT_ROUNDS: z.coerce.number().min(8).max(15).default(12),
  
  // Feature Flags
  ENABLE_LOGGING: z.coerce.boolean().default(true),
  ENABLE_METRICS: z.coerce.boolean().default(false),
  ENABLE_SWAGGER: z.coerce.boolean().default(false),
  DEBUG_MODE: z.coerce.boolean().default(false),
  
  // Logging Configuration
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  LOG_FORMAT: z.enum(['json', 'text']).default('json'),
  
  // AWS Configuration
  AWS_REGION: z.string().optional(),
  AWS_S3_BUCKET: z.string().optional(),
  
  // Email Configuration (optional)
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().min(1).max(65535).optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  
  // Rate Limiting
  RATE_LIMIT_WINDOW: z.coerce.number().min(1000).default(60000), // 1 minute
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().min(1).default(100),
  
  // File Upload Configuration
  MAX_FILE_SIZE: z.coerce.number().min(1024).default(10485760), // 10MB
  ALLOWED_FILE_TYPES: z.string()
    .transform(val => val.split(',').map(type => type.trim()))
    .pipe(z.array(z.string()))
    .default('jpg,jpeg,png,pdf'),
  
  // Custom transformations and validations
  TAGS: z.string()
    .transform(val => val.split(',').map(tag => tag.trim().toLowerCase()))
    .pipe(z.array(z.string().min(1)))
    .default('app,nestjs'),
    
  // Complex nested configuration
  CORS_ORIGINS: z.string()
    .transform(val => val.split(',').map(origin => origin.trim()))
    .pipe(z.array(z.string().url().or(z.literal('*'))))
    .default('http://localhost:3000'),
});

// Infer the TypeScript type from the schema
export type AppConfig = z.infer<typeof appConfigSchema>;

// Environment-specific schema variations
export const getEnvironmentSpecificSchema = (env: string) => {
  const baseSchema = appConfigSchema;
  
  switch (env) {
    case 'production':
      return baseSchema.extend({
        // Production requires HTTPS and stricter security
        ENABLE_SWAGGER: z.literal(false),
        DEBUG_MODE: z.literal(false),
        DATABASE_SSL: z.literal(true),
        LOG_LEVEL: z.enum(['error', 'warn', 'info']).default('warn'),
      });
      
    case 'development':
      return baseSchema.extend({
        // Development allows more relaxed settings
        ENABLE_SWAGGER: z.coerce.boolean().default(true),
        DEBUG_MODE: z.coerce.boolean().default(true),
        LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('debug'),
      });
      
    case 'test':
      return baseSchema.extend({
        // Test environment specific overrides
        DATABASE_URL: z.string().url().default('postgres://localhost:5432/test_db'),
        ENABLE_LOGGING: z.literal(false),
        LOG_LEVEL: z.literal('error'),
      });
      
    default:
      return baseSchema;
  }
};

// Configuration validation helpers
export const validateConfig = (config: unknown): AppConfig => {
  const result = appConfigSchema.safeParse(config);
  
  if (!result.success) {
    const errors = result.error.errors.map(err => 
      `${err.path.join('.')}: ${err.message}`
    ).join(', ');
    
    throw new Error(`Configuration validation failed: ${errors}`);
  }
  
  return result.data;
};

// Configuration defaults for different environments
export const getDefaultConfig = (env: string): Partial<AppConfig> => {
  const defaults: Record<string, Partial<AppConfig>> = {
    local: {
      DEBUG_MODE: true,
      ENABLE_SWAGGER: true,
      LOG_LEVEL: 'debug',
      DATABASE_SSL: false,
    },
    development: {
      DEBUG_MODE: true,
      ENABLE_SWAGGER: true,
      ENABLE_METRICS: true,
      LOG_LEVEL: 'debug',
    },
    test: {
      ENABLE_LOGGING: false,
      LOG_LEVEL: 'error',
      DATABASE_POOL_SIZE: 5,
    },
    production: {
      DEBUG_MODE: false,
      ENABLE_SWAGGER: false,
      LOG_LEVEL: 'warn',
      DATABASE_SSL: true,
      ENABLE_METRICS: true,
    },
  };
  
  return defaults[env] || {};
};