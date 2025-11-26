# Requirements Document

## Introduction

This document specifies the requirements for extracting the current `@dyanet/nestjs-config-aws` monolithic package into three separate, focused npm packages:

1. **config-aws** - A framework-agnostic core library for AWS configuration loading (Secrets Manager, SSM Parameter Store)
2. **nestjs-config-aws** - A thin NestJS adapter layer that extends config-aws
3. **nextjs-config-aws** - A thin Next.js adapter layer that extends config-aws

This refactoring aims to reduce code duplication, minimize dependencies, and enable AWS configuration loading in any JavaScript/TypeScript application regardless of framework.

## Glossary

- **Config_AWS**: The framework-agnostic core package providing AWS Secrets Manager and SSM Parameter Store configuration loading
- **NestJS_Config_AWS**: The NestJS-specific adapter package that integrates Config_AWS with NestJS dependency injection
- **NextJS_Config_AWS**: The Next.js-specific adapter package that integrates Config_AWS with Next.js configuration patterns
- **ConfigLoader**: An interface for loading configuration from various sources (environment, AWS services)
- **Peer_Dependency**: A dependency that must be installed by the consuming application rather than bundled with the package
- **Adapter_Layer**: A thin wrapper that adapts the core library to work with a specific framework

## Requirements

### Requirement 1: Core Package Extraction (config-aws)

**User Story:** As a developer, I want a framework-agnostic AWS configuration library, so that I can use AWS Secrets Manager and SSM Parameter Store in any JavaScript/TypeScript application.

#### Acceptance Criteria

1. WHEN a developer imports config-aws THEN the Config_AWS package SHALL provide EnvironmentLoader, SecretsManagerLoader, SSMParameterStoreLoader, EnvFileLoader, and S3Loader classes without any framework dependencies
2. WHEN a developer uses config-aws THEN the Config_AWS package SHALL export ConfigLoader interface, error classes (ConfigurationError, ValidationError, AWSServiceError), and validation utilities
3. WHEN config-aws is installed THEN the Config_AWS package SHALL declare @aws-sdk/client-secrets-manager, @aws-sdk/client-ssm, @aws-sdk/client-s3, and zod as peer dependencies
4. WHEN a developer creates a ConfigManager instance THEN the Config_AWS package SHALL orchestrate loading from multiple sources with configurable precedence order
5. WHEN config-aws loads configuration THEN the Config_AWS package SHALL support environment-aware path construction for AWS resources
6. WHEN serializing configuration to JSON THEN the Config_AWS package SHALL produce valid JSON output
7. WHEN deserializing configuration from JSON THEN the Config_AWS package SHALL restore the original configuration object
8. WHEN EnvFileLoader is used THEN the Config_AWS package SHALL read and parse .env files from the local filesystem with support for multiple file paths
9. WHEN S3Loader is used THEN the Config_AWS package SHALL fetch configuration files from S3 buckets with support for JSON and .env file formats
10. WHEN EnvironmentLoader is used THEN the Config_AWS package SHALL scan process.env with optional prefix filtering
11. WHEN multiple loaders are configured THEN the Config_AWS package SHALL merge configurations according to a configurable precedence strategy (aws-first, local-first, or custom order)

### Requirement 2: NestJS Adapter Package (nestjs-config-aws)

**User Story:** As a NestJS developer, I want a thin adapter for config-aws, so that I can use AWS configuration with NestJS dependency injection and module patterns.

#### Acceptance Criteria

1. WHEN nestjs-config-aws is installed THEN the NestJS_Config_AWS package SHALL depend on config-aws as a runtime dependency
2. WHEN nestjs-config-aws is installed THEN the NestJS_Config_AWS package SHALL declare @nestjs/common ^11.0.0, @nestjs/core ^11.0.0, and @nestjs/config ^4.0.0 as peer dependencies
3. WHEN a developer imports ConfigModule THEN the NestJS_Config_AWS package SHALL provide forRoot() and forRootAsync() static methods for module configuration
4. WHEN ConfigModule is initialized THEN the NestJS_Config_AWS package SHALL register ConfigService as an injectable provider using config-aws internally
5. WHEN a developer uses NestConfigAwsIntegrationModule THEN the NestJS_Config_AWS package SHALL integrate with @nestjs/config ConfigService for seamless compatibility
6. WHEN the NestJS adapter is used THEN the NestJS_Config_AWS package SHALL re-export all public types and interfaces from config-aws

### Requirement 3: Next.js Adapter Package (nextjs-config-aws)

**User Story:** As a Next.js developer, I want a thin adapter for config-aws, so that I can use AWS configuration with Next.js server components and API routes.

#### Acceptance Criteria

1. WHEN nextjs-config-aws is installed THEN the NextJS_Config_AWS package SHALL depend on config-aws as a runtime dependency
2. WHEN nextjs-config-aws is installed THEN the NextJS_Config_AWS package SHALL declare next ^16.0.0 and react ^19.0.0 as peer dependencies
3. WHEN a developer imports getConfig THEN the NextJS_Config_AWS package SHALL provide a function to load AWS configuration for server-side use
4. WHEN configuration is loaded in Next.js THEN the NextJS_Config_AWS package SHALL cache configuration to avoid repeated AWS API calls during request handling
5. WHEN a developer uses createConfigProvider THEN the NextJS_Config_AWS package SHALL provide a React context provider for accessing configuration in server components
6. WHEN the Next.js adapter is used THEN the NextJS_Config_AWS package SHALL re-export all public types and interfaces from config-aws

### Requirement 7: Next.js Runtime Environment Variables

**User Story:** As a Next.js developer, I want all environment variables to be loaded at runtime instead of build-time, so that I can deploy the same build artifact to different environments without rebuilding.

#### Acceptance Criteria

1. WHEN nextjs-config-aws is configured with runtime mode THEN the NextJS_Config_AWS package SHALL load environment variables at request time instead of build time
2. WHEN a developer uses the PublicEnvScript component THEN the NextJS_Config_AWS package SHALL inject a script tag that exposes server-side environment variables to the client
3. WHEN client-side code accesses environment variables THEN the NextJS_Config_AWS package SHALL provide an env() function that reads from the injected runtime values instead of process.env
4. WHEN the runtime env feature is enabled THEN the NextJS_Config_AWS package SHALL eliminate the need for NEXT_PUBLIC_ prefixed variables at build time
5. WHEN environment variables are exposed to the client THEN the NextJS_Config_AWS package SHALL allow configuration of which variables are safe to expose publicly
6. WHEN the PublicEnvScript is rendered THEN the NextJS_Config_AWS package SHALL serialize environment variables as a JSON object in a script tag with a configurable variable name

### Requirement 4: Package Size and Dependency Optimization

**User Story:** As a developer, I want minimal package sizes and optimized dependencies, so that my application bundle remains small and installation is fast.

#### Acceptance Criteria

1. WHEN config-aws is built THEN the Config_AWS package SHALL produce both ESM and CommonJS outputs with tree-shaking support
2. WHEN any package is installed THEN the package SHALL have zero runtime dependencies that duplicate peer dependencies
3. WHEN nestjs-config-aws is installed without NestJS THEN the installation SHALL fail with a clear peer dependency error message
4. WHEN nextjs-config-aws is installed without Next.js THEN the installation SHALL fail with a clear peer dependency error message
5. WHEN config-aws is used standalone THEN the Config_AWS package SHALL function without any framework-specific code paths

### Requirement 5: Backward Compatibility

**User Story:** As an existing user of nestjs-config-aws, I want a smooth migration path, so that I can upgrade without breaking changes.

#### Acceptance Criteria

1. WHEN a developer upgrades to the new nestjs-config-aws THEN the NestJS_Config_AWS package SHALL maintain the same public API surface for ConfigModule and ConfigService
2. WHEN a developer uses existing configuration options THEN the NestJS_Config_AWS package SHALL accept the same options interface as the current version
3. WHEN NestConfigAwsIntegrationModule is used THEN the NestJS_Config_AWS package SHALL maintain compatibility with @nestjs/config integration patterns
4. WHEN a developer imports from nestjs-config-aws THEN the NestJS_Config_AWS package SHALL export all previously exported types and interfaces

### Requirement 6: Testing and Quality

**User Story:** As a maintainer, I want comprehensive tests for all packages, so that I can ensure reliability across the package ecosystem.

#### Acceptance Criteria

1. WHEN config-aws is tested THEN the Config_AWS package SHALL have unit tests for all loaders and the ConfigManager class
2. WHEN nestjs-config-aws is tested THEN the NestJS_Config_AWS package SHALL have integration tests verifying NestJS module behavior
3. WHEN nextjs-config-aws is tested THEN the NextJS_Config_AWS package SHALL have tests verifying Next.js integration patterns
4. WHEN any package is published THEN the package SHALL pass all tests and type checking before publication
