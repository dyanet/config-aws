# AWS Integration Example

This example demonstrates comprehensive AWS service integration with nestjs-config-aws, showcasing real-world patterns for AWS-native applications.

## Features Demonstrated

- ✅ **Comprehensive AWS Configuration**: S3, DynamoDB, SQS, SNS, Lambda, Cognito, API Gateway
- ✅ **Environment-Aware AWS Paths**: Automatic path construction for Secrets Manager and SSM
- ✅ **AWS Service Monitoring**: Health checks and status endpoints for all AWS services
- ✅ **CloudWatch Integration**: Metrics collection and log management
- ✅ **X-Ray Tracing**: Distributed tracing configuration
- ✅ **Type-Safe AWS Configuration**: Full TypeScript support for all AWS service configurations
- ✅ **Production-Ready Patterns**: Security, monitoring, and operational best practices
- ✅ **Mock AWS Operations**: Demonstrates AWS SDK integration patterns without requiring actual AWS resources

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your AWS configuration
   ```

3. **Configure AWS credentials:**
   ```bash
   # Option 1: AWS CLI
   aws configure
   
   # Option 2: Environment variables
   export AWS_ACCESS_KEY_ID=your-access-key
   export AWS_SECRET_ACCESS_KEY=your-secret-key
   export AWS_REGION=us-east-1
   
   # Option 3: AWS Profile
   export AWS_PROFILE=myprofile
   ```

4. **Run the application:**
   ```bash
   # Local development (no AWS services)
   APP_ENV=local npm run start:dev
   
   # Development with AWS integration
   APP_ENV=development npm run start:dev
   
   # Production simulation
   APP_ENV=production npm run start:prod
   ```

5. **Explore AWS endpoints:**
   ```bash
   # AWS services overview
   curl http://localhost:3000/aws
   
   # Individual service status
   curl http://localhost:3000/aws/s3
   curl http://localhost:3000/aws/dynamodb
   curl http://localhost:3000/aws/sqs
   curl http://localhost:3000/aws/sns
   curl http://localhost:3000/aws/lambda
   curl http://localhost:3000/aws/cognito
   
   # Monitoring endpoints
   curl http://localhost:3000/monitoring/metrics
   curl http://localhost:3000/monitoring/logs
   curl http://localhost:3000/monitoring/health
   ```

## AWS Services Configuration

### S3 (Simple Storage Service)
```typescript
AWS_S3_BUCKET=my-app-bucket
AWS_S3_REGION=us-east-1  # Optional, defaults to AWS_REGION
S3_UPLOAD_PREFIX=uploads/
S3_PRESIGNED_URL_EXPIRES=3600
```

**Endpoints:**
- `GET /aws/s3` - S3 service status
- `POST /aws/s3/upload` - Generate presigned upload URL

### DynamoDB
```typescript
DYNAMODB_TABLE_PREFIX=myapp
DYNAMODB_READ_CAPACITY=5
DYNAMODB_WRITE_CAPACITY=5
```

**Endpoints:**
- `GET /aws/dynamodb` - DynamoDB service status
- `POST /aws/dynamodb/query` - Execute DynamoDB query

### SQS (Simple Queue Service)
```typescript
SQS_QUEUE_URL=https://sqs.us-east-1.amazonaws.com/123456789012/my-queue
SQS_DEAD_LETTER_QUEUE_URL=https://sqs.us-east-1.amazonaws.com/123456789012/my-dlq
SQS_VISIBILITY_TIMEOUT=30
SQS_MESSAGE_RETENTION=345600
```

**Endpoints:**
- `GET /aws/sqs` - SQS service status
- `POST /aws/sqs/send` - Send message to queue

### SNS (Simple Notification Service)
```typescript
SNS_TOPIC_ARN=arn:aws:sns:us-east-1:123456789012:my-topic
SNS_PLATFORM_APPLICATION_ARN=arn:aws:sns:us-east-1:123456789012:app/GCM/my-app
```

**Endpoints:**
- `GET /aws/sns` - SNS service status
- `POST /aws/sns/publish` - Publish message to topic

### Lambda
```typescript
LAMBDA_FUNCTION_NAME=my-function
LAMBDA_TIMEOUT=30
LAMBDA_MEMORY_SIZE=512
```

**Endpoints:**
- `GET /aws/lambda` - Lambda service status
- `POST /aws/lambda/invoke` - Invoke Lambda function

### Cognito
```typescript
COGNITO_USER_POOL_ID=us-east-1_XXXXXXXXX
COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
COGNITO_REGION=us-east-1  # Optional, defaults to AWS_REGION
```

**Endpoints:**
- `GET /aws/cognito` - Cognito service status

### API Gateway
```typescript
API_GATEWAY_URL=https://api.example.com
API_GATEWAY_STAGE=dev
API_GATEWAY_API_KEY=your-api-key
```

### CloudWatch & X-Ray
```typescript
CLOUDWATCH_LOG_GROUP=/aws/lambda/myapp
CLOUDWATCH_LOG_STREAM=my-stream
ENABLE_CLOUDWATCH_METRICS=true
ENABLE_X_RAY_TRACING=true
```

**Endpoints:**
- `GET /monitoring/metrics` - CloudWatch metrics
- `GET /monitoring/logs` - CloudWatch logs
- `GET /monitoring/health` - Detailed health check

## Environment-Specific AWS Configuration

### Local Development (APP_ENV=local)
- ✅ Environment variables only
- ❌ AWS Secrets Manager (disabled)
- ❌ AWS SSM Parameter Store (disabled)
- ✅ Local .env file support
- ✅ Mock AWS operations (no real AWS calls)

### Development (APP_ENV=development)
- ✅ Environment variables
- ✅ AWS Secrets Manager: `/myapp/development/secrets`
- ✅ AWS SSM Parameter Store: `/myapp/development/config/`
- ✅ Debug mode enabled
- ✅ Swagger enabled

### Test (APP_ENV=test)
- ✅ Environment variables
- ✅ AWS Secrets Manager: `/myapp/test/secrets`
- ✅ AWS SSM Parameter Store: `/myapp/test/config/`
- ❌ Logging disabled
- ❌ Metrics disabled

### Production (APP_ENV=production)
- ✅ Environment variables
- ✅ AWS Secrets Manager: `/myapp/production/secrets`
- ✅ AWS SSM Parameter Store: `/myapp/production/config/`
- ✅ SSL required
- ✅ X-Ray tracing enabled
- ✅ CloudWatch metrics enabled
- ❌ Debug mode disabled
- ❌ Swagger disabled

## AWS Resources Setup

### 1. Create AWS Secrets Manager Secrets

```bash
# Development environment
aws secretsmanager create-secret \
  --name "/myapp/development/secrets" \
  --secret-string '{
    "DATABASE_URL": "postgres://user:pass@dev-db.amazonaws.com:5432/myapp_dev",
    "API_KEY": "dev-api-key-from-secrets-manager",
    "JWT_SECRET": "dev-jwt-secret-from-secrets-manager-32-chars",
    "REDIS_AUTH_TOKEN": "dev-redis-auth-token"
  }'

# Production environment
aws secretsmanager create-secret \
  --name "/myapp/production/secrets" \
  --secret-string '{
    "DATABASE_URL": "postgres://user:pass@prod-db.amazonaws.com:5432/myapp_prod",
    "API_KEY": "prod-api-key-from-secrets-manager",
    "JWT_SECRET": "prod-jwt-secret-from-secrets-manager-32-chars",
    "REDIS_AUTH_TOKEN": "prod-redis-auth-token"
  }'
```

### 2. Create SSM Parameters

```bash
# Development parameters
aws ssm put-parameter --name "/myapp/development/config/DEBUG_MODE" --value "true" --type "String"
aws ssm put-parameter --name "/myapp/development/config/LOG_LEVEL" --value "debug" --type "String"
aws ssm put-parameter --name "/myapp/development/config/ENABLE_SWAGGER" --value "true" --type "String"
aws ssm put-parameter --name "/myapp/development/config/ENABLE_CLOUDWATCH_METRICS" --value "true" --type "String"
aws ssm put-parameter --name "/myapp/development/config/ENABLE_X_RAY_TRACING" --value "false" --type "String"

# Production parameters
aws ssm put-parameter --name "/myapp/production/config/DEBUG_MODE" --value "false" --type "String"
aws ssm put-parameter --name "/myapp/production/config/LOG_LEVEL" --value "warn" --type "String"
aws ssm put-parameter --name "/myapp/production/config/ENABLE_SWAGGER" --value "false" --type "String"
aws ssm put-parameter --name "/myapp/production/config/ENABLE_CLOUDWATCH_METRICS" --value "true" --type "String"
aws ssm put-parameter --name "/myapp/production/config/ENABLE_X_RAY_TRACING" --value "true" --type "String"
aws ssm put-parameter --name "/myapp/production/config/DATABASE_SSL" --value "true" --type "String"
```

### 3. Create AWS Resources (Optional)

```bash
# Create S3 bucket
aws s3 mb s3://my-app-bucket --region us-east-1

# Create SQS queue
aws sqs create-queue --queue-name my-queue --region us-east-1

# Create SNS topic
aws sns create-topic --name my-topic --region us-east-1

# Create DynamoDB table
aws dynamodb create-table \
  --table-name myapp_users \
  --attribute-definitions AttributeName=id,AttributeType=S \
  --key-schema AttributeName=id,KeyType=HASH \
  --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 \
  --region us-east-1
```

## IAM Permissions

Your AWS credentials need the following permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue",
        "secretsmanager:DescribeSecret"
      ],
      "Resource": "arn:aws:secretsmanager:*:*:secret:/myapp/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "ssm:GetParameter",
        "ssm:GetParameters",
        "ssm:GetParametersByPath"
      ],
      "Resource": "arn:aws:ssm:*:*:parameter/myapp/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::my-app-bucket",
        "arn:aws:s3:::my-app-bucket/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:Query",
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:DeleteItem",
        "dynamodb:Scan"
      ],
      "Resource": "arn:aws:dynamodb:*:*:table/myapp_*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "sqs:SendMessage",
        "sqs:ReceiveMessage",
        "sqs:DeleteMessage",
        "sqs:GetQueueAttributes"
      ],
      "Resource": "arn:aws:sqs:*:*:my-queue*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "sns:Publish",
        "sns:GetTopicAttributes"
      ],
      "Resource": "arn:aws:sns:*:*:my-topic*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "lambda:InvokeFunction",
        "lambda:GetFunction"
      ],
      "Resource": "arn:aws:lambda:*:*:function:my-function*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "cognito-idp:AdminGetUser",
        "cognito-idp:AdminCreateUser",
        "cognito-idp:AdminSetUserPassword"
      ],
      "Resource": "arn:aws:cognito-idp:*:*:userpool/*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents",
        "logs:GetLogEvents"
      ],
      "Resource": "arn:aws:logs:*:*:log-group:/aws/lambda/myapp*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "cloudwatch:PutMetricData",
        "cloudwatch:GetMetricStatistics"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "xray:PutTraceSegments",
        "xray:PutTelemetryRecords"
      ],
      "Resource": "*"
    }
  ]
}
```

## Code Structure

```
src/
├── config/
│   └── aws-schema.ts          # Comprehensive AWS configuration schema
├── services/
│   ├── aws.service.ts         # AWS services integration
│   └── monitoring.service.ts  # CloudWatch and monitoring
├── app.module.ts              # Module with AWS-focused configuration
├── app.controller.ts          # HTTP endpoints for AWS operations
├── app.service.ts             # Main application service
└── main.ts                    # Application bootstrap with AWS logging
```

## Testing Different Environments

### Local Development
```bash
# No AWS services required
APP_ENV=local \
DATABASE_URL=postgres://localhost:5432/test \
API_KEY=test-key \
JWT_SECRET=test-secret-32-characters-long \
npm run start:dev
```

### Development with AWS
```bash
# Requires AWS credentials and resources
APP_ENV=development \
AWS_REGION=us-east-1 \
AWS_S3_BUCKET=my-dev-bucket \
npm run start:dev
```

### Production Simulation
```bash
# Full production configuration
APP_ENV=production \
AWS_REGION=us-east-1 \
AWS_S3_BUCKET=my-prod-bucket \
DATABASE_SSL=true \
npm run start:prod
```

## Monitoring and Observability

### CloudWatch Integration
- **Metrics**: Application and AWS service metrics
- **Logs**: Structured logging with configurable levels
- **Alarms**: Health check and performance monitoring

### X-Ray Tracing
- **Distributed Tracing**: Request flow across AWS services
- **Performance Analysis**: Latency and error tracking
- **Service Map**: Visual representation of service dependencies

### Health Checks
- **Application Health**: Memory, CPU, uptime monitoring
- **AWS Services Health**: Connectivity and configuration validation
- **Database Health**: Connection pool and query performance
- **External APIs**: Availability and response time monitoring

## Troubleshooting

### Configuration Issues
```bash
# Enable debug logging
DEBUG=nestjs-config-aws* npm run start:dev

# Verify AWS credentials
aws sts get-caller-identity

# Test AWS service access
aws s3 ls s3://my-app-bucket
aws secretsmanager get-secret-value --secret-id /myapp/development/secrets
aws ssm get-parameters-by-path --path /myapp/development/config/
```

### Common Problems

1. **AWS Credentials Not Found**
   - Verify AWS CLI configuration: `aws configure list`
   - Check environment variables: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`
   - Verify IAM permissions for configured services

2. **Secrets Manager Access Denied**
   - Check IAM permissions for `secretsmanager:GetSecretValue`
   - Verify secret exists: `aws secretsmanager describe-secret --secret-id /myapp/development/secrets`
   - Ensure correct region configuration

3. **SSM Parameter Store Access Denied**
   - Check IAM permissions for `ssm:GetParametersByPath`
   - Verify parameters exist: `aws ssm get-parameters-by-path --path /myapp/development/config/`
   - Ensure correct region configuration

4. **S3 Access Issues**
   - Verify bucket exists and is accessible
   - Check IAM permissions for S3 operations
   - Ensure correct region configuration

5. **Configuration Validation Errors**
   - Check required environment variables are set
   - Verify URL formats for database and API endpoints
   - Ensure JWT secret is at least 32 characters
   - Validate ARN formats for SNS/SQS resources

### Debug Commands
```bash
# Test configuration loading
curl http://localhost:3000/config

# Check AWS services status
curl http://localhost:3000/aws

# Verify health checks
curl http://localhost:3000/monitoring/health

# Test specific AWS service
curl http://localhost:3000/aws/s3
curl -X POST http://localhost:3000/aws/s3/upload \
  -H "Content-Type: application/json" \
  -d '{"fileName":"test.jpg","contentType":"image/jpeg"}'
```

## Next Steps

- Explore the [basic-usage example](../basic-usage/) for simpler setup
- Check the [custom-schema example](../custom-schema/) for advanced type safety
- Review the [Docker Compose setup](../docker-compose/) for local AWS service testing
- See the [main documentation](../../README.md) for complete API reference
- Check the [troubleshooting guide](../../docs/TROUBLESHOOTING.md) for additional help

## Production Deployment

For production deployment, consider:

1. **Security**: Use IAM roles instead of access keys
2. **Monitoring**: Set up CloudWatch alarms and dashboards
3. **Scaling**: Configure auto-scaling for AWS services
4. **Backup**: Implement backup strategies for DynamoDB and S3
5. **Disaster Recovery**: Multi-region deployment considerations
6. **Cost Optimization**: Monitor and optimize AWS service usage