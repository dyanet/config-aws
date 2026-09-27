import { ConfigurationLoadError } from '../errors';

/**
 * Dynamically import an optional dependency (e.g. an AWS SDK client) only when a
 * loader actually needs it.
 *
 * This keeps the AWS SDK packages as genuinely optional peer dependencies:
 * consumers that never use AWS-backed loaders do not need them installed, and the
 * SDKs are never loaded at module import time — only on first use of the loader.
 *
 * Callers mark the `import()` with `webpackIgnore` / `turbopackIgnore` so that
 * bundlers (Next.js, webpack, Turbopack) leave it as a native runtime import
 * instead of trying to resolve — and failing on — an SDK the app didn't install.
 *
 * @param packageName The npm package name, used for the install hint and error message.
 * @param importer A thunk performing the dynamic `import()` with a literal specifier.
 * @returns The imported module namespace.
 * @throws ConfigurationLoadError with an install hint when the package is not installed.
 *
 * @example
 * ```typescript
 * const { S3Client } = await loadOptionalDependency(
 *   '@aws-sdk/client-s3',
 *   () => import('@aws-sdk/client-s3'), // plus the ignore comments, see above
 * );
 * ```
 */
export async function loadOptionalDependency<T>(
  packageName: string,
  importer: () => Promise<T>,
): Promise<T> {
  try {
    return await importer();
  } catch (error) {
    const code = (error as NodeJS.ErrnoException | undefined)?.code;
    const message = error instanceof Error ? error.message : '';
    const isMissing =
      code === 'MODULE_NOT_FOUND' ||
      code === 'ERR_MODULE_NOT_FOUND' ||
      /cannot find (module|package)/i.test(message);

    if (isMissing) {
      throw new ConfigurationLoadError(
        `The optional dependency "${packageName}" is required for this loader but is not installed. ` +
          `Install it with: npm install ${packageName}`,
        packageName,
        error instanceof Error ? error : undefined,
      );
    }

    throw error;
  }
}
