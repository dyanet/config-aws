# nestjs-config-aws Examples

This directory contains comprehensive examples demonstrating different usage patterns and features of the nestjs-config-aws module.

## Available Examples

### 1. [Basic Usage](./basic-usage/)
**Perfect for getting started quickly**

- ✅ Default configuration schema
- ✅ Environment variable loading
- ✅ Simple NestJS integration
- ✅ Local development focus
- ✅ Minimal setup required

**Use this when**: You want to quickly add configuration management to a NestJS app without complex requirements.

### 2. [Custom Schema](./custom-schema/)
**Advanced configuration with full type safety**

- ✅ Comprehensive custom Zod schema
- ✅ Full TypeScript type safety
- ✅ Complex validation rules
- ✅ Environment-specific configurations
- ✅ Real-world patterns (database, API, security, features)
- ✅ Multiple services integration

**Use this when**: You need type-safe configuration with complex validation and multiple service integrations.

### 3. [AWS Integration](./aws-integration/)
**Production-ready AWS service integration**

- ✅ Comprehensive AWS services (S3, DynamoDB, SQS, SNS, Lambda, Cognito)
- ✅ Environment-aware AWS configuration
- ✅ CloudWatch and X-Ray integration
- ✅ Production security patterns
- ✅ Monitoring and health checks
- ✅ Mock AWS operations for development

**Use this when**: You're building AWS-native applications that need comprehensive AWS service integration.

### 4. [@nestjs/config Integration](./nestjs-config-integration/)
**Seamless integration with standard @nestjs/config**

- ✅ Standard @nestjs/config compatibility
- ✅ AWS-sourced configuration through familiar patterns
- ✅ Precedence rule handling (aws-first, local-first, merge)
- ✅ Namespaced configuration with registerAs
- ✅ Validation integration (Joi and class-validator)
- ✅ Migration examples from existing setups
- ✅ Async configuration support

**Use this when**: You want to add AWS capabilities to existing @nestjs/config setups or prefer standard NestJS patterns.

### 5. [Docker Compose Setup](./docker-compose/)
**Complete local development environment**

- ✅ LocalStack for AWS services emulation
- ✅ PostgreSQL with sample data
- ✅ Redis caching service
- ✅ All examples running in containers
- ✅ Automated resource setup
- ✅ Development tools included

**Use this when**: You want a complete local development environment that mirrors production AWS services.

## Quick Start Guide

### Choose Your Starting Point

#### New to nestjs-config-aws?
Start with the **[Basic Usage](./basic-usage/)** example:
```bash
cd basic-usage
npm install
cp .env.example .env
npm run start:dev
```

#### Need type safety and validation?
Use the **[Custom Schema](./custom-schema/)** example:
```bash
cd custom-schema
npm install
cp .env.example .env
# Edit .env with required values
npm run start:dev
```

#### Building AWS applications?
Try the **[AWS Integration](./aws-integration/)** example:
```bash
cd aws-integration
npm install
cp .env.example .env
# Configure AWS credentials
npm run start:dev
```

#### Using @nestjs/config already?
Try the **[@nestjs/config Integration](./nestjs-config-integration/)** example:
```bash
cd nestjs-config-integration
npm install
cp .env.example .env
npm run start:dev
```

#### Want a complete local environment?
Use the **[Docker Compose](./docker-compose/)** setup:
```bash
cd docker-compose
docker-compose up -d
# Access examples at localhost:3001, 3002, 3003
```

## Feature Comparison

| Feature | Basic Usage | Custom Schema | AWS Integration | @nestjs/config Integration | Docker Compose |
|---------|-------------|---------------|-----------------|----------------------------|----------------|
| **Complexity** | Simple | Medium | Advanced | Medium | Complete |
| **Setup Time** | 5 minutes | 15 minutes | 30 minutes | 10 minutes | 10 minutes |
| **Type Safety** | Basic | Full | Full | Full | Full |
| **AWS Services** | None | None | Comprehensive | Basic | Emulated |
| **Validation** | Default | Custom Zod | AWS-focused | Joi + class-validator | All patterns |
| **@nestjs/config Compatible** | No | No | No | Yes | Yes |
| **Production Ready** | Basic | Yes | Yes | Yes | Development |
| **Learning Curve** | Easy | Medium | Advanced | Easy | Easy |

## Common Use Cases

### 1. Simple Configuration Management
**Example**: Basic web application with database and API configuration
**Recommended**: [Basic Usage](./basic-usage/)

### 2. Type-Safe Configuration
**Example**: Application with complex configuration requirements and multiple services
**Recommended**: [Custom Schema](./custom-schema/)

### 3. AWS-Native Applications
**Example**: Serverless or containerized applications using multiple AWS services
**Recommended**: [AWS Integration](./aws-integration/)

### 4. Local Development with AWS
**Example**: Developing AWS applications locally without cloud costs
**Recommended**: [Docker Compose](./docker-compose/)

### 5. Team Development Environment
**Example**: Consistent development environment across team members
**Recommended**: [Docker Compose](./docker-compose/)

## Configuration Patterns Demonstrated

### Environment-Aware Configuration
All examples demonstrate how configuration changes based on `APP_ENV`:

- **local**: Environment variables + .env file only
- **development**: + AWS Secrets Manager + SSM Parameter Store
- **test**: + AWS services with test-specific paths
- **production**: + AWS services with production security

### Configuration Sources Priority
1. Environment variables (highest priority)
2. AWS Secrets Manager (if enabled)
3. AWS SSM Parameter Store (if enabled)
4. Default values in schema (lowest priority)

### Security Best Practices
- Sensitive values masked in configuration endpoints
- AWS credentials through IAM roles (production)
- Environment-specific secret paths
- Validation of all configuration values

## Development Workflow

### 1. Local Development
```bash
# Start with basic example
cd basic-usage
APP_ENV=local npm run start:dev

# Test configuration
curl http://localhost:3000/config
```

### 2. AWS Development
```bash
# Configure AWS credentials
aws configure

# Use AWS integration example
cd aws-integration
APP_ENV=development npm run start:dev

# Test AWS services
curl http://localhost:3000/aws
```

### 3. Production Simulation
```bash
# Use production environment settings
APP_ENV=production npm run start:prod

# Verify production configuration
curl http://localhost:3000/health
```

## Testing Strategies

### Unit Testing
Each example includes patterns for:
- Configuration service testing
- Mock AWS services
- Environment-specific test configurations

### Integration Testing
- Docker Compose provides full integration testing environment
- LocalStack enables AWS service testing without cloud costs
- Database and Redis services for complete application testing

### End-to-End Testing
- Health check endpoints for monitoring
- Configuration validation endpoints
- AWS service status endpoints

## Deployment Patterns

### Container Deployment
All examples include:
- Multi-stage Dockerfiles for production builds
- Health checks for container orchestration
- Environment variable configuration
- Security best practices

### AWS Deployment
AWS Integration example demonstrates:
- IAM role-based authentication
- Environment-specific resource paths
- CloudWatch integration
- X-Ray tracing setup

## Troubleshooting

### Common Issues

#### Configuration Not Loading
1. Check `APP_ENV` is set correctly
2. Verify AWS credentials (if not local)
3. Check AWS region configuration
4. Enable debug logging: `DEBUG=nestjs-config-aws*`

#### AWS Service Access Denied
1. Verify IAM permissions
2. Check AWS region matches configuration
3. Ensure resources exist in correct environment paths
4. Test AWS CLI access: `aws sts get-caller-identity`

#### Type Errors
1. Ensure schema matches actual configuration
2. Check required vs optional fields
3. Verify type coercion for numbers/booleans
4. Review Zod validation errors

### Debug Commands

```bash
# Enable debug logging
DEBUG=nestjs-config-aws* npm run start:dev

# Test AWS connectivity
aws sts get-caller-identity
aws secretsmanager get-secret-value --secret-id /myapp/development/secrets
aws ssm get-parameters-by-path --path /myapp/development/config/

# Verify configuration loading
curl http://localhost:3000/config
curl http://localhost:3000/health
```

## Best Practices

### Configuration Schema Design
1. Use descriptive validation messages
2. Provide sensible defaults
3. Group related configuration
4. Use environment-specific schemas when needed

### Security
1. Never log sensitive configuration values
2. Use AWS IAM roles in production
3. Validate all configuration inputs
4. Mask sensitive values in API responses

### Performance
1. Cache configuration after loading
2. Use connection pooling for AWS services
3. Implement health checks for monitoring
4. Monitor configuration loading times

### Maintainability
1. Document all configuration options
2. Use TypeScript for type safety
3. Implement comprehensive error handling
4. Provide clear validation error messages

## Next Steps

1. **Start Simple**: Begin with the basic usage example
2. **Add Type Safety**: Move to custom schema when you need validation
3. **Integrate AWS**: Use AWS integration for cloud-native applications
4. **Local Development**: Set up Docker Compose for team development
5. **Production**: Follow security and monitoring best practices

## Contributing

To add new examples or improve existing ones:

1. Follow the established patterns in existing examples
2. Include comprehensive documentation
3. Add both unit and integration tests
4. Provide clear setup instructions
5. Include troubleshooting guidance

## Support

- **Documentation**: [Main README](../README.md)
- **API Reference**: [API Documentation](../docs/API.md)
- **Troubleshooting**: [Troubleshooting Guide](../docs/TROUBLESHOOTING.md)
- **Issues**: [GitHub Issues](https://github.com/your-org/nestjs-config-aws/issues)