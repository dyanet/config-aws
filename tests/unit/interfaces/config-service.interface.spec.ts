import { ConfigService } from '../../../src/interfaces/config-service.interface';

// Mock implementation for testing
class MockConfigService extends ConfigService<{ test: string; number: number }> {
  private config = { test: 'value', number: 42 };
  private initialized = true;

  get<K extends keyof { test: string; number: number }>(key: K): { test: string; number: number }[K] {
    return this.config[key];
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  getAll(): { test: string; number: number } {
    return this.config;
  }
}

describe('ConfigService Interface', () => {
  let service: MockConfigService;

  beforeEach(() => {
    service = new MockConfigService();
  });

  it('should provide type-safe access to configuration values', () => {
    expect(service.get('test')).toBe('value');
    expect(service.get('number')).toBe(42);
  });

  it('should report initialization status', () => {
    expect(service.isInitialized()).toBe(true);
  });

  it('should return all configuration values', () => {
    const config = service.getAll();
    expect(config).toEqual({ test: 'value', number: 42 });
  });
});