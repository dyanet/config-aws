# Changelog

All notable changes to `@dyanet/config-aws` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.1] - 2025-12-20

### 🐞 Bug Fixes

- **Fixed stack overflow in SecretsManagerLoader.getName()** - The `getName()` method was calling `buildSecretName()`, which throws a `ConfigurationLoadError` when there's no environment mapping for the current `APP_ENV`. The error message included a call to `getName()`, causing infinite recursion. The fix inlines the path construction logic in `getName()` with a fallback to the base secret name when the environment mapping is unavailable.

## [1.0.0] - 2025-01-27

### 🎉 Initial Release

Framework-agnostic AWS configuration management library extracted from `@dyanet/nestjs-config-aws`.

### ✨ Features

#### Configuration Loading
- **Multi-source configuration loading** with intelligent precedence handling
- **EnvironmentLoader** - Scans `process.env` with optional prefix filtering
- **EnvFileLoader** - Reads `.env` files using AWS ECS environment file format
- **S3Loader** - Fetches config from S3 buckets (JSON or .env format)
- **SecretsManagerLoader** - Loads from AWS Secrets Manager with environment-aware paths
- **SSMParameterStoreLoader** - Loads from AWS SSM Parameter Store with pagination support

#### Precedence Strategies
- **aws-first**: Local sources load first, AWS sources override
- **local-first**: AWS sources load first, local sources override
- **custom**: User-defined order via `LoaderPrecedence[]`

#### Type Safety & Validation
- **Full TypeScript support** with generic types and autocomplete
- **Zod schema validation** for runtime type checking
- **Type-safe configuration access** with IntelliSense support

#### Environment Awareness
- **APP_ENV-based configuration** (local, development, test, production)
- **Automatic AWS resource path construction** based on environment
- **Graceful degradation** when AWS services are unavailable

#### Verbose Logging
- Debug configuration loading with detailed output
- Log keys, values, overrides, and timing
- Mask sensitive values with configurable patterns

#### Error Handling
- **ConfigurationError** - Base error class
- **ValidationError** - Schema validation failed
- **AWSServiceError** - AWS API call failed
- **ConfigurationLoadError** - Loader failed to load
- **MissingConfigurationError** - Required keys missing

### 📦 Package Features

- **Framework Agnostic** - Works with any JavaScript/TypeScript application
- **Peer Dependencies** - AWS SDK packages are optional peer dependencies
- **Tree-Shakeable** - ESM and CommonJS builds with tree-shaking support
- **Zero Configuration** - Sensible defaults for quick setup

---

*This changelog follows the [Keep a Changelog](https://keepachangelog.com/) format.*
