# @nestjs/config Integration Example

This example demonstrates how to integrate `nest-config-aws` with the standard `@nestjs/config` module to use AWS-sourced configuration values through familiar NestJS patterns.

## Features Demonstrated

- Basic integration setup with `@nestjs/config`
- Async configuration with dependency injection
- Namespaced configuration using `registerAs`
- Validation integration with both Joi and class-validator
- Precedence rule handling
- Error handling and graceful degradation
- Migration patterns from existing setups

## Prerequisites

- Node.js 18+ 
- AWS CLI configured with appropriate credentials
- AWS Secrets Manager and/or SSM Parameter Store access

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure AWS resources** (optional - the example works without AWS):
   
   **Secrets Manager:**
   ```bash
   # Create a secret with database configuration
   aws secretsmanager create-secret \
     --name "/myapp/development/secrets" \
     --description "Development database secrets" \
     --secret-string '{"DATABASE_PASSWORD":"dev-secret-password","API_KEY":"dev-api-key-123"}'
   ```
   
   **SSM Parameter Store:**
   ```bash
   # Create parameters for application configuration
   aws ssm put-parameter \
     --name "/myapp/development/DATABASE_HOST" \
     --value "localhost" \
     --type "String"
   
   aws ssm put-parameter \
     --name "/myapp/development/DATABASE_PORT" \
     --value "5432" \
     --type "String"
   ```

3. **Set environment variables:**
   ```bash
   # Copy the example environment file
   cp .env.example .env
   
   # Edit .env with your configuration
   ```

4. **Run the application:**
   ```bash
   # Development mode
   npm run start:dev
   
   # Production mode
   npm run build
   npm run start:prod
   ```

## Configuration Examples

### Basic Integration

The simplest integration setup loads AWS configuration and makes it available through standard `@nestjs/config` patterns:

```typescript
// app.module.ts
@Module({
  imports: [
    NestConfigAwsIntegrationModule.forRoot({
      secretsManagerConfig: { enabled: true },
      precedence: 'aws-first'
    }),
    ConfigModule.forRoot({ isGlobal: true })
  ]
})
export class AppModule {}
```

### Async Configuration

For complex setups requiring dynamic configuration:

```typescript
// app.module.ts
@Module({
  imports: [
    NestConfigAwsIntegrationModule.forRootAsync({
      useFactory: async () => ({
        secretsManagerConfig: {
          enabled: process.env.NODE_ENV !== 'test',
          region: process.env.AWS_REGION
        }
      })
    }),
    ConfigModule.forRootAsync({
      useFactory: async (configService: ConfigService) => ({
        isGlobal: true,
        validate: validateConfig
      }),
      inject: [ConfigService]
    })
  ]
})
export class AppModule {}
```

### Namespaced Configuration

Using `registerAs` for organized configuration:

```typescript
// config/database.config.ts
export default registerAs('database', () => ({
  host: process.env.DATABASE_HOST,
  port: parseInt(process.env.DATABASE_PORT, 10),
  username: process.env.DATABASE_USERNAME,
  password: process.env.DATABASE_PASSWORD, // From AWS Secrets Manager
}));

// app.module.ts
@Module({
  imports: [
    NestConfigAwsIntegrationModule.forRoot({
      namespaces: ['database'],
      secretsManagerConfig: { enabled: true }
    }),
    ConfigModule.forRoot({
      load: [databaseConfig],
      isGlobal: true
    })
  ]
})
export class AppModule {}
```

## Testing

The example includes comprehensive tests demonstrating:

- Configuration loading from different sources
- Precedence rule behavior
- Error handling scenarios
- Integration with validation

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:cov

# Run e2e tests
npm run test:e2e
```

## API Endpoints

The example application exposes several endpoints to demonstrate configuration access:

- `GET /config` - Show all loaded configuration
- `GET /config/database` - Show database configuration (namespaced)
- `GET /config/source/:key` - Show which source provided a specific key
- `GET /health` - Health check endpoint using configuration

## Environment Variables

| Variable | Description | Default | Source |
|----------|-------------|---------|---------|
| `NODE_ENV` | Application environment | `development` | Local |
| `PORT` | Server port | `3000` | Local/AWS |
| `DATABASE_HOST` | Database hostname | `localhost` | AWS SSM |
| `DATABASE_PORT` | Database port | `5432` | AWS SSM |
| `DATABASE_USERNAME` | Database username | `postgres` | Local |
| `DATABASE_PASSWORD` | Database password | - | AWS Secrets Manager |
| `API_KEY` | External API key | - | AWS Secrets Manager |
| `REDIS_URL` | Redis connection URL | - | Local/AWS |
| `LOG_LEVEL` | Logging level | `info` | Local |

## Troubleshooting

### Common Issues

1. **AWS credentials not found**
   - Ensure AWS CLI is configured: `aws configure`
   - Check environment variables: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`
   - Verify IAM permissions for Secrets Manager and SSM

2. **Configuration not loading from AWS**
   - Check that integration module is imported before ConfigModule
   - Verify AWS resource paths match configuration
   - Enable debug logging: `DEBUG=nest-config-aws:integration*`

3. **Precedence rules not working**
   - Verify precedence setting: `'aws-first'`, `'local-first'`, or `'merge'`
   - Check that both sources contain the same configuration keys
   - Use the `/config/source/:key` endpoint to debug

## Migration Examples

### From @nestjs/config Only

If you're currently using only `@nestjs/config`, see `src/migration/from-nestjs-config.example.ts` for a step-by-step migration.

### From nest-config-aws Only

If you're currently using only `nest-config-aws`, see `src/migration/from-nest-config-aws.example.ts` for migration patterns.

## Learn More

- [nest-config-aws Documentation](../../README.md)
- [@nestjs/config Documentation](https://docs.nestjs.com/techniques/configuration)
- [AWS Secrets Manager](https://aws.amazon.com/secrets-manager/)
- [AWS Systems Manager Parameter Store](https://docs.aws.amazon.com/systems-manager/latest/userguide/systems-manager-parameter-store.html)