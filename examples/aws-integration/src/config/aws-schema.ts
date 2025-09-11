import { z } from 'zod';

/**
 * AWS-focused configuration schema demonstrating comprehensive
 * AWS service integration patterns and environment-aware configuration.
 */
export const awsConfigSchema = z.object({
  // Environment Configuration
  APP_ENV: z.enum(['local', 'development', 'test', 'production']).default('local'),
  NODE_ENV: z.enum(['development', 'test', 'production']).optional(),
  
  // Server Configuration
  PORT: z.coerce.number().min(1).max(65535).default(3000),
  HOST: z.string().default('localhost'),
  
  // AWS Core Configuration
  AWS_REGION: z.string().min(1, 'AWS region is required for non-local environments'),
  AWS_ACCOUNT_ID: z.string().regex(/^\d{12}$/, 'AWS Account ID must be 12 digits').optional(),
  
  // Database Configuration (RDS)
  DATABASE_URL: z.string().url('Invalid database URL format'),
  DATABASE_POOL_SIZE: z.coerce.number().min(1).max(100).default(10),
  DATABASE_TIMEOUT: z.coerce.number().min(1000).default(30000),
  DATABASE_SSL: z.coerce.boolean().default(false),
  RDS_INSTANCE_IDENTIFIER: z.string().optional(),
  
  // ElastiCache Redis Configuration
  REDIS_CLUSTER_ENDPOINT: z.string().optional(),
  REDIS_PORT: z.coerce.number().min(1).max(65535).default(6379),
  REDIS_TTL: z.coerce.number().min(60).default(3600),
  REDIS_AUTH_TOKEN: z.string().optional(),
  
  // S3 Configuration
  AWS_S3_BUCKET: z.string().min(1, 'S3 bucket name is required'),
  AWS_S3_REGION: z.string().optional(), // Falls back to AWS_REGION
  S3_UPLOAD_PREFIX: z.string().default('uploads/'),
  S3_PRESIGNED_URL_EXPIRES: z.coerce.number().min(60).default(3600),
  
  // CloudWatch Configuration
  CLOUDWATCH_LOG_GROUP: z.string().default('/aws/lambda/myapp'),
  CLOUDWATCH_LOG_STREAM: z.string().optional(),
  ENABLE_CLOUDWATCH_METRICS: z.coerce.boolean().default(true),
  
  // SQS Configuration
  SQS_QUEUE_URL: z.string().url().optional(),
  SQS_DEAD_LETTER_QUEUE_URL: z.string().url().optional(),
  SQS_VISIBILITY_TIMEOUT: z.coerce.number().min(0).max(43200).default(30),
  SQS_MESSAGE_RETENTION: z.coerce.number().min(60).max(1209600).default(345600),
  
  // SNS Configuration
  SNS_TOPIC_ARN: z.string().regex(/^arn:aws:sns:/, 'Invalid SNS topic ARN format').optional(),
  SNS_PLATFORM_APPLICATION_ARN: z.string().regex(/^arn:aws:sns:/, 'Invalid SNS platform application ARN').optional(),
  
  // Lambda Configuration
  LAMBDA_FUNCTION_NAME: z.string().optional(),
  LAMBDA_TIMEOUT: z.coerce.number().min(1).max(900).default(30),
  LAMBDA_MEMORY_SIZE: z.coerce.number().min(128).max(10240).default(512),
  
  // API Gateway Configuration
  API_GATEWAY_URL: z.string().url().optional(),
  API_GATEWAY_STAGE: z.enum(['dev', 'test', 'prod']).default('dev'),
  API_GATEWAY_API_KEY: z.string().optional(),
  
  // Cognito Configuration
  COGNITO_USER_POOL_ID: z.string().optional(),
  COGNITO_CLIENT_ID: z.string().optional(),
  COGNITO_REGION: z.string().optional(),
  
  // DynamoDB Configuration
  DYNAMODB_TABLE_PREFIX: z.string().default('myapp'),
  DYNAMODB_READ_CAPACITY: z.coerce.number().min(1).default(5),
  DYNAMODB_WRITE_CAPACITY: z.coerce.number().min(1).default(5),
  
  // External API Configuration
  API_KEY: z.string().min(1, 'API key is required'),
  API_BASE_URL: z.string().url().default('https://api.example.com'),
  API_TIMEOUT: z.coerce.number().min(1000).default(10000),
  API_RETRY_ATTEMPTS: z.coerce.number().min(0).max(10).default(3),
  
  // Security Configuration
  JWT_SECRET: z.string().min(32, 'JWT secret must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('1h'),
  BCRYPT_ROUNDS: z.coerce.number().min(8).max(15).default(12),
  
  // KMS Configuration
  KMS_KEY_ID: z.string().optional(),
  KMS_ALIAS: z.string().optional(),
  
  // Feature Flags
  ENABLE_LOGGING: z.coerce.boolean().default(true),
  ENABLE_METRICS: z.coerce.boolean().default(true),
  ENABLE_SWAGGER: z.coerce.boolean().default(false),
  DEBUG_MODE: z.coerce.boolean().default(false),
  ENABLE_X_RAY_TRACING: z.coerce.boolean().default(false),
  
  // Logging Configuration
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  LOG_FORMAT: z.enum(['json', 'text']).default('json'),
  
  // Rate Limiting
  RATE_LIMIT_WINDOW: z.coerce.number().min(1000).default(60000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().min(1).default(100),
  
  // File Upload Configuration
  MAX_FILE_SIZE: z.coerce.number().min(1024).default(10485760),
  ALLOWED_FILE_TYPES: z.string()
    .transform(val => val.split(',').map(type => type.trim()))
    .pipe(z.array(z.string()))
    .default('jpg,jpeg,png,pdf'),
  
  // Application Tags for AWS Resource Tagging
  TAGS: z.string()
    .transform(val => val.split(',').map(tag => tag.trim().toLowerCase()))
    .pipe(z.array(z.string().min(1)))
    .default('app,nestjs,aws'),
    
  // CORS Configuration
  CORS_ORIGINS: z.string()
    .transform(val => val.split(',').map(origin => origin.trim()))
    .pipe(z.array(z.string().url().or(z.literal('*'))))
    .default('http://localhost:3000'),
});

// Infer the TypeScript type from the schema
export type AwsConfig = z.infer<typeof awsConfigSchema>;

// Environment-specific AWS configuration
export const getAwsEnvironmentConfig = (env: string) => {
  const baseSchema = awsConfigSchema;
  
  switch (env) {
    case 'production':
      return baseSchema.extend({
        // Production requires stricter security and monitoring
        ENABLE_SWAGGER: z.literal(false),
        DEBUG_MODE: z.literal(false),
        DATABASE_SSL: z.literal(true),
        LOG_LEVEL: z.enum(['error', 'warn', 'info']).default('warn'),
        ENABLE_X_RAY_TRACING: z.literal(true),
        ENABLE_CLOUDWATCH_METRICS: z.literal(true),
        API_GATEWAY_STAGE: z.literal('prod'),
      });
      
    case 'development':
      return baseSchema.extend({
        // Development allows more relaxed settings
        ENABLE_SWAGGER: z.coerce.boolean().default(true),
        DEBUG_MODE: z.coerce.boolean().default(true),
        LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('debug'),
        API_GATEWAY_STAGE: z.literal('dev'),
      });
      
    case 'test':
      return baseSchema.extend({
        // Test environment specific overrides
        ENABLE_LOGGING: z.literal(false),
        LOG_LEVEL: z.literal('error'),
        ENABLE_CLOUDWATCH_METRICS: z.literal(false),
        API_GATEWAY_STAGE: z.literal('test'),
      });
      
    case 'local':
      return baseSchema.extend({
        // Local development - AWS services optional
        AWS_REGION: z.string().optional(),
        AWS_S3_BUCKET: z.string().optional(),
        ENABLE_SWAGGER: z.literal(true),
        DEBUG_MODE: z.literal(true),
        LOG_LEVEL: z.literal('debug'),
      });
      
    default:
      return baseSchema;
  }
};

// AWS service configuration helpers
export const getAwsServiceConfig = (config: AwsConfig) => {
  return {
    region: config.AWS_REGION,
    s3: {
      bucket: config.AWS_S3_BUCKET,
      region: config.AWS_S3_REGION || config.AWS_REGION,
      uploadPrefix: config.S3_UPLOAD_PREFIX,
      presignedUrlExpires: config.S3_PRESIGNED_URL_EXPIRES,
    },
    dynamodb: {
      tablePrefix: config.DYNAMODB_TABLE_PREFIX,
      readCapacity: config.DYNAMODB_READ_CAPACITY,
      writeCapacity: config.DYNAMODB_WRITE_CAPACITY,
    },
    sqs: {
      queueUrl: config.SQS_QUEUE_URL,
      deadLetterQueueUrl: config.SQS_DEAD_LETTER_QUEUE_URL,
      visibilityTimeout: config.SQS_VISIBILITY_TIMEOUT,
      messageRetention: config.SQS_MESSAGE_RETENTION,
    },
    sns: {
      topicArn: config.SNS_TOPIC_ARN,
      platformApplicationArn: config.SNS_PLATFORM_APPLICATION_ARN,
    },
    lambda: {
      functionName: config.LAMBDA_FUNCTION_NAME,
      timeout: config.LAMBDA_TIMEOUT,
      memorySize: config.LAMBDA_MEMORY_SIZE,
    },
    cognito: {
      userPoolId: config.COGNITO_USER_POOL_ID,
      clientId: config.COGNITO_CLIENT_ID,
      region: config.COGNITO_REGION || config.AWS_REGION,
    },
    cloudwatch: {
      logGroup: config.CLOUDWATCH_LOG_GROUP,
      logStream: config.CLOUDWATCH_LOG_STREAM,
      metricsEnabled: config.ENABLE_CLOUDWATCH_METRICS,
    },
    xray: {
      enabled: config.ENABLE_X_RAY_TRACING,
    },
  };
};

// Validation helper with AWS-specific error messages
export const validateAwsConfig = (config: unknown): AwsConfig => {
  const result = awsConfigSchema.safeParse(config);
  
  if (!result.success) {
    const errors = result.error.errors.map(err => {
      const path = err.path.join('.');
      let message = err.message;
      
      // Add AWS-specific error context
      if (path.includes('AWS_REGION')) {
        message += '. Valid regions: us-east-1, us-west-2, eu-west-1, etc.';
      } else if (path.includes('S3_BUCKET')) {
        message += '. S3 bucket names must be globally unique and follow AWS naming rules.';
      } else if (path.includes('ARN')) {
        message += '. ARN format: arn:aws:service:region:account-id:resource';
      }
      
      return `${path}: ${message}`;
    }).join(', ');
    
    throw new Error(`AWS Configuration validation failed: ${errors}`);
  }
  
  return result.data;
};