# Docker Compose Setup for Local AWS Service Testing

This Docker Compose setup provides a complete local development environment for testing nest-config-aws with AWS services using LocalStack, along with PostgreSQL and Redis.

## Features

- ✅ **LocalStack**: Complete AWS services emulation (S3, DynamoDB, SQS, SNS, Lambda, Secrets Manager, SSM, CloudWatch)
- ✅ **PostgreSQL**: Local database with sample data and schemas
- ✅ **Redis**: Local caching service with authentication
- ✅ **Example Applications**: All three nest-config-aws examples running in containers
- ✅ **Automated Setup**: Initialization scripts for AWS resources and database schemas
- ✅ **Health Checks**: Comprehensive health monitoring for all services
- ✅ **Development Tools**: AWS CLI container for testing and debugging

## Quick Start

### 1. Start All Services

```bash
# Start core services (LocalStack, PostgreSQL, Redis)
docker-compose up -d localstack postgres redis

# Wait for services to be ready (check health)
docker-compose ps

# Start a specific example application
docker-compose --profile basic up -d app-basic      # Basic usage example
docker-compose --profile custom up -d app-custom    # Custom schema example  
docker-compose --profile aws up -d app-aws         # AWS integration example

# Start all examples at once
docker-compose --profile basic --profile custom --profile aws up -d
```

### 2. Access Applications

- **Basic Usage Example**: http://localhost:3001
- **Custom Schema Example**: http://localhost:3002  
- **AWS Integration Example**: http://localhost:3003
- **LocalStack Dashboard**: http://localhost:4566/_localstack/health
- **PostgreSQL**: localhost:5432 (postgres/password)
- **Redis**: localhost:6379 (password: redispassword)

### 3. Test AWS Integration

```bash
# Use AWS CLI container to test LocalStack
docker-compose --profile tools run --rm awscli aws s3 ls --endpoint-url=http://localstack:4566

# Test S3 bucket
docker-compose --profile tools run --rm awscli aws s3 ls s3://my-test-bucket --endpoint-url=http://localstack:4566

# Test Secrets Manager
docker-compose --profile tools run --rm awscli aws secretsmanager get-secret-value --secret-id /myapp/development/secrets --endpoint-url=http://localstack:4566

# Test SSM Parameter Store
docker-compose --profile tools run --rm awscli aws ssm get-parameters-by-path --path /myapp/development/config/ --endpoint-url=http://localstack:4566
```

## Service Profiles

The Docker Compose setup uses profiles to organize services:

### Core Services (Always Available)
- `localstack` - AWS services emulation
- `postgres` - PostgreSQL database
- `redis` - Redis cache

### Application Profiles
- `basic` - Basic usage example application
- `custom` - Custom schema example application  
- `aws` - AWS integration example application

### Tool Profiles
- `tools` - AWS CLI container for testing

### Usage Examples

```bash
# Start only core services
docker-compose up -d

# Start core services + basic example
docker-compose --profile basic up -d

# Start core services + AWS integration example
docker-compose --profile aws up -d

# Start everything including tools
docker-compose --profile basic --profile custom --profile aws --profile tools up -d

# Start specific services
docker-compose up -d postgres redis
docker-compose --profile aws up -d app-aws
```

## AWS Services in LocalStack

### Automatically Created Resources

The setup automatically creates the following AWS resources:

#### S3
- **Bucket**: `my-test-bucket`
- **Sample File**: `uploads/sample.txt`
- **CORS Configuration**: Enabled for web access

#### SQS
- **Queue**: `my-test-queue`
- **Dead Letter Queue**: `my-test-dlq`

#### SNS
- **Topic**: `my-test-topic`

#### DynamoDB
- **Tables**: `myapp_users`, `myapp_sessions`
- **Sample Data**: Pre-populated user records

#### Lambda
- **Function**: `my-test-function`
- **Runtime**: Node.js 18.x
- **Handler**: Returns sample response

#### Secrets Manager
- **Development Secrets**: `/myapp/development/secrets`
- **Test Secrets**: `/myapp/test/secrets`
- **Contains**: Database URLs, API keys, JWT secrets

#### SSM Parameter Store
- **Development Config**: `/myapp/development/config/*`
- **Test Config**: `/myapp/test/config/*`
- **Parameters**: Feature flags, logging config, etc.

#### CloudWatch
- **Log Group**: `/aws/lambda/myapp`

### Testing AWS Services

```bash
# Test S3 operations
curl -X POST http://localhost:3003/aws/s3/upload \
  -H "Content-Type: application/json" \
  -d '{"fileName":"test.jpg","contentType":"image/jpeg"}'

# Test DynamoDB operations
curl -X POST http://localhost:3003/aws/dynamodb/query \
  -H "Content-Type: application/json" \
  -d '{"tableName":"users","key":{"id":"user1"}}'

# Test SQS operations
curl -X POST http://localhost:3003/aws/sqs/send \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello SQS!","attributes":{"source":"test"}}'

# Test SNS operations
curl -X POST http://localhost:3003/aws/sns/publish \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello SNS!","subject":"Test Message"}'

# Test Lambda operations
curl -X POST http://localhost:3003/aws/lambda/invoke \
  -H "Content-Type: application/json" \
  -d '{"payload":{"test":"data"}}'
```

## Database Setup

### PostgreSQL Configuration

- **Host**: localhost:5432
- **Username**: postgres
- **Password**: password
- **Databases**: myapp_dev, myapp_test, myapp_prod

### Pre-created Tables

#### Development Database (myapp_dev)
- `users` - User accounts with authentication
- `sessions` - User session management
- `app_config` - Application configuration storage
- `audit_logs` - Audit trail for user actions

#### Test Database (myapp_test)
- `users` - Simplified user table for testing
- `test_data` - Generic test data table

### Sample Data

The database is pre-populated with:
- 3 sample users with hashed passwords
- Configuration entries for different environments
- Sample audit log entries
- Test data for automated testing

### Database Access

```bash
# Connect to PostgreSQL
docker-compose exec postgres psql -U postgres -d myapp_dev

# Run SQL queries
docker-compose exec postgres psql -U postgres -d myapp_dev -c "SELECT * FROM users;"

# Backup database
docker-compose exec postgres pg_dump -U postgres myapp_dev > backup.sql

# Restore database
docker-compose exec -T postgres psql -U postgres myapp_dev < backup.sql
```

## Redis Configuration

- **Host**: localhost:6379
- **Password**: redispassword
- **Persistence**: Enabled with AOF

### Redis Testing

```bash
# Connect to Redis
docker-compose exec redis redis-cli -a redispassword

# Test Redis operations
docker-compose exec redis redis-cli -a redispassword SET test "Hello Redis"
docker-compose exec redis redis-cli -a redispassword GET test
```

## Environment Variables

### Core Services

```bash
# LocalStack Configuration
DEBUG=0                    # Set to 1 for verbose logging
PERSISTENCE=0              # Set to 1 to persist data between restarts
LOCALSTACK_API_KEY=        # Optional LocalStack Pro API key

# PostgreSQL Configuration
POSTGRES_DB=myapp_dev
POSTGRES_USER=postgres
POSTGRES_PASSWORD=password

# Redis Configuration  
REDIS_PASSWORD=redispassword
```

### Application Configuration

Each example application has its own environment configuration:

#### Basic Example (Port 3001)
```bash
APP_ENV=local
DATABASE_URL=postgres://postgres:password@postgres:5432/myapp_dev
DEBUG_MODE=true
```

#### Custom Schema Example (Port 3002)
```bash
APP_ENV=local
DATABASE_URL=postgres://postgres:password@postgres:5432/myapp_dev
API_KEY=local-api-key-for-testing
JWT_SECRET=local-jwt-secret-32-characters-long
REDIS_URL=redis://:redispassword@redis:6379
```

#### AWS Integration Example (Port 3003)
```bash
APP_ENV=development
AWS_ENDPOINT_URL=http://localstack:4566
AWS_S3_BUCKET=my-test-bucket
SQS_QUEUE_URL=http://localstack:4566/000000000000/my-test-queue
SNS_TOPIC_ARN=arn:aws:sns:us-east-1:000000000000:my-test-topic
```

## Monitoring and Debugging

### Health Checks

All services include health checks:

```bash
# Check service health
docker-compose ps

# View service logs
docker-compose logs localstack
docker-compose logs postgres
docker-compose logs redis
docker-compose logs app-aws

# Follow logs in real-time
docker-compose logs -f app-aws
```

### LocalStack Dashboard

Access the LocalStack dashboard at http://localhost:4566/_localstack/health to see:
- Service status for all AWS services
- Resource listings
- API call logs
- Configuration details

### Application Health Endpoints

Each example application provides health endpoints:

```bash
# Basic example health
curl http://localhost:3001/health

# Custom schema example health  
curl http://localhost:3002/health

# AWS integration example health
curl http://localhost:3003/health
curl http://localhost:3003/monitoring/health
```

## Development Workflow

### 1. Start Development Environment

```bash
# Start core services
docker-compose up -d localstack postgres redis

# Wait for initialization (check logs)
docker-compose logs localstack | grep "Ready"

# Start your preferred example
docker-compose --profile aws up -d app-aws
```

### 2. Develop and Test

```bash
# Make changes to example code
# Rebuild and restart container
docker-compose --profile aws build app-aws
docker-compose --profile aws up -d app-aws

# Test configuration loading
curl http://localhost:3003/config

# Test AWS integration
curl http://localhost:3003/aws
```

### 3. Debug Issues

```bash
# Check container logs
docker-compose logs app-aws

# Access container shell
docker-compose exec app-aws sh

# Test AWS connectivity from container
docker-compose exec app-aws wget -qO- http://localstack:4566/_localstack/health
```

## Troubleshooting

### Common Issues

#### LocalStack Not Ready
```bash
# Check LocalStack status
curl http://localhost:4566/_localstack/health

# Restart LocalStack
docker-compose restart localstack

# Check initialization logs
docker-compose logs localstack
```

#### Database Connection Issues
```bash
# Check PostgreSQL status
docker-compose exec postgres pg_isready -U postgres

# Test database connection
docker-compose exec postgres psql -U postgres -d myapp_dev -c "SELECT 1;"

# Restart PostgreSQL
docker-compose restart postgres
```

#### Redis Connection Issues
```bash
# Test Redis connection
docker-compose exec redis redis-cli -a redispassword ping

# Check Redis logs
docker-compose logs redis

# Restart Redis
docker-compose restart redis
```

#### Application Startup Issues
```bash
# Check application logs
docker-compose logs app-aws

# Verify environment variables
docker-compose exec app-aws env | grep AWS

# Test configuration endpoint
curl http://localhost:3003/config
```

### Reset Environment

```bash
# Stop all services
docker-compose down

# Remove volumes (loses data)
docker-compose down -v

# Remove images (forces rebuild)
docker-compose down --rmi all

# Complete cleanup
docker-compose down -v --rmi all --remove-orphans

# Start fresh
docker-compose up -d
```

## Production Considerations

This Docker Compose setup is designed for local development and testing. For production:

1. **Security**: Use proper AWS credentials and IAM roles
2. **Persistence**: Configure proper data persistence strategies
3. **Monitoring**: Implement production monitoring solutions
4. **Scaling**: Use container orchestration platforms
5. **Networking**: Configure proper network security
6. **Backup**: Implement backup and disaster recovery

## File Structure

```
docker-compose/
├── docker-compose.yml              # Main Docker Compose configuration
├── Dockerfile.example              # Multi-stage Dockerfile for examples
├── README.md                       # This documentation
├── localstack-init/
│   └── 01-setup-aws-resources.sh   # LocalStack initialization script
└── postgres-init/
    └── 01-init-database.sql        # PostgreSQL initialization script
```

## Next Steps

- Explore the [basic-usage example](../basic-usage/) for simple configuration
- Check the [custom-schema example](../custom-schema/) for advanced type safety
- Review the [AWS integration example](../aws-integration/) for comprehensive AWS usage
- See the [main documentation](../../README.md) for complete API reference