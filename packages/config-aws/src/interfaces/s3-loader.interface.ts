/**
 * Configuration options for S3Loader
 */
export interface S3LoaderConfig {
  /** S3 bucket name */
  bucket: string;
  /** S3 object key */
  key: string;
  /** AWS region. If not specified, uses default region from environment */
  region?: string;
  /** Format of the configuration file. Default: 'auto' (auto-detect based on content) */
  format?: 'json' | 'env' | 'auto';
}
