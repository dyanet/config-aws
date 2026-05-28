# Changelog

All notable changes to `@dyanet/config-aws` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2026-05-27

### ✨ Features

- **AWS SDK clients are now truly optional.** Each AWS-backed loader (`SecretsManagerLoader`, `SSMParameterStoreLoader`, `S3Loader`) imports its SDK lazily on first use, so consumers who do not use those loaders need not install the SDK at all. Importing the package no longer touches the AWS SDK at module load time.
- **Per-loader subpath exports.** Each loader is available as its own entry point: `@dyanet/config-aws/loaders/environment`, `/env-file`, `/s3`, `/secrets-manager`, `/ssm-parameter-store`. Importing a single loader does not reference the others in your bundle.
- **Native ESM resolution.** The ESM build (`dist/esm`) now resolves correctly under Node's native ESM loader: relative imports include `.js` extensions and explicit `/index.js` for directory imports, and `dist/esm/package.json` / `dist/cjs/package.json` declare the module type. CommonJS resolution is unchanged.
- **Clear missing-dependency errors.** When an optional AWS SDK client is not installed, the loader throws a `ConfigurationLoadError` with the exact `npm install …` command needed.

### 🔧 Internal

- Credentials are resolved through the AWS SDK's default Node provider chain (environment, shared config/profile, SSO, web identity, ECS/EKS container, EC2 IMDS). No explicit credential package is required.
- LICENSE file is now included in the published tarball.

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
