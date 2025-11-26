import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from 'nest-config-aws';
import { AwsConfig } from './config/aws-schema';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Get the typed configuration service
  const configService = app.get<ConfigService<AwsConfig>>(ConfigService);
  
  // Use type-safe configuration access
  const port = configService.get('PORT');
  const host = configService.get('HOST');
  const env = configService.get('APP_ENV');
  const awsRegion = configService.get('AWS_REGION');
  
  // Configure CORS using configuration
  const corsOrigins = configService.get('CORS_ORIGINS');
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });
  
  // Log startup information
  console.log('🚀 Starting nest-config-aws AWS Integration Example');
  console.log(`📊 Environment: ${env}`);
  console.log(`🔧 Node Environment: ${configService.get('NODE_ENV') || 'not set'}`);
  console.log(`🌐 Server: http://${host}:${port}`);
  console.log(`☁️  AWS Region: ${awsRegion || 'not configured'}`);
  
  // Log AWS service configuration
  const s3Bucket = configService.get('AWS_S3_BUCKET');
  const dynamoPrefix = configService.get('DYNAMODB_TABLE_PREFIX');
  const sqsQueue = configService.get('SQS_QUEUE_URL');
  const snsTopicArn = configService.get('SNS_TOPIC_ARN');
  
  console.log('☁️  AWS Services Configuration:');
  console.log(`   S3 Bucket: ${s3Bucket || 'not configured'}`);
  console.log(`   DynamoDB Prefix: ${dynamoPrefix}`);
  console.log(`   SQS Queue: ${sqsQueue ? '✅ configured' : '❌ not configured'}`);
  console.log(`   SNS Topic: ${snsTopicArn ? '✅ configured' : '❌ not configured'}`);
  
  // Log Lambda configuration if applicable
  const lambdaFunction = configService.get('LAMBDA_FUNCTION_NAME');
  if (lambdaFunction) {
    console.log(`   Lambda Function: ${lambdaFunction}`);
    console.log(`   Lambda Timeout: ${configService.get('LAMBDA_TIMEOUT')}s`);
    console.log(`   Lambda Memory: ${configService.get('LAMBDA_MEMORY_SIZE')}MB`);
  }
  
  // Log Cognito configuration if applicable
  const cognitoUserPool = configService.get('COGNITO_USER_POOL_ID');
  if (cognitoUserPool) {
    console.log(`   Cognito User Pool: ${cognitoUserPool}`);
    console.log(`   Cognito Client ID: ${configService.get('COGNITO_CLIENT_ID')}`);
  }
  
  // Log API Gateway configuration if applicable
  const apiGatewayUrl = configService.get('API_GATEWAY_URL');
  if (apiGatewayUrl) {
    console.log(`   API Gateway: ${apiGatewayUrl}`);
    console.log(`   API Gateway Stage: ${configService.get('API_GATEWAY_STAGE')}`);
  }
  
  // Log feature flags
  const features = {
    swagger: configService.get('ENABLE_SWAGGER'),
    metrics: configService.get('ENABLE_METRICS'),
    xrayTracing: configService.get('ENABLE_X_RAY_TRACING'),
    cloudwatchMetrics: configService.get('ENABLE_CLOUDWATCH_METRICS'),
    debug: configService.get('DEBUG_MODE'),
  };
  
  console.log('🎛️  Feature Flags:');
  Object.entries(features).forEach(([key, value]) => {
    console.log(`   ${key}: ${value ? '✅' : '❌'}`);
  });
  
  // Log configuration sources based on environment
  console.log('📋 Configuration Sources:');
  console.log(`   Environment Variables: ✅`);
  
  if (env !== 'local') {
    console.log(`   AWS Secrets Manager: ✅ (/myapp/${env}/secrets)`);
    console.log(`   AWS SSM Parameter Store: ✅ (/myapp/${env}/config/)`);
  } else {
    console.log(`   AWS Secrets Manager: ❌ (disabled in local mode)`);
    console.log(`   AWS SSM Parameter Store: ❌ (disabled in local mode)`);
    console.log(`   Local .env file: ✅`);
  }
  
  // Log security configuration
  console.log('🔐 Security Configuration:');
  console.log(`   JWT Expires In: ${configService.get('JWT_EXPIRES_IN')}`);
  console.log(`   Bcrypt Rounds: ${configService.get('BCRYPT_ROUNDS')}`);
  console.log(`   Rate Limit: ${configService.get('RATE_LIMIT_MAX_REQUESTS')} requests per ${configService.get('RATE_LIMIT_WINDOW')}ms`);
  
  // Log CloudWatch configuration
  const cloudwatchLogGroup = configService.get('CLOUDWATCH_LOG_GROUP');
  console.log('📊 Monitoring Configuration:');
  console.log(`   CloudWatch Log Group: ${cloudwatchLogGroup}`);
  console.log(`   CloudWatch Metrics: ${configService.get('ENABLE_CLOUDWATCH_METRICS') ? '✅' : '❌'}`);
  console.log(`   X-Ray Tracing: ${configService.get('ENABLE_X_RAY_TRACING') ? '✅' : '❌'}`);
  
  // Log Redis configuration if applicable
  const redisEndpoint = configService.get('REDIS_CLUSTER_ENDPOINT');
  if (redisEndpoint) {
    console.log('🔴 Redis Configuration:');
    console.log(`   Cluster Endpoint: ${redisEndpoint}`);
    console.log(`   Port: ${configService.get('REDIS_PORT')}`);
    console.log(`   TTL: ${configService.get('REDIS_TTL')}s`);
  }
  
  await app.listen(port, host);
  
  console.log(`✅ Application is running on: http://${host}:${port}`);
  console.log('📚 Available endpoints:');
  console.log('   GET  /           - Hello message');
  console.log('   GET  /info       - Application and AWS configuration info');
  console.log('   GET  /config     - Complete configuration (masked)');
  console.log('   GET  /health     - Health check with AWS service status');
  console.log('   GET  /aws        - AWS services status');
  console.log('   GET  /aws/s3     - S3 service status and operations');
  console.log('   POST /aws/s3/upload - Generate S3 presigned upload URL');
  console.log('   GET  /aws/dynamodb - DynamoDB service status');
  console.log('   POST /aws/dynamodb/query - Execute DynamoDB query');
  console.log('   GET  /aws/sqs    - SQS service status');
  console.log('   POST /aws/sqs/send - Send message to SQS queue');
  console.log('   GET  /aws/sns    - SNS service status');
  console.log('   POST /aws/sns/publish - Publish message to SNS topic');
  console.log('   GET  /aws/lambda - Lambda service status');
  console.log('   POST /aws/lambda/invoke - Invoke Lambda function');
  console.log('   GET  /aws/cognito - Cognito service status');
  console.log('   GET  /monitoring/metrics - CloudWatch metrics');
  console.log('   GET  /monitoring/logs - CloudWatch logs');
}

bootstrap().catch((error) => {
  console.error('❌ Failed to start application:', error);
  
  // Log AWS-specific configuration validation errors
  if (error.name === 'ValidationError' || error.message.includes('validation')) {
    console.error('🔍 AWS Configuration validation failed. Please check:');
    console.error('   1. All required AWS environment variables are set');
    console.error('   2. AWS credentials are properly configured');
    console.error('   3. AWS region is set and valid');
    console.error('   4. S3 bucket name is valid and accessible');
    console.error('   5. ARN formats are correct for SNS/SQS resources');
    console.error('   6. DynamoDB table permissions are configured');
    console.error('');
    console.error('💡 Tips:');
    console.error('   - Set DEBUG=nest-config-aws* for detailed configuration loading logs');
    console.error('   - Use AWS CLI to verify your credentials: aws sts get-caller-identity');
    console.error('   - Check AWS service availability in your region');
    console.error('   - Verify IAM permissions for all configured services');
  }
  
  process.exit(1);
});