import * as fs from 'fs';
import * as path from 'path';
import type { ConfigLoader } from '../interfaces/config-loader.interface';
import type { EnvFileLoaderConfig } from '../interfaces/env-file-loader.interface';
import { EnvFileParser } from '../utils/env-file-parser.util';
import { ConfigurationLoadError } from '../errors/index.js';

/**
 * Loader that reads configuration from .env files on the filesystem.
 * Uses AWS ECS-compatible format for parsing.
 *
 * @example
 * ```typescript
 * // Load from default paths (.env, .env.local)
 * const loader = new EnvFileLoader();
 *
 * // Load from specific paths
 * const loader = new EnvFileLoader({
 *   paths: ['.env', '.env.production']
 * });
 *
 * // Disable override (first file wins)
 * const loader = new EnvFileLoader({
 *   paths: ['.env', '.env.local'],
 *   override: false
 * });
 * ```
 *
 * @see https://docs.aws.amazon.com/AmazonECS/latest/developerguide/use-environment-file.html
 */
export class EnvFileLoader implements ConfigLoader {
  /** @internal */
  protected readonly _config: Required<EnvFileLoaderConfig>;

  /** Default paths to search for .env files */
  private static readonly DEFAULT_PATHS = ['.env', '.env.local'];

  /** Default file encoding */
  private static readonly DEFAULT_ENCODING: BufferEncoding = 'utf-8';

  constructor(config: EnvFileLoaderConfig = {}) {
    this._config = {
      paths: config.paths ?? EnvFileLoader.DEFAULT_PATHS,
      encoding: config.encoding ?? EnvFileLoader.DEFAULT_ENCODING,
      override: config.override ?? true,
    };
  }

  getName(): string {
    return 'EnvFileLoader';
  }


  /**
   * Check if at least one of the configured .env files exists.
   * @returns Promise resolving to true if any file exists
   */
  async isAvailable(): Promise<boolean> {
    for (const filePath of this._config.paths) {
      const resolvedPath = this.resolvePath(filePath);
      if (await this.fileExists(resolvedPath)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Load configuration from .env files.
   *
   * Files are processed in order. When override is true (default),
   * later files override earlier ones. When override is false,
   * earlier files take precedence.
   *
   * Missing files are silently skipped.
   *
   * @returns Promise resolving to the merged configuration
   * @throws ConfigurationLoadError if a file exists but cannot be read
   */
  async load(): Promise<Record<string, unknown>> {
    const result: Record<string, unknown> = {};

    for (const filePath of this._config.paths) {
      const resolvedPath = this.resolvePath(filePath);

      if (!(await this.fileExists(resolvedPath))) {
        // Skip missing files silently
        continue;
      }

      try {
        const content = await this.readFile(resolvedPath);
        const parsed = EnvFileParser.parse(content);

        // Merge based on override setting
        if (this._config.override) {
          // Later files override earlier ones
          Object.assign(result, parsed);
        } else {
          // Earlier files take precedence - only add keys that don't exist
          for (const [key, value] of Object.entries(parsed)) {
            if (!(key in result)) {
              result[key] = value;
            }
          }
        }
      } catch (error) {
        throw new ConfigurationLoadError(
          `Failed to read env file: ${resolvedPath}`,
          this.getName(),
          error instanceof Error ? error : undefined,
        );
      }
    }

    return result;
  }

  /**
   * Resolve a file path relative to the current working directory.
   * @internal
   */
  protected resolvePath(filePath: string): string {
    if (path.isAbsolute(filePath)) {
      return filePath;
    }
    return path.resolve(process.cwd(), filePath);
  }

  /**
   * Check if a file exists.
   * @internal
   */
  protected async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.promises.access(filePath, fs.constants.R_OK);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Read a file's contents.
   * @internal
   */
  protected async readFile(filePath: string): Promise<string> {
    return fs.promises.readFile(filePath, { encoding: this._config.encoding });
  }
}
