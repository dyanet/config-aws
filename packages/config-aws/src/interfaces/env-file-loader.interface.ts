/**
 * Configuration options for EnvFileLoader
 */
export interface EnvFileLoaderConfig {
  /** Paths to .env files to load. Default: ['.env', '.env.local'] */
  paths?: string[];
  /** File encoding. Default: 'utf-8' */
  encoding?: BufferEncoding;
  /** Whether later files override earlier ones. Default: true */
  override?: boolean;
}
