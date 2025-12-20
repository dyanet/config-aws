# Getting Started with nestjs-config-aws

Welcome to nestjs-config-aws! This guide will help you get up and running quickly with AWS-integrated configuration management for your NestJS applications.

## 🚀 Quick Start

### Choose Your Integration Approach

nestjs-config-aws offers two ways to integrate with your NestJS application:

1. **Standalone Usage** - Use nestjs-config-aws as your primary configuration module
2. **@nestjs/config Integration** - Add AWS capabilities to existing @nestjs/config setups

## Option 1: Standalone Usage

Perfect for new projects or when you want a complete configuration solution.

### Installation

```bash
npm install nestjs-config-aws
npm install @nestjs/common @nestjs/core zod  # Peer dependencies
```

### Basic Setup

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from 'nestjs-config-aws';

@Module({
  imports: [
    ConfigModule.forRoot({
      // Optional: Enable AWS integration
      secretsManagerConfig: {
        enabled: process.env.NODE_ENV === 'production',
      },
    }),
  ],
})
export class AppModule {}
```

### Service Usage

```typescript
// app.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from 'nestjs-config-aws';

@Injectable()
export class AppService {
  constructor(private configService: ConfigService) {}

  getConfig() {
    return {
      port: this.configService.get('PORT', 3000),
      databaseUrl: this.configService.get('DATABASE_URL'),
      // Values can come from environment variables or AWS
    };
  }
}
```

## Option 2: @nestjs/config Integration (Recommended)

Perfect for existing projects using @nestjs/config or when you prefer standard NestJS patterns.

### Installation

```bash
npm install nestjs-config-aws @nestjs/config
npm install @nestjs/common @nestjs/core zod  # Peer dependencies
```

### Integration Setup

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NestConfigAwsIntegrationModule } from 'nestjs-config-aws';

@Module({
  imports: [
    // Step 1: AWS Integration (must be first)
    NestConfigAwsIntegrationModule.forRoot({
      secretsManagerConfig: {
        enabled: process.env.NODE_ENV !== 'local',
        paths: {
          development: '/myapp/dev/secrets',
          production: '/myapp/prod/secrets',
        },
      },
      precedence: 'aws-first', // AWS values override local values
    }),
    
    // Step 2: Standard @nestjs/config (must be after)
    ConfigModule.forRoot({
      isGlobal: true,
    }),
  ],
})
export class AppModule {}
```

### Service Usage

```typescript
// app.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config'; // Standard @nestjs/config import

@Injectable()
export class AppService {
  constructor(private configService: ConfigService) {}

  getConfig() {
    return {
      port: this.configService.get('PORT', 3000),
      databaseUrl: this.configService.get('DATABASE_URL'), // Can come from AWS
      // No changes needed from standard @nestjs/config usage!
    };
  }
}
```

## 🔧 Environment Configuration

### Environment Variables

Set these environment variables to control behavior:

```bash
# Application environment (controls AWS integration)
APP_ENV=local          # Disable AWS, use local only
APP_ENV=development    # Enable AWS with dev resources
APP_ENV=production     # Enable AWS with prod resources

# AWS Configuration (optional for local development)
AWS_REGION=us-east-1
AWS_PROFILE=myprofile  # For local development

# Your application configuration
PORT=3000
DATABASE_URL=postgresql://localhost:5432/myapp
```

### AWS Resources Setup (Optional)

For AWS integration, set up your secrets and parameters:

#### AWS Secrets Manager

```bash
# Create a secret for your application
aws secretsmanager create-secret \
  --name "/myapp/production/secrets" \
  --description "Production secrets for myapp" \
  --secret-string '{"DATABASE_PASSWORD":"secure-password","API_KEY":"prod-api-key"}'
```

#### AWS SSM Parameter Store

```bash
# Create parameters for your application
aws ssm put-parameter \
  --name "/myapp/production/DATABASE_HOST" \
  --value "prod-db.example.com" \
  --type "String"

aws ssm put-parameter \
  --name "/myapp/production/DATABASE_PORT" \
  --value "5432" \
  --type "String"
```

## 🏃‍♂️ Running Your Application

### Local Development

```bash
# Use local configuration only
APP_ENV=local npm run start:dev
```

### With AWS Integration

```bash
# Use AWS resources for development
APP_ENV=development npm run start:dev

# Use AWS resources for production
APP_ENV=production npm run start:prod
```

## 📋 Configuration Precedence

Understanding how configuration values are resolved:

### aws-first (Default)
1. AWS Secrets Manager
2. AWS SSM Parameter Store
3. Environment Variables
4. Default Values

### local-first
1. Environment Variables
2. AWS Secrets Manager
3. AWS SSM Parameter Store
4. Default Values

### merge
Intelligent merging based on value types and contexts.

## 🔍 Debugging Configuration

Enable debug logging to see how configuration is loaded:

```bash
DEBUG=nestjs-config-aws* npm start
```

Check configuration endpoints (if available):

```bash
curl http://localhost:3000/config
curl http://localhost:3000/health
```

## 📚 Next Steps

### Explore Examples

Check out the comprehensive examples in the `examples/` directory:

- **[basic-usage/](examples/basic-usage/)** - Simple standalone setup
- **[nestjs-config-integration/](examples/nestjs-config-integration/)** - @nestjs/config integration
- **[custom-schema/](examples/custom-schema/)** - Advanced validation with Zod
- **[aws-integration/](examples/aws-integration/)** - Production AWS setup
- **[docker-compose/](examples/docker-compose/)** - Local development environment

### Learn More

- **[README.md](README.md)** - Complete documentation
- **[API Reference](README.md#api-reference)** - Detailed API documentation
- **[Troubleshooting](README.md#troubleshooting)** - Common issues and solutions
- **[Integration Guide](examples/nestjs-config-integration/INTEGRATION_GUIDE.md)** - Comprehensive integration guide

## 🆘 Need Help?

- **Issues**: [GitHub Issues](https://github.com/dyanet/config-aws/issues)
- **Discussions**: [GitHub Discussions](https://github.com/dyanet/config-aws/discussions)
- **Documentation**: [README.md](README.md)

## 🎯 Common Use Cases

### Simple Web Application

```typescript
// Just need basic configuration with optional AWS secrets
NestConfigAwsIntegrationModule.forRoot({
  secretsManagerConfig: {
    enabled: process.env.NODE_ENV === 'production',
    paths: { production: '/myapp/prod/secrets' }
  }
})
```

### Microservices Architecture

```typescript
// Different services, different AWS resource paths
NestConfigAwsIntegrationModule.forRoot({
  secretsManagerConfig: {
    enabled: true,
    paths: {
      development: `/myapp/${process.env.SERVICE_NAME}/dev/secrets`,
      production: `/myapp/${process.env.SERVICE_NAME}/prod/secrets`
    }
  }
})
```

### Multi-Environment Deployment

```typescript
// Dynamic configuration based on deployment stage
NestConfigAwsIntegrationModule.forRootAsync({
  useFactory: async () => {
    const stage = process.env.DEPLOYMENT_STAGE || 'dev';
    return {
      secretsManagerConfig: {
        enabled: stage !== 'local',
        paths: { [stage]: `/myapp/${stage}/secrets` }
      },
      precedence: stage === 'prod' ? 'aws-first' : 'local-first'
    };
  }
})
```

---

**Ready to get started?** Choose your integration approach above and follow the setup instructions. You'll have AWS-integrated configuration running in minutes!

For more advanced usage patterns, check out our [comprehensive examples](examples/) and [detailed documentation](README.md).