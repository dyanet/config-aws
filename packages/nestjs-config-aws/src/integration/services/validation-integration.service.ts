import { Injectable, Logger } from '@nestjs/common';
import { ConfigFactory } from '@nestjs/config';
import { ConfigurationSource } from '../interfaces/configuration-source.interface';

/**
 * Interface for validation schema providers.
 */
export interface ValidationSchemaProvider {
  name: string;
  validate(config: any, schema: any): { isValid: boolean; errors: string[] };
  isAvailable(): boolean;
}

/**
 * Joi validation schema provider.
 */
export class JoiValidationProvider implements ValidationSchemaProvider {
  name = 'joi';
  private joi: any;

  constructor() {
    try {
      // Try to import Joi dynamically
      this.joi = require('joi');
    } catch {
      // Joi is not available
      this.joi = null;
    }
  }

  isAvailable(): boolean {
    return this.joi !== null;
  }

  validate(config: any, schema: any): { isValid: boolean; errors: string[] } {
    if (!this.joi) {
      return { isValid: false, errors: ['Joi is not available'] };
    }

    try {
      const { error } = this.joi.attempt ? 
        { error: null } :
        schema.validate(config);

      if (error) {
        const errors = error.details?.map((detail: any) => detail.message) || [error.message];
        return { isValid: false, errors };
      }

      return { isValid: true, errors: [] };
    } catch (error) {
      const validationError = error instanceof Error ? error : new Error(String(error));
      return { isValid: false, errors: [validationError.message] };
    }
  }
}

/**
 * Class-validator validation schema provider.
 */
export class ClassValidatorProvider implements ValidationSchemaProvider {
  name = 'class-validator';
  private classValidator: any;
  private classTransformer: any;

  constructor() {
    try {
      // Try to import class-validator and class-transformer dynamically
      this.classValidator = require('class-validator');
      this.classTransformer = require('class-transformer');
    } catch {
      // class-validator is not available
      this.classValidator = null;
      this.classTransformer = null;
    }
  }

  isAvailable(): boolean {
    return this.classValidator !== null && this.classTransformer !== null;
  }

  validate(config: any, schemaClass: any): { isValid: boolean; errors: string[] } {
    if (!this.classValidator || !this.classTransformer) {
      return { isValid: false, errors: ['class-validator or class-transformer is not available'] };
    }

    try {
      // Transform plain object to class instance
      const instance = this.classTransformer.plainToClass(schemaClass, config);
      
      // Validate the instance
      const errors = this.classValidator.validateSync(instance);
      
      if (errors && errors.length > 0) {
        const errorMessages = errors.map((error: any) => {
          const constraints = error.constraints || {};
          return Object.values(constraints).join(', ');
        }).filter((msg: string) => msg.length > 0);

        return { isValid: false, errors: errorMessages };
      }

      return { isValid: true, errors: [] };
    } catch (error) {
      const validationError = error instanceof Error ? error : new Error(String(error));
      return { isValid: false, errors: [validationError.message] };
    }
  }
}

/**
 * Custom validation function provider.
 */
export class CustomValidationProvider implements ValidationSchemaProvider {
  name = 'custom';

  isAvailable(): boolean {
    return true;
  }

  validate(config: any, validationFn: (config: any) => string[] | void): { isValid: boolean; errors: string[] } {
    try {
      const result = validationFn(config);
      
      if (Array.isArray(result) && result.length > 0) {
        return { isValid: false, errors: result };
      }

      return { isValid: true, errors: [] };
    } catch (error) {
      const validationError = error instanceof Error ? error : new Error(String(error));
      return { isValid: false, errors: [validationError.message] };
    }
  }
}

/**
 * Service for integrating AWS-sourced configuration with @nestjs/config validation.
 * Supports Joi, class-validator, and custom validation functions.
 */
@Injectable()
export class ValidationIntegrationService {
  private readonly logger = new Logger(ValidationIntegrationService.name);
  private readonly validationProviders: Map<string, ValidationSchemaProvider> = new Map();

  constructor() {
    // Register available validation providers
    this.registerValidationProviders();
  }

  /**
   * Create a validated configuration factory.
   * This factory will validate AWS-sourced configuration before returning it.
   * 
   * @param namespace - Optional namespace for the configuration
   * @param config - Configuration data to validate
   * @param validationSchema - Validation schema (Joi schema, class-validator class, or custom function)
   * @param validationType - Type of validation ('joi', 'class-validator', or 'custom')
   * @param sources - Configuration sources metadata
   * @returns Validated configuration factory
   */
  createValidatedFactory(
    namespace: string | undefined,
    config: Record<string, any>,
    validationSchema: any,
    validationType: 'joi' | 'class-validator' | 'custom',
    sources?: ConfigurationSource[]
  ): ConfigFactory {
    this.logger.debug(`Creating validated factory for namespace: ${namespace || 'default'} with ${validationType} validation`);

    const factory = () => {
      this.logger.debug(`Validated factory called for namespace: ${namespace || 'default'}`);

      // Validate configuration
      const validationResult = this.validateConfiguration(config, validationSchema, validationType, sources);

      if (!validationResult.isValid) {
        const errorMessage = `Configuration validation failed for ${namespace || 'default'}: ${validationResult.errors.join(', ')}`;
        this.logger.error(errorMessage);
        
        // Create detailed error with source information
        const detailedError = this.createValidationError(
          namespace || 'default',
          validationResult.errors,
          sources
        );
        
        throw detailedError;
      }

      this.logger.debug(`Configuration validation passed for namespace: ${namespace || 'default'}`);
      return config;
    };

    // Add validation metadata
    (factory as any).__isValidatedFactory = true;
    (factory as any).__validationType = validationType;
    (factory as any).__namespace = namespace;
    (factory as any).__sources = sources?.map(s => s.name) || [];

    return factory;
  }

  /**
   * Validate configuration using the specified validation type and schema.
   * 
   * @param config - Configuration to validate
   * @param schema - Validation schema
   * @param validationType - Type of validation
   * @param sources - Configuration sources for error reporting
   * @returns Validation result
   */
  validateConfiguration(
    config: Record<string, any>,
    schema: any,
    validationType: 'joi' | 'class-validator' | 'custom',
    sources?: ConfigurationSource[]
  ): { isValid: boolean; errors: string[]; warnings: string[] } {
    const provider = this.validationProviders.get(validationType);
    
    if (!provider) {
      return {
        isValid: false,
        errors: [`Validation provider '${validationType}' is not available`],
        warnings: []
      };
    }

    if (!provider.isAvailable()) {
      return {
        isValid: false,
        errors: [`Validation provider '${validationType}' is not properly configured`],
        warnings: []
      };
    }

    try {
      const result = provider.validate(config, schema);
      
      // Add source information to errors
      const enhancedErrors = result.errors.map(error => 
        this.enhanceErrorWithSourceInfo(error, sources)
      );

      return {
        isValid: result.isValid,
        errors: enhancedErrors,
        warnings: []
      };
    } catch (error) {
      const validationError = error instanceof Error ? error : new Error(String(error));
      return {
        isValid: false,
        errors: [validationError.message],
        warnings: []
      };
    }
  }

  /**
   * Create a factory that validates configuration and provides fallback values.
   * 
   * @param namespace - Optional namespace
   * @param config - Configuration data
   * @param validationSchema - Validation schema
   * @param validationType - Type of validation
   * @param fallbackConfig - Fallback configuration to use if validation fails
   * @param sources - Configuration sources
   * @returns Factory with validation and fallback
   */
  createValidatedFactoryWithFallback(
    namespace: string | undefined,
    config: Record<string, any>,
    validationSchema: any,
    validationType: 'joi' | 'class-validator' | 'custom',
    fallbackConfig: Record<string, any>,
    sources?: ConfigurationSource[]
  ): ConfigFactory {
    this.logger.debug(`Creating validated factory with fallback for namespace: ${namespace || 'default'}`);

    const factory = () => {
      this.logger.debug(`Validated factory with fallback called for namespace: ${namespace || 'default'}`);

      // Validate configuration
      const validationResult = this.validateConfiguration(config, validationSchema, validationType, sources);

      if (!validationResult.isValid) {
        this.logger.warn(`Configuration validation failed for ${namespace || 'default'}, using fallback: ${validationResult.errors.join(', ')}`);
        
        // Validate fallback configuration
        const fallbackValidation = this.validateConfiguration(fallbackConfig, validationSchema, validationType);
        
        if (fallbackValidation.isValid) {
          return fallbackConfig;
        } else {
          // Both primary and fallback failed
          const errorMessage = `Both primary and fallback configuration validation failed for ${namespace || 'default'}`;
          this.logger.error(errorMessage);
          
          const detailedError = this.createValidationError(
            namespace || 'default',
            [...validationResult.errors, ...fallbackValidation.errors],
            sources
          );
          
          throw detailedError;
        }
      }

      this.logger.debug(`Configuration validation passed for namespace: ${namespace || 'default'}`);
      return config;
    };

    // Add metadata
    (factory as any).__isValidatedFactory = true;
    (factory as any).__hasFallback = true;
    (factory as any).__validationType = validationType;
    (factory as any).__namespace = namespace;
    (factory as any).__sources = sources?.map(s => s.name) || [];

    return factory;
  }

  /**
   * Validate multiple namespace configurations.
   * 
   * @param namespacedConfig - Configuration organized by namespace
   * @param validationSchemas - Validation schemas for each namespace
   * @param validationType - Type of validation
   * @param sources - Configuration sources
   * @returns Validation results for each namespace
   */
  validateNamespacedConfiguration(
    namespacedConfig: Record<string, Record<string, any>>,
    validationSchemas: Record<string, any>,
    validationType: 'joi' | 'class-validator' | 'custom',
    sources?: ConfigurationSource[]
  ): Record<string, { isValid: boolean; errors: string[]; warnings: string[] }> {
    const results: Record<string, { isValid: boolean; errors: string[]; warnings: string[] }> = {};

    for (const [namespace, config] of Object.entries(namespacedConfig)) {
      const schema = validationSchemas[namespace];
      
      if (schema) {
        results[namespace] = this.validateConfiguration(config, schema, validationType, sources);
      } else {
        results[namespace] = {
          isValid: true,
          errors: [],
          warnings: [`No validation schema provided for namespace: ${namespace}`]
        };
      }
    }

    return results;
  }

  /**
   * Check which validation providers are available.
   * 
   * @returns Object indicating availability of each provider
   */
  getAvailableValidationProviders(): Record<string, boolean> {
    const availability: Record<string, boolean> = {};
    
    for (const [name, provider] of this.validationProviders) {
      availability[name] = provider.isAvailable();
    }

    return availability;
  }

  /**
   * Get validation recommendations based on configuration structure.
   * 
   * @param config - Configuration to analyze
   * @returns Validation recommendations
   */
  getValidationRecommendations(config: Record<string, any>): {
    recommendedProvider: string;
    reasons: string[];
    examples: Record<string, string>;
  } {
    const analysis = this.analyzeConfigurationStructure(config);
    
    let recommendedProvider = 'custom';
    const reasons: string[] = [];
    const examples: Record<string, string> = {};

    // Determine best validation approach
    if (analysis.hasComplexNesting || analysis.hasArrays) {
      if (this.validationProviders.get('joi')?.isAvailable()) {
        recommendedProvider = 'joi';
        reasons.push('Complex nested structure detected - Joi provides excellent nested validation');
        examples['joi'] = this.generateJoiExample(config);
      }
    }

    if (analysis.hasTypedValues && this.validationProviders.get('class-validator')?.isAvailable()) {
      recommendedProvider = 'class-validator';
      reasons.push('Typed values detected - class-validator provides strong type safety');
      examples['class-validator'] = this.generateClassValidatorExample(config);
    }

    // Always provide custom example
    examples['custom'] = this.generateCustomValidationExample(config);

    return {
      recommendedProvider,
      reasons,
      examples
    };
  }

  /**
   * Register validation providers.
   */
  private registerValidationProviders(): void {
    this.validationProviders.set('joi', new JoiValidationProvider());
    this.validationProviders.set('class-validator', new ClassValidatorProvider());
    this.validationProviders.set('custom', new CustomValidationProvider());

    // Log available providers
    const available = Array.from(this.validationProviders.entries())
      .filter(([_, provider]) => provider.isAvailable())
      .map(([name]) => name);

    this.logger.debug(`Available validation providers: ${available.join(', ')}`);
  }

  /**
   * Create a detailed validation error with source information.
   * 
   * @param namespace - Namespace that failed validation
   * @param errors - Validation errors
   * @param sources - Configuration sources
   * @returns Detailed error
   */
  private createValidationError(
    namespace: string,
    errors: string[],
    sources?: ConfigurationSource[]
  ): Error {
    let message = `Configuration validation failed for namespace '${namespace}':\n`;
    message += errors.map(error => `  - ${error}`).join('\n');

    if (sources && sources.length > 0) {
      message += '\n\nConfiguration sources:\n';
      message += sources.map(source => 
        `  - ${source.name} (${source.type}): ${Object.keys(source.data).length} keys`
      ).join('\n');
    }

    const error = new Error(message);
    error.name = 'ConfigurationValidationError';
    (error as any).namespace = namespace;
    (error as any).validationErrors = errors;
    (error as any).sources = sources;

    return error;
  }

  /**
   * Enhance error message with source information.
   * 
   * @param error - Original error message
   * @param sources - Configuration sources
   * @returns Enhanced error message
   */
  private enhanceErrorWithSourceInfo(error: string, sources?: ConfigurationSource[]): string {
    if (!sources || sources.length === 0) {
      return error;
    }

    const sourceNames = sources.map(s => s.name).join(', ');
    return `${error} (from sources: ${sourceNames})`;
  }

  /**
   * Analyze configuration structure for validation recommendations.
   * 
   * @param config - Configuration to analyze
   * @returns Structure analysis
   */
  private analyzeConfigurationStructure(config: Record<string, any>): {
    hasComplexNesting: boolean;
    hasArrays: boolean;
    hasTypedValues: boolean;
    depth: number;
  } {
    let hasComplexNesting = false;
    let hasArrays = false;
    let hasTypedValues = false;
    let maxDepth = 0;

    const analyze = (obj: any, depth: number = 0): void => {
      maxDepth = Math.max(maxDepth, depth);

      if (depth > 2) {
        hasComplexNesting = true;
      }

      for (const value of Object.values(obj)) {
        if (Array.isArray(value)) {
          hasArrays = true;
        } else if (typeof value === 'object' && value !== null) {
          analyze(value, depth + 1);
        } else if (typeof value === 'number' || typeof value === 'boolean') {
          hasTypedValues = true;
        }
      }
    };

    analyze(config);

    return {
      hasComplexNesting,
      hasArrays,
      hasTypedValues,
      depth: maxDepth
    };
  }

  /**
   * Generate Joi validation example.
   * 
   * @param config - Configuration to generate example for
   * @returns Joi validation example
   */
  private generateJoiExample(config: Record<string, any>): string {
    const schema = this.generateJoiSchemaFromConfig(config);
    return `const Joi = require('joi');

const schema = ${schema};

// Usage in factory
const factory = () => {
  const config = loadAwsConfig();
  const { error, value } = schema.validate(config);
  if (error) throw error;
  return value;
};`;
  }

  /**
   * Generate class-validator example.
   * 
   * @param config - Configuration to generate example for
   * @returns class-validator example
   */
  private generateClassValidatorExample(config: Record<string, any>): string {
    const classDefinition = this.generateClassFromConfig(config);
    return `import { IsString, IsNumber, IsOptional, validateSync } from 'class-validator';
import { plainToClass } from 'class-transformer';

${classDefinition}

// Usage in factory
const factory = () => {
  const config = loadAwsConfig();
  const instance = plainToClass(ConfigClass, config);
  const errors = validateSync(instance);
  if (errors.length > 0) throw new Error('Validation failed');
  return config;
};`;
  }

  /**
   * Generate custom validation example.
   * 
   * @param config - Configuration to generate example for
   * @returns Custom validation example
   */
  private generateCustomValidationExample(config: Record<string, any>): string {
    const validationChecks = this.generateValidationChecks(config);
    return `const validateConfig = (config) => {
  const errors = [];
  
${validationChecks}
  
  return errors;
};

// Usage in factory
const factory = () => {
  const config = loadAwsConfig();
  const errors = validateConfig(config);
  if (errors.length > 0) throw new Error(\`Validation failed: \${errors.join(', ')}\`);
  return config;
};`;
  }

  /**
   * Generate Joi schema from configuration structure.
   * 
   * @param config - Configuration object
   * @returns Joi schema string
   */
  private generateJoiSchemaFromConfig(config: Record<string, any>): string {
    const generateSchema = (obj: any): string => {
      if (typeof obj === 'string') return 'Joi.string()';
      if (typeof obj === 'number') return 'Joi.number()';
      if (typeof obj === 'boolean') return 'Joi.boolean()';
      if (Array.isArray(obj)) return 'Joi.array()';
      
      if (typeof obj === 'object' && obj !== null) {
        const properties = Object.entries(obj)
          .map(([key, value]) => `  ${key}: ${generateSchema(value)}`)
          .join(',\n');
        return `Joi.object({\n${properties}\n})`;
      }
      
      return 'Joi.any()';
    };

    return generateSchema(config);
  }

  /**
   * Generate class definition from configuration structure.
   * 
   * @param config - Configuration object
   * @returns Class definition string
   */
  private generateClassFromConfig(config: Record<string, any>): string {
    const properties = Object.entries(config)
      .map(([key, value]) => {
        const decorator = this.getClassValidatorDecorator(value);
        return `  ${decorator}\n  ${key}: ${this.getTypeScriptType(value)};`;
      })
      .join('\n\n');

    return `class ConfigClass {\n${properties}\n}`;
  }

  /**
   * Generate validation checks for custom validation.
   * 
   * @param config - Configuration object
   * @returns Validation checks string
   */
  private generateValidationChecks(config: Record<string, any>): string {
    return Object.entries(config)
      .map(([key, value]) => {
        const check = this.getValidationCheck(key, value);
        return `  ${check}`;
      })
      .join('\n');
  }

  /**
   * Get class-validator decorator for a value.
   * 
   * @param value - Value to get decorator for
   * @returns Decorator string
   */
  private getClassValidatorDecorator(value: any): string {
    if (typeof value === 'string') return '@IsString()';
    if (typeof value === 'number') return '@IsNumber()';
    if (typeof value === 'boolean') return '@IsBoolean()';
    return '@IsOptional()';
  }

  /**
   * Get TypeScript type for a value.
   * 
   * @param value - Value to get type for
   * @returns TypeScript type string
   */
  private getTypeScriptType(value: any): string {
    if (typeof value === 'string') return 'string';
    if (typeof value === 'number') return 'number';
    if (typeof value === 'boolean') return 'boolean';
    if (Array.isArray(value)) return 'any[]';
    if (typeof value === 'object') return 'object';
    return 'any';
  }

  /**
   * Get validation check for custom validation.
   * 
   * @param key - Configuration key
   * @param value - Configuration value
   * @returns Validation check string
   */
  private getValidationCheck(key: string, value: any): string {
    if (typeof value === 'string') {
      return `if (!config.${key} || typeof config.${key} !== 'string') errors.push('${key} must be a string');`;
    }
    if (typeof value === 'number') {
      return `if (config.${key} === undefined || typeof config.${key} !== 'number') errors.push('${key} must be a number');`;
    }
    if (typeof value === 'boolean') {
      return `if (config.${key} === undefined || typeof config.${key} !== 'boolean') errors.push('${key} must be a boolean');`;
    }
    return `if (config.${key} === undefined) errors.push('${key} is required');`;
  }
}