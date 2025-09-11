import { Test, TestingModule } from '@nestjs/testing';
import { IntegrationStateService } from '../../../src/integration/services/integration-state.service';
import { ConfigurationSource } from '../../../src/integration/interfaces/configuration-source.interface';
import { IntegrationState } from '../../../src/integration/interfaces/integration-state.interface';

describe('IntegrationStateService', () => {
  let service: IntegrationStateService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [IntegrationStateService],
    }).compile();

    service = module.get<IntegrationStateService>(IntegrationStateService);
  });

  afterEach(() => {
    service.reset();
  });

  describe('initialization', () => {
    it('should start with default state', () => {
      // Act
      const state = service.getState();

      // Assert
      expect(state).toMatchObject({
        isInitialized: false,
        awsAvailable: false,
        loadedSources: [],
        registeredFactories: [],
        errors: [],
      });
    });

    it('should have valid timestamps in initial state', () => {
      // Act
      const state = service.getState();

      // Assert
      expect(state.lastUpdated).toBeInstanceOf(Date);
      expect(state.initializationStarted).toBeUndefined();
      expect(state.initializationCompleted).toBeUndefined();
    });
  });

  describe('initialization tracking', () => {
    it('should track initialization start', () => {
      // Act
      service.markInitializationStarted();
      const state = service.getState();

      // Assert
      expect(state.initializationStarted).toBeInstanceOf(Date);
      expect(state.initializationCompleted).toBeUndefined();
      expect(state.isInitialized).toBe(false);
    });

    it('should track initialization completion', () => {
      // Arrange
      service.markInitializationStarted();

      // Act
      service.markInitializationCompleted();
      const state = service.getState();

      // Assert
      expect(state.initializationStarted).toBeInstanceOf(Date);
      expect(state.initializationCompleted).toBeInstanceOf(Date);
      expect(state.isInitialized).toBe(true);
    });

    it('should calculate initialization duration', () => {
      // Arrange
      service.markInitializationStarted();
      
      // Add small delay to ensure measurable duration
      const delay = 10;
      const startTime = Date.now();
      
      // Act
      setTimeout(() => {
        service.markInitializationCompleted();
      }, delay);

      // Wait for completion
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          const duration = service.getInitializationDuration();
          
          // Assert
          expect(duration).toBeGreaterThanOrEqual(delay);
          expect(duration).toBeLessThan(delay + 50); // Allow some tolerance
          resolve();
        }, delay + 20);
      });
    });

    it('should return null duration when not initialized', () => {
      // Act
      const duration = service.getInitializationDuration();

      // Assert
      expect(duration).toBeNull();
    });
  });

  describe('AWS availability tracking', () => {
    it('should update AWS availability status', () => {
      // Act
      service.setAwsAvailability(true);
      const state = service.getState();

      // Assert
      expect(state.awsAvailable).toBe(true);
    });

    it('should track AWS availability changes', () => {
      // Arrange
      service.setAwsAvailability(true);
      expect(service.getState().awsAvailable).toBe(true);

      // Act
      service.setAwsAvailability(false);
      const state = service.getState();

      // Assert
      expect(state.awsAvailable).toBe(false);
    });
  });

  describe('source tracking', () => {
    it('should add loaded sources', () => {
      // Arrange
      const source: ConfigurationSource = {
        name: 'test-source',
        type: 'secrets-manager',
        priority: 1,
        data: { key: 'value' },
        loadedAt: new Date(),
      };

      // Act
      service.addLoadedSource(source);
      const state = service.getState();

      // Assert
      expect(state.loadedSources).toHaveLength(1);
      expect(state.loadedSources[0]).toEqual(source);
    });

    it('should track multiple sources', () => {
      // Arrange
      const sources: ConfigurationSource[] = [
        {
          name: 'secrets-manager',
          type: 'secrets-manager',
          priority: 2,
          data: { secret: 'value' },
          loadedAt: new Date(),
        },
        {
          name: 'ssm',
          type: 'ssm',
          priority: 1,
          data: { param: 'value' },
          loadedAt: new Date(),
        },
      ];

      // Act
      sources.forEach(source => service.addLoadedSource(source));
      const state = service.getState();

      // Assert
      expect(state.loadedSources).toHaveLength(2);
      expect(state.loadedSources).toEqual(expect.arrayContaining(sources));
    });

    it('should prevent duplicate sources', () => {
      // Arrange
      const source: ConfigurationSource = {
        name: 'test-source',
        type: 'secrets-manager',
        priority: 1,
        data: { key: 'value' },
        loadedAt: new Date(),
      };

      // Act
      service.addLoadedSource(source);
      service.addLoadedSource(source); // Add same source twice
      const state = service.getState();

      // Assert
      expect(state.loadedSources).toHaveLength(1);
    });

    it('should update existing source with newer data', () => {
      // Arrange
      const originalSource: ConfigurationSource = {
        name: 'test-source',
        type: 'secrets-manager',
        priority: 1,
        data: { key: 'old-value' },
        loadedAt: new Date(Date.now() - 1000),
      };

      const updatedSource: ConfigurationSource = {
        name: 'test-source',
        type: 'secrets-manager',
        priority: 1,
        data: { key: 'new-value' },
        loadedAt: new Date(),
      };

      // Act
      service.addLoadedSource(originalSource);
      service.addLoadedSource(updatedSource);
      const state = service.getState();

      // Assert
      expect(state.loadedSources).toHaveLength(1);
      expect(state.loadedSources[0]?.data.key).toBe('new-value');
    });
  });

  describe('factory tracking', () => {
    it('should register factory names', () => {
      // Act
      service.registerFactory('database');
      const state = service.getState();

      // Assert
      expect(state.registeredFactories).toContain('database');
    });

    it('should track multiple factories', () => {
      // Arrange
      const factories = ['database', 'api', 'cache'];

      // Act
      factories.forEach(factory => service.registerFactory(factory));
      const state = service.getState();

      // Assert
      expect(state.registeredFactories).toHaveLength(3);
      expect(state.registeredFactories).toEqual(expect.arrayContaining(factories));
    });

    it('should prevent duplicate factory registration', () => {
      // Act
      service.registerFactory('database');
      service.registerFactory('database'); // Register same factory twice
      const state = service.getState();

      // Assert
      expect(state.registeredFactories).toHaveLength(1);
      expect(state.registeredFactories[0]).toBe('database');
    });

    it('should unregister factories', () => {
      // Arrange
      service.registerFactory('database');
      service.registerFactory('api');
      expect(service.getState().registeredFactories).toHaveLength(2);

      // Act
      service.unregisterFactory('database');
      const state = service.getState();

      // Assert
      expect(state.registeredFactories).toHaveLength(1);
      expect(state.registeredFactories).toContain('api');
      expect(state.registeredFactories).not.toContain('database');
    });
  });

  describe('error tracking', () => {
    it('should add errors', () => {
      // Arrange
      const error = 'Configuration load failed';

      // Act
      service.addError(error);
      const state = service.getState();

      // Assert
      expect(state.errors).toContain(error);
    });

    it('should track multiple errors', () => {
      // Arrange
      const errors = ['Error 1', 'Error 2', 'Error 3'];

      // Act
      errors.forEach(error => service.addError(error));
      const state = service.getState();

      // Assert
      expect(state.errors).toHaveLength(3);
      expect(state.errors).toEqual(expect.arrayContaining(errors));
    });

    it('should clear errors', () => {
      // Arrange
      service.addError('Error 1');
      service.addError('Error 2');
      expect(service.getState().errors).toHaveLength(2);

      // Act
      service.clearErrors();
      const state = service.getState();

      // Assert
      expect(state.errors).toHaveLength(0);
    });
  });

  describe('state queries', () => {
    it('should check if initialized', () => {
      // Initially not initialized
      expect(service.isInitialized()).toBe(false);

      // After marking as completed
      service.markInitializationStarted();
      service.markInitializationCompleted();
      expect(service.isInitialized()).toBe(true);
    });

    it('should check if AWS is available', () => {
      // Initially not available
      expect(service.isAwsAvailable()).toBe(false);

      // After setting availability
      service.setAwsAvailability(true);
      expect(service.isAwsAvailable()).toBe(true);
    });

    it('should check if has errors', () => {
      // Initially no errors
      expect(service.hasErrors()).toBe(false);

      // After adding error
      service.addError('Test error');
      expect(service.hasErrors()).toBe(true);
    });

    it('should get source count', () => {
      // Initially no sources
      expect(service.getSourceCount()).toBe(0);

      // After adding sources
      const source: ConfigurationSource = {
        name: 'test',
        type: 'secrets-manager',
        priority: 1,
        data: {},
        loadedAt: new Date(),
      };
      service.addLoadedSource(source);
      expect(service.getSourceCount()).toBe(1);
    });

    it('should get factory count', () => {
      // Initially no factories
      expect(service.getFactoryCount()).toBe(0);

      // After registering factories
      service.registerFactory('database');
      service.registerFactory('api');
      expect(service.getFactoryCount()).toBe(2);
    });
  });

  describe('state reset', () => {
    it('should reset to initial state', () => {
      // Arrange - modify state
      service.markInitializationStarted();
      service.markInitializationCompleted();
      service.setAwsAvailability(true);
      service.addLoadedSource({
        name: 'test',
        type: 'secrets-manager',
        priority: 1,
        data: {},
        loadedAt: new Date(),
      });
      service.registerFactory('database');
      service.addError('Test error');

      // Verify state is modified
      expect(service.isInitialized()).toBe(true);
      expect(service.isAwsAvailable()).toBe(true);
      expect(service.getSourceCount()).toBe(1);
      expect(service.getFactoryCount()).toBe(1);
      expect(service.hasErrors()).toBe(true);

      // Act
      service.reset();
      const state = service.getState();

      // Assert
      expect(state.isInitialized).toBe(false);
      expect(state.awsAvailable).toBe(false);
      expect(state.loadedSources).toHaveLength(0);
      expect(state.registeredFactories).toHaveLength(0);
      expect(state.errors).toHaveLength(0);
      expect(state.initializationStarted).toBeUndefined();
      expect(state.initializationCompleted).toBeUndefined();
    });
  });

  describe('state serialization', () => {
    it('should provide serializable state', () => {
      // Arrange
      service.markInitializationStarted();
      service.setAwsAvailability(true);
      service.addLoadedSource({
        name: 'test',
        type: 'secrets-manager',
        priority: 1,
        data: { key: 'value' },
        loadedAt: new Date(),
      });
      service.registerFactory('database');

      // Act
      const state = service.getState();
      const serialized = JSON.stringify(state);
      const deserialized = JSON.parse(serialized);

      // Assert
      expect(deserialized.isInitialized).toBe(false);
      expect(deserialized.awsAvailable).toBe(true);
      expect(deserialized.loadedSources).toHaveLength(1);
      expect(deserialized.registeredFactories).toContain('database');
    });
  });

  describe('state validation', () => {
    it('should validate state consistency', () => {
      // Arrange
      service.markInitializationStarted();
      service.markInitializationCompleted();
      service.setAwsAvailability(true);

      // Act
      const isValid = service.validateState();

      // Assert
      expect(isValid).toBe(true);
    });

    it('should detect invalid state', () => {
      // Arrange - create inconsistent state
      service.markInitializationCompleted(); // Complete without starting

      // Act
      const isValid = service.validateState();

      // Assert
      expect(isValid).toBe(false);
    });
  });

  describe('state snapshots', () => {
    it('should create state snapshot', () => {
      // Arrange
      service.setAwsAvailability(true);
      service.registerFactory('database');

      // Act
      const snapshot = service.createSnapshot();

      // Assert
      expect(snapshot).toMatchObject({
        timestamp: expect.any(Date),
        state: expect.objectContaining({
          awsAvailable: true,
          registeredFactories: ['database'],
        }),
      });
    });

    it('should restore from snapshot', () => {
      // Arrange
      const originalState = service.getState();
      service.setAwsAvailability(true);
      service.registerFactory('database');
      
      const snapshot = service.createSnapshot();
      
      // Modify state further
      service.addError('Test error');
      service.registerFactory('api');

      // Act
      service.restoreFromSnapshot(snapshot);
      const restoredState = service.getState();

      // Assert
      expect(restoredState.awsAvailable).toBe(true);
      expect(restoredState.registeredFactories).toContain('database');
      expect(restoredState.registeredFactories).not.toContain('api');
      expect(restoredState.errors).toHaveLength(0);
    });
  });
});