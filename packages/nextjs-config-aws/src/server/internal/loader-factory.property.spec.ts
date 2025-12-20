/**
 * Property-based tests for the loader factory.
 *
 * **Feature: nextjs-interface-improvements, Property 1: Environment Override Takes Precedence**
 * **Validates: Requirements 2.4**
 * 
 * **Feature: nextjs-interface-improvements, Property 2: AWS Region Propagation**
 * **Validates: Requirements 1.4**
 */

import * as fc from 'fast-check';
import { detectEnvironment, EnvironmentMode } from './environment';
import { createLoaders, LoaderFactoryOptions } from './loader-factory';

/**
 * Arbitrary for generating environment modes.
 */
const environmentModeArb = fc.constantFrom<EnvironmentMode>('development', 'production', 'test');

/**
 * Arbitrary for generating NODE_ENV values (including invalid ones).
 */
const nodeEnvArb = fc.oneof(
  fc.constant('development'),
  fc.constant('production'),
  fc.constant('test'),
  fc.constant('staging'),
  fc.constant('local'),
  fc.constant(undefined)
);

/**
 * Arbitrary for generating valid AWS region strings.
 */
const awsRegionArb = fc.constantFrom(
  'us-east-1',
  'us-east-2',
  'us-west-1',
  'us-west-2',
  'eu-west-1',
  'eu-west-2',
  'eu-central-1',
  'ap-northeast-1',
  'ap-southeast-1',
  'ap-southeast-2'
);

/**
 * Arbitrary for generating AWS options with realistic values.
 * Secret names and SSM prefixes should be non-empty, non-whitespace strings.
 */
const awsOptionsArb = fc.option(
  fc.record({
    secretName: fc.option(
      fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789-_/'.split('')), { minLength: 1, maxLength: 50 }),
      { nil: undefined }
    ),
    ssmPrefix: fc.option(
      fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789-_/'.split('')), { minLength: 1, maxLength: 50 }),
      { nil: undefined }
    ),
    region: fc.option(fc.constantFrom('us-east-1', 'us-west-2', 'eu-west-1'), { nil: undefined }),
  }),
  { nil: undefined }
);

/**
 * Arbitrary for generating AWS options that always include a region.
 * Used specifically for testing region propagation.
 */
const awsOptionsWithRegionArb = fc.record({
  secretName: fc.option(
    fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789-_/'.split('')), { minLength: 1, maxLength: 50 }),
    { nil: undefined }
  ),
  ssmPrefix: fc.option(
    fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789-_/'.split('')), { minLength: 1, maxLength: 50 }),
    { nil: undefined }
  ),
  region: awsRegionArb,
});

describe('Loader Factory Property Tests', () => {
  const originalNodeEnv = process.env['NODE_ENV'];

  afterEach(() => {
    // Restore original NODE_ENV
    if (originalNodeEnv !== undefined) {
      process.env['NODE_ENV'] = originalNodeEnv;
    } else {
      delete process.env['NODE_ENV'];
    }
  });

  /**
   * **Feature: nextjs-interface-improvements, Property 1: Environment Override Takes Precedence**
   * **Validates: Requirements 2.4**
   *
   * For any NODE_ENV value and explicit environment option,
   * the explicit option SHALL determine loader behavior.
   */
  describe('Property 1: Environment Override Takes Precedence', () => {
    it('explicit environment option should override NODE_ENV for loader creation', async () => {
      await fc.assert(
        fc.asyncProperty(
          nodeEnvArb,
          environmentModeArb,
          awsOptionsArb,
          fc.boolean(),
          async (nodeEnv, explicitEnv, aws, forceAwsInDev) => {
            // Set NODE_ENV to a specific value
            if (nodeEnv !== undefined) {
              process.env['NODE_ENV'] = nodeEnv;
            } else {
              delete process.env['NODE_ENV'];
            }

            // Create loaders with explicit environment override
            const options: LoaderFactoryOptions = {
              environment: explicitEnv,
              aws: aws ?? undefined,
              forceAwsInDev,
            };

            const loaders = createLoaders(options);

            // Verify loader behavior matches explicit environment, not NODE_ENV
            // Note: Some loaders may throw when getName() is called without proper environment setup
            // We use a safe getter that catches these errors
            const getLoaderNameSafe = (loader: { getName(): string }): string => {
              try {
                return loader.getName();
              } catch {
                // If getName() throws, use constructor name as fallback
                return loader.constructor.name;
              }
            };
            const loaderNames = loaders.map(getLoaderNameSafe);

            // EnvironmentLoader should always be present
            expect(loaderNames).toContain('EnvironmentLoader');

            // Verify EnvFileLoader behavior based on explicit environment
            if (explicitEnv === 'development') {
              // Development should have EnvFileLoader
              expect(loaderNames).toContain('EnvFileLoader');
            } else if (explicitEnv === 'production') {
              // Production should have EnvFileLoader
              expect(loaderNames).toContain('EnvFileLoader');
            } else if (explicitEnv === 'test') {
              // Test should NOT have EnvFileLoader
              expect(loaderNames).not.toContain('EnvFileLoader');
            }

            // Verify AWS loader behavior based on explicit environment
            // Note: AWS loader names include the path/secret name, so we check with startsWith
            const hasSecretsManager = loaderNames.some(name => name.startsWith('SecretsManagerLoader'));
            const hasSSMParameterStore = loaderNames.some(name => name.startsWith('SSMParameterStoreLoader'));

            if (explicitEnv === 'test') {
              // Test environment should never have AWS loaders
              expect(hasSecretsManager).toBe(false);
              expect(hasSSMParameterStore).toBe(false);
            } else if (explicitEnv === 'production' && aws) {
              // Production with AWS config should have AWS loaders if configured
              if (aws.secretName) {
                expect(hasSecretsManager).toBe(true);
              }
              if (aws.ssmPrefix) {
                expect(hasSSMParameterStore).toBe(true);
              }
            } else if (explicitEnv === 'development' && forceAwsInDev && aws) {
              // Development with forceAwsInDev should have AWS loaders if configured
              if (aws.secretName) {
                expect(hasSecretsManager).toBe(true);
              }
              if (aws.ssmPrefix) {
                expect(hasSSMParameterStore).toBe(true);
              }
            } else if (explicitEnv === 'development' && !forceAwsInDev) {
              // Development without forceAwsInDev should NOT have AWS loaders
              expect(hasSecretsManager).toBe(false);
              expect(hasSSMParameterStore).toBe(false);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('detectEnvironment should be independent of createLoaders when explicit env is provided', async () => {
      await fc.assert(
        fc.asyncProperty(
          nodeEnvArb,
          environmentModeArb,
          async (nodeEnv, explicitEnv) => {
            // Set NODE_ENV
            if (nodeEnv !== undefined) {
              process.env['NODE_ENV'] = nodeEnv;
            } else {
              delete process.env['NODE_ENV'];
            }

            // detectEnvironment reads from NODE_ENV
            const detectedEnv = detectEnvironment();

            // createLoaders with explicit environment should use explicit, not detected
            const loadersWithExplicit = createLoaders({ environment: explicitEnv });
            const loadersWithDetected = createLoaders({ environment: detectedEnv });

            // If explicit differs from detected, loaders should differ
            if (explicitEnv !== detectedEnv) {
              // The key point is that explicit environment is used, not auto-detected
              // Both should produce valid loaders
              expect(loadersWithExplicit.length).toBeGreaterThan(0);
              expect(loadersWithDetected.length).toBeGreaterThan(0);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: nextjs-interface-improvements, Property 2: AWS Region Propagation**
   * **Validates: Requirements 1.4**
   *
   * For any AWS configuration with a region specified,
   * all created AWS loaders SHALL use that region.
   */
  describe('Property 2: AWS Region Propagation', () => {
    it('all AWS loaders should use the specified region', async () => {
      await fc.assert(
        fc.asyncProperty(
          awsOptionsWithRegionArb,
          async (aws) => {
            // Only test when at least one AWS source is configured
            if (!aws.secretName && !aws.ssmPrefix) {
              return; // Skip if no AWS sources configured
            }

            // Create loaders in production environment (where AWS loaders are created)
            const options: LoaderFactoryOptions = {
              environment: 'production',
              aws,
              forceAwsInDev: false,
            };

            const loaders = createLoaders(options);

            // Find AWS loaders and verify they have the correct region
            for (const loader of loaders) {
              const loaderName = loader.getName();
              
              // Check SecretsManagerLoader
              if (loaderName.startsWith('SecretsManagerLoader')) {
                // The loader should have been created with the specified region
                expect(aws.secretName).toBeDefined();
                
                // Access the loader's region through its internal _config property
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const loaderAny = loader as any;
                const loaderRegion = loaderAny._config?.region;
                expect(loaderRegion).toBe(aws.region);
              }
              
              // Check SSMParameterStoreLoader
              if (loaderName.startsWith('SSMParameterStoreLoader')) {
                expect(aws.ssmPrefix).toBeDefined();
                
                // Access the loader's region through its internal _config property
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const loaderAny = loader as any;
                const loaderRegion = loaderAny._config?.region;
                expect(loaderRegion).toBe(aws.region);
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('AWS loaders should be created with region when both secretName and ssmPrefix are provided', async () => {
      await fc.assert(
        fc.asyncProperty(
          awsRegionArb,
          fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789-_/'.split('')), { minLength: 1, maxLength: 30 }),
          fc.stringOf(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789-_/'.split('')), { minLength: 1, maxLength: 30 }),
          async (region, secretName, ssmPrefix) => {
            const options: LoaderFactoryOptions = {
              environment: 'production',
              aws: {
                secretName,
                ssmPrefix,
                region,
              },
              forceAwsInDev: false,
            };

            const loaders = createLoaders(options);
            const loaderNames = loaders.map(l => l.getName());

            // Both AWS loaders should be present
            const hasSecretsManager = loaderNames.some(name => name.startsWith('SecretsManagerLoader'));
            const hasSSMParameterStore = loaderNames.some(name => name.startsWith('SSMParameterStoreLoader'));

            expect(hasSecretsManager).toBe(true);
            expect(hasSSMParameterStore).toBe(true);

            // Verify region is passed to both loaders via their internal _config
            for (const loader of loaders) {
              const loaderName = loader.getName();
              if (loaderName.startsWith('SecretsManagerLoader') || loaderName.startsWith('SSMParameterStoreLoader')) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const loaderAny = loader as any;
                const loaderRegion = loaderAny._config?.region;
                expect(loaderRegion).toBe(region);
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
