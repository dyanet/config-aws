# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.1] - 2025-08-25
### 🐞 Bug Fixes

- **Fixed peer dependencies** -  NestJS and @nestjs/config versions updated

## [1.0.0] - 2025-01-27

### 🎉 Initial Public Release

This is the first stable release of `nestjs-config-aws`, providing comprehensive AWS-integrated configuration management for NestJS applications with seamless @nestjs/config compatibility.

### ✨ Core Features

#### Configuration Loading
- **Multi-source configuration loading** with intelligent precedence handling
- **Environment variable loading** with optional prefix support
- **AWS Secrets Manager integration** with environment-aware paths
- **AWS Systems Manager Parameter Store integration** with recursive parameter fetching
- **Local .env file support** for development environments

#### @nestjs/config Integration
- **Seamless @nestjs/config compatibility** - use AWS-sourced values through standard ConfigService
- **NestConfigAwsIntegrationModule** for easy integration with existing @nestjs/config setups
- **Precedence rule handling** (aws-first, local-first, merge) for flexible configuration strategies
- **Namespaced configuration support** with registerAs patterns
- **Async configuration support** for dynamic setup scenarios

#### Type Safety & Validation
- **Full TypeScript support** with generic types and autocomplete
- **Zod schema validation** for runtime type checking and validation
- **Type-safe configuration access** with IntelliSense support
- **Custom schema support** with type inference
- **Validation integration** with Joi and class-validator

#### Environment Awareness
- **APP_ENV-based configuration** (local, development, test, production)
- **Automatic AWS resource path construction** based on environment
- **Environment-specific behavior** with intelligent defaults
- **Graceful degradation** when AWS services are unavailable

#### AWS Integration
- **AWS SDK v3** for modern, efficient AWS service integration
- **Automatic region detection** and configuration
- **Credential chain support** (profiles, roles, environment variables)
- **Encrypted parameter support** (SSM SecureString)
- **JSON parsing** for complex secret values
- **Retry logic and error handling** for robust AWS operations

#### Performance & Reliability
- **Configuration caching** after initial load for optimal performance
- **Efficient AWS SDK client reuse** to minimize overhead
- **Pagination support** for large parameter sets
- **Connection pooling** and optimized API usage
- **Comprehensive error handling** with descriptive messages

#### Developer Experience
- **Zero-configuration setup** with sensible defaults
- **Comprehensive documentation** with real-world examples
- **Multiple example applications** demonstrating different usage patterns
- **Troubleshooting guide** for common issues and solutions
- **Debug logging support** for development and troubleshooting
- **Health check endpoints** for monitoring configuration status

### 📦 Package Features

#### Installation & Setup
```bash
npm install nestjs-config-aws @nestjs/config
```

#### Basic Usage
```typescript
// Standalone usage
import { ConfigModule } from 'nestjs-config-aws';

@Module({
  imports: [
    ConfigModule.forRoot({
      secretsManagerConfig: { enabled: true },
      schema: myConfigSchema
    })
  ]
})
export class AppModule {}
```

#### @nestjs/config Integration
```typescript
// Integration with @nestjs/config
import { ConfigModule } from '@nestjs/config';
import { NestConfigAwsIntegrationModule } from 'nestjs-config-aws';

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

### 🏗️ Architecture

#### Configuration Sources (in precedence order)
1. **Environment Variables** - Always loaded as base configuration
2. **AWS Secrets Manager** - Environment-aware secret loading
3. **AWS SSM Parameter Store** - Hierarchical parameter management
4. **Local .env Files** - Local development support (local mode only)

#### Supported Environments
- **`local`** - Development with optional AWS integration
- **`development`** - Full AWS integration with development resources
- **`test`** - Test environment with isolated AWS resources
- **`production`** - Production environment with strict security

#### Module Architecture
- **ConfigModule** - Standalone configuration module with AWS integration
- **NestConfigAwsIntegrationModule** - Integration layer for @nestjs/config compatibility
- **ConfigService** - Type-safe configuration service with generic support
- **Configuration Loaders** - Pluggable loaders for different sources (Environment, Secrets Manager, SSM)

### 🧪 Testing & Quality

#### Test Coverage
- **Unit Tests** - Comprehensive test suite for all core functionality
- **Integration Tests** - End-to-end testing with AWS service mocks
- **Performance Tests** - Load testing and performance benchmarks
- **Type Tests** - TypeScript compilation and type safety validation

#### Code Quality
- **TypeScript** - Full type safety with strict compiler settings
- **ESLint** - Code linting with comprehensive rules
- **Prettier** - Consistent code formatting
- **Jest** - Testing framework with coverage reporting

### 📚 Documentation & Examples

#### Documentation
- **Comprehensive README** with setup instructions and API reference
- **API Documentation** with detailed interface descriptions
- **Troubleshooting Guide** with common issues and solutions
- **Integration Guide** for @nestjs/config compatibility

#### Example Applications
- **Basic Usage** - Simple setup with default configuration
- **Custom Schema** - Advanced usage with Zod validation
- **AWS Integration** - Production-ready AWS service integration
- **@nestjs/config Integration** - Seamless integration with standard NestJS patterns
- **Docker Compose** - Complete local development environment

### 🔧 Technical Specifications

#### Requirements
- **Node.js** >= 18.0.0
- **npm** >= 8.0.0
- **NestJS** >= 10.0.0
- **TypeScript** >= 5.0.0

#### Peer Dependencies
- `@nestjs/common` ^10.0.0
- `@nestjs/config` ^3.0.0 (for integration features)
- `@nestjs/core` ^10.0.0
- `zod` ^3.22.0

#### AWS Dependencies (included)
- `@aws-sdk/client-secrets-manager` ^3.0.0
- `@aws-sdk/client-ssm` ^3.0.0
- `@aws-sdk/credential-providers` ^3.0.0

### 🚀 Getting Started

#### Quick Start
1. **Install the package**
   ```bash
   npm install nestjs-config-aws
   ```

2. **Basic setup**
   ```typescript
   import { ConfigModule } from 'nestjs-config-aws';
   
   @Module({
     imports: [ConfigModule.forRoot()]
   })
   export class AppModule {}
   ```

3. **Use in services**
   ```typescript
   @Injectable()
   export class AppService {
     constructor(private configService: ConfigService) {}
     
     getConfig() {
       return this.configService.get('DATABASE_URL');
     }
   }
   ```

#### @nestjs/config Integration
1. **Install both packages**
   ```bash
   npm install nestjs-config-aws @nestjs/config
   ```

2. **Setup integration**
   ```typescript
   import { ConfigModule } from '@nestjs/config';
   import { NestConfigAwsIntegrationModule } from 'nestjs-config-aws';
   
   @Module({
     imports: [
       NestConfigAwsIntegrationModule.forRoot({
         secretsManagerConfig: { enabled: true }
       }),
       ConfigModule.forRoot({ isGlobal: true })
     ]
   })
   export class AppModule {}
   ```

### 🛡️ Security & Best Practices

#### Security Features
- **IAM role-based authentication** for production environments
- **Encrypted parameter support** with AWS KMS integration
- **Credential chain support** following AWS best practices
- **Environment-specific resource isolation**
- **Sensitive value masking** in logs and debug output

#### Best Practices
- Use IAM roles instead of access keys in production
- Implement least-privilege access policies
- Use environment-specific AWS resource paths
- Enable CloudTrail logging for audit trails
- Regularly rotate secrets and access keys

---

## 🔮 Future Roadmap

### Planned Features
- Additional AWS service integrations (Parameter Store Advanced Parameters, AppConfig)
- Configuration hot-reloading capabilities
- Enhanced caching strategies
- Metrics and monitoring integrations
- Additional validation framework support

### Community Contributions
We welcome contributions! See our [Contributing Guide](CONTRIBUTING.md) for details on how to get involved.

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

Special thanks to the open source community and the teams behind the technologies that make this project possible:

- **NestJS Team** - For the excellent framework and ecosystem
- **AWS SDK Team** - For comprehensive AWS service support and excellent documentation
- **Zod Team** - For powerful runtime schema validation
- **TypeScript Team** - For the excellent type system and developer experience
- **Jest Team** - For the robust testing framework
- **Open Source Community** - For inspiration, feedback, and contributions

---

## 📞 Support & Community

- **Documentation**: [README.md](README.md)
- **Examples**: [examples/](examples/)
- **Issues**: [GitHub Issues](https://github.com/your-org/nestjs-config-aws/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-org/nestjs-config-aws/discussions)

---

*This changelog follows the [Keep a Changelog](https://keepachangelog.com/) format and this project adheres to [Semantic Versioning](https://semver.org/).*
