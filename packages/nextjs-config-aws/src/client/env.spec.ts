/**
 * Tests for client-side environment variable access.
 */

import { env, envFrom, getAllEnv, hasEnv } from './env';

describe('Client env functions', () => {
  // Store original window
  const originalWindow = global.window;

  beforeEach(() => {
    // Reset window mock before each test
    (global as any).window = {
      __ENV: {
        API_URL: 'https://api.example.com',
        APP_NAME: 'Test App',
        DEBUG: 'true',
      },
      __CUSTOM_ENV: {
        CUSTOM_VAR: 'custom-value',
      },
    };
  });

  afterEach(() => {
    // Restore original window
    (global as any).window = originalWindow;
  });

  describe('env()', () => {
    it('should return the value of an existing environment variable', () => {
      expect(env('API_URL')).toBe('https://api.example.com');
      expect(env('APP_NAME')).toBe('Test App');
    });

    it('should return undefined for non-existent variables', () => {
      expect(env('NON_EXISTENT')).toBeUndefined();
    });

    it('should return default value when variable does not exist', () => {
      expect(env('NON_EXISTENT', 'default')).toBe('default');
    });

    it('should return actual value over default when variable exists', () => {
      expect(env('API_URL', 'default')).toBe('https://api.example.com');
    });

    it('should return empty object when window is undefined (SSR)', () => {
      (global as any).window = undefined;
      expect(env('API_URL')).toBeUndefined();
      expect(env('API_URL', 'default')).toBe('default');
    });

    it('should return empty object when __ENV is not set', () => {
      (global as any).window = {};
      expect(env('API_URL')).toBeUndefined();
    });

    it('should return empty object when __ENV is not an object', () => {
      (global as any).window = { __ENV: 'not-an-object' };
      expect(env('API_URL')).toBeUndefined();
    });

    it('should return empty object when __ENV is an array', () => {
      (global as any).window = { __ENV: ['not', 'an', 'object'] };
      expect(env('API_URL')).toBeUndefined();
    });
  });

  describe('envFrom()', () => {
    it('should read from custom variable name', () => {
      expect(envFrom('__CUSTOM_ENV', 'CUSTOM_VAR')).toBe('custom-value');
    });

    it('should return undefined for non-existent variables', () => {
      expect(envFrom('__CUSTOM_ENV', 'NON_EXISTENT')).toBeUndefined();
    });

    it('should return default value when variable does not exist', () => {
      expect(envFrom('__CUSTOM_ENV', 'NON_EXISTENT', 'default')).toBe('default');
    });

    it('should return actual value over default when variable exists', () => {
      expect(envFrom('__CUSTOM_ENV', 'CUSTOM_VAR', 'default')).toBe('custom-value');
    });

    it('should return undefined when custom variable name does not exist', () => {
      expect(envFrom('__NON_EXISTENT', 'SOME_VAR')).toBeUndefined();
    });
  });

  describe('getAllEnv()', () => {
    it('should return all environment variables', () => {
      const allEnv = getAllEnv();
      expect(allEnv).toEqual({
        API_URL: 'https://api.example.com',
        APP_NAME: 'Test App',
        DEBUG: 'true',
      });
    });

    it('should return a copy, not the original object', () => {
      const allEnv = getAllEnv();
      allEnv['NEW_VAR'] = 'new-value';
      expect(env('NEW_VAR')).toBeUndefined();
    });

    it('should read from custom variable name', () => {
      const customEnv = getAllEnv('__CUSTOM_ENV');
      expect(customEnv).toEqual({
        CUSTOM_VAR: 'custom-value',
      });
    });

    it('should return empty object when window is undefined', () => {
      (global as any).window = undefined;
      expect(getAllEnv()).toEqual({});
    });
  });

  describe('hasEnv()', () => {
    it('should return true for existing variables', () => {
      expect(hasEnv('API_URL')).toBe(true);
      expect(hasEnv('APP_NAME')).toBe(true);
    });

    it('should return false for non-existent variables', () => {
      expect(hasEnv('NON_EXISTENT')).toBe(false);
    });

    it('should check custom variable name', () => {
      expect(hasEnv('CUSTOM_VAR', '__CUSTOM_ENV')).toBe(true);
      expect(hasEnv('API_URL', '__CUSTOM_ENV')).toBe(false);
    });

    it('should return false when window is undefined', () => {
      (global as any).window = undefined;
      expect(hasEnv('API_URL')).toBe(false);
    });
  });
});
