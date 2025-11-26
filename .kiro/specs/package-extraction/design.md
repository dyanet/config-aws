# Design Document: Package Extraction

## Overview

This design describes the extraction of the monolithic `@dyanet/nestjs-config-aws` package into three focused npm packages:

1. **@dyanet/config-aws** - Framework-agnostic core library
2. **@dyanet/nestjs-config-aws** - NestJS adapter (thin layer)
3. **@dyanet/nextjs-config-aws** - Next.js adapter (thin layer)

The architecture follows a layered approach where the core package provides all AWS configuration loading functionality, and framework-specific adapters provide thin integration layers.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Application Layer                             │
├─────────────────────────┬───────────────────────────────────────┤
│   nestjs-config-aws     │        nextjs-config-aws              │
│   ┌─────────────────┐   │   ┌─────────────────────────────┐     │
│   │ ConfigModule    │   │   │ getConfig()                 │     │
│   │ ConfigService   │   │   │ createConfigProvider()      │     │
│   │ Integration     │   │   │ PublicEnvScript             │     │
│   │ Module          │   │   │ env() client function       │     │
│   └────────┬────────┘   │   └──────────────┬──────────────┘     │
│            │            │                  │                     │
├────────────┴────────────┴──────────────────┴─────────────────────┤
│                        config-aws (Core)                         │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────────────┐  │
│  │ ConfigManager│ │   Loaders    │ │    Utilities             │  │
│  │              │ │              │ │                          │  │
│  │ - load()     │ │ Environment  │ │ - ConfigValidationUtil   │  │
│  │ - get()      │ │ EnvFile      │ │ - Error classes          │  │
│  │ - getAll()   │ │ S3           │ │ - Type definitions       │  │
│  │ - merge()    │ │ SecretsManager│ │                         │  │
│  │              │ │ SSMParameter │ │                          │  │
│  └──────────────┘ └──────────────┘ └──────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### Package 1: @dyanet/config-aws (Core)

#### ConfigLoader Interface
```typescript
interface ConfigLoader {
  load(): Promise<Record<string, any>>;
  getName(): string;
  isAvailable(): Promise<boolean>;
}
```

#### ConfigManager Class
```typescript
interface ConfigManagerOptions<T = Record<string, any>> {
  loaders?: ConfigLoader[];
  schema?: ZodType<T>;
  precedence?: 'aws-first' | 'local-first' | LoaderPrecedence[];
  validateOnLoad?: boolean;
  enableLogging?: boolean;
  logger?: Logger;
  verbose?: VerboseOptions | boolean;  // Verbose debugging output
}

interface VerboseOptions {
  /** Log all variable names being loaded */
  logKeys?: boolean;           // Default: true
  /** Log variable values (WARNING: may expose secrets) */
  logValues?: boolean;         // Default: false
  /** Log when a variable is overridden by a higher-precedence loader */
  logOverrides?: boolean;      // Default: true
  /** Log loader timing information */
  logTiming?: boolean;         // Default: true
  /** Mask sensitive values (show first/last 2 chars only) */
  maskValues?: boolean;        // Default: true (when logValues is true)
  /** Keys to always mask regardless of maskValues setting */
  sensitiveKeys?: string[];    // Default: ['password', 'secret', 'key', 'token']
}

interface LoaderPrecedence {
  loader: string;  // Loader name
  priority: number; // Higher = later (overrides earlier)
}

class ConfigManager<T = Record<string, any>> {
  constructor(options?: ConfigManagerOptions<T>);
  async load(): Promise<void>;
  get<K extends keyof T>(key: K): T[K];
  getAll(): T;
  isLoaded(): boolean;
  getAppEnv(): string;
}
```

#### Verbose Output Example
When `verbose: true` or `verbose: { logOverrides: true }`:
```
[config-aws] Loading configuration...
[config-aws] EnvironmentLoader: loaded 15 keys in 2ms
[config-aws]   - DATABASE_URL
[config-aws]   - API_KEY
[config-aws]   - PORT
[config-aws] SecretsManagerLoader: loaded 3 keys in 145ms
[config-aws]   - DATABASE_URL (overrides EnvironmentLoader)
[config-aws]   - API_SECRET
[config-aws]   - JWT_KEY
[config-aws] SSMParameterStoreLoader: loaded 2 keys in 89ms
[config-aws]   - FEATURE_FLAG_X
[config-aws]   - RATE_LIMIT (overrides EnvironmentLoader)
[config-aws] Configuration loaded: 18 total keys, 2 overrides, 236ms total
```

When `verbose: { logValues: true, maskValues: true }`:
```
[config-aws]   - DATABASE_URL = "po**...//db" (overrides EnvironmentLoader)
[config-aws]   - API_KEY = "sk**...xyz"
```
```

#### Loaders

**EnvironmentLoader**
```typescript
interface EnvironmentLoaderConfig {
  prefix?: string;
  exclude?: string[];
}
```

**EnvFileLoader**
```typescript
interface EnvFileLoaderConfig {
  paths?: string[];           // Default: ['.env', '.env.local']
  encoding?: BufferEncoding;  // Default: 'utf-8'
  override?: boolean;         // Whether later files override earlier
}
```

**Environment File Format (AWS ECS Compatible)**
The EnvFileLoader and S3Loader follow the [AWS ECS environment file format](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/use-environment-file.html):

```
# Lines beginning with # are comments and ignored
# Blank lines are ignored

# Format: VARIABLE=VALUE (no spaces around =)
DATABASE_URL=postgres://localhost:5432/db
API_KEY=sk-1234567890

# Values can contain = signs
CONNECTION_STRING=host=localhost;port=5432

# No quotes needed for values with spaces (quotes are literal)
MESSAGE=Hello World
QUOTED="This includes the quotes"

# No variable interpolation - ${VAR} is literal
TEMPLATE=${NOT_INTERPOLATED}

# No multi-line values - each line is one variable
# No export keyword support
```

**Parsing Rules:**
1. Lines beginning with `#` are treated as comments and ignored
2. Blank lines are ignored
3. Format must be `VARIABLE=VALUE` (no spaces around `=`)
4. Variable names must consist of alphanumeric characters, underscores, and cannot start with a number
5. Values are taken literally - no quote processing, no variable interpolation
6. Each line defines exactly one environment variable
7. Lines without `=` are ignored (invalid format)
8. Maximum line length: 32KB (AWS ECS limit)

**S3Loader**
```typescript
interface S3LoaderConfig {
  bucket: string;
  key: string;
  region?: string;
  format?: 'json' | 'env' | 'auto';  // Default: 'auto'
}
```

When `format: 'env'` or auto-detected as env format, S3Loader uses the same AWS ECS-compatible parsing rules as EnvFileLoader.

**SecretsManagerLoader**
```typescript
interface SecretsManagerLoaderConfig {
  secretName?: string;
  region?: string;
  environmentMapping?: Record<string, string>;
}
```

**SSMParameterStoreLoader**
```typescript
interface SSMParameterStoreLoaderConfig {
  parameterPath?: string;
  region?: string;
  environmentMapping?: Record<string, string>;
  withDecryption?: boolean;
}
```

#### Error Classes
```typescript
class ConfigurationError extends Error { cause?: Error }
class ValidationError extends ConfigurationError { validationErrors: any }
class AWSServiceError extends ConfigurationError { service: string; operation: string }
class ConfigurationLoadError extends ConfigurationError { loader: string }
class MissingConfigurationError extends ConfigurationError { missingKeys: string[] }
```

### Package 2: @dyanet/nestjs-config-aws (NestJS Adapter)

#### ConfigModule
```typescript
@Global()
@Module({})
class ConfigModule {
  static forRoot<T>(options?: NestConfigAwsModuleOptions<T>): DynamicModule;
  static forRootAsync<T>(options: NestConfigAwsModuleAsyncOptions<T>): DynamicModule;
}
```

#### NestConfigAwsIntegrationModule
```typescript
@Global()
@Module({})
class NestConfigAwsIntegrationModule {
  static forRoot(options?: IntegrationOptions): DynamicModule;
  static forRootAsync(options: AsyncIntegrationOptions): DynamicModule;
}
```

#### ConfigService (NestJS Injectable)
```typescript
@Injectable()
class ConfigService<T = any> {
  constructor(private readonly configManager: ConfigManager<T>);
  get<K extends keyof T>(key: K): T[K];
  getAll(): T;
  isInitialized(): boolean;
}
```

### Package 3: @dyanet/nextjs-config-aws (Next.js Adapter)

#### Server-Side API
```typescript
interface NextConfigOptions<T = Record<string, any>> {
  schema?: ZodType<T>;
  loaders?: ConfigLoader[];
  precedence?: 'aws-first' | 'local-first';
  cache?: boolean;  // Default: true
  cacheTTL?: number; // Default: 60000 (1 minute)
}

// Singleton config loader with caching
async function getConfig<T>(options?: NextConfigOptions<T>): Promise<T>;

// React context provider for server components
function createConfigProvider<T>(config: T): React.FC<{ children: React.ReactNode }>;
```

#### Runtime Environment Variables
```typescript
interface PublicEnvScriptProps {
  /** Environment variables to expose (allowlist) */
  publicVars?: string[];
  /** Prefix to filter env vars (e.g., 'PUBLIC_') */
  publicPrefix?: string;
  /** Global variable name for client access */
  variableName?: string;  // Default: '__ENV'
  /** Nonce for CSP compliance */
  nonce?: string;
}

// Server component that injects env vars as script tag
function PublicEnvScript(props: PublicEnvScriptProps): JSX.Element;

// Client-side function to read runtime env vars
function env(key: string): string | undefined;
function env<T>(key: string, defaultValue: T): string | T;
```

## Data Models

### Configuration Precedence
```typescript
type PrecedenceStrategy = 'aws-first' | 'local-first' | 'custom';

// aws-first: env -> envFile -> s3 -> secretsManager -> ssm (AWS wins)
// local-first: secretsManager -> ssm -> s3 -> envFile -> env (local wins)
// custom: user-defined order via LoaderPrecedence[]
```

### Merged Configuration Result
```typescript
interface ConfigLoadResult<T> {
  config: T;
  sources: ConfigSourceInfo[];
  loadedAt: Date;
}

interface ConfigSourceInfo {
  loader: string;
  keysLoaded: string[];
  duration: number;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Configuration Serialization Round-Trip
*For any* valid configuration object T, serializing to JSON and deserializing back SHALL produce an object equal to the original.
```
∀ config: T, deserialize(serialize(config)) === config
```
**Validates: Requirements 1.6, 1.7**

### Property 2: Precedence Order Consistency
*For any* set of loaders L and precedence strategy P, when multiple loaders provide the same key K, the final value SHALL come from the loader with highest precedence according to P.
```
∀ loaders: L[], precedence: P, key: K where multiple loaders have K,
  result[K] === loaderWithHighestPrecedence(L, P, K).value
```
**Validates: Requirements 1.4, 1.11**

### Property 3: Environment Path Construction
*For any* environment name E and base path B, the constructed AWS path SHALL follow the pattern `/{envMapping[E]}{B}`.
```
∀ env: E, basePath: B, mapping: M,
  buildPath(env, basePath, mapping) === `/${M[env]}${basePath}`
```
**Validates: Requirements 1.5**

### Property 4: Environment Loader Prefix Filtering
*For any* process.env state and prefix P, EnvironmentLoader SHALL return only keys starting with P, with the prefix stripped from key names.
```
∀ env: Record<string, string>, prefix: P,
  result = load(env, P) implies
    ∀ key in result: env[P + key] === result[key]
    ∧ ∀ key in env where !key.startsWith(P): key ∉ result
```
**Validates: Requirements 1.10**

### Property 5: EnvFile Parsing Consistency (AWS ECS Format)
*For any* valid AWS ECS-format environment file content, parsing SHALL:
- Ignore lines starting with `#` (comments)
- Ignore blank lines
- Parse `VARIABLE=VALUE` format with no space around `=`
- Treat values literally (no quote processing, no interpolation)
- Reject variable names starting with numbers or containing invalid characters
```
∀ content: string (valid AWS ECS env format),
  parse(content) produces correct key-value mapping where:
    - keys match /^[a-zA-Z_][a-zA-Z0-9_]*$/
    - values are literal strings after first `=`
    - comment lines and blank lines produce no output
```
**Validates: Requirements 1.8, 1.9**

### Property 6: S3 Content Format Detection
*For any* S3 object content, when format is 'auto', the loader SHALL correctly detect JSON vs .env format based on content structure.
```
∀ content: string,
  detectFormat(content) === 'json' iff content.trim().startsWith('{')
  detectFormat(content) === 'env' otherwise
```
**Validates: Requirements 1.9**

### Property 7: Next.js Configuration Caching
*For any* sequence of getConfig() calls within the cache TTL, AWS APIs SHALL be called at most once.
```
∀ calls: getConfig()[] within TTL,
  awsApiCallCount <= 1
```
**Validates: Requirements 3.4**

### Property 8: PublicEnvScript Output Correctness
*For any* set of environment variables V, allowlist A, and variable name N, the rendered script SHALL:
- Contain only variables in the allowlist (or matching prefix)
- Use the specified variable name
- Produce valid JSON
```
∀ vars: V, allowlist: A, varName: N,
  script = render(V, A, N) implies
    script contains `window.${N} = ${JSON.stringify(filtered(V, A))}`
    ∧ ∀ key in parsed(script): key ∈ A
```
**Validates: Requirements 7.2, 7.5, 7.6**

## Error Handling

### Core Package (config-aws)
- **ConfigurationError**: Base error for all config-related failures
- **ValidationError**: Thrown when Zod schema validation fails, includes detailed error info
- **AWSServiceError**: Thrown for AWS API failures, includes service name and operation
- **ConfigurationLoadError**: Thrown when a specific loader fails, includes loader name
- **MissingConfigurationError**: Thrown when required keys are missing after load

### Error Propagation Strategy
1. Loaders catch AWS SDK errors and wrap in `AWSServiceError`
2. ConfigManager catches loader errors and can either:
   - Fail fast (default for production)
   - Continue with partial config (configurable)
3. Validation errors are always thrown unless `ignoreValidationErrors: true`

### Framework Adapters
- NestJS adapter: Errors during module initialization prevent app startup
- Next.js adapter: Errors can be caught and handled, with fallback to empty config option

## Testing Strategy

### Dual Testing Approach
Both unit tests and property-based tests are required for comprehensive coverage.

### Property-Based Testing Library
**fast-check** will be used for property-based testing in all packages.

### Unit Tests
- Test specific examples and edge cases
- Test error conditions and error messages
- Test integration points between components

### Property-Based Tests
Each correctness property will have a corresponding property-based test:

1. **Property 1 Test**: Generate random configuration objects, serialize/deserialize, verify equality
2. **Property 2 Test**: Generate random loader results and precedence configs, verify merge correctness
3. **Property 3 Test**: Generate random env names and paths, verify path construction
4. **Property 4 Test**: Generate random env objects and prefixes, verify filtering
5. **Property 5 Test**: Generate random .env content, verify parsing
6. **Property 6 Test**: Generate random JSON and .env content, verify format detection
7. **Property 7 Test**: Mock AWS calls, verify caching behavior
8. **Property 8 Test**: Generate random env vars and allowlists, verify script output

### Test Configuration
- Minimum 100 iterations per property test
- Tests tagged with format: `**Feature: package-extraction, Property {N}: {description}**`
