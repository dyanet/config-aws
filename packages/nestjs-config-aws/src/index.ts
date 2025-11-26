// Re-export all public types from @dyanet/config-aws core package
export {
  // Loaders
  EnvironmentLoader,
  EnvFileLoader,
  S3Loader,
  SecretsManagerLoader,
  SSMParameterStoreLoader,
  
  // ConfigManager
  ConfigManager,
  
  // Error classes
  ConfigurationError,
  ValidationError,
  AWSServiceError,
  ConfigurationLoadError,
  MissingConfigurationError,
  
  // Utilities
  ConfigValidationUtil,
  EnvFileParser,
} from '@dyanet/config-aws';

// Re-export types from @dyanet/config-aws
export type {
  // Core interfaces
  ConfigLoader,
  ConfigManagerOptions,
  LoaderPrecedence,
  VerboseOptions,
  PrecedenceStrategy,
  ConfigLoadResult,
  ConfigSourceInfo as CoreConfigSourceInfo,
  Logger,
  
  // Loader configs
  EnvironmentLoaderConfig,
  EnvFileLoaderConfig,
  S3LoaderConfig,
  SecretsManagerLoaderConfig,
  SSMParameterStoreLoaderConfig,
} from '@dyanet/config-aws';

// NestJS-specific exports
export * from './config.module';
export * from './interfaces';
export * from './services/config.service';

// Integration module exports for @nestjs/config compatibility
export * from './integration';

// Utility functions
export {
  isAwsSource,
  isLocalSource,
  hasMetadata,
  isValidationResult,
  isCacheEntry
} from './integration/interfaces/utility-types.interface';

// Decorators and utility functions
export {
  InjectEnhancedConfig,
  ConfigProperty,
  ConfigClass,
  ValidateConfig,
  TransformConfig,
  createTypeSafeConfigFactory
} from './integration/interfaces/nestjs-config-compatibility.interface';

// Explicit exports for better discoverability
export { NestConfigAwsIntegrationModule } from './integration/nestjs-config-integration.module';
export type {
  // Integration Options
  IntegrationOptions,
  AsyncIntegrationOptions,
  PrecedenceRule,
  ErrorHandlingStrategy,
  FactoryOptions,

  // Configuration Factory Types
  AwsConfigurationFactory,
  ConfigurationFactoryProvider,

  // Configuration Source Types
  ConfigurationSource,
  ConfigurationSourceType,

  // Integration State Types
  IntegrationState,

  // Typed Configuration Types
  TypedConfiguration,
  TypedConfigurationFactory,
  TypedConfigurationAccessor,
  ConfigurationSchema,
  TypedConfigurationRegistry,
  TypedConfigurationOptions,
  ConfigurationType,
  StronglyTypedConfig,
  ConfigurationValue,
  ConfigurationPathResolver,

  // NestJS Config Integration Types
  NestJSConfigIntegrationService,
  EnhancedConfigModuleOptions,
  EnhancedAsyncConfigModuleOptions,
  EnhancedConfigModuleFactory,
  EnhancedAsyncConfigModuleFactory,
  EnhancedConfigModuleOptionsFactory,
  IntegrationStatus,
  AwsConfigurationLoader,
  ConfigurationMerger,
  AwsConfigurationValidator,

  // Compatibility Types
  EnhancedConfigService,
  ConfigValueWithSource,
  ConfigSourceInfo,
  ConfigHealthStatus,
  ConfigPropertyOptions,
  ConfigClassOptions,
  ConfigValidationOptions,
  TypeSafeConfigFactory,
  ConfigModuleBuilder,
  ConfigTestingUtils,
  ConfigMonitor,
  ConfigMetrics,
  ConfigEvent,
  ConfigAuditEntry,
  ConfigAuditLogger,

  // Utility Types
  ExtractConfigType,
  TypedConfigService,
  ConfigurationNamespaceRegistry,
  DeepReadonly,
  PartialDeep,
  RequiredDeep,
  ConfigPath,
  ConfigValue,
  AwsConfigSource,
  LocalConfigSource,
  AllConfigSource,
  ConfigSourceMetadata,
  ConfigWithSource,
  ExtractConfig,
  ConfigFactoryMap,
  ExtractConfigMap,
  NamespaceConfig,
  MultiNamespaceConfig,
  ValidationResult,
  AsyncValidationResult,
  ConfigTransformerFn,
  AsyncConfigTransformerFn,
  ConfigPredicate,
  AsyncConfigPredicate,
  ConfigBuilder,
  ConfigFluentAPI
} from './integration/interfaces';
