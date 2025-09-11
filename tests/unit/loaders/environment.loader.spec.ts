import { EnvironmentLoader } from '../../../src/loaders/environment.loader';

describe('EnvironmentLoader', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('constructor', () => {
    it('should create instance without prefix', () => {
      const loader = new EnvironmentLoader();
      expect(loader).toBeInstanceOf(EnvironmentLoader);
    });

    it('should create instance with prefix', () => {
      const loader = new EnvironmentLoader('APP_');
      expect(loader).toBeInstanceOf(EnvironmentLoader);
    });
  });

  describe('getName', () => {
    it('should return default name without prefix', () => {
      const loader = new EnvironmentLoader();
      expect(loader.getName()).toBe('EnvironmentLoader');
    });

    it('should return name with prefix', () => {
      const loader = new EnvironmentLoader('APP_');
      expect(loader.getName()).toBe('EnvironmentLoader(APP_)');
    });
  });

  describe('isAvailable', () => {
    it('should always return true', async () => {
      const loader = new EnvironmentLoader();
      const result = await loader.isAvailable();
      expect(result).toBe(true);
    });

    it('should always return true with prefix', async () => {
      const loader = new EnvironmentLoader('APP_');
      const result = await loader.isAvailable();
      expect(result).toBe(true);
    });
  });

  describe('load', () => {
    it('should load all environment variables without prefix', async () => {
      // Set test environment variables
      process.env['TEST_VAR1'] = 'value1';
      process.env['TEST_VAR2'] = 'value2';
      process.env['NODE_ENV'] = 'test';

      const loader = new EnvironmentLoader();
      const config = await loader.load();

      expect(config['TEST_VAR1']).toBe('value1');
      expect(config['TEST_VAR2']).toBe('value2');
      expect(config['NODE_ENV']).toBe('test');
    });

    it('should load only prefixed environment variables', async () => {
      // Set test environment variables
      process.env['APP_DATABASE_URL'] = 'postgres://localhost';
      process.env['APP_PORT'] = '3000';
      process.env['OTHER_VAR'] = 'should not be included';
      process.env['NODE_ENV'] = 'test';

      const loader = new EnvironmentLoader('APP_');
      const config = await loader.load();

      expect(config['DATABASE_URL']).toBe('postgres://localhost');
      expect(config['PORT']).toBe('3000');
      expect(config['OTHER_VAR']).toBeUndefined();
      expect(config['NODE_ENV']).toBeUndefined();
    });

    it('should handle empty prefix correctly', async () => {
      process.env['TEST_VAR'] = 'value';
      
      const loader = new EnvironmentLoader('');
      const config = await loader.load();

      expect(config['TEST_VAR']).toBe('value');
    });

    it('should exclude undefined environment variables', async () => {
      // Ensure a variable is undefined
      delete process.env['UNDEFINED_VAR'];
      process.env['DEFINED_VAR'] = 'value';

      const loader = new EnvironmentLoader();
      const config = await loader.load();

      expect(config['UNDEFINED_VAR']).toBeUndefined();
      expect(config['DEFINED_VAR']).toBe('value');
    });

    it('should handle prefix that matches no variables', async () => {
      process.env['TEST_VAR'] = 'value';
      
      const loader = new EnvironmentLoader('NONEXISTENT_');
      const config = await loader.load();

      expect(Object.keys(config)).toHaveLength(0);
    });

    it('should handle empty environment', async () => {
      // Clear all environment variables for this test
      process.env = {};
      
      const loader = new EnvironmentLoader();
      const config = await loader.load();

      expect(Object.keys(config)).toHaveLength(0);
    });

    it('should handle prefix with no suffix', async () => {
      // Variable that exactly matches prefix (no suffix)
      process.env['APP_'] = 'value';
      process.env['APP_VAR'] = 'other_value';
      
      const loader = new EnvironmentLoader('APP_');
      const config = await loader.load();

      // Should not include the exact prefix match (empty key after removal)
      expect(config['']).toBeUndefined();
      expect(config['VAR']).toBe('other_value');
    });

    it('should preserve variable values as strings', async () => {
      process.env['STRING_VAR'] = 'hello';
      process.env['NUMBER_VAR'] = '123';
      process.env['BOOLEAN_VAR'] = 'true';
      process.env['EMPTY_VAR'] = '';
      
      const loader = new EnvironmentLoader();
      const config = await loader.load();

      expect(config['STRING_VAR']).toBe('hello');
      expect(config['NUMBER_VAR']).toBe('123'); // Should remain as string
      expect(config['BOOLEAN_VAR']).toBe('true'); // Should remain as string
      expect(config['EMPTY_VAR']).toBe(''); // Empty string should be preserved
    });
  });

  describe('edge cases', () => {
    it('should handle special characters in variable names', async () => {
      process.env['APP_VAR-WITH-DASHES'] = 'value1';
      process.env['APP_VAR_WITH_UNDERSCORES'] = 'value2';
      
      const loader = new EnvironmentLoader('APP_');
      const config = await loader.load();

      expect(config['VAR-WITH-DASHES']).toBe('value1');
      expect(config['VAR_WITH_UNDERSCORES']).toBe('value2');
    });

    it('should handle unicode characters in values', async () => {
      process.env['UNICODE_VAR'] = '🚀 Hello 世界';
      
      const loader = new EnvironmentLoader();
      const config = await loader.load();

      expect(config['UNICODE_VAR']).toBe('🚀 Hello 世界');
    });

    it('should handle very long variable values', async () => {
      const longValue = 'a'.repeat(10000);
      process.env['LONG_VAR'] = longValue;
      
      const loader = new EnvironmentLoader();
      const config = await loader.load();

      expect(config['LONG_VAR']).toBe(longValue);
    });
  });
});