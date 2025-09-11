# Contributing to nest-config-aws

We welcome contributions to nest-config-aws! This guide will help you get started with contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Testing](#testing)
- [Code Style](#code-style)
- [Submitting Changes](#submitting-changes)
- [Release Process](#release-process)

## Code of Conduct

This project adheres to a code of conduct. By participating, you are expected to uphold this code. Please report unacceptable behavior to the project maintainers.

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- AWS CLI (for testing AWS integration)
- Git

### Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/your-username/nest-config-aws.git
   cd nest-config-aws
   ```

3. Add the upstream repository:
   ```bash
   git remote add upstream https://github.com/original-owner/nest-config-aws.git
   ```

## Development Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Build the project:**
   ```bash
   npm run build
   ```

3. **Run tests:**
   ```bash
   npm test
   ```

4. **Run tests in watch mode:**
   ```bash
   npm run test:watch
   ```

5. **Run linting:**
   ```bash
   npm run lint
   ```

## Project Structure

```
nest-config-aws/
├── src/                          # Source code
│   ├── interfaces/               # TypeScript interfaces
│   ├── loaders/                  # Configuration loaders
│   ├── services/                 # Core services
│   ├── utils/                    # Utility functions
│   ├── config.module.ts          # Main NestJS module
│   └── index.ts                  # Public API exports
├── tests/                        # Test files
│   ├── unit/                     # Unit tests
│   ├── integration/              # Integration tests
│   └── performance/              # Performance tests
├── examples/                     # Example applications
│   ├── basic-usage/              # Basic usage example
│   └── custom-schema/            # Advanced usage example
├── docs/                         # Documentation
│   ├── API.md                    # API documentation
│   └── TROUBLESHOOTING.md        # Troubleshooting guide
├── dist/                         # Compiled output
├── coverage/                     # Test coverage reports
└── README.md                     # Main documentation
```

## Development Workflow

### 1. Create a Feature Branch

```bash
git checkout -b feature/your-feature-name
```

### 2. Make Your Changes

- Write code following the established patterns
- Add tests for new functionality
- Update documentation as needed
- Ensure all tests pass

### 3. Commit Your Changes

We use conventional commits for consistent commit messages:

```bash
git commit -m "feat: add support for custom validation errors"
git commit -m "fix: resolve issue with AWS region detection"
git commit -m "docs: update API documentation for new features"
```

**Commit Types:**
- `feat`: New features
- `fix`: Bug fixes
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

### 4. Keep Your Branch Updated

```bash
git fetch upstream
git rebase upstream/main
```

### 5. Push and Create Pull Request

```bash
git push origin feature/your-feature-name
```

Then create a pull request on GitHub.

## Testing

### Test Structure

- **Unit Tests**: Test individual components in isolation
- **Integration Tests**: Test component interactions and AWS services
- **Performance Tests**: Test configuration loading performance

### Running Tests

```bash
# All tests
npm test

# Unit tests only
npm run test:unit

# Integration tests (requires AWS credentials)
npm run test:integration

# Performance tests
npm run test:performance

# Test coverage
npm run test:coverage

# Watch mode for development
npm run test:watch
```

### Writing Tests

#### Unit Test Example

```typescript
// tests/unit/loaders/environment.loader.spec.ts
import { EnvironmentLoader } from '../../../src/loaders/environment.loader';

describe('EnvironmentLoader', () => {
  let loader: EnvironmentLoader;

  beforeEach(() => {
    loader = new EnvironmentLoader();
  });

  it('should load environment variables', async () => {
    process.env.TEST_VAR = 'test-value';
    
    const config = await loader.load();
    
    expect(config.TEST_VAR).toBe('test-value');
  });
});
```

#### Integration Test Example

```typescript
// tests/integration/aws-services.spec.ts
import { SecretsManagerLoader } from '../../src/loaders/secrets-manager.loader';

describe('AWS Integration', () => {
  it('should load from Secrets Manager', async () => {
    const loader = new SecretsManagerLoader(
      { enabled: true },
      'test',
      'us-east-1'
    );
    
    const config = await loader.load();
    
    expect(config).toBeDefined();
  });
});
```

### Test Guidelines

1. **Test Coverage**: Aim for >90% test coverage
2. **Mock External Dependencies**: Use mocks for AWS services in unit tests
3. **Test Error Cases**: Include tests for error scenarios
4. **Performance Tests**: Test configuration loading performance
5. **Integration Tests**: Test real AWS service integration

## Code Style

### TypeScript Guidelines

1. **Use TypeScript strictly**: Enable strict mode and avoid `any`
2. **Interface over Type**: Prefer interfaces for object shapes
3. **Explicit Return Types**: Always specify return types for public methods
4. **Generic Constraints**: Use proper generic constraints

#### Example:

```typescript
// Good
export interface ConfigLoader {
  load(): Promise<Record<string, any>>;
}

export class EnvironmentLoader implements ConfigLoader {
  async load(): Promise<Record<string, any>> {
    return process.env;
  }
}

// Avoid
export class EnvironmentLoader {
  async load() {
    return process.env;
  }
}
```

### Code Formatting

We use Prettier and ESLint for code formatting:

```bash
# Format code
npm run format

# Lint code
npm run lint

# Fix linting issues
npm run lint:fix
```

### Naming Conventions

- **Classes**: PascalCase (`ConfigService`, `EnvironmentLoader`)
- **Interfaces**: PascalCase with descriptive names (`ConfigLoader`, `ModuleOptions`)
- **Methods**: camelCase (`loadConfiguration`, `validateSchema`)
- **Constants**: UPPER_SNAKE_CASE (`DEFAULT_TIMEOUT`, `MAX_RETRIES`)
- **Files**: kebab-case (`config.service.ts`, `environment.loader.ts`)

### Documentation

1. **JSDoc Comments**: Document all public APIs
2. **README Updates**: Update README for new features
3. **API Documentation**: Update API.md for interface changes
4. **Examples**: Add examples for new features

#### JSDoc Example:

```typescript
/**
 * Loads configuration from AWS Secrets Manager.
 * 
 * @param secretName - The name of the secret to retrieve
 * @param region - AWS region for the Secrets Manager service
 * @returns Promise resolving to the configuration object
 * @throws {ConfigurationError} When secret cannot be retrieved
 */
async loadSecret(secretName: string, region: string): Promise<Record<string, any>> {
  // Implementation
}
```

## Submitting Changes

### Pull Request Guidelines

1. **Clear Description**: Describe what your PR does and why
2. **Link Issues**: Reference related issues with "Fixes #123"
3. **Test Coverage**: Ensure tests cover your changes
4. **Documentation**: Update docs for user-facing changes
5. **Breaking Changes**: Clearly mark breaking changes

### Pull Request Template

```markdown
## Description
Brief description of the changes.

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] New tests added for new functionality

## Checklist
- [ ] Code follows the project's style guidelines
- [ ] Self-review of code completed
- [ ] Documentation updated
- [ ] No new warnings introduced
```

### Review Process

1. **Automated Checks**: CI/CD pipeline runs tests and linting
2. **Code Review**: Maintainers review the code
3. **Feedback**: Address any feedback from reviewers
4. **Approval**: Get approval from maintainers
5. **Merge**: Maintainers merge the PR

## Release Process

### Versioning

We follow [Semantic Versioning](https://semver.org/):

- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes (backward compatible)

### Release Steps

1. **Update Version**: Update version in `package.json`
2. **Update Changelog**: Document changes in `CHANGELOG.md`
3. **Create Release**: Create GitHub release with notes
4. **Publish**: Publish to npm registry

### Pre-release Testing

Before releasing:

1. Run full test suite
2. Test examples with new version
3. Verify AWS integration works
4. Check documentation accuracy

## Development Tips

### Local AWS Testing

1. **Use LocalStack**: For local AWS service simulation
   ```bash
   docker run -p 4566:4566 localstack/localstack
   ```

2. **AWS Profiles**: Use different profiles for testing
   ```bash
   export AWS_PROFILE=test-profile
   ```

3. **Mock Services**: Use mocks for unit tests
   ```typescript
   jest.mock('@aws-sdk/client-secrets-manager');
   ```

### Debugging

1. **Enable Debug Logs**:
   ```bash
   DEBUG=nest-config-aws* npm test
   ```

2. **Use Debugger**:
   ```typescript
   debugger; // Add breakpoints
   ```

3. **Test Isolation**: Run single test files
   ```bash
   npm test -- --testPathPattern=environment.loader.spec.ts
   ```

### Performance Considerations

1. **Async Operations**: Use proper async/await patterns
2. **Caching**: Implement caching where appropriate
3. **Error Handling**: Graceful error handling and retries
4. **Memory Usage**: Monitor memory usage in tests

## Getting Help

- **Issues**: Create GitHub issues for bugs or feature requests
- **Discussions**: Use GitHub discussions for questions
- **Documentation**: Check existing documentation first
- **Examples**: Look at example applications

## Recognition

Contributors will be recognized in:
- GitHub contributors list
- Release notes for significant contributions
- README acknowledgments

Thank you for contributing to nest-config-aws!