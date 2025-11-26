/**
 * Parser for AWS ECS-compatible environment files.
 *
 * Format rules (per AWS ECS documentation):
 * - Lines beginning with # are comments and ignored
 * - Blank lines are ignored
 * - Format: VARIABLE=VALUE (no spaces around =)
 * - Variable names must match /^[a-zA-Z_][a-zA-Z0-9_]*$/
 * - Values are literal (no quote processing, no interpolation)
 * - One variable per line
 * - Lines without = are ignored
 * - Maximum line length: 32KB
 *
 * @see https://docs.aws.amazon.com/AmazonECS/latest/developerguide/use-environment-file.html
 */
export class EnvFileParser {
  /** Maximum line length per AWS ECS specification */
  private static readonly MAX_LINE_LENGTH = 32 * 1024; // 32KB

  /** Valid variable name pattern: alphanumeric + underscore, cannot start with digit */
  private static readonly VARIABLE_NAME_PATTERN = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

  /**
   * Parse environment file content into key-value pairs.
   * @param content The raw content of the environment file
   * @returns Record of environment variable names to values
   */
  static parse(content: string): Record<string, string> {
    const result: Record<string, string> = {};

    // Handle empty content
    if (!content) {
      return result;
    }

    const lines = content.split(/\r?\n/);

    for (const line of lines) {
      // Skip lines exceeding max length
      if (line.length > this.MAX_LINE_LENGTH) {
        continue;
      }

      // Skip blank lines
      if (line.trim() === '') {
        continue;
      }

      // Skip comment lines (lines starting with # after optional whitespace)
      if (line.trimStart().startsWith('#')) {
        continue;
      }

      // Find the first = sign
      const equalsIndex = line.indexOf('=');
      if (equalsIndex === -1) {
        // Lines without = are ignored
        continue;
      }

      const key = line.substring(0, equalsIndex);
      const value = line.substring(equalsIndex + 1);

      // Validate variable name (must not be empty and must match pattern)
      if (key.length === 0 || !this.VARIABLE_NAME_PATTERN.test(key)) {
        continue;
      }

      result[key] = value;
    }

    return result;
  }

  /**
   * Check if a variable name is valid per AWS ECS format.
   * Variable names must:
   * - Start with a letter (a-z, A-Z) or underscore (_)
   * - Contain only alphanumeric characters and underscores
   * - Not be empty
   *
   * @param name The variable name to check
   * @returns true if the name is valid
   */
  static isValidVariableName(name: string): boolean {
    if (!name || name.length === 0) {
      return false;
    }
    return this.VARIABLE_NAME_PATTERN.test(name);
  }

  /**
   * Serialize a configuration object to AWS ECS-compatible env file format.
   * @param config The configuration object to serialize
   * @returns The serialized env file content
   */
  static serialize(config: Record<string, string>): string {
    const lines: string[] = [];

    for (const [key, value] of Object.entries(config)) {
      // Only include valid variable names
      if (this.isValidVariableName(key)) {
        lines.push(`${key}=${value}`);
      }
    }

    return lines.join('\n');
  }
}
