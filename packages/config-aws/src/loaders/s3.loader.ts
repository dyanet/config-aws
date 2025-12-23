import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { fromNodeProviderChain } from '@aws-sdk/credential-providers';
import type { ConfigLoader } from '../interfaces/config-loader.interface.js';
import type { S3LoaderConfig } from '../interfaces/s3-loader.interface.js';
import { EnvFileParser } from '../utils/env-file-parser.util.js';
import { AWSServiceError, ConfigurationLoadError } from '../errors/index.js';

/**
 * Loader that reads configuration from S3 buckets.
 * Supports JSON and .env file formats with auto-detection.
 *
 * @example
 * ```typescript
 * // Load JSON config from S3
 * const loader = new S3Loader({
 *   bucket: 'my-config-bucket',
 *   key: 'config/app.json',
 *   format: 'json'
 * });
 *
 * // Load .env file from S3 with auto-detection
 * const loader = new S3Loader({
 *   bucket: 'my-config-bucket',
 *   key: 'config/.env'
 * });
 * ```
 *
 * @see https://docs.aws.amazon.com/AmazonECS/latest/developerguide/use-environment-file.html
 */
export class S3Loader implements ConfigLoader {
  /** @internal */
  protected readonly _config: Required<S3LoaderConfig>;
  /** @internal */
  protected readonly _client: S3Client;

  constructor(config: S3LoaderConfig) {
    this._config = {
      bucket: config.bucket,
      key: config.key,
      region: config.region || process.env['AWS_REGION'] || 'us-east-1',
      format: config.format || 'auto',
    };

    this._client = new S3Client({
      credentials: fromNodeProviderChain(),
      region: this._config.region,
    });
  }

  getName(): string {
    return `S3Loader(s3://${this._config.bucket}/${this._config.key})`;
  }


  /**
   * Check if this loader is available by verifying AWS credentials.
   * @returns Promise resolving to true if AWS credentials are available
   */
  async isAvailable(): Promise<boolean> {
    try {
      await this._client.config.credentials();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Load configuration from S3.
   * @returns Promise resolving to configuration key-value pairs
   * @throws AWSServiceError if S3 operation fails
   * @throws ConfigurationLoadError if content cannot be parsed
   */
  async load(): Promise<Record<string, unknown>> {
    try {
      const command = new GetObjectCommand({
        Bucket: this._config.bucket,
        Key: this._config.key,
      });

      const response = await this._client.send(command);

      if (!response.Body) {
        return {};
      }

      const content = await response.Body.transformToString();

      if (!content || content.trim() === '') {
        return {};
      }

      return this.parseContent(content);
    } catch (error) {
      if (error instanceof ConfigurationLoadError) {
        throw error;
      }

      if (error instanceof Error) {
        if (error.name === 'NoSuchKey' || error.name === 'NoSuchBucket') {
          // Object or bucket doesn't exist - return empty config
          return {};
        }

        if (error.name === 'AccessDenied') {
          throw new AWSServiceError(
            `Access denied when retrieving s3://${this._config.bucket}/${this._config.key}. Check AWS credentials and permissions.`,
            'S3',
            'GetObject',
            error,
          );
        }
      }

      throw new AWSServiceError(
        `Failed to retrieve s3://${this._config.bucket}/${this._config.key}: ${error instanceof Error ? error.message : String(error)}`,
        'S3',
        'GetObject',
        error instanceof Error ? error : undefined,
      );
    }
  }

  /**
   * Parse content based on format setting or auto-detection.
   * @internal
   */
  protected parseContent(content: string): Record<string, unknown> {
    const format = this._config.format === 'auto' ? this.detectFormat(content) : this._config.format;

    if (format === 'json') {
      return this.parseJson(content);
    } else {
      return EnvFileParser.parse(content);
    }
  }

  /**
   * Detect content format based on structure.
   * JSON content starts with '{' after trimming whitespace.
   * @internal
   */
  protected detectFormat(content: string): 'json' | 'env' {
    const trimmed = content.trim();
    if (trimmed.startsWith('{')) {
      return 'json';
    }
    return 'env';
  }

  /**
   * Parse JSON content.
   * @internal
   */
  protected parseJson(content: string): Record<string, unknown> {
    try {
      const parsed = JSON.parse(content);

      if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
        return parsed;
      }

      // If not an object, wrap it
      return { CONFIG_VALUE: parsed };
    } catch (error) {
      throw new ConfigurationLoadError(
        `Failed to parse JSON from s3://${this._config.bucket}/${this._config.key}: ${error instanceof Error ? error.message : String(error)}`,
        this.getName(),
        error instanceof Error ? error : undefined,
      );
    }
  }
}
