import * as Joi from 'joi';

// Joi validation schema for configuration
export const configValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  
  PORT: Joi.number().port().default(3000),
  
  // Database configuration
  DATABASE_HOST: Joi.string().default('localhost'),
  DATABASE_PORT: Joi.number().port().default(5432),
  DATABASE_USERNAME: Joi.string().default('postgres'),
  DATABASE_PASSWORD: Joi.string().required(),
  DATABASE_NAME: Joi.string().default('myapp'),
  DATABASE_SSL: Joi.boolean().default(false),
  DATABASE_POOL_SIZE: Joi.number().min(1).default(10),
  DATABASE_CONNECTION_TIMEOUT: Joi.number().min(1000).default(30000),
  
  // External services
  API_KEY: Joi.string().required(),
  REDIS_URL: Joi.string().uri().optional(),
  
  // Application settings
  LOG_LEVEL: Joi.string()
    .valid('error', 'warn', 'info', 'debug', 'verbose')
    .default('info'),
  DEBUG_MODE: Joi.boolean().default(false),
  ENABLE_METRICS: Joi.boolean().default(false),
  
  // Security settings
  JWT_SECRET: Joi.string().min(32).optional(),
  ENCRYPTION_KEY: Joi.string().min(32).optional(),
  
  // Feature flags
  ENABLE_NEW_FEATURE: Joi.boolean().default(false),
  ENABLE_EXPERIMENTAL_FEATURE: Joi.boolean().default(false),
  
  // AWS Integration settings
  AWS_REGION: Joi.string().optional(),
  ENABLE_AWS_INTEGRATION: Joi.boolean().default(false),
  PRECEDENCE_RULE: Joi.string()
    .valid('aws-first', 'local-first', 'merge')
    .default('aws-first'),
  FAIL_ON_AWS_ERROR: Joi.boolean().default(false),
});

// Validation function for @nestjs/config
export function validateConfig(config: Record<string, unknown>) {
  const { error, value } = configValidationSchema.validate(config, {
    allowUnknown: true,
    abortEarly: false,
  });

  if (error) {
    throw new Error(`Configuration validation error: ${error.message}`);
  }

  return value;
}

// Class-validator approach (alternative)
import { IsString, IsNumber, IsBoolean, IsOptional, IsIn, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';

export class EnvironmentVariables {
  @IsString()
  @IsIn(['development', 'production', 'test'])
  NODE_ENV: string = 'development';

  @IsNumber()
  @Min(1)
  @Max(65535)
  @Transform(({ value }) => parseInt(value, 10))
  PORT: number = 3000;

  // Database configuration
  @IsString()
  DATABASE_HOST: string = 'localhost';

  @IsNumber()
  @Min(1)
  @Max(65535)
  @Transform(({ value }) => parseInt(value, 10))
  DATABASE_PORT: number = 5432;

  @IsString()
  DATABASE_USERNAME: string = 'postgres';

  @IsString()
  DATABASE_PASSWORD: string;

  @IsString()
  DATABASE_NAME: string = 'myapp';

  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  DATABASE_SSL: boolean = false;

  @IsNumber()
  @Min(1)
  @Transform(({ value }) => parseInt(value, 10))
  DATABASE_POOL_SIZE: number = 10;

  @IsNumber()
  @Min(1000)
  @Transform(({ value }) => parseInt(value, 10))
  DATABASE_CONNECTION_TIMEOUT: number = 30000;

  // External services
  @IsString()
  API_KEY: string;

  @IsOptional()
  @IsString()
  REDIS_URL?: string;

  // Application settings
  @IsString()
  @IsIn(['error', 'warn', 'info', 'debug', 'verbose'])
  LOG_LEVEL: string = 'info';

  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  DEBUG_MODE: boolean = false;

  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  ENABLE_METRICS: boolean = false;

  // Security settings
  @IsOptional()
  @IsString()
  JWT_SECRET?: string;

  @IsOptional()
  @IsString()
  ENCRYPTION_KEY?: string;

  // Feature flags
  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  ENABLE_NEW_FEATURE: boolean = false;

  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  ENABLE_EXPERIMENTAL_FEATURE: boolean = false;

  // AWS Integration settings
  @IsOptional()
  @IsString()
  AWS_REGION?: string;

  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  ENABLE_AWS_INTEGRATION: boolean = false;

  @IsString()
  @IsIn(['aws-first', 'local-first', 'merge'])
  PRECEDENCE_RULE: string = 'aws-first';

  @IsBoolean()
  @Transform(({ value }) => value === 'true')
  FAIL_ON_AWS_ERROR: boolean = false;
}