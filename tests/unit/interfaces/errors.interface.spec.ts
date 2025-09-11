import {
  ConfigurationError,
  ValidationError,
  AWSServiceError,
  MissingConfigurationError,
  ConfigurationLoadError
} from '../../../src/interfaces/errors.interface';

describe('Error Classes', () => {
  describe('ConfigurationError', () => {
    it('should create a basic configuration error', () => {
      const error = new ConfigurationError('Test error');
      expect(error.name).toBe('ConfigurationError');
      expect(error.message).toBe('Test error');
      expect(error.cause).toBeUndefined();
    });

    it('should create a configuration error with cause', () => {
      const cause = new Error('Original error');
      const error = new ConfigurationError('Test error', cause);
      expect(error.cause).toBe(cause);
    });
  });

  describe('ValidationError', () => {
    it('should create a validation error with validation details', () => {
      const validationErrors = { field: 'is required' };
      const invalidKeys = ['field'];
      const error = new ValidationError('Validation failed', validationErrors, invalidKeys);
      
      expect(error.name).toBe('ValidationError');
      expect(error.message).toBe('Validation failed');
      expect(error.validationErrors).toBe(validationErrors);
      expect(error.invalidKeys).toBe(invalidKeys);
    });
  });

  describe('AWSServiceError', () => {
    it('should create an AWS service error', () => {
      const error = new AWSServiceError('AWS error', 'SecretsManager', 'getSecretValue');
      
      expect(error.name).toBe('AWSServiceError');
      expect(error.message).toBe('AWS error');
      expect(error.service).toBe('SecretsManager');
      expect(error.operation).toBe('getSecretValue');
    });

    it('should create an AWS service error with cause', () => {
      const cause = new Error('Network error');
      const error = new AWSServiceError('AWS error', 'SSM', 'getParameters', cause);
      
      expect(error.cause).toBe(cause);
    });
  });

  describe('MissingConfigurationError', () => {
    it('should create a missing configuration error', () => {
      const missingKeys = ['API_KEY', 'DATABASE_URL'];
      const error = new MissingConfigurationError(missingKeys);
      
      expect(error.name).toBe('MissingConfigurationError');
      expect(error.missingKeys).toBe(missingKeys);
      expect(error.message).toBe('Missing required configuration: API_KEY, DATABASE_URL');
    });

    it('should create a missing configuration error with custom message', () => {
      const missingKeys = ['API_KEY'];
      const customMessage = 'Custom error message';
      const error = new MissingConfigurationError(missingKeys, customMessage);
      
      expect(error.message).toBe(customMessage);
    });
  });

  describe('ConfigurationLoadError', () => {
    it('should create a configuration load error', () => {
      const error = new ConfigurationLoadError('Load failed', 'EnvironmentLoader');
      
      expect(error.name).toBe('ConfigurationLoadError');
      expect(error.message).toBe('Load failed');
      expect(error.loader).toBe('EnvironmentLoader');
    });

    it('should create a configuration load error with cause', () => {
      const cause = new Error('File not found');
      const error = new ConfigurationLoadError('Load failed', 'FileLoader', cause);
      
      expect(error.cause).toBe(cause);
    });
  });
});