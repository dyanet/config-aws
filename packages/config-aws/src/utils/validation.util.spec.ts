/**
 * Unit tests for ConfigValidationUtil and loadOptionalDependency.
 */

import { z } from 'zod';
import { ConfigValidationUtil } from './validation.util';
import { loadOptionalDependency } from './optional-dependency.util';
import { ConfigurationLoadError, ValidationError } from '../errors';

const schema = z.object({
  PORT: z.coerce.number().int().positive(),
  DB: z.object({ HOST: z.string().min(1) }),
});

describe('ConfigValidationUtil', () => {
  describe('validate()', () => {
    it('returns the parsed (coerced) value on success', () => {
      expect(ConfigValidationUtil.validate(schema, { PORT: '8080', DB: { HOST: 'h' } })).toEqual({
        PORT: 8080,
        DB: { HOST: 'h' },
      });
    });

    it('throws ValidationError with per-path details and context', () => {
      let err: unknown;
      try {
        ConfigValidationUtil.validate(schema, { PORT: '-1', DB: { HOST: '' } }, 'app');
      } catch (e) {
        err = e;
      }
      expect(err).toBeInstanceOf(ValidationError);
      const ve = err as ValidationError;
      expect(ve.message).toBe('Configuration validation failed for app');
      const details = ve.validationErrors as Record<string, Array<{ path: unknown[] }>>;
      expect(Object.keys(details).sort()).toEqual(['DB.HOST', 'PORT']);
      expect(details['DB.HOST']![0]!.path).toEqual(['DB', 'HOST']);
    });

    it('uses the default message without context', () => {
      expect(() => ConfigValidationUtil.validate(z.string(), 1)).toThrow('Configuration validation failed');
    });
  });

  describe('safeValidate()', () => {
    it('returns success with data', () => {
      expect(ConfigValidationUtil.safeValidate(z.string(), 'x')).toEqual({ success: true, data: 'x' });
    });

    it('returns a ValidationError instead of throwing', () => {
      const r = ConfigValidationUtil.safeValidate(z.string(), 1);
      expect(r.success).toBe(false);
      if (!r.success) expect(r.error).toBeInstanceOf(ValidationError);
    });
  });

  describe('formatValidationErrors()', () => {
    it('collapses a single root-level issue to its message', () => {
      const r = z.string().safeParse(1);
      expect(typeof ConfigValidationUtil.formatValidationErrors(r.error!)).toBe('string');
    });

    it('groups multiple issues on one path, and keys root issues as "root"', () => {
      const s = z.string().min(5).regex(/^[a-z]+$/);
      const nested = z.object({ K: s }).safeParse({ K: 'AB' });
      const grouped = ConfigValidationUtil.formatValidationErrors(nested.error!) as Record<string, unknown[]>;
      expect(grouped['K']).toHaveLength(2);

      const root = s.safeParse('AB');
      const rootGrouped = ConfigValidationUtil.formatValidationErrors(root.error!) as Record<string, unknown[]>;
      expect(rootGrouped['root']).toHaveLength(2);
    });
  });

  describe('createDetailedErrorMessage()', () => {
    it('formats a single issue with its path and context', () => {
      const r = z.object({ A: z.number() }).safeParse({ A: 'x' });
      expect(ConfigValidationUtil.createDetailedErrorMessage(r.error!, 'env')).toMatch(/^env: .* at 'A'$/);
    });

    it('formats a single root issue without a path', () => {
      const r = z.number().safeParse('x');
      expect(ConfigValidationUtil.createDetailedErrorMessage(r.error!)).not.toMatch(/ at '/);
    });

    it('lists multiple issues one per line', () => {
      const r = z.object({ A: z.number(), B: z.string() }).safeParse({});
      const msg = ConfigValidationUtil.createDetailedErrorMessage(r.error!);
      expect(msg.split('\n')[0]).toBe('Multiple validation errors:');
      expect(msg).toMatch(/- .* at 'A'/);
      expect(msg).toMatch(/- .* at 'B'/);
    });
  });

  describe('validateConfiguration()', () => {
    it('names the source in the error and keeps the details', () => {
      const err = (() => {
        try {
          ConfigValidationUtil.validateConfiguration(schema, {}, 'secrets-manager');
        } catch (e) {
          return e as ValidationError;
        }
        return undefined;
      })();
      expect(err).toBeInstanceOf(ValidationError);
      expect(err!.message).toBe(
        "Configuration validation failed for source 'secrets-manager': Configuration validation failed for secrets-manager configuration",
      );
      expect(err!.validationErrors).toBeTruthy();
    });

    it('rethrows non-validation errors unchanged', () => {
      const boom = new TypeError('boom');
      const exploding = z.string().transform(() => {
        throw boom;
      });
      expect(() => ConfigValidationUtil.validateConfiguration(exploding, 'x', 'env')).toThrow(boom);
    });

    it('returns the parsed value on success', () => {
      expect(ConfigValidationUtil.validateConfiguration(z.coerce.number(), '3', 'env')).toBe(3);
    });
  });
});

describe('loadOptionalDependency()', () => {
  it('returns the imported module', async () => {
    await expect(loadOptionalDependency('x', async () => ({ ok: 1 }))).resolves.toEqual({ ok: 1 });
  });

  it.each([
    ['CommonJS MODULE_NOT_FOUND', Object.assign(new Error('nope'), { code: 'MODULE_NOT_FOUND' })],
    ['ESM ERR_MODULE_NOT_FOUND', Object.assign(new Error('nope'), { code: 'ERR_MODULE_NOT_FOUND' })],
    ['a bundler "Cannot find module" message', new Error("Cannot find module '@aws-sdk/client-ssm'")],
  ])('turns %s into an install hint', async (_label, error) => {
    const err = await loadOptionalDependency('@aws-sdk/client-ssm', () => Promise.reject(error)).catch((e) => e);
    expect(err).toBeInstanceOf(ConfigurationLoadError);
    expect(err.message).toMatch(/npm install @aws-sdk\/client-ssm/);
  });

  it('rethrows unrelated failures (e.g. a crash inside the SDK) unchanged', async () => {
    const crash = new SyntaxError('Unexpected token');
    await expect(loadOptionalDependency('pkg', () => Promise.reject(crash))).rejects.toBe(crash);
  });
});
