/**
 * Utility types for enhanced TypeScript support in nest-config-aws integration.
 */

/**
 * Deep readonly type for configuration objects.
 */
export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends (infer U)[]
    ? DeepReadonlyArray<U>
    : T[P] extends object
    ? DeepReadonly<T[P]>
    : T[P];
};

/**
 * Deep readonly array type.
 */
export interface DeepReadonlyArray<T> extends ReadonlyArray<DeepReadonly<T>> {}

/**
 * Partial deep type for configuration objects.
 */
export type PartialDeep<T> = {
  [P in keyof T]?: T[P] extends (infer U)[]
    ? PartialDeepArray<U>
    : T[P] extends object
    ? PartialDeep<T[P]>
    : T[P];
};

/**
 * Partial deep array type.
 */
export interface PartialDeepArray<T> extends Array<PartialDeep<T>> {}

/**
 * Required deep type for configuration objects.
 */
export type RequiredDeep<T> = {
  [P in keyof T]-?: T[P] extends (infer U)[]
    ? RequiredDeepArray<U>
    : T[P] extends object
    ? RequiredDeep<T[P]>
    : T[P];
};

/**
 * Required deep array type.
 */
export interface RequiredDeepArray<T> extends Array<RequiredDeep<T>> {}

/**
 * Configuration path type for dot notation access.
 */
export type ConfigPath<T, K extends keyof T = keyof T> = K extends string
  ? T[K] extends Record<string, any>
    ? `${K}` | `${K}.${ConfigPath<T[K]>}`
    : `${K}`
  : never;

/**
 * Configuration value type for a given path.
 */
export type ConfigValue<T, P extends string> = P extends `${infer K}.${infer Rest}`
  ? K extends keyof T
    ? ConfigValue<T[K], Rest>
    : never
  : P extends keyof T
  ? T[P]
  : never;

/**
 * AWS configuration source union type.
 */
export type AwsConfigSource = 'secrets-manager' | 'ssm';

/**
 * Local configuration source union type.
 */
export type LocalConfigSource = 'environment' | 'local-file';

/**
 * All configuration source union type.
 */
export type AllConfigSource = AwsConfigSource | LocalConfigSource;

/**
 * Configuration source metadata.
 */
export type ConfigSourceMetadata<T extends AllConfigSource> = {
  source: T;
  isAws: T extends AwsConfigSource ? true : false;
  priority: number;
  loadedAt: Date;
};

/**
 * Configuration with source metadata.
 */
export type ConfigWithSource<T, S extends AllConfigSource> = T & {
  __metadata: ConfigSourceMetadata<S>;
};

/**
 * Extract configuration type from a configuration factory.
 */
export type ExtractConfig<T> = T extends () => infer U ? U : never;

/**
 * Configuration factory map type.
 */
export type ConfigFactoryMap = Record<string, () => any>;

/**
 * Extract all configuration types from a factory map.
 */
export type ExtractConfigMap<T extends ConfigFactoryMap> = {
  [K in keyof T]: ExtractConfig<T[K]>;
};

/**
 * Namespace configuration type.
 */
export type NamespaceConfig<T extends Record<string, any>> = {
  [K in keyof T]: T[K];
};

/**
 * Multi-namespace configuration type.
 */
export type MultiNamespaceConfig<T extends Record<string, Record<string, any>>> = {
  [K in keyof T]: NamespaceConfig<T[K]>;
};

/**
 * Configuration validation result.
 */
export type ValidationResult<T = any> = {
  isValid: boolean;
  data?: T;
  errors: string[];
};

/**
 * Async configuration validation result.
 */
export type AsyncValidationResult<T = any> = Promise<ValidationResult<T>>;

/**
 * Configuration transformer function type.
 */
export type ConfigTransformerFn<TInput, TOutput> = (input: TInput) => TOutput;

/**
 * Async configuration transformer function type.
 */
export type AsyncConfigTransformerFn<TInput, TOutput> = (input: TInput) => Promise<TOutput>;

/**
 * Configuration predicate function type.
 */
export type ConfigPredicate<T> = (config: T) => boolean;

/**
 * Async configuration predicate function type.
 */
export type AsyncConfigPredicate<T> = (config: T) => Promise<boolean>;

/**
 * Configuration key extractor type.
 */
export type ConfigKeyExtractor<T> = (config: T) => string[];

/**
 * Configuration value extractor type.
 */
export type ConfigValueExtractor<T, U> = (config: T, key: string) => U | undefined;

/**
 * Configuration merger function type.
 */
export type ConfigMerger<T> = (primary: T, secondary: T) => T;

/**
 * Configuration serializer function type.
 */
export type ConfigSerializer<T> = (config: T) => string;

/**
 * Configuration deserializer function type.
 */
export type ConfigDeserializer<T> = (serialized: string) => T;

/**
 * Configuration cache key generator type.
 */
export type CacheKeyGenerator<T> = (config: T) => string;

/**
 * Configuration cache entry type.
 */
export type CacheEntry<T> = {
  key: string;
  value: T;
  timestamp: Date;
  ttl?: number;
};

/**
 * Configuration cache type.
 */
export type ConfigCache<T> = Map<string, CacheEntry<T>>;

/**
 * Configuration event type.
 */
export type ConfigEventType = 'loaded' | 'updated' | 'error' | 'validated';

/**
 * Configuration event handler type.
 */
export type ConfigEventHandler<T = any> = (event: ConfigEventType, data: T) => void;

/**
 * Async configuration event handler type.
 */
export type AsyncConfigEventHandler<T = any> = (event: ConfigEventType, data: T) => Promise<void>;

/**
 * Configuration watcher type.
 */
export type ConfigWatcher<T> = {
  watch: (handler: ConfigEventHandler<T>) => void;
  unwatch: (handler: ConfigEventHandler<T>) => void;
  stop: () => void;
};

/**
 * Configuration builder pattern interface.
 */
export interface ConfigBuilder<T> {
  /**
   * Add a configuration source.
   */
  addSource(source: AllConfigSource, config: any): ConfigBuilder<T>;

  /**
   * Set precedence rule.
   */
  setPrecedence(rule: 'aws-first' | 'local-first' | 'merge'): ConfigBuilder<T>;

  /**
   * Add namespace.
   */
  addNamespace(namespace: string): ConfigBuilder<T>;

  /**
   * Add validation.
   */
  addValidation(validator: (config: any) => boolean): ConfigBuilder<T>;

  /**
   * Build the configuration.
   */
  build(): T;
}

/**
 * Configuration fluent API interface.
 */
export interface ConfigFluentAPI<T> {
  /**
   * Filter configuration by predicate.
   */
  filter(predicate: ConfigPredicate<T>): ConfigFluentAPI<T>;

  /**
   * Transform configuration.
   */
  map<U>(transformer: ConfigTransformerFn<T, U>): ConfigFluentAPI<U>;

  /**
   * Validate configuration.
   */
  validate(validator: ConfigPredicate<T>): ConfigFluentAPI<T>;

  /**
   * Get the final configuration.
   */
  get(): T;
}

/**
 * Type guard for AWS configuration sources.
 */
export const isAwsSource = (source: AllConfigSource): source is AwsConfigSource => {
  return source === 'secrets-manager' || source === 'ssm';
};

/**
 * Type guard for local configuration sources.
 */
export const isLocalSource = (source: AllConfigSource): source is LocalConfigSource => {
  return source === 'environment' || source === 'local-file';
};

/**
 * Type guard for configuration with metadata.
 */
export const hasMetadata = <T, S extends AllConfigSource>(
  config: any
): config is ConfigWithSource<T, S> => {
  return config && typeof config === 'object' && '__metadata' in config;
};

/**
 * Type guard for validation result.
 */
export const isValidationResult = <T>(result: any): result is ValidationResult<T> => {
  return (
    result &&
    typeof result === 'object' &&
    'isValid' in result &&
    typeof result.isValid === 'boolean' &&
    'errors' in result &&
    Array.isArray(result.errors)
  );
};

/**
 * Type guard for cache entry.
 */
export const isCacheEntry = <T>(entry: any): entry is CacheEntry<T> => {
  return (
    entry &&
    typeof entry === 'object' &&
    'key' in entry &&
    'value' in entry &&
    'timestamp' in entry &&
    entry.timestamp instanceof Date
  );
};