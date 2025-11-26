/**
 * Property-based tests for AWS ECS-compatible environment file parser.
 *
 * **Feature: package-extraction, Property 5: EnvFile Parsing Consistency (AWS ECS Format)**
 * **Validates: Requirements 1.8, 1.9**
 */

import * as fc from 'fast-check';
import { EnvFileParser } from './env-file-parser.util';

/**
 * Arbitrary for generating valid AWS ECS variable names.
 * Must start with letter or underscore, followed by alphanumeric or underscore.
 */
const validVariableName = fc
  .tuple(
    fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ_'.split('')),
    fc.stringOf(
      fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_'.split('')),
      { minLength: 0, maxLength: 50 },
    ),
  )
  .map(([first, rest]) => first + rest);

/**
 * Arbitrary for generating invalid variable names (starting with digit).
 */
const invalidVariableNameStartingWithDigit = fc
  .tuple(
    fc.constantFrom(...'0123456789'.split('')),
    fc.stringOf(
      fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_'.split('')),
      { minLength: 0, maxLength: 20 },
    ),
  )
  .map(([first, rest]) => first + rest);

/**
 * Arbitrary for generating values that don't contain newlines.
 * Values are literal in AWS ECS format.
 */
const envValue = fc.string({ minLength: 0, maxLength: 200 }).filter((s) => !s.includes('\n') && !s.includes('\r'));

/**
 * Arbitrary for generating valid key-value pairs.
 */
const validKeyValuePair = fc.tuple(validVariableName, envValue);

/**
 * Arbitrary for generating comment lines.
 */
const commentLine = fc
  .tuple(
    fc.stringOf(fc.constant(' '), { minLength: 0, maxLength: 5 }),
    fc.constant('#'),
    fc.string({ minLength: 0, maxLength: 100 }).filter((s) => !s.includes('\n') && !s.includes('\r')),
  )
  .map(([spaces, hash, content]) => spaces + hash + content);

/**
 * Arbitrary for generating blank lines (whitespace only).
 */
const blankLine = fc.stringOf(fc.constantFrom(' ', '\t'), { minLength: 0, maxLength: 10 });

describe('EnvFileParser Property Tests', () => {
  /**
   * **Feature: package-extraction, Property 5: EnvFile Parsing Consistency (AWS ECS Format)**
   * **Validates: Requirements 1.8, 1.9**
   */
  describe('Property 5: EnvFile Parsing Consistency', () => {
    it('should correctly parse valid VARIABLE=VALUE lines', () => {
      fc.assert(
        fc.property(validKeyValuePair, ([key, value]) => {
          const content = `${key}=${value}`;
          const result = EnvFileParser.parse(content);

          expect(result[key]).toBe(value);
          expect(Object.keys(result)).toHaveLength(1);
        }),
        { numRuns: 100 },
      );
    });

    it('should ignore comment lines starting with #', () => {
      fc.assert(
        fc.property(commentLine, validKeyValuePair, (comment, [key, value]) => {
          const content = `${comment}\n${key}=${value}`;
          const result = EnvFileParser.parse(content);

          // Comment should not produce any output
          expect(result[key]).toBe(value);
          expect(Object.keys(result)).toHaveLength(1);
        }),
        { numRuns: 100 },
      );
    });

    it('should ignore blank lines', () => {
      fc.assert(
        fc.property(blankLine, validKeyValuePair, (blank, [key, value]) => {
          const content = `${blank}\n${key}=${value}\n${blank}`;
          const result = EnvFileParser.parse(content);

          expect(result[key]).toBe(value);
          expect(Object.keys(result)).toHaveLength(1);
        }),
        { numRuns: 100 },
      );
    });

    it('should reject variable names starting with digits', () => {
      fc.assert(
        fc.property(invalidVariableNameStartingWithDigit, envValue, (key, value) => {
          const content = `${key}=${value}`;
          const result = EnvFileParser.parse(content);

          // Invalid variable names should be ignored
          expect(result[key]).toBeUndefined();
          expect(Object.keys(result)).toHaveLength(0);
        }),
        { numRuns: 100 },
      );
    });

    it('should handle values containing = signs', () => {
      fc.assert(
        fc.property(validVariableName, envValue, envValue, (key, value1, value2) => {
          // Value contains an = sign
          const valueWithEquals = `${value1}=${value2}`;
          const content = `${key}=${valueWithEquals}`;
          const result = EnvFileParser.parse(content);

          // The entire string after the first = should be the value
          expect(result[key]).toBe(valueWithEquals);
        }),
        { numRuns: 100 },
      );
    });

    it('should treat values literally (no quote processing)', () => {
      fc.assert(
        fc.property(validVariableName, envValue, (key, innerValue) => {
          // Test with quoted values - quotes should be literal
          const quotedValue = `"${innerValue}"`;
          const content = `${key}=${quotedValue}`;
          const result = EnvFileParser.parse(content);

          // Quotes should be preserved as literal characters
          expect(result[key]).toBe(quotedValue);
        }),
        { numRuns: 100 },
      );
    });

    it('should ignore lines without = sign', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 50 }).filter((s) => !s.includes('=') && !s.includes('\n') && !s.startsWith('#')),
          validKeyValuePair,
          (invalidLine, [key, value]) => {
            const content = `${invalidLine}\n${key}=${value}`;
            const result = EnvFileParser.parse(content);

            // Invalid line should be ignored
            expect(result[key]).toBe(value);
            expect(Object.keys(result)).toHaveLength(1);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should parse multiple valid key-value pairs', () => {
      fc.assert(
        fc.property(
          fc.array(validKeyValuePair, { minLength: 1, maxLength: 10 }),
          (pairs) => {
            // Ensure unique keys
            const uniquePairs = pairs.reduce(
              (acc, [key, value]) => {
                acc[key] = value;
                return acc;
              },
              {} as Record<string, string>,
            );

            const content = Object.entries(uniquePairs)
              .map(([k, v]) => `${k}=${v}`)
              .join('\n');

            const result = EnvFileParser.parse(content);

            // All unique pairs should be parsed
            expect(Object.keys(result).length).toBe(Object.keys(uniquePairs).length);
            for (const [key, value] of Object.entries(uniquePairs)) {
              expect(result[key]).toBe(value);
            }
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should validate variable names correctly', () => {
      fc.assert(
        fc.property(validVariableName, (name) => {
          expect(EnvFileParser.isValidVariableName(name)).toBe(true);
        }),
        { numRuns: 100 },
      );
    });

    it('should reject invalid variable names', () => {
      fc.assert(
        fc.property(invalidVariableNameStartingWithDigit, (name) => {
          expect(EnvFileParser.isValidVariableName(name)).toBe(false);
        }),
        { numRuns: 100 },
      );
    });

    it('should handle empty content', () => {
      expect(EnvFileParser.parse('')).toEqual({});
    });

    it('should handle content with only comments and blank lines', () => {
      fc.assert(
        fc.property(
          fc.array(fc.oneof(commentLine, blankLine), { minLength: 1, maxLength: 10 }),
          (lines) => {
            const content = lines.join('\n');
            const result = EnvFileParser.parse(content);

            expect(Object.keys(result)).toHaveLength(0);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should handle both \\n and \\r\\n line endings', () => {
      fc.assert(
        fc.property(
          fc.array(validKeyValuePair, { minLength: 2, maxLength: 5 }),
          fc.constantFrom('\n', '\r\n'),
          (pairs, lineEnding) => {
            // Ensure unique keys
            const uniquePairs = pairs.reduce(
              (acc, [key, value]) => {
                acc[key] = value;
                return acc;
              },
              {} as Record<string, string>,
            );

            const content = Object.entries(uniquePairs)
              .map(([k, v]) => `${k}=${v}`)
              .join(lineEnding);

            const result = EnvFileParser.parse(content);

            expect(Object.keys(result).length).toBe(Object.keys(uniquePairs).length);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  describe('Round-trip property (serialize then parse)', () => {
    it('should round-trip valid configurations', () => {
      fc.assert(
        fc.property(
          fc.array(validKeyValuePair, { minLength: 0, maxLength: 10 }),
          (pairs) => {
            // Create unique key-value map
            const original = pairs.reduce(
              (acc, [key, value]) => {
                acc[key] = value;
                return acc;
              },
              {} as Record<string, string>,
            );

            const serialized = EnvFileParser.serialize(original);
            const parsed = EnvFileParser.parse(serialized);

            // Round-trip should preserve all key-value pairs
            expect(parsed).toEqual(original);
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});
