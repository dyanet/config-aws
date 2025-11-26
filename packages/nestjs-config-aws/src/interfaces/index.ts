// Core interfaces
export * from './config-service.interface';
export * from './module-options.interface';

// Error classes - re-export from core for backward compatibility
export {
  ConfigurationError,
  ValidationError,
  AWSServiceError,
  ConfigurationLoadError,
  MissingConfigurationError,
} from '@dyanet/config-aws';

// Default schema and types
export * from './default-schema.interface';
