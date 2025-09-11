#!/bin/bash

# LocalStack initialization script for nest-config-aws examples
# This script sets up AWS resources in LocalStack for testing

set -e

echo "🚀 Setting up AWS resources in LocalStack..."

# Wait for LocalStack to be ready
echo "⏳ Waiting for LocalStack to be ready..."
until curl -s http://localhost:4566/_localstack/health | grep -q '"s3": "available"'; do
  echo "Waiting for LocalStack services..."
  sleep 2
done

echo "✅ LocalStack is ready!"

# Set AWS CLI to use LocalStack
export AWS_ACCESS_KEY_ID=test
export AWS_SECRET_ACCESS_KEY=test
export AWS_DEFAULT_REGION=us-east-1
export AWS_ENDPOINT_URL=http://localhost:4566

# Create S3 bucket
echo "📦 Creating S3 bucket..."
aws s3 mb s3://my-test-bucket --endpoint-url=http://localhost:4566
aws s3api put-bucket-cors --bucket my-test-bucket --endpoint-url=http://localhost:4566 --cors-configuration '{
  "CORSRules": [
    {
      "AllowedHeaders": ["*"],
      "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
      "AllowedOrigins": ["*"],
      "ExposeHeaders": ["ETag"]
    }
  ]
}'

# Create SQS queue
echo "📨 Creating SQS queue..."
aws sqs create-queue --queue-name my-test-queue --endpoint-url=http://localhost:4566

# Create SQS dead letter queue
echo "💀 Creating SQS dead letter queue..."
aws sqs create-queue --queue-name my-test-dlq --endpoint-url=http://localhost:4566

# Create SNS topic
echo "📢 Creating SNS topic..."
aws sns create-topic --name my-test-topic --endpoint-url=http://localhost:4566

# Create DynamoDB tables
echo "🗄️  Creating DynamoDB tables..."
aws dynamodb create-table \
  --table-name myapp_users \
  --attribute-definitions AttributeName=id,AttributeType=S \
  --key-schema AttributeName=id,KeyType=HASH \
  --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 \
  --endpoint-url=http://localhost:4566

aws dynamodb create-table \
  --table-name myapp_sessions \
  --attribute-definitions AttributeName=sessionId,AttributeType=S \
  --key-schema AttributeName=sessionId,KeyType=HASH \
  --provisioned-throughput ReadCapacityUnits=5,WriteCapacityUnits=5 \
  --endpoint-url=http://localhost:4566

# Create Lambda function
echo "⚡ Creating Lambda function..."
cat > /tmp/lambda-function.js << 'EOF'
exports.handler = async (event) => {
  console.log('Event:', JSON.stringify(event, null, 2));
  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Hello from LocalStack Lambda!',
      input: event,
      timestamp: new Date().toISOString()
    })
  };
};
EOF

zip -j /tmp/lambda-function.zip /tmp/lambda-function.js

aws lambda create-function \
  --function-name my-test-function \
  --runtime nodejs18.x \
  --role arn:aws:iam::000000000000:role/lambda-role \
  --handler index.handler \
  --zip-file fileb:///tmp/lambda-function.zip \
  --endpoint-url=http://localhost:4566

# Create IAM role for Lambda (LocalStack doesn't enforce IAM but needs the role to exist)
echo "🔐 Creating IAM role..."
aws iam create-role \
  --role-name lambda-role \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Principal": {
          "Service": "lambda.amazonaws.com"
        },
        "Action": "sts:AssumeRole"
      }
    ]
  }' \
  --endpoint-url=http://localhost:4566 || true

# Create Secrets Manager secrets
echo "🔒 Creating Secrets Manager secrets..."
aws secretsmanager create-secret \
  --name "/myapp/development/secrets" \
  --secret-string '{
    "DATABASE_URL": "postgres://postgres:password@postgres:5432/myapp_dev",
    "API_KEY": "dev-api-key-from-secrets-manager",
    "JWT_SECRET": "dev-jwt-secret-from-secrets-manager-32-chars",
    "REDIS_AUTH_TOKEN": "redispassword"
  }' \
  --endpoint-url=http://localhost:4566

aws secretsmanager create-secret \
  --name "/myapp/test/secrets" \
  --secret-string '{
    "DATABASE_URL": "postgres://postgres:password@postgres:5432/myapp_test",
    "API_KEY": "test-api-key-from-secrets-manager",
    "JWT_SECRET": "test-jwt-secret-from-secrets-manager-32-chars"
  }' \
  --endpoint-url=http://localhost:4566

# Create SSM parameters
echo "⚙️  Creating SSM parameters..."

# Development parameters
aws ssm put-parameter --name "/myapp/development/config/DEBUG_MODE" --value "true" --type "String" --endpoint-url=http://localhost:4566
aws ssm put-parameter --name "/myapp/development/config/LOG_LEVEL" --value "debug" --type "String" --endpoint-url=http://localhost:4566
aws ssm put-parameter --name "/myapp/development/config/ENABLE_SWAGGER" --value "true" --type "String" --endpoint-url=http://localhost:4566
aws ssm put-parameter --name "/myapp/development/config/ENABLE_CLOUDWATCH_METRICS" --value "true" --type "String" --endpoint-url=http://localhost:4566
aws ssm put-parameter --name "/myapp/development/config/ENABLE_X_RAY_TRACING" --value "false" --type "String" --endpoint-url=http://localhost:4566
aws ssm put-parameter --name "/myapp/development/config/RATE_LIMIT_MAX_REQUESTS" --value "1000" --type "String" --endpoint-url=http://localhost:4566

# Test parameters
aws ssm put-parameter --name "/myapp/test/config/DEBUG_MODE" --value "false" --type "String" --endpoint-url=http://localhost:4566
aws ssm put-parameter --name "/myapp/test/config/LOG_LEVEL" --value "error" --type "String" --endpoint-url=http://localhost:4566
aws ssm put-parameter --name "/myapp/test/config/ENABLE_LOGGING" --value "false" --type "String" --endpoint-url=http://localhost:4566

# Create CloudWatch log group
echo "📊 Creating CloudWatch log group..."
aws logs create-log-group --log-group-name /aws/lambda/myapp --endpoint-url=http://localhost:4566

# Create some sample data in DynamoDB
echo "📝 Adding sample data to DynamoDB..."
aws dynamodb put-item \
  --table-name myapp_users \
  --item '{
    "id": {"S": "user1"},
    "name": {"S": "John Doe"},
    "email": {"S": "john@example.com"},
    "createdAt": {"S": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"}
  }' \
  --endpoint-url=http://localhost:4566

aws dynamodb put-item \
  --table-name myapp_users \
  --item '{
    "id": {"S": "user2"},
    "name": {"S": "Jane Smith"},
    "email": {"S": "jane@example.com"},
    "createdAt": {"S": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'"}
  }' \
  --endpoint-url=http://localhost:4566

# Upload sample file to S3
echo "📁 Uploading sample file to S3..."
echo "Hello from nest-config-aws example!" > /tmp/sample.txt
aws s3 cp /tmp/sample.txt s3://my-test-bucket/uploads/sample.txt --endpoint-url=http://localhost:4566

echo "✅ AWS resources setup completed!"
echo ""
echo "📋 Created resources:"
echo "   🪣 S3 Bucket: my-test-bucket"
echo "   📨 SQS Queue: my-test-queue"
echo "   💀 SQS DLQ: my-test-dlq"
echo "   📢 SNS Topic: my-test-topic"
echo "   🗄️  DynamoDB Tables: myapp_users, myapp_sessions"
echo "   ⚡ Lambda Function: my-test-function"
echo "   🔒 Secrets Manager: /myapp/development/secrets, /myapp/test/secrets"
echo "   ⚙️  SSM Parameters: /myapp/development/config/*, /myapp/test/config/*"
echo "   📊 CloudWatch Log Group: /aws/lambda/myapp"
echo ""
echo "🔗 LocalStack Dashboard: http://localhost:4566/_localstack/health"
echo "🧪 Test AWS CLI: docker-compose exec awscli aws s3 ls --endpoint-url=http://localstack:4566"