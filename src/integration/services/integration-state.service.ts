import { Injectable } from '@nestjs/common';
import { IntegrationState } from '../interfaces/integration-state.interface';
import { ConfigurationSource } from '../interfaces/configuration-source.interface';

/**
 * Service for managing the state of the integration module.
 */
@Injectable()
export class IntegrationStateService {
  private state: IntegrationState = {
    isInitialized: false,
    awsAvailable: false,
    loadedSources: [],
    registeredFactories: [],
    errors: [],
  };

  /**
   * Get the current integration state.
   */
  getState(): IntegrationState {
    return { ...this.state };
  }

  /**
   * Mark the integration as initialized.
   */
  setInitialized(initialized: boolean): void {
    this.state.isInitialized = initialized;
  }

  /**
   * Set AWS availability status.
   */
  setAwsAvailable(available: boolean): void {
    this.state.awsAvailable = available;
  }

  /**
   * Add a loaded configuration source.
   */
  addLoadedSource(source: ConfigurationSource): void {
    this.state.loadedSources.push(source);
  }

  /**
   * Add a registered factory name.
   */
  addRegisteredFactory(factoryName: string): void {
    this.state.registeredFactories.push(factoryName);
  }

  /**
   * Add an error to the state.
   */
  addError(error: string): void {
    this.state.errors.push(error);
  }

  /**
   * Clear all errors.
   */
  clearErrors(): void {
    this.state.errors = [];
  }

  /**
   * Reset the integration state.
   */
  reset(): void {
    this.state = {
      isInitialized: false,
      awsAvailable: false,
      loadedSources: [],
      registeredFactories: [],
      errors: [],
    };
  }
}