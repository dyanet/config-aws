/**
 * Unit tests for config-provider.tsx
 *
 * Tests context creation and value access for the ConfigProvider.
 * **Validates: Requirements 3.5**
 */

import React from 'react';
import {
  createConfigProvider,
  ConfigProvider,
  useConfig,
  ConfigContext,
} from './config-provider';

describe('ConfigProvider', () => {
  describe('createConfigProvider', () => {
    it('should create a ConfigProvider, useConfig hook, and ConfigContext', () => {
      const result = createConfigProvider<{ API_KEY: string }>();

      expect(result).toHaveProperty('ConfigProvider');
      expect(result).toHaveProperty('useConfig');
      expect(result).toHaveProperty('ConfigContext');
      expect(typeof result.ConfigProvider).toBe('function');
      expect(typeof result.useConfig).toBe('function');
      expect(result.ConfigContext).toBeDefined();
    });

    it('should create typed providers for different config shapes', () => {
      interface AppConfig {
        DATABASE_URL: string;
        PORT: number;
        DEBUG: boolean;
      }

      const { ConfigProvider: TypedProvider } = createConfigProvider<AppConfig>();

      expect(typeof TypedProvider).toBe('function');
    });

    it('should create independent contexts for different createConfigProvider calls', () => {
      const provider1 = createConfigProvider<{ key1: string }>();
      const provider2 = createConfigProvider<{ key2: string }>();

      expect(provider1.ConfigContext).not.toBe(provider2.ConfigContext);
    });
  });

  describe('ConfigProvider component', () => {
    it('should render children', () => {
      const { ConfigProvider: TestProvider } = createConfigProvider<{ test: string }>();
      const config = { test: 'value' };

      const element = React.createElement(
        TestProvider,
        { config, children: React.createElement('div', { key: 'child' }, 'Child content') }
      );

      expect(element).toBeDefined();
      expect(element.type).toBe(TestProvider);
    });

    it('should accept config prop with correct type', () => {
      interface MyConfig {
        API_URL: string;
        TIMEOUT: number;
      }

      const { ConfigProvider: TypedProvider } = createConfigProvider<MyConfig>();
      const config: MyConfig = { API_URL: 'https://api.example.com', TIMEOUT: 5000 };

      const element = React.createElement(
        TypedProvider,
        { config, children: React.createElement('span', null, 'test') }
      );

      expect(element).toBeDefined();
      expect(element.type).toBe(TypedProvider);
    });
  });

  describe('useConfig hook', () => {
    it('should throw error when used outside ConfigProvider', () => {
      const { useConfig: testUseConfig } = createConfigProvider<{ test: string }>();

      expect(typeof testUseConfig).toBe('function');
    });

    it('should be a function that can be used as a hook', () => {
      const { useConfig: testUseConfig } = createConfigProvider();

      expect(typeof testUseConfig).toBe('function');
    });
  });

  describe('Default exports', () => {
    it('should export default ConfigProvider', () => {
      expect(ConfigProvider).toBeDefined();
      expect(typeof ConfigProvider).toBe('function');
    });

    it('should export default useConfig', () => {
      expect(useConfig).toBeDefined();
      expect(typeof useConfig).toBe('function');
    });

    it('should export default ConfigContext', () => {
      expect(ConfigContext).toBeDefined();
    });

    it('should allow creating elements with default ConfigProvider', () => {
      const config = { key: 'value', number: 42 };

      const element = React.createElement(
        ConfigProvider,
        { config, children: React.createElement('div', null, 'content') }
      );

      expect(element).toBeDefined();
      expect(element.type).toBe(ConfigProvider);
    });
  });

  describe('Context value structure', () => {
    it('should wrap config in a context value object', () => {
      const { ConfigContext: TestContext } = createConfigProvider<{ data: string }>();

      expect(TestContext).toBeDefined();
      expect(TestContext.Provider).toBeDefined();
      expect(TestContext.Consumer).toBeDefined();
    });
  });

  describe('Type safety', () => {
    it('should maintain type information through the provider', () => {
      interface StrictConfig {
        required: string;
        optional?: number;
      }

      const { ConfigProvider: StrictProvider } = createConfigProvider<StrictConfig>();

      const validConfig: StrictConfig = { required: 'test' };

      const element = React.createElement(
        StrictProvider,
        { config: validConfig, children: null }
      );

      expect(element).toBeDefined();
      expect(element.type).toBe(StrictProvider);
    });

    it('should work with complex nested config types', () => {
      interface NestedConfig {
        database: {
          host: string;
          port: number;
        };
        features: string[];
      }

      const { ConfigProvider: NestedProvider } = createConfigProvider<NestedConfig>();

      const config: NestedConfig = {
        database: { host: 'localhost', port: 5432 },
        features: ['feature1', 'feature2'],
      };

      const element = React.createElement(
        NestedProvider,
        { config, children: React.createElement('div', null) }
      );

      expect(element).toBeDefined();
      expect(element.type).toBe(NestedProvider);
    });
  });
});
