import { ConfigLoader } from '../../../src/interfaces/config-loader.interface';

// Mock implementation for testing
class MockConfigLoader implements ConfigLoader {
  constructor(
    private name: string,
    private data: Record<string, any>,
    private available: boolean = true
  ) {}

  async load(): Promise<Record<string, any>> {
    return this.data;
  }

  getName(): string {
    return this.name;
  }

  async isAvailable(): Promise<boolean> {
    return this.available;
  }
}

describe('ConfigLoader Interface', () => {
  let loader: MockConfigLoader;

  beforeEach(() => {
    loader = new MockConfigLoader('test-loader', { key: 'value', number: 123 });
  });

  it('should load configuration data', async () => {
    const data = await loader.load();
    expect(data).toEqual({ key: 'value', number: 123 });
  });

  it('should return loader name', () => {
    expect(loader.getName()).toBe('test-loader');
  });

  it('should report availability status', async () => {
    expect(await loader.isAvailable()).toBe(true);
  });

  it('should handle unavailable loader', async () => {
    const unavailableLoader = new MockConfigLoader('unavailable', {}, false);
    expect(await unavailableLoader.isAvailable()).toBe(false);
  });
});