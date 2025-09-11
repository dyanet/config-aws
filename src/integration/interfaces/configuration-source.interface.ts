/**
 * Types of configuration sources supported by the integration.
 */
export type ConfigurationSourceType = 'environment' | 'secrets-manager' | 'ssm' | 'local-file';

/**
 * Represents a configuration source with metadata about its origin and state.
 */
export interface ConfigurationSource {
  /** Human-readable name of the configuration source */
  name: string;
  /** Type of the configuration source */
  type: ConfigurationSourceType;
  /** Priority of this source (higher numbers have higher priority) */
  priority: number;
  /** The configuration data from this source */
  data: Record<string, any>;
  /** Optional namespace for this configuration */
  namespace?: string;
  /** Timestamp when this configuration was loaded */
  loadedAt: Date;
  /** Any errors encountered while loading this source */
  errors?: string[];
}