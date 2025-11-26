# Troubleshooting Guide

This guide covers common issues you might encounter when using nest-config-aws and their solutions.

## Table of Contents

- [AWS Credential Issues](#aws-credential-issues)
- [Configuration Loading Problems](#configuration-loading-problems)
- [Validation Errors](#validation-errors)
- [Environment Setup Issues](#environment-setup-issues)
- [Performance Issues](#performance-issues)
- [TypeScript Issues](#typescript-issues)
- [Debugging Tips](#debugging-tips)

## AWS Credential Issues

### Issue: CredentialsProviderError - Could not load credentials

**Error Message:**
```
CredentialsProviderError: Could not load credentials from any providers
```

**Causes and Solutions:**

1. **No AWS credentials configured**
   ```bash
   # Configure AWS CLI
   aws configure
   
   # Or set environment variables
   export AWS_ACCESS_KEY_ID=your-access-key
   export AWS_SECRET_ACCESS_KEY=your-secret-key
   export AWS_REGION=us-east-1
   ```

2. **Using AWS profiles**
   ```bash
   # Set profile for the application
   export AWS_PROFILE=myprofile
   
   # Or configure in your application
   process.env.AWS_PROFILE = 'myprofile';
   ```

3. **IAM Role issues in AWS environments**
   - Ensure your EC2 instance, Lambda function, or ECS task has the correct IAM role attached
   - Verify the role has the necessary permissions (see [Permission Issues](#permission-issues))

### Issue: Invalid AWS Region

**Error Message:**
```
ConfigurationError: AWS region could not be determined
```

**Solutions:**

1. **Set AWS_REGION environment variable**
   ```bash
   export AWS_REGION=us-east-1
   ```

2. **Configure region in AWS credentials file**
   ```ini
   # ~/.aws/config
   [default]
   region = us-east-1
   ```

3. **Specify region in module configuration**
   ```typescript
   ConfigModule.forRoot({
     secretsManagerConfig: {
       region: 'us-east-1',
     },
     ssmConfig: {
       region: 'us-east-1',
     },
   })
   ```

### Permission Issues

#### Secrets Manager Access Denied

**Error Message:**
```
AccessDenied: User: arn:aws:iam::123456789012:user/myuser is not authorized to perform: secretsmanager:GetSecretValue
```

**Required IAM Policy:**
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
      "Resource": [
        "arn:aws:secretsmanager:*:*:secret:/myapp/*",
        "arn:aws:secretsmanager:*:*:secret:/myapp/development/*",
        "arn:aws:secretsmanager:*:*:secret:/myapp/test/*",
        "arn:aws:secretsmanager:*:*:secret:/myapp/production/*"
      ]
    }
  ]
}
```

#### SSM Parameter Store Access Denied

**Error Message:**
```
AccessDenied: User: arn:aws:iam::123456789012:user/myuser is not authorized to perform: ssm:GetParametersByPath
```

**Required IAM Policy:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ssm:GetParameter",
        "ssm:GetParameters",
        "ssm:GetParametersByPath"
      ],
      "Resource": [
        "arn:aws:ssm:*:*:parameter/myapp/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "kms:Decrypt"
      ],
      "Resource": [
        "arn:aws:kms:*:*:key/*"
      ],
      "Condition": {
        "StringEquals": {
          "kms:ViaService": "ssm.*.amazonaws.com"
        }
      }
    }
  ]
}
```

## Configuration Loading Problems

### Issue: Configuration Service Returns Undefined

**Symptoms:**
- `configService.get('KEY')` returns `undefined`
- Configuration seems to not be loaded

**Debugging Steps:**

1. **Check module import**
   ```typescript
   // Ensure ConfigModule is imported in your root module
   @Module({
     imports: [
       ConfigModule.forRoot({
         // your configuration
       }),
     ],
   })
   export class AppModule {}
   ```

2. **Verify service injection**
   ```typescript
   // Correct injection
   constructor(private configService: ConfigService<YourConfigType>) {}
   
   // Incorrect - missing type parameter
   constructor(private configService: ConfigService) {}
   ```

3. **Check APP_ENV setting**
   ```bash
   # Verify APP_ENV is set correctly
   echo $APP_ENV
   
   # Should be one of: local, development, test, production
   export APP_ENV=development
   ```

4. **Enable debug logging**
   ```bash
   DEBUG=nest-config-aws* npm start
   ```

### Issue: Configuration Not Loading from AWS

**Symptoms:**
- Only environment variables are loaded
- AWS Secrets Manager or SSM values are missing

**Common Causes:**

1. **APP_ENV is set to 'local'**
   - In local mode, AWS services are only used if valid credentials are found
   - Solution: Set `APP_ENV=development` for testing AWS integration

2. **AWS services disabled in configuration**
   ```typescript
   ConfigModule.forRoot({
     secretsManagerConfig: {
       enabled: true, // Ensure this is true
     },
     ssmConfig: {
       enabled: true, // Ensure this is true
     },
   })
   ```

3. **Incorrect AWS resource paths**
   ```typescript
   // Verify your paths match your AWS resources
   ConfigModule.forRoot({
     secretsManagerConfig: {
       paths: {
         development: '/myapp/dev/secrets', // Must match actual secret name
       },
     },
   })
   ```

### Issue: Configuration Precedence Problems

**Problem:** Values from one source are overriding values from another unexpectedly

**Configuration Loading Order:**
1. Environment Variables (lowest precedence)
2. AWS Secrets Manager
3. AWS SSM Parameter Store
4. Local .env file (highest precedence, local mode only)

**Solutions:**

1. **Check for conflicting variable names**
   ```bash
   # Environment variable
   export DATABASE_URL=postgres://localhost/mydb
   
   # If AWS Secrets Manager also has DATABASE_URL, it will override the env var
   ```

2. **Use environment-specific naming**
   ```bash
   # Environment variables
   export DEV_DATABASE_URL=postgres://localhost/mydb
   export PROD_DATABASE_URL=postgres://prod-server/mydb
   
   # Use different keys in different environments
   ```

3. **Disable specific loaders if needed**
   ```typescript
   ConfigModule.forRoot({
     secretsManagerConfig: {
       enabled: process.env.APP_ENV !== 'local',
     },
   })
   ```

## Validation Errors

### Issue: Schema Validation Failures

**Error Message:**
```
ValidationError: Configuration validation failed
```

**Debugging Steps:**

1. **Check the validation error details**
   ```typescript
   try {
     const config = configService.getAll();
   } catch (error) {
     if (error instanceof ValidationError) {
       console.log('Validation errors:', JSON.stringify(error.validationErrors, null, 2));
     }
   }
   ```

2. **Common validation issues:**

   **Missing required fields:**
   ```typescript
   // Schema requires DATABASE_URL
   const schema = z.object({
     DATABASE_URL: z.string(), // Required
   });
   
   // Solution: Set the environment variable
   export DATABASE_URL=postgres://localhost/mydb
   ```

   **Type coercion problems:**
   ```typescript
   // Schema expects number
   const schema = z.object({
     PORT: z.coerce.number(), // Will convert string to number
   });
   
   // Environment variable (always string)
   export PORT=3000  # This will be coerced to number 3000
   ```

   **Invalid enum values:**
   ```typescript
   // Schema with enum
   const schema = z.object({
     LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']),
   });
   
   // Invalid value
   export LOG_LEVEL=verbose  # Not in enum, will fail
   
   // Solution: Use valid enum value
   export LOG_LEVEL=debug
   ```

3. **Temporarily ignore validation for debugging**
   ```typescript
   ConfigModule.forRoot({
     schema: yourSchema,
     ignoreValidationErrors: true, // Only for debugging!
   })
   ```

### Issue: Type Coercion Not Working

**Problem:** String values from environment variables aren't being converted to expected types

**Solutions:**

1. **Use z.coerce for automatic conversion**
   ```typescript
   const schema = z.object({
     PORT: z.coerce.number(),           // "3000" -> 3000
     DEBUG: z.coerce.boolean(),         // "true" -> true
     TIMEOUT: z.coerce.number().min(0), // "5000" -> 5000 with validation
   });
   ```

2. **Handle boolean conversion explicitly**
   ```typescript
   const schema = z.object({
     ENABLE_FEATURE: z.string()
       .transform(val => val.toLowerCase() === 'true')
       .pipe(z.boolean()),
   });
   ```

3. **Custom transformations**
   ```typescript
   const schema = z.object({
     TAGS: z.string()
       .transform(val => val.split(','))
       .pipe(z.array(z.string())),
   });
   ```

## Environment Setup Issues

### Issue: APP_ENV vs NODE_ENV Confusion

**Problem:** Unexpected behavior due to APP_ENV and NODE_ENV mismatch

**Understanding the difference:**
- `NODE_ENV`: Standard Node.js environment variable
- `APP_ENV`: nest-config-aws specific variable that controls configuration loading

**Behavior:**
```typescript
// If APP_ENV is not set, it defaults to 'local'
// If APP_ENV is set but different from NODE_ENV, a warning is logged

// Examples:
NODE_ENV=production APP_ENV=local     // Warning logged, uses 'local' behavior
NODE_ENV=development APP_ENV=test     // Warning logged, uses 'test' behavior
APP_ENV=production                    // No warning, uses 'production' behavior
```

**Best Practices:**
```bash
# Keep them aligned
export NODE_ENV=production
export APP_ENV=production

# Or use APP_ENV only
export APP_ENV=development
```

### Issue: Local Development Setup

**Problem:** Difficulty setting up local development environment

**Recommended Setup:**

1. **Create .env file for local development**
   ```bash
   # .env
   APP_ENV=local
   DATABASE_URL=postgres://localhost/myapp_dev
   REDIS_URL=redis://localhost:6379
   API_KEY=dev-api-key
   DEBUG=true
   ```

2. **Use dotenv for loading .env files**
   ```bash
   npm install dotenv
   ```

   ```typescript
   // main.ts
   import 'dotenv/config';
   import { NestFactory } from '@nestjs/core';
   ```

3. **Configure AWS profile for local AWS testing**
   ```bash
   # Set up AWS profile
   aws configure --profile myapp-dev
   
   # Use profile in development
   export AWS_PROFILE=myapp-dev
   export APP_ENV=development  # This will use AWS services
   ```

### Issue: Docker Environment Configuration

**Problem:** Configuration not working in Docker containers

**Solutions:**

1. **Pass environment variables to Docker**
   ```dockerfile
   # Dockerfile
   ENV APP_ENV=production
   ENV AWS_REGION=us-east-1
   ```

   ```bash
   # docker run
   docker run -e APP_ENV=production -e AWS_REGION=us-east-1 myapp
   ```

2. **Use Docker Compose for complex setups**
   ```yaml
   # docker-compose.yml
   version: '3.8'
   services:
     app:
       build: .
       environment:
         - APP_ENV=development
         - AWS_REGION=us-east-1
         - DATABASE_URL=postgres://db:5432/myapp
       depends_on:
         - db
     
     db:
       image: postgres:13
       environment:
         - POSTGRES_DB=myapp
   ```

3. **Use AWS IAM roles in ECS/EKS**
   ```json
   {
     "taskRoleArn": "arn:aws:iam::123456789012:role/MyAppTaskRole",
     "executionRoleArn": "arn:aws:iam::123456789012:role/MyAppExecutionRole"
   }
   ```

## Performance Issues

### Issue: Slow Configuration Loading

**Symptoms:**
- Application startup is slow
- Configuration loading takes several seconds

**Optimization Strategies:**

1. **Reduce AWS API calls**
   ```typescript
   // Disable unused services
   ConfigModule.forRoot({
     secretsManagerConfig: {
       enabled: false, // If not using Secrets Manager
     },
     ssmConfig: {
       enabled: process.env.APP_ENV === 'production', // Only in production
     },
   })
   ```

2. **Optimize SSM Parameter Store queries**
   ```typescript
   // Use specific paths to reduce parameter count
   ConfigModule.forRoot({
     ssmConfig: {
       paths: {
         production: '/myapp/prod/config/', // Specific path
       },
     },
   })
   ```

3. **Use regional optimization**
   ```typescript
   // Specify region to avoid auto-detection
   ConfigModule.forRoot({
     secretsManagerConfig: {
       region: 'us-east-1', // Explicit region
     },
   })
   ```

### Issue: Memory Usage

**Problem:** High memory usage due to configuration caching

**Solutions:**

1. **Monitor configuration size**
   ```typescript
   const config = configService.getAll();
   console.log('Config size:', JSON.stringify(config).length);
   ```

2. **Optimize large configuration values**
   ```typescript
   // Instead of storing large JSON in config
   const schema = z.object({
     CONFIG_FILE_PATH: z.string(), // Store path, not content
   });
   
   // Load large config files separately
   const configPath = configService.get('CONFIG_FILE_PATH');
   const largeConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
   ```

## TypeScript Issues

### Issue: Type Safety Not Working

**Problem:** No autocomplete or type checking for configuration keys

**Solutions:**

1. **Ensure proper generic typing**
   ```typescript
   // Define your config type
   const configSchema = z.object({
     PORT: z.coerce.number(),
     DATABASE_URL: z.string(),
   });
   
   type AppConfig = z.infer<typeof configSchema>;
   
   // Use typed service
   @Injectable()
   export class MyService {
     constructor(
       private configService: ConfigService<AppConfig> // Important: include type parameter
     ) {}
   
     getPort() {
       return this.configService.get('PORT'); // Autocomplete works!
     }
   }
   ```

2. **Export and reuse config types**
   ```typescript
   // config/schema.ts
   export const appConfigSchema = z.object({
     PORT: z.coerce.number(),
     DATABASE_URL: z.string(),
   });
   
   export type AppConfig = z.infer<typeof appConfigSchema>;
   
   // services/my.service.ts
   import { AppConfig } from '../config/schema';
   
   @Injectable()
   export class MyService {
     constructor(private configService: ConfigService<AppConfig>) {}
   }
   ```

### Issue: Module Import Errors

**Error Message:**
```
Cannot find module 'nest-config-aws' or its corresponding type declarations
```

**Solutions:**

1. **Check installation**
   ```bash
   npm list nest-config-aws
   # If not installed:
   npm install nest-config-aws
   ```

2. **Check TypeScript configuration**
   ```json
   // tsconfig.json
   {
     "compilerOptions": {
       "moduleResolution": "node",
       "esModuleInterop": true,
       "allowSyntheticDefaultImports": true
     }
   }
   ```

3. **Clear node_modules and reinstall**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

## Debugging Tips

### Enable Debug Logging

```bash
# Enable all nest-config-aws debug logs
DEBUG=nest-config-aws* npm start

# Enable specific component logs
DEBUG=nest-config-aws:loader npm start
DEBUG=nest-config-aws:validation npm start
DEBUG=nest-config-aws:aws npm start
```

### Configuration Loading Inspection

```typescript
// Add temporary logging to see what's being loaded
@Injectable()
export class DebugService implements OnModuleInit {
  constructor(private configService: ConfigService) {}

  onModuleInit() {
    console.log('Configuration loaded:');
    console.log('- Initialized:', this.configService.isInitialized());
    console.log('- All config:', this.configService.getAll());
  }
}
```

### AWS Service Testing

```typescript
// Test AWS services independently
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

async function testSecretsManager() {
  const client = new SecretsManagerClient({ region: 'us-east-1' });
  try {
    const result = await client.send(new GetSecretValueCommand({
      SecretId: '/myapp/development/secrets'
    }));
    console.log('Secrets Manager test successful:', result.SecretString);
  } catch (error) {
    console.error('Secrets Manager test failed:', error);
  }
}
```

### Environment Variable Inspection

```bash
# List all environment variables
printenv | grep -E "(APP_ENV|NODE_ENV|AWS_|DATABASE_)"

# Check specific variables
echo "APP_ENV: $APP_ENV"
echo "AWS_REGION: $AWS_REGION"
echo "AWS_PROFILE: $AWS_PROFILE"
```

### Common Debug Commands

```bash
# Check AWS credentials
aws sts get-caller-identity

# Test AWS region detection
aws configure get region

# List available AWS profiles
aws configure list-profiles

# Test Secrets Manager access
aws secretsmanager get-secret-value --secret-id /myapp/development/secrets

# Test SSM Parameter Store access
aws ssm get-parameters-by-path --path /myapp/development/ --recursive
```

## Getting Help

If you're still experiencing issues:

1. **Check the GitHub Issues**: Look for similar problems in the project's issue tracker
2. **Enable Debug Logging**: Always include debug logs when reporting issues
3. **Provide Minimal Reproduction**: Create a minimal example that reproduces the problem
4. **Include Environment Details**: Node.js version, AWS SDK version, operating system
5. **Check AWS Service Status**: Verify that AWS services are operational in your region

## Common Error Messages Reference

| Error Message | Likely Cause | Solution |
|---------------|--------------|----------|
| `CredentialsProviderError` | AWS credentials not configured | Configure AWS credentials |
| `ValidationError` | Configuration doesn't match schema | Check environment variables and schema |
| `ConfigurationError: AWS region could not be determined` | AWS region not set | Set AWS_REGION environment variable |
| `AccessDenied` | Insufficient AWS permissions | Update IAM policies |
| `ResourceNotFoundException` | AWS resource doesn't exist | Check secret/parameter names and paths |
| `Cannot find module 'nest-config-aws'` | Package not installed | Run `npm install nest-config-aws` |
| `ConfigService.get() returns undefined` | Configuration not loaded | Check module import and APP_ENV |