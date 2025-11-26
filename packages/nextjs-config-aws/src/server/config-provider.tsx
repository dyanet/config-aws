/**
 * React context provider for server-side configuration in Next.js applications.
 * Provides a way to access configuration values in server components.
 */

import React, { createContext, useContext, type ReactNode } from 'react';

/**
 * Configuration context type
 */
interface ConfigContextValue<T> {
  config: T;
}

/**
 * Props for the ConfigProvider component
 */
interface ConfigProviderProps<T> {
  children: ReactNode;
  config: T;
}

/**
 * Creates a typed configuration provider and hook for accessing configuration
 * in React server components.
 *
 * @example
 * ```typescript
 * import { createConfigProvider, getConfig } from '@dyanet/nextjs-config-aws';
 * import { z } from 'zod';
 *
 * const schema = z.object({
 *   DATABASE_URL: z.string(),
 *   API_KEY: z.string(),
 * });
 *
 * type AppConfig = z.infer<typeof schema>;
 *
 * // Create the provider and hook
 * const { ConfigProvider, useConfig } = createConfigProvider<AppConfig>();
 *
 * // In your layout.tsx (Server Component)
 * export default async function RootLayout({ children }) {
 *   const config = await getConfig({ schema });
 *
 *   return (
 *     <html>
 *       <body>
 *         <ConfigProvider config={config}>
 *           {children}
 *         </ConfigProvider>
 *       </body>
 *     </html>
 *   );
 * }
 *
 * // In a child component
 * function MyComponent() {
 *   const config = useConfig();
 *   return <div>API Key: {config.API_KEY}</div>;
 * }
 * ```
 *
 * @returns An object containing the ConfigProvider component and useConfig hook
 */
export function createConfigProvider<T = Record<string, unknown>>(): {
  ConfigProvider: React.FC<ConfigProviderProps<T>>;
  useConfig: () => T;
  ConfigContext: React.Context<ConfigContextValue<T> | null>;
} {
  // Create a context with null as default (will be provided by ConfigProvider)
  const ConfigContext = createContext<ConfigContextValue<T> | null>(null);

  /**
   * Provider component that wraps children with configuration context
   */
  function ConfigProvider({ children, config }: ConfigProviderProps<T>): React.ReactElement {
    const value: ConfigContextValue<T> = { config };

    return (
      <ConfigContext.Provider value={value}>
        {children}
      </ConfigContext.Provider>
    );
  }

  /**
   * Hook to access configuration from the context
   * @throws Error if used outside of ConfigProvider
   */
  function useConfig(): T {
    const context = useContext(ConfigContext);

    if (context === null) {
      throw new Error(
        'useConfig must be used within a ConfigProvider. ' +
        'Make sure to wrap your component tree with ConfigProvider.'
      );
    }

    return context.config;
  }

  return {
    ConfigProvider,
    useConfig,
    ConfigContext,
  };
}

/**
 * Default configuration context and provider for simple use cases.
 * For typed configuration, use createConfigProvider<T>() instead.
 */
const defaultProvider = createConfigProvider<Record<string, unknown>>();

/**
 * Default ConfigProvider for untyped configuration
 */
export const ConfigProvider = defaultProvider.ConfigProvider;

/**
 * Default useConfig hook for untyped configuration
 */
export const useConfig = defaultProvider.useConfig;

/**
 * Default ConfigContext for untyped configuration
 */
export const ConfigContext = defaultProvider.ConfigContext;
