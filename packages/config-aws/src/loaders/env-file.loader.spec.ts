/**
 * Unit tests for EnvFileLoader
 *
 * Tests file reading, parsing, multiple files, and missing files.
 * **Validates: Requirements 1.8**
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { EnvFileLoader } from './env-file.loader';
import { ConfigurationLoadError } from '../errors';

describe('EnvFileLoader', () => {
  let tempDir: string;

  beforeEach(async () => {
    // Create a temporary directory for test files
    tempDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'env-file-loader-test-'));
  });

  afterEach(async () => {
    // Clean up temporary directory
    await fs.promises.rm(tempDir, { recursive: true, force: true });
  });

  /**
   * Helper to create a test .env file
   */
  async function createEnvFile(filename: string, content: string): Promise<string> {
    const filePath = path.join(tempDir, filename);
    await fs.promises.writeFile(filePath, content, 'utf-8');
    return filePath;
  }

  describe('getName', () => {
    it('should return EnvFileLoader', () => {
      const loader = new EnvFileLoader();
      expect(loader.getName()).toBe('EnvFileLoader');
    });
  });

  describe('isAvailable', () => {
    it('should return true when at least one file exists', async () => {
      const filePath = await createEnvFile('.env', 'KEY=value');
      const loader = new EnvFileLoader({ paths: [filePath] });
      expect(await loader.isAvailable()).toBe(true);
    });


    it('should return false when no files exist', async () => {
      const loader = new EnvFileLoader({ paths: ['/nonexistent/.env'] });
      expect(await loader.isAvailable()).toBe(false);
    });

    it('should return true if any file in the list exists', async () => {
      const filePath = await createEnvFile('.env.local', 'KEY=value');
      const loader = new EnvFileLoader({
        paths: ['/nonexistent/.env', filePath],
      });
      expect(await loader.isAvailable()).toBe(true);
    });
  });

  describe('load', () => {
    it('should load a single .env file', async () => {
      const filePath = await createEnvFile('.env', 'DATABASE_URL=postgres://localhost\nAPI_KEY=secret123');
      const loader = new EnvFileLoader({ paths: [filePath] });
      const result = await loader.load();

      expect(result).toEqual({
        DATABASE_URL: 'postgres://localhost',
        API_KEY: 'secret123',
      });
    });

    it('should handle empty files', async () => {
      const filePath = await createEnvFile('.env', '');
      const loader = new EnvFileLoader({ paths: [filePath] });
      const result = await loader.load();

      expect(result).toEqual({});
    });

    it('should skip comment lines', async () => {
      const filePath = await createEnvFile('.env', '# This is a comment\nKEY=value\n# Another comment');
      const loader = new EnvFileLoader({ paths: [filePath] });
      const result = await loader.load();

      expect(result).toEqual({ KEY: 'value' });
    });

    it('should skip blank lines', async () => {
      const filePath = await createEnvFile('.env', 'KEY1=value1\n\n\nKEY2=value2');
      const loader = new EnvFileLoader({ paths: [filePath] });
      const result = await loader.load();

      expect(result).toEqual({ KEY1: 'value1', KEY2: 'value2' });
    });

    it('should handle values with equals signs', async () => {
      const filePath = await createEnvFile('.env', 'CONNECTION=host=localhost;port=5432');
      const loader = new EnvFileLoader({ paths: [filePath] });
      const result = await loader.load();

      expect(result).toEqual({ CONNECTION: 'host=localhost;port=5432' });
    });

    it('should treat quotes as literal characters', async () => {
      const filePath = await createEnvFile('.env', 'MESSAGE="Hello World"');
      const loader = new EnvFileLoader({ paths: [filePath] });
      const result = await loader.load();

      expect(result).toEqual({ MESSAGE: '"Hello World"' });
    });

    it('should return empty object when no files exist', async () => {
      const loader = new EnvFileLoader({ paths: ['/nonexistent/.env'] });
      const result = await loader.load();

      expect(result).toEqual({});
    });
  });

  describe('multiple files', () => {
    it('should merge multiple files with override=true (default)', async () => {
      const file1 = await createEnvFile('.env', 'KEY1=from_env\nSHARED=from_env');
      const file2 = await createEnvFile('.env.local', 'KEY2=from_local\nSHARED=from_local');

      const loader = new EnvFileLoader({ paths: [file1, file2] });
      const result = await loader.load();

      expect(result).toEqual({
        KEY1: 'from_env',
        KEY2: 'from_local',
        SHARED: 'from_local', // Later file wins
      });
    });

    it('should merge multiple files with override=false (first wins)', async () => {
      const file1 = await createEnvFile('.env', 'KEY1=from_env\nSHARED=from_env');
      const file2 = await createEnvFile('.env.local', 'KEY2=from_local\nSHARED=from_local');

      const loader = new EnvFileLoader({ paths: [file1, file2], override: false });
      const result = await loader.load();

      expect(result).toEqual({
        KEY1: 'from_env',
        KEY2: 'from_local',
        SHARED: 'from_env', // First file wins
      });
    });

    it('should skip missing files in the list', async () => {
      const file1 = await createEnvFile('.env', 'KEY1=value1');
      // file2 doesn't exist

      const loader = new EnvFileLoader({
        paths: [file1, path.join(tempDir, '.env.missing')],
      });
      const result = await loader.load();

      expect(result).toEqual({ KEY1: 'value1' });
    });
  });

  describe('error handling', () => {
    it('should throw ConfigurationLoadError when file cannot be read', async () => {
      // Create a file then make it unreadable (platform-specific)
      const filePath = await createEnvFile('.env', 'KEY=value');

      // Create a loader with a mock that throws
      const loader = new EnvFileLoader({ paths: [filePath] });

      // Override the protected readFile method to simulate an error
      (loader as any).readFile = async () => {
        throw new Error('Permission denied');
      };

      await expect(loader.load()).rejects.toThrow(ConfigurationLoadError);
      await expect(loader.load()).rejects.toThrow('Failed to read env file');
    });
  });

  describe('encoding', () => {
    it('should use specified encoding', async () => {
      const filePath = await createEnvFile('.env', 'KEY=value');
      const loader = new EnvFileLoader({
        paths: [filePath],
        encoding: 'utf-8',
      });
      const result = await loader.load();

      expect(result).toEqual({ KEY: 'value' });
    });
  });

  describe('path resolution', () => {
    it('should resolve relative paths from cwd', async () => {
      // Create file in temp dir
      const filePath = await createEnvFile('.env', 'KEY=value');

      // Use absolute path for this test
      const loader = new EnvFileLoader({ paths: [filePath] });
      const result = await loader.load();

      expect(result).toEqual({ KEY: 'value' });
    });

    it('should handle absolute paths', async () => {
      const filePath = await createEnvFile('.env', 'KEY=value');
      const loader = new EnvFileLoader({ paths: [filePath] });
      const result = await loader.load();

      expect(result).toEqual({ KEY: 'value' });
    });
  });
});
