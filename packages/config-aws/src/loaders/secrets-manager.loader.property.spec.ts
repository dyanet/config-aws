/**
 * Property-based tests for SecretsManagerLoader path construction.
 *
 * **Feature: package-extraction, Property 3: Environment Path Construction**
 * **Validates: Requirements 1.5**
 */

import * as fc from 'fast-check';
import { SecretsManagerLoader } from './secrets-manager.loader';

/**
 * Arbitrary for generating valid environment names (alphanumeric, lowercase)
 */
const envName = fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'.split('')), {
  minLength: 3,
  maxLength: 15,
});

/**
 * Arbitrary for generating valid path prefixes (alphanumeric, lowercase)
 */
const pathPrefix = fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'.split('')), {
  minLength: 2,
  maxLength: 10,
});

/**
 * Arbitrary for generating valid secret base paths
 * Paths should start with / and contain alphanumeric characters, hyphens, and slashes
 */
const secretBasePath = fc
  .array(
    fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789-'.split('')), {
      minLength: 1,
      maxLength: 15,
    }),
    { minLength: 1, maxLength: 4 },
  )
  .map((parts) => '/' + parts.join('/'));

/**
 * Arbitrary for generating environment mappings
 */
const environmentMapping = fc
  .array(fc.tuple(envName, pathPrefix), { minLength: 1, maxLength: 5 })
  .map((pairs) => {
    const mapping: Record<string, string> = {};
    for (const [env, prefix] of pairs) {
      mapping[env] = prefix;
    }
    return mapping;
  });


describe('SecretsManagerLoader Property Tests', () => {
  // Store original env values
  const originalAppEnv = process.env['APP_ENV'];
  const originalNodeEnv = process.env['NODE_ENV'];

  afterEach(() => {
    // Restore original env values
    if (originalAppEnv !== undefined) {
      process.env['APP_ENV'] = originalAppEnv;
    } else {
      delete process.env['APP_ENV'];
    }
    if (originalNodeEnv !== undefined) {
      process.env['NODE_ENV'] = originalNodeEnv;
    } else {
      delete process.env['NODE_ENV'];
    }
  });

  /**
   * **Feature: package-extraction, Property 3: Environment Path Construction**
   * **Validates: Requirements 1.5**
   *
   * For any environment name E and base path B, the constructed AWS path
   * SHALL follow the pattern `/{envMapping[E]}{B}`.
   */
  describe('Property 3: Environment Path Construction', () => {
    it('should construct path as /{envMapping[env]}{basePath} for any valid env and path', () => {
      fc.assert(
        fc.property(environmentMapping, secretBasePath, (mapping, basePath) => {
          // Pick a random environment from the mapping
          const envNames = Object.keys(mapping);
          if (envNames.length === 0) return; // Skip empty mappings

          const selectedEnv = envNames[0] as string;
          const expectedPrefix = mapping[selectedEnv] as string;

          // Set the environment
          process.env['APP_ENV'] = selectedEnv;
          delete process.env['NODE_ENV'];

          const loader = new SecretsManagerLoader({
            secretName: basePath,
            environmentMapping: mapping,
          });

          const constructedPath = loader.buildSecretName();
          const expectedPath = `/${expectedPrefix}${basePath}`;

          expect(constructedPath).toBe(expectedPath);
        }),
        { numRuns: 100 },
      );
    });

    it('should use APP_ENV over NODE_ENV when both are set', () => {
      fc.assert(
        fc.property(environmentMapping, secretBasePath, (mapping, basePath) => {
          const envNames = Object.keys(mapping);
          if (envNames.length < 2) return; // Need at least 2 environments

          const appEnv = envNames[0] as string;
          const nodeEnv = envNames[1] as string;

          process.env['APP_ENV'] = appEnv;
          process.env['NODE_ENV'] = nodeEnv;

          const loader = new SecretsManagerLoader({
            secretName: basePath,
            environmentMapping: mapping,
          });

          const constructedPath = loader.buildSecretName();
          const expectedPath = `/${mapping[appEnv] as string}${basePath}`;

          // Should use APP_ENV, not NODE_ENV
          expect(constructedPath).toBe(expectedPath);
        }),
        { numRuns: 100 },
      );
    });

    it('should fall back to NODE_ENV when APP_ENV is not set', () => {
      fc.assert(
        fc.property(environmentMapping, secretBasePath, (mapping, basePath) => {
          const envNames = Object.keys(mapping);
          if (envNames.length === 0) return;

          const nodeEnv = envNames[0] as string;

          delete process.env['APP_ENV'];
          process.env['NODE_ENV'] = nodeEnv;

          const loader = new SecretsManagerLoader({
            secretName: basePath,
            environmentMapping: mapping,
          });

          const constructedPath = loader.buildSecretName();
          const expectedPath = `/${mapping[nodeEnv] as string}${basePath}`;

          expect(constructedPath).toBe(expectedPath);
        }),
        { numRuns: 100 },
      );
    });

    it('should throw error when environment is not in mapping', () => {
      fc.assert(
        fc.property(environmentMapping, secretBasePath, envName, (mapping, basePath, unknownEnv) => {
          // Ensure unknownEnv is not in the mapping
          if (mapping[unknownEnv] !== undefined) return;

          process.env['APP_ENV'] = unknownEnv;
          delete process.env['NODE_ENV'];

          const loader = new SecretsManagerLoader({
            secretName: basePath,
            environmentMapping: mapping,
          });

          expect(() => loader.buildSecretName()).toThrow();
        }),
        { numRuns: 100 },
      );
    });

    it('should always start constructed path with /', () => {
      fc.assert(
        fc.property(environmentMapping, secretBasePath, (mapping, basePath) => {
          const envNames = Object.keys(mapping);
          if (envNames.length === 0) return;

          process.env['APP_ENV'] = envNames[0];
          delete process.env['NODE_ENV'];

          const loader = new SecretsManagerLoader({
            secretName: basePath,
            environmentMapping: mapping,
          });

          const constructedPath = loader.buildSecretName();

          expect(constructedPath.startsWith('/')).toBe(true);
        }),
        { numRuns: 100 },
      );
    });

    it('should preserve the base path exactly after the environment prefix', () => {
      fc.assert(
        fc.property(environmentMapping, secretBasePath, (mapping, basePath) => {
          const envNames = Object.keys(mapping);
          if (envNames.length === 0) return;

          const selectedEnv = envNames[0] as string;
          const envPrefix = mapping[selectedEnv] as string;

          process.env['APP_ENV'] = selectedEnv;
          delete process.env['NODE_ENV'];

          const loader = new SecretsManagerLoader({
            secretName: basePath,
            environmentMapping: mapping,
          });

          const constructedPath = loader.buildSecretName();

          // The path should end with the base path
          expect(constructedPath.endsWith(basePath)).toBe(true);

          // The path should contain the env prefix right after the leading /
          expect(constructedPath.substring(1, 1 + envPrefix.length)).toBe(envPrefix);
        }),
        { numRuns: 100 },
      );
    });
  });

  describe('Loader metadata', () => {
    it('should return correct loader name with secret path', () => {
      process.env['APP_ENV'] = 'production';

      const loader = new SecretsManagerLoader({
        secretName: '/my-app/config',
        environmentMapping: { production: 'prod' },
      });

      expect(loader.getName()).toBe('SecretsManagerLoader(/prod/my-app/config)');
    });

    it('should report app environment correctly', () => {
      process.env['APP_ENV'] = 'staging';

      const loader = new SecretsManagerLoader({
        environmentMapping: { staging: 'stg' },
      });

      expect(loader.getAppEnv()).toBe('staging');
    });

    it('should return a copy of environment mapping', () => {
      const mapping = { dev: 'development', prod: 'production' };
      process.env['APP_ENV'] = 'dev';

      const loader = new SecretsManagerLoader({
        environmentMapping: mapping,
      });

      const returnedMapping = loader.getEnvironmentMapping();

      // Should be equal but not the same reference
      expect(returnedMapping).toEqual(mapping);
      expect(returnedMapping).not.toBe(mapping);
    });
  });
});
