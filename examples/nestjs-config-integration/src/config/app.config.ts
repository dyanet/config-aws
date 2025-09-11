import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  name: process.env.APP_NAME || 'nest-config-aws-integration-example',
  version: process.env.APP_VERSION || '1.0.0',
  environment: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 3000,
  
  // External service configuration
  apiKey: process.env.API_KEY, // This can come from AWS Secrets Manager
  redisUrl: process.env.REDIS_URL,
  
  // Application settings
  logLevel: process.env.LOG_LEVEL || 'info',
  debugMode: process.env.DEBUG_MODE === 'true',
  enableMetrics: process.env.ENABLE_METRICS === 'true',
  
  // Security settings
  jwtSecret: process.env.JWT_SECRET, // This should come from AWS Secrets Manager
  encryptionKey: process.env.ENCRYPTION_KEY, // This should come from AWS Secrets Manager
  
  // Feature flags
  enableNewFeature: process.env.ENABLE_NEW_FEATURE === 'true',
  enableExperimentalFeature: process.env.ENABLE_EXPERIMENTAL_FEATURE === 'true',
}));