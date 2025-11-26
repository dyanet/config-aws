# Basic Usage Example

This example demonstrates the basic usage of nest-config-aws with default configuration settings.

## Features Demonstrated

- ✅ Default configuration loading from environment variables
- ✅ Automatic APP_ENV detection and handling
- ✅ Basic service injection and configuration access
- ✅ Environment-aware configuration loading
- ✅ Health check endpoint with configuration info

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your values
   ```

3. **Run the application:**
   ```bash
   # Development mode
   npm run start:dev
   
   # Production mode
   npm run build
   npm run start:prod
   ```

4. **Test the endpoints:**
   ```bash
   # Basic hello endpoint
   curl http://localhost:3000
   
   # Configuration info
   curl http://localhost:3000/config
   
   # Health check
   curl http://localhost:3000/health
   ```

## Configuration Sources

This example uses the default configuration loading behavior:

### Local Mode (APP_ENV=local)
- ✅ Environment variables from `process.env`
- ✅ Local `.env` file (if using dotenv)
- ❌ AWS Secrets Manager (disabled)
- ❌ AWS SSM Parameter Store (disabled)

### Development/Test/Production Mode
- ✅ Environment variables from `process.env`
- ✅ AWS Secrets Manager (if configured)
- ✅ AWS SSM Parameter Store (if configured)
- ❌ Local `.env` file (not loaded)

## Environment Variables

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `APP_ENV` | Application environment | `local` | `development` |
| `NODE_ENV` | Node.js environment | - | `production` |
| `PORT` | Server port | `3000` | `8080` |
| `HOST` | Server host | `localhost` | `0.0.0.0` |
| `DEBUG` | Enable debug mode | `false` | `true` |

## Testing Different Environments

### Local Development
```bash
APP_ENV=local npm run start:dev
```

### Development with AWS
```bash
# Requires AWS credentials
APP_ENV=development AWS_REGION=us-east-1 npm run start:dev
```

### Production Simulation
```bash
APP_ENV=production PORT=8080 npm run start:prod
```

## AWS Integration Testing

To test AWS integration in development mode:

1. **Configure AWS credentials:**
   ```bash
   aws configure
   # or
   export AWS_PROFILE=myprofile
   ```

2. **Set up AWS resources (optional):**
   ```bash
   # Create a test secret
   aws secretsmanager create-secret \
     --name "/myapp/development/secrets" \
     --secret-string '{"API_KEY":"test-key","DATABASE_PASSWORD":"secret"}'
   
   # Create test parameters
   aws ssm put-parameter \
     --name "/myapp/development/DEBUG" \
     --value "true" \
     --type "String"
   ```

3. **Run with AWS integration:**
   ```bash
   APP_ENV=development npm run start:dev
   ```

## Code Structure

```
src/
├── main.ts          # Application bootstrap
├── app.module.ts    # Root module with ConfigModule setup
├── app.controller.ts # HTTP endpoints
└── app.service.ts   # Business logic with configuration usage
```

### Key Files

**app.module.ts** - Shows basic ConfigModule setup:
```typescript
@Module({
  imports: [
    ConfigModule.forRoot({
      // Uses default settings
    }),
  ],
})
```

**app.service.ts** - Demonstrates configuration access:
```typescript
@Injectable()
export class AppService {
  constructor(private configService: ConfigService) {}
  
  getPort(): number {
    return this.configService.get('PORT') || 3000;
  }
}
```

## Common Use Cases

### 1. Simple Environment Variable Access
```typescript
const port = this.configService.get('PORT');
const debug = this.configService.get('DEBUG');
```

### 2. Configuration with Fallbacks
```typescript
const host = this.configService.get('HOST') || 'localhost';
const timeout = this.configService.get('TIMEOUT') || 30000;
```

### 3. Type Conversion
```typescript
const port = parseInt(this.configService.get('PORT') || '3000', 10);
const debug = this.configService.get('DEBUG') === 'true';
```

### 4. Environment-Specific Logic
```typescript
const isDevelopment = this.configService.get('APP_ENV') === 'development';
if (isDevelopment) {
  // Development-specific code
}
```

## Troubleshooting

### Configuration Not Loading
1. Check that `ConfigModule.forRoot()` is imported in your root module
2. Verify environment variables are set correctly
3. Ensure `APP_ENV` is set to the expected value

### AWS Integration Issues
1. Verify AWS credentials are configured
2. Check AWS region is set (`AWS_REGION`)
3. Ensure IAM permissions for Secrets Manager and SSM
4. Set `APP_ENV` to non-local value (`development`, `test`, `production`)

### Debug Mode
Enable debug logging to see configuration loading details:
```bash
DEBUG=nest-config-aws* npm run start:dev
```

## Next Steps

- See the [custom-schema example](../custom-schema/) for advanced usage with type safety
- Check the [main documentation](../../README.md) for complete API reference
- Review the [troubleshooting guide](../../docs/TROUBLESHOOTING.md) for common issues