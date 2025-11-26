/**
 * Property-based tests for S3Loader format detection.
 *
 * **Feature: package-extraction, Property 6: S3 Content Format Detection**
 * **Validates: Requirements 1.9**
 */

import * as fc from 'fast-check';
import { S3Loader } from './s3.loader';

// Create a testable subclass to access protected methods
class TestableS3Loader extends S3Loader {
  public testDetectFormat(content: string): 'json' | 'env' {
    return this.detectFormat(content);
  }

  public testParseContent(content: string): Record<string, unknown> {
    return this.parseContent(content);
  }
}

/**
 * Arbitrary for generating valid JSON objects
 */
const jsonObject = fc.dictionary(
  fc.string({ minLength: 1, maxLength: 20 }).filter((s) => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(s)),
  fc.oneof(fc.string(), fc.integer(), fc.boolean(), fc.constant(null)),
  { minKeys: 0, maxKeys: 10 },
);

/**
 * Arbitrary for generating valid env file content
 */
const validEnvVarName = fc
  .tuple(
    fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZ_'.split('')),
    fc.stringOf(fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_'.split('')), { minLength: 0, maxLength: 20 }),
  )
  .map(([first, rest]) => first + rest);

const envValue = fc.string({ minLength: 0, maxLength: 100 }).filter((s) => !s.includes('\n') && !s.includes('\r'));

const envFileContent = fc
  .array(fc.tuple(validEnvVarName, envValue), { minLength: 1, maxLength: 10 })
  .map((pairs) => pairs.map(([k, v]) => `${k}=${v}`).join('\n'));

/**
 * Arbitrary for whitespace that can appear before content
 */
const leadingWhitespace = fc.stringOf(fc.constantFrom(' ', '\t', '\n', '\r'), { minLength: 0, maxLength: 5 });

describe('S3Loader Property Tests', () => {
  let loader: TestableS3Loader;

  beforeEach(() => {
    loader = new TestableS3Loader({
      bucket: 'test-bucket',
      key: 'test-key',
    });
  });


  /**
   * **Feature: package-extraction, Property 6: S3 Content Format Detection**
   * **Validates: Requirements 1.9**
   */
  describe('Property 6: S3 Content Format Detection', () => {
    it('should detect JSON format when content starts with {', () => {
      fc.assert(
        fc.property(jsonObject, leadingWhitespace, (obj, whitespace) => {
          const jsonContent = whitespace + JSON.stringify(obj);
          const format = loader.testDetectFormat(jsonContent);
          expect(format).toBe('json');
        }),
        { numRuns: 100 },
      );
    });

    it('should detect env format when content does not start with {', () => {
      fc.assert(
        fc.property(envFileContent, (content) => {
          // Ensure content doesn't start with { after trimming
          if (content.trim().startsWith('{')) {
            return; // Skip this case
          }
          const format = loader.testDetectFormat(content);
          expect(format).toBe('env');
        }),
        { numRuns: 100 },
      );
    });

    it('should correctly parse detected JSON content', () => {
      fc.assert(
        fc.property(jsonObject, (obj) => {
          const jsonContent = JSON.stringify(obj);
          const parsed = loader.testParseContent(jsonContent);
          expect(parsed).toEqual(obj);
        }),
        { numRuns: 100 },
      );
    });

    it('should correctly parse detected env content', () => {
      fc.assert(
        fc.property(
          fc.array(fc.tuple(validEnvVarName, envValue), { minLength: 1, maxLength: 5 }),
          (pairs) => {
            // Create unique key-value map
            const expected: Record<string, string> = {};
            for (const [key, value] of pairs) {
              expected[key] = value;
            }

            const content = Object.entries(expected)
              .map(([k, v]) => `${k}=${v}`)
              .join('\n');

            const parsed = loader.testParseContent(content);
            expect(parsed).toEqual(expected);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('should handle JSON with leading whitespace', () => {
      fc.assert(
        fc.property(jsonObject, leadingWhitespace, (obj, whitespace) => {
          const content = whitespace + JSON.stringify(obj);
          const format = loader.testDetectFormat(content);
          expect(format).toBe('json');
        }),
        { numRuns: 100 },
      );
    });

    it('should handle env content with comments', () => {
      fc.assert(
        fc.property(validEnvVarName, envValue, (key, value) => {
          const content = `# Comment line\n${key}=${value}\n# Another comment`;
          const parsed = loader.testParseContent(content);
          expect(parsed[key]).toBe(value);
          expect(Object.keys(parsed)).toHaveLength(1);
        }),
        { numRuns: 100 },
      );
    });
  });

  describe('Loader metadata', () => {
    it('should return correct loader name with S3 path', () => {
      const customLoader = new TestableS3Loader({
        bucket: 'my-bucket',
        key: 'config/app.json',
      });
      expect(customLoader.getName()).toBe('S3Loader(s3://my-bucket/config/app.json)');
    });
  });
});
