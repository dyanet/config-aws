import type { ZodType, ZodError, TypeOf } from 'zod';
import { ValidationError } from '../errors';

/**
 * Framework-agnostic validation utility for configuration values.
 * Provides methods for validating configuration objects against Zod schemas.
 */
export class ConfigValidationUtil {
  /**
   * Validates a value against a Zod schema.
   * @param schema The Zod schema to validate against
   * @param value The value to validate
   * @param context Optional context for error messages
   * @returns The validated and transformed value
   * @throws ValidationError if validation fails
   */
  static validate<T extends ZodType>(
    schema: T,
    value: unknown,
    context?: string,
  ): TypeOf<T> {
    const result = schema.safeParse(value);

    if (result.success) {
      return result.data;
    }

    const errors = this.formatValidationErrors(result.error);
    const contextMessage = context
      ? `Configuration validation failed for ${context}`
      : 'Configuration validation failed';

    throw new ValidationError(contextMessage, errors);
  }

  /**
   * Safely validates a value against a Zod schema without throwing.
   * @param schema The Zod schema to validate against
   * @param value The value to validate
   * @returns Object with success flag and either data or error
   */
  static safeValidate<T extends ZodType>(
    schema: T,
    value: unknown,
  ): { success: true; data: TypeOf<T> } | { success: false; error: ValidationError } {
    const result = schema.safeParse(value);

    if (result.success) {
      return { success: true, data: result.data };
    }

    const errors = this.formatValidationErrors(result.error);
    const validationError = new ValidationError('Configuration validation failed', errors);

    return { success: false, error: validationError };
  }

  /**
   * Formats Zod validation errors into a structured format.
   * @param error The ZodError to format
   * @returns Formatted error object or string
   */
  static formatValidationErrors(error: ZodError): unknown {
    // If there's only one error at the root level, return just the message
    if (error.issues.length === 1) {
      const issue = error.issues[0];
      if (issue && Array.isArray(issue.path) && issue.path.length === 0) {
        return issue.message;
      }
    }

    // For multiple errors or nested paths, create a structured object
    return error.issues.reduce(
      (errors, issue) => {
        const path = issue.path.join('.');
        const key = path || 'root';

        if (!errors[key]) {
          errors[key] = [];
        }

        errors[key].push({
          message: issue.message,
          code: issue.code,
          path: issue.path,
        });

        return errors;
      },
      {} as Record<string, Array<{ message: string; code: string; path: (string | number)[] }>>,
    );
  }

  /**
   * Creates a detailed error message for configuration validation failures.
   * @param error The ZodError to create a message for
   * @param context Optional context for the error
   * @returns Detailed error message string
   */
  static createDetailedErrorMessage(error: ZodError, context?: string): string {
    const contextPrefix = context ? `${context}: ` : '';

    if (error.issues.length === 1) {
      const issue = error.issues[0];
      if (issue) {
        const pathStr = issue.path.length > 0 ? ` at '${issue.path.join('.')}'` : '';
        return `${contextPrefix}${issue.message}${pathStr}`;
      }
    }

    const errorMessages = error.issues.map((issue) => {
      const pathStr = issue.path.length > 0 ? ` at '${issue.path.join('.')}'` : '';
      return `  - ${issue.message}${pathStr}`;
    });

    return `${contextPrefix}Multiple validation errors:\n${errorMessages.join('\n')}`;
  }

  /**
   * Validates configuration with enhanced error context.
   * @param schema The Zod schema to validate against
   * @param value The configuration object to validate
   * @param source The source of the configuration (e.g., 'environment', 'secrets-manager')
   * @returns The validated configuration
   * @throws ValidationError with enhanced context
   */
  static validateConfiguration<T extends ZodType>(
    schema: T,
    value: unknown,
    source: string,
  ): TypeOf<T> {
    try {
      return this.validate(schema, value, `${source} configuration`);
    } catch (error) {
      if (error instanceof ValidationError) {
        // Enhance the error with source information
        const enhancedMessage = `Configuration validation failed for source '${source}': ${error.message}`;
        throw new ValidationError(enhancedMessage, error.validationErrors);
      }
      throw error;
    }
  }
}
