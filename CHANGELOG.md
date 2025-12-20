# config-aws Monorepo Changelog

This monorepo contains multiple packages. See individual package changelogs for detailed release notes:

- [@dyanet/config-aws](packages/config-aws/CHANGELOG.md) - Framework-agnostic core library
- [@dyanet/nestjs-config-aws](packages/nestjs-config-aws/CHANGELOG.md) - NestJS adapter
- [@dyanet/nextjs-config-aws](packages/nextjs-config-aws/CHANGELOG.md) - Next.js adapter

## Monorepo Changes

### 2025-12-20

- Extracted core functionality into `@dyanet/config-aws` package
- Created `@dyanet/nextjs-config-aws` adapter for Next.js applications
- Refactored `@dyanet/nestjs-config-aws` to use core package as dependency
