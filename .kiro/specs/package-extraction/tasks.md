# Implementation Plan

## Phase 1: Core Package Setup (config-aws)

- [x] 1. Initialize config-aws package structure








  - [x] 1.1 Create packages/config-aws directory with package.json, tsconfig.json

    - Set up dual ESM/CJS build configuration
    - Configure peer dependencies: @aws-sdk/client-secrets-manager, @aws-sdk/client-ssm, @aws-sdk/client-s3, zod
    - _Requirements: 1.3, 4.1_

  - [x] 1.2 Create src/index.ts with public exports structure






    - Export placeholders for all loaders, ConfigManager, errors, utilities
    - _Requirements: 1.1, 1.2_

- [x] 2. Implement core interfaces and error classes



  - [x] 2.1 Create src/interfaces/config-loader.interface.ts

    - Define ConfigLoader interface with load(), getName(), isAvailable()
    - _Requirements: 1.2_

  - [x] 2.2 Create src/interfaces/config-manager.interface.ts
    - Define ConfigManagerOptions, LoaderPrecedence, VerboseOptions interfaces

    - _Requirements: 1.4, 1.11_
  - [x] 2.3 Create src/errors/index.ts with all error classes
    - ConfigurationError, ValidationError, AWSServiceError, ConfigurationLoadError, MissingConfigurationError
    - _Requirements: 1.2_
  - [x] 2.4 Write property test for error class hierarchy



    - **Property: Error classes maintain proper inheritance chain**
    - **Validates: Requirements 1.2**

- [x] 3. Implement validation utilities






  - [x] 3.1 Create src/utils/validation.util.ts


    - Port ConfigValidationUtil from existing code (framework-agnostic)
    - _Requirements: 1.2_
  - [x] 3.2 Create src/utils/env-file-parser.util.ts


    - Implement AWS ECS-compatible .env file parser
    - Handle comments, blank lines, VARIABLE=VALUE format
    - Validate variable names (alphanumeric + underscore, no leading digit)
    - _Requirements: 1.8, 1.9_
  - [x] 3.3 Write property test for env file parsing


    - **Property 5: EnvFile Parsing Consistency (AWS ECS Format)**
    - **Validates: Requirements 1.8, 1.9**

- [x] 4. Implement EnvironmentLoader





  - [x] 4.1 Create src/loaders/environment.loader.ts

    - Port from existing code, remove NestJS dependencies
    - Support prefix filtering and exclusion list
    - _Requirements: 1.1, 1.10_
  - [x] 4.2 Write property test for prefix filtering




    - **Property 4: Environment Loader Prefix Filtering**
    - **Validates: Requirements 1.10**

- [x] 5. Implement EnvFileLoader


  - [x] 5.1 Create src/loaders/env-file.loader.ts


    - Read .env files from filesystem using AWS ECS format parser
    - Support multiple file paths with override behavior
    - _Requirements: 1.1, 1.8_
  - [x] 5.2 Write unit tests for EnvFileLoader


    - Test file reading, parsing, multiple files, missing files
    - _Requirements: 1.8_

- [x] 6. Implement S3Loader







  - [x] 6.1 Create src/loaders/s3.loader.ts





    - Fetch configuration from S3 buckets
    - Support JSON and .env formats with auto-detection
    - Use AWS ECS format parser for .env files
    - _Requirements: 1.1, 1.9_
  - [x] 6.2 Write property test for S3 format detection


    - **Property 6: S3 Content Format Detection**
    - **Validates: Requirements 1.9**

- [x] 7. Implement SecretsManagerLoader




  - [x] 7.1 Create src/loaders/secrets-manager.loader.ts


    - Port from existing code, remove NestJS dependencies
    - Support environment-aware path construction
    - _Requirements: 1.1, 1.5_
  - [x] 7.2 Write property test for path construction


    - **Property 3: Environment Path Construction**
    - **Validates: Requirements 1.5**

- [x] 8. Implement SSMParameterStoreLoader





  - [x] 8.1 Create src/loaders/ssm-parameter-store.loader.ts


    - Port from existing code, remove NestJS dependencies
    - Support pagination and decryption options
    - _Requirements: 1.1, 1.5_

  - [x] 8.2 Write unit tests for SSM loader

    - Test pagination, parameter transformation, error handling
    - _Requirements: 1.1_

- [x] 9. Implement ConfigManager
















  - [x] 9.1 Create src/config-manager.ts


    - Orchestrate loading from multiple loaders
    - Implement precedence strategies (aws-first, local-first, custom)
    - Implement verbose logging with override tracking
    - _Requirements: 1.4, 1.11_


  - [x] 9.2 Write property test for precedence consistency
    - **Property 2: Precedence Order Consistency**
    - **Validates: Requirements 1.4, 1.11**
  - [x] 9.3 Write property test for serialization round-trip

    - **Property 1: Configuration Serialization Round-Trip**
    - **Validates: Requirements 1.6, 1.7**

- [x] 10. Checkpoint - Core package tests




  - Ensure all tests pass, ask the user if questions arise.

## Phase 2: NestJS Adapter Package (nestjs-config-aws)

- [x] 11. Initialize nestjs-config-aws package structure



  - [x] 11.1 Create packages/nestjs-config-aws directory with package.json


    - Add config-aws as runtime dependency
    - Configure peer dependencies: @nestjs/common, @nestjs/core, @nestjs/config, zod
    - _Requirements: 2.1, 2.2_
  - [x] 11.2 Create src/index.ts re-exporting config-aws types

    - Re-export all public types from config-aws
    - _Requirements: 2.6_

- [x] 12. Implement NestJS ConfigService wrapper





  - [x] 12.1 Create src/services/config.service.ts


    - Injectable wrapper around ConfigManager from config-aws
    - Maintain same API as current ConfigService
    - _Requirements: 2.4, 5.1_
  - [x] 12.2 Write unit tests for ConfigService


    - Test injection, get(), getAll(), isInitialized()
    - _Requirements: 2.4_

- [x] 13. Implement ConfigModule





  - [x] 13.1 Create src/config.module.ts


    - Implement forRoot() and forRootAsync() static methods
    - Use ConfigManager from config-aws internally
    - Maintain backward-compatible options interface
    - _Requirements: 2.3, 5.1, 5.2_

  - [x] 13.2 Write integration tests for ConfigModule

    - Test module registration, provider injection, async configuration
    - _Requirements: 2.3_

- [x] 14. Implement NestConfigAwsIntegrationModule


  - [x] 14.1 Create src/integration/nestjs-config-integration.module.ts


    - Port integration services from existing code
    - Maintain @nestjs/config compatibility
    - _Requirements: 2.5, 5.3_
  - [x] 14.2 Write integration tests for @nestjs/config compatibility


    - Test precedence rules, namespace handling, validation integration
    - _Requirements: 2.5, 5.3_

- [x] 15. Checkpoint - NestJS adapter tests






  - Ensure all tests pass, ask the user if questions arise.

## Phase 3: Next.js Adapter Package (nextjs-config-aws)

- [x] 16. Initialize nextjs-config-aws package structure






  - [x] 16.1 Create packages/nextjs-config-aws directory with package.json

    - Add config-aws as runtime dependency
    - Configure peer dependencies: next, react
    - _Requirements: 3.1, 3.2_

  - [x] 16.2 Create src/index.ts re-exporting config-aws types

    - Re-export all public types from config-aws
    - _Requirements: 3.6_

- [x] 17. Implement server-side configuration loading





  - [x] 17.1 Create src/server/get-config.ts


    - Implement getConfig() function with caching
    - Use ConfigManager from config-aws internally
    - _Requirements: 3.3, 3.4_
  - [x] 17.2 Write property test for caching behavior


    - **Property 7: Next.js Configuration Caching**
    - **Validates: Requirements 3.4**

- [x] 18. Implement React context provider





  - [x] 18.1 Create src/server/config-provider.tsx


    - Implement createConfigProvider() for server components
    - _Requirements: 3.5_

  - [x] 18.2 Write unit tests for config provider

    - Test context creation and value access
    - _Requirements: 3.5_

- [x] 19. Implement runtime environment variables






  - [x] 19.1 Create src/components/public-env-script.tsx

    - Server component that renders script tag with env vars
    - Support allowlist and prefix filtering
    - Configurable variable name and CSP nonce
    - _Requirements: 7.1, 7.2, 7.5, 7.6_

  - [x] 19.2 Create src/client/env.ts

    - Client-side env() function reading from window.__ENV
    - Support default values
    - _Requirements: 7.3_

  - [x] 19.3 Write property test for PublicEnvScript output

    - **Property 8: PublicEnvScript Output Correctness**
    - **Validates: Requirements 7.2, 7.5, 7.6**

- [x] 20. Checkpoint - Next.js adapter tests





  - Ensure all tests pass, ask the user if questions arise.

## Phase 4: Migration and Documentation

- [x] 21. Create migration tooling






  - [x] 21.1 Update existing nestjs-config-aws to use new package structure

    - Refactor to thin adapter layer
    - Ensure backward compatibility
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [x] 21.2 Write backward compatibility tests

    - Test existing API surface still works
    - _Requirements: 5.1, 5.4_

- [x] 22. Update documentation





  - [x] 22.1 Create README.md for config-aws package


    - Document all loaders, ConfigManager, options
    - Include usage examples for standalone use
    - _Requirements: 1.1_
  - [x] 22.2 Update README.md for nestjs-config-aws package


    - Document migration from monolithic package
    - Update examples to show thin adapter usage
    - _Requirements: 2.1_

  - [x] 22.3 Create README.md for nextjs-config-aws package

    - Document getConfig(), PublicEnvScript, env()
    - Include App Router and Pages Router examples
    - _Requirements: 3.1, 7.1_

- [x] 23. Final Checkpoint - All packages





  - Ensure all tests pass, ask the user if questions arise.
