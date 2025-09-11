import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from 'nest-config-aws';
import { AppConfig } from './config/schema';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Get the typed configuration service
  const configService = app.get<ConfigService<AppConfig>>(ConfigService);
  
  // Use type-safe configuration access
  const port = configService.get('PORT');
  const host = configService.get('HOST');
  const env = configService.get('APP_ENV');
  const corsOrigins = configService.get('CORS_ORIGINS');
  
  // Configure CORS using configuration
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });
  
  // Log startup information
  console.log('🚀 Starting nest-config-aws Custom Schema Example');
  console.log(`📊 Environment: ${env}`);
  console.log(`🔧 Node Environment: ${configService.get('NODE_ENV') || 'not set'}`);
  console.log(`🌐 Server: http://${host}:${port}`);
  console.log(`🔒 CORS Origins: ${corsOrigins.join(', ')}`);
  
  // Log feature flags
  const features = {
    debug: configService.get('DEBUG_MODE'),
    swagger: configService.get('ENABLE_SWAGGER'),
    metrics: configService.get('ENABLE_METRICS'),
    logging: configService.get('ENABLE_LOGGING'),
  };
  
  console.log('🎛️  Feature Flags:');
  Object.entries(features).forEach(([key, value]) => {
    console.log(`   ${key}: ${value ? '✅' : '❌'}`);
  });
  
  // Log configuration sources
  console.log('📋 Configuration Sources:');
  console.log(`   Environment Variables: ✅`);
  console.log(`   AWS Secrets Manager: ${env !== 'local' ? '✅' : '❌'}`);
  console.log(`   AWS SSM Parameter Store: ${env !== 'local' ? '✅' : '❌'}`);
  
  // Log security configuration
  console.log('🔐 Security Configuration:');
  console.log(`   JWT Expires In: ${configService.get('JWT_EXPIRES_IN')}`);
  console.log(`   Bcrypt Rounds: ${configService.get('BCRYPT_ROUNDS')}`);
  console.log(`   Rate Limit: ${configService.get('RATE_LIMIT_MAX_REQUESTS')} requests per ${configService.get('RATE_LIMIT_WINDOW')}ms`);
  
  // Log external services
  const awsRegion = configService.get('AWS_REGION');
  const s3Bucket = configService.get('AWS_S3_BUCKET');
  const redisUrl = configService.get('REDIS_URL');
  
  console.log('🌐 External Services:');
  console.log(`   API Base URL: ${configService.get('API_BASE_URL')}`);
  console.log(`   AWS Region: ${awsRegion || 'not configured'}`);
  console.log(`   S3 Bucket: ${s3Bucket || 'not configured'}`);
  console.log(`   Redis: ${redisUrl ? '✅ configured' : '❌ not configured'}`);
  
  await app.listen(port, host);
  
  console.log(`✅ Application is running on: http://${host}:${port}`);
  console.log('📚 Available endpoints:');
  console.log('   GET  /           - Hello message');
  console.log('   GET  /info       - Application information');
  console.log('   GET  /config     - Complete configuration');
  console.log('   GET  /health     - Health check');
  console.log('   GET  /features   - Feature flags');
  console.log('   GET  /database/status - Database status');
  console.log('   POST /database/query  - Execute database query');
  console.log('   GET  /api/config - API configuration');
  console.log('   POST /api/call/:endpoint - Make API call');
  console.log('   POST /upload/validate - Validate file upload');
}

bootstrap().catch((error) => {
  console.error('❌ Failed to start application:', error);
  
  // Log configuration validation errors in detail
  if (error.name === 'ValidationError' || error.message.includes('validation')) {
    console.error('🔍 Configuration validation failed. Please check:');
    console.error('   1. All required environment variables are set');
    console.error('   2. Environment variable values match the expected types');
    console.error('   3. AWS credentials are configured (if not in local mode)');
    console.error('   4. AWS region is set or auto-detectable');
    console.error('');
    console.error('💡 Tip: Set DEBUG=nest-config-aws* to see detailed configuration loading logs');
  }
  
  process.exit(1);
});