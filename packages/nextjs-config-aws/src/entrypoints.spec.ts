/**
 * Entry-point regression tests.
 *
 * Under React Server Components, Next.js resolves `react` with the
 * `react-server` condition, where `createContext` does not exist. Anything
 * that calls it at module load crashes every server component importing this
 * package ("createContext is not a function" while collecting page data).
 * These tests load the public entry points against such a `react` and check
 * that nothing on the import path touches it.
 */

describe('public entry points under a react-server style React', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.doMock('react', () => {
      const actual = jest.requireActual('react');
      return {
        ...actual,
        createContext: () => {
          throw new Error('createContext is not available under react-server');
        },
      };
    });
  });

  afterEach(() => {
    jest.dontMock('react');
  });

  it('the main entry loads and exposes the documented API', () => {
    let mod: Record<string, unknown> = {};
    expect(() => {
      mod = require('./index');
    }).not.toThrow();
    for (const name of ['getConfig', 'PublicEnvScript', 'env', 'ConfigurationError', 'ValidationError']) {
      expect(mod[name]).toBeDefined();
    }
  });

  it('the ./client entry loads and exposes only the browser helpers', () => {
    const mod = require('./client');
    expect(Object.keys(mod).sort()).toEqual(['env', 'envFrom', 'getAllEnv', 'hasEnv']);
  });

  it('the ./client entry does not pull in server code or @dyanet/config-aws', () => {
    const loaded = new Set<string>();
    jest.doMock('@dyanet/config-aws', () => {
      loaded.add('@dyanet/config-aws');
      return {};
    });
    require('./client');
    expect(loaded.has('@dyanet/config-aws')).toBe(false);
    jest.dontMock('@dyanet/config-aws');
  });
});

describe('package.json exports', () => {
  const pkg = require('../package.json');

  it('publishes a ./client subpath for client components', () => {
    expect(pkg.exports['./client']).toEqual({
      types: './dist/types/client/index.d.ts',
      import: './dist/esm/client/index.js',
      require: './dist/cjs/client/index.js',
    });
  });
});
