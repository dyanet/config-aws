# Complete @nestjs/config Integration Guide

This guide provides comprehensive instructions for integrating `nest-config-aws` with the standard `@nestjs/config` module.

## Table of Contents

1. [Quick Start](#quick-start)
2. [Integration Patterns](#integration-patterns)
3. [Configuration Options](#configuration-options)
4. [Migration Strategies](#migration-strategies)
5. [Best Practices](#best-practices)
6. [Troubleshooting](#troubleshooting)
7. [Advanced Usage](#advanced-usage)

## Quick Start

### 1. Installation

```bash
npm install nest-config-aws @nestjs/config
```

### 2. Basic Setup

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NestConfigAwsIntegrationModule } from 'nest-config-aws';

@Module({
  imports: [
    // Step 1: AWS Integration (must be first)
    NestConfigAwsIntegrationModule.forRoot({
      secretsManagerConfig: { enabled: true },
      precedence: 'aws-first'
    }),
    
    // Step 2: Standard @nestjs/config (must be after)
    ConfigModule.forRoot({ isGlobal: true })
  ]
})
export class AppModule {}
```

### 3. Usage in Services

```typescript
// any.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config'; // Standard import

@Injectable()
export class AnyService {
  constructor(private configService: ConfigService) {}

  getConfig() {
    // Values can now come from AWS or local sources
    return this.configService.get('DATABASE_URL');
  }
}
```

## Integration Patterns

### Pattern 1: Basic Integration

**Use Case**: Simple applications that need AWS secrets in production but local config in development.

```typescript
NestConfigAwsIntegrationModule.forRoot({
  secretsManagerConfig: {
    enabled: process.env.NODE_ENV === 'production',
    paths: { production: '/myapp/prod/secrets' }
  },
  precedence: 'aws-first'
})
```

### Pattern 2: Environment-Aware Integration

**Use Case**: Different AWS resources for different environments.

```typescript
NestConfigAwsIntegrationModule.forRoot({
  secretsManagerConfig: {
    enabled: process.env.APP_ENV !== 'local',
    paths: {
      development: '/myapp/dev/secrets',
      test: '/myapp/test/secrets',
      production: '/myapp/prod/secrets'
    }
  },
  ssmConfig: {
    enabled: process.env.APP_ENV !== 'local',
    paths: {
      development: '/myapp/dev/',
      test: '/myapp/test/',
      production: '/myapp/prod/'
    }
  },
  precedence: process.env.NODE_ENV === 'production' ? 'aws-first' : 'local-first'
})
```

### Pattern 3: Async Integration

**Use Case**: Dynamic configuration based on runtime conditions.

```typescript
NestConfigAwsIntegrationModule.forRootAsync({
  useFactory: async () => {
    const stage = await getDeploymentStage();
    return {
      secretsManagerConfig: {
        enabled: stage !== 'local',
        paths: { [stage]: `/myapp/${stage}/secrets` }
      }
    };
  }
})
```

### Pattern 4: Namespaced Integration

**Use Case**: Organized configuration with `registerAs` patterns.

```typescript
// config/database.config.ts
export default registerAs('database', () => ({
  host: process.env.DATABASE_HOST,
  password: process.env.DATABASE_PASSWORD, // From AWS
}));

// app.module.ts
NestConfigAwsIntegrationModule.forRoot({
  namespaces: ['database'],
  secretsManagerConfig: { enabled: true }
}),
ConfigModule.forRoot({
  load: [databaseConfig]
})
```

## Configuration Options

### Integration Options

```typescript
interface IntegrationOptions {
  // AWS Configuration
  secretsManagerConfig?: SecretsManagerConfig;
  ssmConfig?: SSMConfig;
  
  // Integration Behavior
  precedence?: 'aws-first' | 'local-first' | 'merge';
  namespaces?: string[];
  enableLogging?: boolean;
  
  // Error Handling
  failOnAwsError?: boolean;
  fallbackToLocal?: boolean;
  
  // @nestjs/config Compatibility
  registerGlobally?: boolean;
  factoryOptions?: {
    cache?: boolean;
    expandVariables?: boolean;
  };
}
```

### Precedence Rules

#### aws-first (Default)
```typescript
// AWS values override local values
precedence: 'aws-first'

// Result: AWS_VALUE (if available), otherwise LOCAL_VALUE
```

#### local-first
```typescript
// Local values override AWS values
precedence: 'local-first'

// Result: LOCAL_VALUE (if available), otherwise AWS_VALUE
```

#### merge
```typescript
// Intelligent merging of all sources
precedence: 'merge'

// Result: Smart combination based on value types and contexts
```

## Migration Strategies

### From @nestjs/config Only

**Before:**
```typescript
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true })
  ]
})
```

**After:**
```typescript
@Module({
  imports: [
    NestConfigAwsIntegrationModule.forRoot({
      secretsManagerConfig: { enabled: true }
    }),
    ConfigModule.forRoot({ isGlobal: true })
  ]
})
```

**Changes Required:**
- ✅ No service code changes
- ✅ No import changes
- ✅ Add AWS resources
- ✅ Configure AWS permissions

### From nest-config-aws Only

**Before:**
```typescript
import { ConfigModule } from 'nest-config-aws';

@Module({
  imports: [
    ConfigModule.forRoot({
      secretsManagerConfig: { enabled: true }
    })
  ]
})
```

**After:**
```typescript
import { ConfigModule } from '@nestjs/config';
import { NestConfigAwsIntegrationModule } from 'nest-config-aws';

@Module({
  imports: [
    NestConfigAwsIntegrationModule.forRoot({
      secretsManagerConfig: { enabled: true }
    }),
    ConfigModule.forRoot({ isGlobal: true })
  ]
})
```

**Changes Required:**
- ✅ Update imports in app.module.ts
- ✅ Update ConfigService imports in services
- ✅ No AWS resource changes needed

### Migration Checklist

- [ ] **Pre-Migration**
  - [ ] Document current configuration keys
  - [ ] Identify sensitive values for AWS migration
  - [ ] Set up AWS resources (Secrets Manager, SSM)
  - [ ] Configure AWS permissions

- [ ] **Migration**
  - [ ] Install required packages
  - [ ] Update module imports
  - [ ] Update service imports (if needed)
  - [ ] Configure integration options

- [ ] **Testing**
  - [ ] Test local development (APP_ENV=local)
  - [ ] Test AWS integration (APP_ENV=development)
  - [ ] Verify precedence rules work correctly
  - [ ] Test error scenarios (AWS unavailable)

- [ ] **Post-Migration**
  - [ ] Update documentation
  - [ ] Train team on new patterns
  - [ ] Monitor in production
  - [ ] Clean up old configuration code

## Best Practices

### 1. Environment Strategy

```typescript
// Use APP_ENV to control AWS integration
const getIntegrationConfig = () => {
  const appEnv = process.env.APP_ENV || 'local';
  
  return {
    secretsManagerConfig: {
      enabled: appEnv !== 'local',
      paths: { [appEnv]: `/myapp/${appEnv}/secrets` }
    },
    precedence: appEnv === 'production' ? 'aws-first' : 'local-first',
    enableLogging: appEnv === 'development',
    failOnAwsError: appEnv === 'production'
  };
};
```

### 2. Security Practices

```typescript
// Never log sensitive configuration
const logSafeConfig = (config: any) => {
  const safe = { ...config };
  const sensitiveKeys = ['password', 'secret', 'key', 'token'];
  
  for (const key of Object.keys(safe)) {
    if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
      safe[key] = '***masked***';
    }
  }
  
  return safe;
};
```

### 3. Validation Integration

```typescript
// Use with Joi validation
import * as Joi from 'joi';

ConfigModule.forRoot({
  validationSchema: Joi.object({
    DATABASE_URL: Joi.string().required(),
    API_KEY: Joi.string().min(10).required(), // Can come from AWS
  })
})
```

### 4. Health Checks

```typescript
@Injectable()
export class HealthService {
  constructor(private configService: ConfigService) {}

  checkConfiguration() {
    const required = ['DATABASE_URL', 'API_KEY'];
    const missing = required.filter(key => !this.configService.get(key));
    
    return {
      status: missing.length === 0 ? 'healthy' : 'unhealthy',
      missing
    };
  }
}
```

## Troubleshooting

### Common Issues

#### 1. Configuration Not Loading from AWS

**Symptoms:**
- Values are undefined or using local fallbacks
- AWS integration seems to be ignored

**Solutions:**
```bash
# Check AWS credentials
aws sts get-caller-identity

# Enable debug logging
DEBUG=nest-config-aws:integration* npm start

# Verify integration module order
# NestConfigAwsIntegrationModule MUST come before ConfigModule
```

#### 2. Precedence Rules Not Working

**Symptoms:**
- Wrong values being used
- Expected AWS values not overriding local values

**Solutions:**
```typescript
// Check precedence configuration
NestConfigAwsIntegrationModule.forRoot({
  precedence: 'aws-first', // Ensure this is set correctly
  enableLogging: true      // Enable to see which values are used
})
```

#### 3. Validation Errors

**Symptoms:**
- Configuration validation fails after integration
- Type errors when accessing configuration

**Solutions:**
```typescript
// Ensure AWS values match validation schema
// Check that all required values are available from AWS sources
// Use debug logging to see actual loaded values
```

#### 4. Async Configuration Issues

**Symptoms:**
- Configuration not available at startup
- Dependency injection errors

**Solutions:**
```typescript
// Ensure proper async setup
NestConfigAwsIntegrationModule.forRootAsync({
  useFactory: async () => {
    // Ensure this completes before ConfigModule initialization
    return integrationOptions;
  }
})
```

### Debug Commands

```bash
# Enable all debug logging
DEBUG=nest-config-aws* npm start

# Test AWS connectivity
aws secretsmanager get-secret-value --secret-id /myapp/dev/secrets
aws ssm get-parameters-by-path --path /myapp/dev/

# Check configuration endpoints
curl http://localhost:3000/config
curl http://localhost:3000/health
```

## Advanced Usage

### Custom Configuration Factories

```typescript
// Create custom configuration factories that work with AWS integration
const createDatabaseConfig = () => registerAs('database', () => ({
  host: process.env.DATABASE_HOST,
  port: parseInt(process.env.DATABASE_PORT, 10),
  password: process.env.DATABASE_PASSWORD, // From AWS Secrets Manager
  ssl: process.env.NODE_ENV === 'production'
}));
```

### Multiple AWS Accounts

```typescript
// Configure different AWS accounts for different environments
NestConfigAwsIntegrationModule.forRootAsync({
  useFactory: async () => {
    const account = await getCurrentAwsAccount();
    return {
      secretsManagerConfig: {
        enabled: true,
        region: getRegionForAccount(account),
        paths: {
          production: `/myapp/${account}/prod/secrets`
        }
      }
    };
  }
})
```

### Configuration Caching

```typescript
// Enable caching for better performance
ConfigModule.forRoot({
  cache: true, // Enable @nestjs/config caching
  isGlobal: true
})

// AWS configuration is automatically cached after first load
```

### Custom Validation

```typescript
// Custom validation that works with AWS-sourced values
const validateConfig = (config: Record<string, unknown>) => {
  // Custom validation logic here
  if (process.env.NODE_ENV === 'production' && !config.API_KEY) {
    throw new Error('API_KEY is required in production');
  }
  return config;
};

ConfigModule.forRoot({
  validate: validateConfig
})
```

## Support and Resources

- **Main Documentation**: [README.md](../README.md)
- **API Reference**: [API Documentation](../docs/API.md)
- **Examples**: [Examples Directory](../examples/)
- **Issues**: [GitHub Issues](https://github.com/your-org/nest-config-aws/issues)

---

## Quick Reference

### Module Import Order
```typescript
// ✅ Correct order
NestConfigAwsIntegrationModule.forRoot({}),
ConfigModule.forRoot({})

// ❌ Wrong order
ConfigModule.forRoot({}),
NestConfigAwsIntegrationModule.forRoot({})
```

### Service Usage
```typescript
// ✅ Standard @nestjs/config patterns work
import { ConfigService } from '@nestjs/config';
this.configService.get('KEY')

// ❌ Don't use nest-config-aws ConfigService
import { ConfigService } from 'nest-config-aws';
```

### Environment Variables
```bash
# Control AWS integration
APP_ENV=local          # Disable AWS, use local only
APP_ENV=development    # Enable AWS with dev resources
APP_ENV=production     # Enable AWS with prod resources

# AWS Configuration
AWS_REGION=us-east-1
AWS_PROFILE=myprofile  # For local development
```

This integration provides the best of both worlds: the familiar patterns of @nestjs/config with the powerful AWS integration capabilities of nest-config-aws.