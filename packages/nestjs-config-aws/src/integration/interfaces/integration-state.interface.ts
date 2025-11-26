import { ConfigurationSource } from './configuration-source.interface';

/**
 * Represents the current state of the integration module.
 */
export interface IntegrationState {
  /** Whether the integration has been initialized */
  isInitialized: boolean;
  /** Whether AWS services are available */
  awsAvailable: boolean;
  /** List of configuration sources that have been loaded */
  loadedSources: ConfigurationSource[];
  /** List of factory names that have been registered with @nestjs/config */
  registeredFactories: string[];
  /** Any errors encountered during initialization or operation */
  errors: string[];
}