# Custom Schema Example

This example demonstrates advanced usage of nest-config-aws with a comprehensive custom Zod schema, type safety, and AWS integration.

## Features Demonstrated

- ✅ **Custom Zod Schema**: Comprehensive configuration schema with validation
- ✅ **Type Safety**: Full TypeScript support with autocomplete and type checking
- ✅ **AWS Integration**: Secrets Manager and SSM Parameter Store integration
- ✅ **Environment-Aware Configuration**: Different behavior based on APP_ENV
- ✅ **Complex Validation**: Custom transformations, enums, and validation rules
- ✅ **Real-World Patterns**: Database, API, security, and feature flag configurations
- ✅ **Service Integration**: Multiple services using typed configuration
- ✅ **Health Checks**: Configuration-based health monitoring
- ✅ **Error Handling**: Comprehensive error handling and validation

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your values - pay attention to required fields
   ```

3. **Run the application:**
   ```bash
   # Development mode with file watching
   npm run start:dev
   
   # Production build and run
   npm run build
   npm run start:prod
   ```

4. **Explore the endpoints:**
   ```bash
   # Application info
   curl http://localhost:3000/info
   
   # Complete configuration (masked sensitive values)
   curl http://localhost:3000/config
   
   # Health check with service status
   curl http://localhost:3000/health
   
   # Feature flags
   curl http://localhost:3000/features
   
   # Database operations
   curl http://localhost:3000/database/status
   curl -X POST http://localhost:3000/database/query \
     -H "Content-Type: application/json" \
     -d '{"query":"SELECT * FROM users"}'
   
   # API service operations
   curl http://localhost:3000/api/config
   curl -X POST http://localhost:3000/api/call/users \
     -H "Content-Type: application/json" \
     -d '{"limit":10}'
   
   # File upload validation
   curl -X POST http://localhost:3000/upload/validate \
     -H "Content-Type: application/json" \
     -d '{"size":1024000,"type":"jpg"}'
   ```

## Configuration Schema

This example uses a comprehensive Zod schema that demonstrates:

### Basic Types and Validation
```typescript
PORT: z.coerce.number().min(1).max(65535).default(3000)
DATABASE_URL: z.string().url('Invalid database URL format')
API_KEY: z.string().min(1, 'API key is required')
```

### Enums and Constraints
```typescript
APP_ENV: z.enum(['local', 'development', 'test', 'production']).default('local')
LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info')
BCRYPT_ROUNDS: z.coerce.number().min(8).max(15).default(12)
```

### Custom Transformations
```typescript
TAGS: z.string()
  .transform(val => val.split(',').map(tag => tag.trim().toLowerCase()))
  .pipe(z.array(z.string().min(1)))
  .default('app,nestjs')

CORS_ORIGINS: z.string()
  .transform(val => val.split(',').map(origin => origin.trim()))
  .pipe(z.array(z.string().url().or(z.literal('*'))))
  .default('http://localhost:3000')
```

### Optional and Conditional Fields
```typescript
REDIS_URL: z.string().url().optional()
AWS_S3_BUCKET: z.string().optional()
SMTP_HOST: z.string().optional()
```

## Type Safety Features

### Typed Configuration Service
```typescript
@Injectable()
export class AppService {
  constructor(
    private configService: ConfigService<AppConfig> // Fully typed!
  ) {}

  getPort(): number {
    return this.configService.get('PORT'); // TypeScript knows this is number
  }

  getTags(): string[] {
    return this.configService.get('TAGS'); // TypeScript knows this is string[]
  }
}
```

### Autocomplete and IntelliSense
- Full autocomplete for configuration keys
- Type checking for configuration values
- Compile-time error detection for invalid keys

## AWS Integration

### Secrets Manager Configuration
```typescript
secretsManagerConfig: {
  enabled: process.env.APP_ENV !== 'local',
  region: process.env.AWS_REGION || 'us-east-1',
  paths: {
    development: '/myapp/dev/secrets',
    test: '/myapp/test/secrets',
    production: '/myapp/prod/secrets',
  },
}
```

### SSM Parameter Store Configuration
```typescript
ssmConfig: {
  enabled: process.env.APP_ENV !== 'local',
  region: process.env.AWS_REGION || 'us-east-1',
  decrypt: true,
  paths: {
    development: '/myapp/dev/config/',
    test: '/myapp/test/config/',
    production: '/myapp/prod/config/',
  },
}
```

## Environment-Specific Behavior

### Local Development (APP_ENV=local)
- Uses only environment variables and .env file
- AWS services disabled
- Debug mode enabled
- Swagger enabled

### Development (APP_ENV=development)
- Loads from environment variables
- Loads from AWS Secrets Manager: `/myapp/dev/secrets`
- Loads from AWS SSM: `/myapp/dev/config/`
- Debug mode enabled
- Swagger enabled

### Test (APP_ENV=test)
- Loads from environment variables
- Loads from AWS Secrets Manager: `/myapp/test/secrets`
- Loads from AWS SSM: `/myapp/test/config/`
- Logging disabled
- Minimal configuration

### Production (APP_ENV=production)
- Loads from environment variables
- Loads from AWS Secrets Manager: `/myapp/prod/secrets`
- Loads from AWS SSM: `/myapp/prod/config/`
- Debug mode disabled
- Swagger disabled
- SSL required

## Required Environment Variables

The following environment variables are required and will cause validation errors if missing:

| Variable | Type | Description | Example |
|----------|------|-------------|---------|
| `DATABASE_URL` | URL | Database connection string | `postgres://user:pass@localhost:5432/db` |
| `API_KEY` | String | External API key (min 1 char) | `your-api-key-here` |
| `JWT_SECRET` | String | JWT signing secret (min 32 chars) | `your-super-secret-jwt-key-32-chars` |

## AWS Setup for Testing

### 1. Configure AWS Credentials
```bash
# Using AWS CLI
aws configure

# Or using environment variables
export AWS_ACCESS_KEY_ID=your-access-key
export AWS_SECRET_ACCESS_KEY=your-secret-key
export AWS_REGION=us-east-1

# Or using AWS profile
export AWS_PROFILE=myprofile
```

### 2. Create Test AWS Resources

**Secrets Manager:**
```bash
# Create development secrets
aws secretsmanager create-secret \
  --name "/myapp/dev/secrets" \
  --secret-string '{
    "API_KEY": "dev-api-key-from-secrets-manager",
    "JWT_SECRET": "dev-jwt-secret-from-secrets-manager-32-chars",
    "DATABASE_PASSWORD": "dev-db-password"
  }'

# Create production secrets
aws secretsmanager create-secret \
  --name "/myapp/prod/secrets" \
  --secret-string '{
    "API_KEY": "prod-api-key-from-secrets-manager",
    "JWT_SECRET": "prod-jwt-secret-from-secrets-manager-32-chars",
    "DATABASE_PASSWORD": "prod-db-password"
  }'
```

**SSM Parameter Store:**
```bash
# Development parameters
aws ssm put-parameter --name "/myapp/dev/config/DEBUG_MODE" --value "true" --type "String"
aws ssm put-parameter --name "/myapp/dev/config/LOG_LEVEL" --value "debug" --type "String"
aws ssm put-parameter --name "/myapp/dev/config/ENABLE_SWAGGER" --value "true" --type "String"

# Production parameters
aws ssm put-parameter --name "/myapp/prod/config/DEBUG_MODE" --value "false" --type "String"
aws ssm put-parameter --name "/myapp/prod/config/LOG_LEVEL" --value "warn" --type "String"
aws ssm put-parameter --name "/myapp/prod/config/ENABLE_SWAGGER" --value "false" --type "String"
aws ssm put-parameter --name "/myapp/prod/config/DATABASE_SSL" --value "true" --type "String"
```

### 3. Test AWS Integration
```bash
# Test with development AWS resources
APP_ENV=development npm run start:dev

# Test with production AWS resources
APP_ENV=production npm run start:dev
```

## Code Structure

```
src/
├── config/
│   └── schema.ts           # Zod schema definition and types
├── services/
│   ├── database.service.ts # Database service with typed config
│   └── api.service.ts      # API service with typed config
├── app.module.ts           # Module configuration
├── app.controller.ts       # HTTP endpoints
├── app.service.ts          # Main application service
└── main.ts                 # Application bootstrap
```

## Advanced Features

### 1. Environment-Specific Schema Variations
```typescript
export const getEnvironmentSpecificSchema = (env: string) => {
  switch (env) {
    case 'production':
      return baseSchema.extend({
        DATABASE_SSL: z.literal(true),
        DEBUG_MODE: z.literal(false),
      });
    // ... other environments
  }
};
```

### 2. Configuration Validation Helpers
```typescript
export const validateConfig = (config: unknown): AppConfig => {
  const result = appConfigSchema.safeParse(config);
  if (!result.success) {
    // Detailed error reporting
  }
  return result.data;
};
```

### 3. Service-Specific Configuration
Each service demonstrates different configuration patterns:
- **DatabaseService**: Connection pooling, timeouts, SSL
- **ApiService**: Retry logic, rate limiting, authentication
- **AppService**: Feature flags, environment detection

### 4. Health Checks
Comprehensive health checks that use configuration:
```typescript
async healthCheck() {
  const dbHealth = await this.databaseService.healthCheck();
  const apiHealth = await this.apiService.healthCheck();
  // Aggregate health status
}
```

## Troubleshooting

### Configuration Validation Errors
```bash
# Enable debug logging
DEBUG=nest-config-aws* npm run start:dev

# Check specific validation errors in the console output
```

### Common Issues

1. **Missing Required Variables**: Check that `DATABASE_URL`, `API_KEY`, and `JWT_SECRET` are set
2. **Invalid URL Format**: Ensure URLs are properly formatted with protocol
3. **JWT Secret Too Short**: Must be at least 32 characters
4. **AWS Credentials**: Required when `APP_ENV` is not 'local'
5. **Type Coercion**: Numbers and booleans are automatically converted from strings

### Testing Different Configurations

```bash
# Test with minimal configuration
APP_ENV=local DATABASE_URL=postgres://localhost/test API_KEY=test JWT_SECRET=test-secret-32-characters-long npm run start:dev

# Test with AWS integration
APP_ENV=development AWS_REGION=us-east-1 npm run start:dev

# Test production configuration
APP_ENV=production DATABASE_SSL=true npm run start:dev
```

## Next Steps

- Explore the [basic-usage example](../basic-usage/) for simpler setup
- Check the [main documentation](../../README.md) for complete API reference
- Review the [troubleshooting guide](../../docs/TROUBLESHOOTING.md) for common issues
- See the [API documentation](../../docs/API.md) for detailed interface reference