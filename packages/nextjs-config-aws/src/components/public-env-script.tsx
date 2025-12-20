/**
 * PublicEnvScript - Server component for exposing environment variables to the client.
 *
 * This component renders a script tag that injects server-side environment variables
 * into the client-side JavaScript context, enabling runtime environment variable access
 * without requiring NEXT_PUBLIC_ prefixes at build time.
 *
 * @remarks
 * This is part of the simplified Next.js API. For advanced configuration loading
 * with custom loaders or direct AWS SDK integration, import from `@dyanet/config-aws` directly.
 *
 * @example
 * ```tsx
 * // In your root layout.tsx
 * import { PublicEnvScript } from '@dyanet/nextjs-config-aws';
 *
 * export default function RootLayout({ children }) {
 *   return (
 *     <html>
 *       <head>
 *         <PublicEnvScript
 *           publicVars={['API_URL', 'APP_NAME']}
 *           variableName="__ENV"
 *         />
 *       </head>
 *       <body>{children}</body>
 *     </html>
 *   );
 * }
 * ```
 */

import * as React from 'react';

/**
 * Props for the PublicEnvScript component.
 */
export interface PublicEnvScriptProps {
  /**
   * Explicit list of environment variable names to expose to the client.
   * Only variables in this list will be included in the output.
   * Takes precedence over publicPrefix if both are provided.
   */
  publicVars?: string[];

  /**
   * Prefix to filter environment variables.
   * Only variables starting with this prefix will be included.
   * The prefix is NOT stripped from the variable names in the output.
   * @example 'PUBLIC_' will include PUBLIC_API_URL, PUBLIC_APP_NAME, etc.
   */
  publicPrefix?: string;

  /**
   * The global variable name used to expose environment variables on the client.
   * @default '__ENV'
   */
  variableName?: string;

  /**
   * CSP nonce for script tag compliance with Content Security Policy.
   * If provided, adds a nonce attribute to the script tag.
   */
  nonce?: string;
}

/**
 * Filters environment variables based on allowlist or prefix.
 *
 * @param env - The environment variables object (typically process.env)
 * @param publicVars - Optional explicit list of variable names to include
 * @param publicPrefix - Optional prefix to filter variables
 * @returns Filtered environment variables object
 */
export function filterEnvVars(
  env: Record<string, string | undefined>,
  publicVars?: string[],
  publicPrefix?: string
): Record<string, string> {
  const result: Record<string, string> = {};

  // If explicit allowlist is provided, use it
  if (publicVars && publicVars.length > 0) {
    for (const key of publicVars) {
      const value = env[key];
      if (value !== undefined) {
        result[key] = value;
      }
    }
    return result;
  }

  // If prefix is provided, filter by prefix
  if (publicPrefix) {
    for (const [key, value] of Object.entries(env)) {
      if (key.startsWith(publicPrefix) && value !== undefined) {
        result[key] = value;
      }
    }
    return result;
  }

  // If neither is provided, return empty object (safe default)
  return result;
}

/**
 * Generates the script content for injecting environment variables.
 *
 * @param filteredEnv - The filtered environment variables to expose
 * @param variableName - The global variable name to use
 * @returns The script content as a string
 */
export function generateScriptContent(
  filteredEnv: Record<string, string>,
  variableName: string
): string {
  const jsonString = JSON.stringify(filteredEnv);
  return `window.${variableName}=${jsonString};`;
}

/**
 * Server component that renders a script tag exposing environment variables to the client.
 *
 * This enables runtime environment variable access in Next.js applications without
 * requiring NEXT_PUBLIC_ prefixes at build time. The same build artifact can be
 * deployed to different environments with different configuration.
 *
 * Security considerations:
 * - Only expose variables that are safe for public access
 * - Use the publicVars allowlist for explicit control
 * - Never expose secrets, API keys, or sensitive data
 *
 * @param props - Component props
 * @returns A script element with environment variables, or null if no variables to expose
 */
export function PublicEnvScript({
  publicVars,
  publicPrefix,
  variableName = '__ENV',
  nonce,
}: PublicEnvScriptProps): React.ReactElement | null {
  // Filter environment variables based on allowlist or prefix
  const filteredEnv = filterEnvVars(process.env as Record<string, string | undefined>, publicVars, publicPrefix);

  // If no variables to expose, render nothing
  if (Object.keys(filteredEnv).length === 0) {
    return null;
  }

  // Generate the script content
  const scriptContent = generateScriptContent(filteredEnv, variableName);

  // Build script props
  const scriptProps: React.ScriptHTMLAttributes<HTMLScriptElement> = {
    dangerouslySetInnerHTML: { __html: scriptContent },
  };

  // Add nonce if provided for CSP compliance
  if (nonce) {
    scriptProps.nonce = nonce;
  }

  return React.createElement('script', scriptProps);
}

export default PublicEnvScript;
