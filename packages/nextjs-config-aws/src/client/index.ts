/**
 * Client-side exports for Next.js configuration management.
 *
 * These utilities are designed for use in client components ('use client')
 * to access runtime environment variables injected by PublicEnvScript.
 */

export { env, envFrom, getAllEnv, hasEnv } from './env';
