import { Injectable } from '@nestjs/common';
import { ConfigService } from 'nest-config-aws';
import { AwsConfig } from './config/aws-schema';

@Injectable()
export class AppService {
  constructor(private configService: ConfigService<AwsConfig>) {}

  getHello(): string {
    const env = this.configService.get('APP_ENV');
    const region = this.configService.get('AWS_REGION');
    return `Hello from nest-config-aws AWS Integration Example! Running in ${env} environment${region ? ` in ${region}` : ''}.`;
  }

  getApplicationInfo() {
    return {
      name: 'nest-config-aws AWS Integration Example',
      version: '1.0.0',
      environment: this.configService.get('APP_ENV'),
      nodeEnvironment: this.configService.get('NODE_ENV'),
      region: this.configService.get('AWS_REGION'),
      port: this.configService.get('PORT'),
      host: this.configService.get('HOST'),
      features: {
        swagger: this.configService.get('ENABLE_SWAGGER'),
        metrics: this.configService.get('ENABLE_METRICS'),
        xrayTracing: this.configService.get('ENABLE_X_RAY_TRACING'),
        cloudwatchMetrics: this.configService.get('ENABLE_CLOUDWATCH_METRICS'),
        debug: this.configService.get('DEBUG_MODE'),
      },
      aws: {
        region: this.configService.get('AWS_REGION'),
        s3Bucket: this.configService.get('AWS_S3_BUCKET'),
        dynamodbPrefix: this.configService.get('DYNAMODB_TABLE_PREFIX'),
        cloudwatchLogGroup: this.configService.get('CLOUDWATCH_LOG_GROUP'),
        hasLambdaFunction: !!this.configService.get('LAMBDA_FUNCTION_NAME'),
        hasCognito: !!this.configService.get('COGNITO_USER_POOL_ID'),
        hasSqsQueue: !!this.configService.get('SQS_QUEUE_URL'),
        hasSnsTopic: !!this.configService.get('SNS_TOPIC_ARN'),
        hasApiGateway: !!this.configService.get('API_GATEWAY_URL'),
      },
    };
  }

  getConfiguration() {
    // Return configuration with sensitive values masked
    const config = {
      environment: {
        APP_ENV: this.configService.get('APP_ENV'),
        NODE_ENV: this.configService.get('NODE_ENV'),
        PORT: this.configService.get('PORT'),
        HOST: this.configService.get('HOST'),
      },
      aws: {
        region: this.configService.get('AWS_REGION'),
        accountId: this.configService.get('AWS_ACCOUNT_ID') ? '***masked***' : undefined,
        s3: {
          bucket: this.configService.get('AWS_S3_BUCKET'),
          region: this.configService.get('AWS_S3_REGION'),
          uploadPrefix: this.configService.get('S3_UPLOAD_PREFIX'),
          presignedUrlExpires: this.configService.get('S3_PRESIGNED_URL_EXPIRES'),
        },
        dynamodb: {
          tablePrefix: this.configService.get('DYNAMODB_TABLE_PREFIX'),
          readCapacity: this.configService.get('DYNAMODB_READ_CAPACITY'),
          writeCapacity: this.configService.get('DYNAMODB_WRITE_CAPACITY'),
        },
        sqs: {
          queueUrl: this.configService.get('SQS_QUEUE_URL') ? '***masked***' : undefined,
          deadLetterQueueUrl: this.configService.get('SQS_DEAD_LETTER_QUEUE_URL') ? '***masked***' : undefined,
          visibilityTimeout: this.configService.get('SQS_VISIBILITY_TIMEOUT'),
          messageRetention: this.configService.get('SQS_MESSAGE_RETENTION'),
        },
        sns: {
          topicArn: this.configService.get('SNS_TOPIC_ARN') ? '***masked***' : undefined,
          platformApplicationArn: this.configService.get('SNS_PLATFORM_APPLICATION_ARN') ? '***masked***' : undefined,
        },
        lambda: {
          functionName: this.configService.get('LAMBDA_FUNCTION_NAME'),
          timeout: this.configService.get('LAMBDA_TIMEOUT'),
          memorySize: this.configService.get('LAMBDA_MEMORY_SIZE'),
        },
        cognito: {
          userPoolId: this.configService.get('COGNITO_USER_POOL_ID') ? '***masked***' : undefined,
          clientId: this.configService.get('COGNITO_CLIENT_ID') ? '***masked***' : undefined,
          region: this.configService.get('COGNITO_REGION'),
        },
        apiGateway: {
          url: this.configService.get('API_GATEWAY_URL'),
          stage: this.configService.get('API_GATEWAY_STAGE'),
          apiKey: this.configService.get('API_GATEWAY_API_KEY') ? '***masked***' : undefined,
        },
        cloudwatch: {
          logGroup: this.configService.get('CLOUDWATCH_LOG_GROUP'),
          logStream: this.configService.get('CLOUDWATCH_LOG_STREAM'),
          metricsEnabled: this.configService.get('ENABLE_CLOUDWATCH_METRICS'),
        },
      },
      database: {
        url: '***masked***',
        poolSize: this.configService.get('DATABASE_POOL_SIZE'),
        timeout: this.configService.get('DATABASE_TIMEOUT'),
        ssl: this.configService.get('DATABASE_SSL'),
        rdsInstanceId: this.configService.get('RDS_INSTANCE_IDENTIFIER'),
      },
      redis: {
        endpoint: this.configService.get('REDIS_CLUSTER_ENDPOINT'),
        port: this.configService.get('REDIS_PORT'),
        ttl: this.configService.get('REDIS_TTL'),
        authToken: this.configService.get('REDIS_AUTH_TOKEN') ? '***masked***' : undefined,
      },
      security: {
        jwtSecret: '***masked***',
        jwtExpiresIn: this.configService.get('JWT_EXPIRES_IN'),
        bcryptRounds: this.configService.get('BCRYPT_ROUNDS'),
        kmsKeyId: this.configService.get('KMS_KEY_ID'),
        kmsAlias: this.configService.get('KMS_ALIAS'),
      },
      api: {
        key: '***masked***',
        baseUrl: this.configService.get('API_BASE_URL'),
        timeout: this.configService.get('API_TIMEOUT'),
        retryAttempts: this.configService.get('API_RETRY_ATTEMPTS'),
      },
      features: {
        logging: this.configService.get('ENABLE_LOGGING'),
        metrics: this.configService.get('ENABLE_METRICS'),
        swagger: this.configService.get('ENABLE_SWAGGER'),
        debug: this.configService.get('DEBUG_MODE'),
        xrayTracing: this.configService.get('ENABLE_X_RAY_TRACING'),
      },
      logging: {
        level: this.configService.get('LOG_LEVEL'),
        format: this.configService.get('LOG_FORMAT'),
      },
      rateLimiting: {
        window: this.configService.get('RATE_LIMIT_WINDOW'),
        maxRequests: this.configService.get('RATE_LIMIT_MAX_REQUESTS'),
      },
      fileUpload: {
        maxSize: this.configService.get('MAX_FILE_SIZE'),
        allowedTypes: this.configService.get('ALLOWED_FILE_TYPES'),
      },
      cors: {
        origins: this.configService.get('CORS_ORIGINS'),
      },
      tags: this.configService.get('TAGS'),
    };

    return config;
  }

  async getHealthCheck() {
    const env = this.configService.get('APP_ENV');
    const region = this.configService.get('AWS_REGION');
    
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: env,
      region: region,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: '1.0.0',
      configurationSources: {
        environmentVariables: true,
        awsSecretsManager: env !== 'local',
        awsSsmParameterStore: env !== 'local',
        localEnvFile: env === 'local',
      },
      awsServices: {
        s3: !!this.configService.get('AWS_S3_BUCKET'),
        dynamodb: true, // Always available with prefix
        sqs: !!this.configService.get('SQS_QUEUE_URL'),
        sns: !!this.configService.get('SNS_TOPIC_ARN'),
        lambda: !!this.configService.get('LAMBDA_FUNCTION_NAME'),
        cognito: !!this.configService.get('COGNITO_USER_POOL_ID'),
        apiGateway: !!this.configService.get('API_GATEWAY_URL'),
        cloudwatch: this.configService.get('ENABLE_CLOUDWATCH_METRICS'),
        xray: this.configService.get('ENABLE_X_RAY_TRACING'),
      },
    };
  }
}