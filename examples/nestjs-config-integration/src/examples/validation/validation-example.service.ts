import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Joi from 'joi';

@Injectable()
export class ValidationExampleService {
  constructor(private readonly configService: ConfigService) {}

  getJoiValidationInfo() {
    // Example of how Joi validation works with AWS-sourced configuration
    const schema = Joi.object({
      PORT: Joi.number().port().required(),
      DATABASE_PASSWORD: Joi.string().min(8).required(),
      API_KEY: Joi.string().min(10).required(),
      LOG_LEVEL: Joi.string().valid('error', 'warn', 'info', 'debug').required(),
    });

    const config = {
      PORT: this.configService.get('PORT'),
      DATABASE_PASSWORD: this.configService.get('DATABASE_PASSWORD'),
      API_KEY: this.configService.get('API_KEY'),
      LOG_LEVEL: this.configService.get('LOG_LEVEL'),
    };

    const { error, value } = schema.validate(config, { abortEarly: false });

    return {
      schema: 'Joi validation schema applied',
      config: {
        PORT: config.PORT,
        DATABASE_PASSWORD: config.DATABASE_PASSWORD ? '***masked***' : undefined,
        API_KEY: config.API_KEY ? '***masked***' : undefined,
        LOG_LEVEL: config.LOG_LEVEL,
      },
      validation: {
        isValid: !error,
        errors: error ? error.details.map(detail => detail.message) : [],
        validatedValue: error ? null : 'Configuration is valid',
      },
    };
  }

  getClassValidatorInfo() {
    // Example of how class-validator would work
    // In a real implementation, this would be handled by the ConfigModule validation
    
    const config = {
      PORT: this.configService.get('PORT'),
      DATABASE_PASSWORD: this.configService.get('DATABASE_PASSWORD'),
      API_KEY: this.configService.get('API_KEY'),
      LOG_LEVEL: this.configService.get('LOG_LEVEL'),
    };

    const validationRules = {
      PORT: {
        rules: ['IsNumber', 'Min(1)', 'Max(65535)'],
        isValid: typeof config.PORT === 'number' && config.PORT >= 1 && config.PORT <= 65535,
      },
      DATABASE_PASSWORD: {
        rules: ['IsString', 'MinLength(8)'],
        isValid: typeof config.DATABASE_PASSWORD === 'string' && config.DATABASE_PASSWORD.length >= 8,
      },
      API_KEY: {
        rules: ['IsString', 'MinLength(10)'],
        isValid: typeof config.API_KEY === 'string' && config.API_KEY.length >= 10,
      },
      LOG_LEVEL: {
        rules: ['IsString', 'IsIn([error, warn, info, debug])'],
        isValid: ['error', 'warn', 'info', 'debug'].includes(config.LOG_LEVEL),
      },
    };

    return {
      description: 'Class-validator decorators would be applied to environment class',
      config: {
        PORT: config.PORT,
        DATABASE_PASSWORD: config.DATABASE_PASSWORD ? '***masked***' : undefined,
        API_KEY: config.API_KEY ? '***masked***' : undefined,
        LOG_LEVEL: config.LOG_LEVEL,
      },
      validation: validationRules,
      overallValid: Object.values(validationRules).every(rule => rule.isValid),
    };
  }

  getCustomValidationInfo() {
    const config = {
      PORT: this.configService.get('PORT'),
      DATABASE_PASSWORD: this.configService.get('DATABASE_PASSWORD'),
      API_KEY: this.configService.get('API_KEY'),
      NODE_ENV: this.configService.get('NODE_ENV'),
    };

    const customValidations = [];

    // Custom validation: Port must be different in different environments
    if (config.NODE_ENV === 'production' && config.PORT === 3000) {
      customValidations.push({
        rule: 'Production port should not be 3000',
        passed: false,
        message: 'Use a different port for production',
      });
    } else {
      customValidations.push({
        rule: 'Port is appropriate for environment',
        passed: true,
        message: 'Port configuration is valid',
      });
    }

    // Custom validation: API key format
    if (config.API_KEY && !config.API_KEY.startsWith('api_')) {
      customValidations.push({
        rule: 'API key should start with "api_"',
        passed: false,
        message: 'API key format is invalid',
      });
    } else if (config.API_KEY) {
      customValidations.push({
        rule: 'API key format is correct',
        passed: true,
        message: 'API key follows expected format',
      });
    }

    // Custom validation: Password complexity
    if (config.DATABASE_PASSWORD) {
      const hasUpperCase = /[A-Z]/.test(config.DATABASE_PASSWORD);
      const hasLowerCase = /[a-z]/.test(config.DATABASE_PASSWORD);
      const hasNumbers = /\d/.test(config.DATABASE_PASSWORD);
      const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(config.DATABASE_PASSWORD);
      
      const complexityScore = [hasUpperCase, hasLowerCase, hasNumbers, hasSpecialChar].filter(Boolean).length;
      
      customValidations.push({
        rule: 'Password complexity check',
        passed: complexityScore >= 3,
        message: `Password complexity score: ${complexityScore}/4`,
        details: {
          hasUpperCase,
          hasLowerCase,
          hasNumbers,
          hasSpecialChar,
        },
      });
    }

    return {
      description: 'Custom validation functions applied to configuration',
      validations: customValidations,
      overallValid: customValidations.every(v => v.passed),
      summary: {
        total: customValidations.length,
        passed: customValidations.filter(v => v.passed).length,
        failed: customValidations.filter(v => !v.passed).length,
      },
    };
  }

  simulateValidationErrors() {
    // Simulate what would happen with various validation errors
    const errorScenarios = [
      {
        scenario: 'Missing required configuration',
        error: 'DATABASE_PASSWORD is required but not provided',
        source: 'Could be missing from both local .env and AWS sources',
        solution: 'Add DATABASE_PASSWORD to AWS Secrets Manager or local .env',
      },
      {
        scenario: 'Invalid configuration format',
        error: 'PORT must be a number between 1 and 65535',
        source: 'Value loaded from AWS SSM Parameter Store',
        solution: 'Update the parameter value in AWS SSM to a valid port number',
      },
      {
        scenario: 'AWS source validation failure',
        error: 'API_KEY must be at least 10 characters long',
        source: 'Value loaded from AWS Secrets Manager',
        solution: 'Update the secret value in AWS Secrets Manager',
      },
      {
        scenario: 'Precedence rule conflict',
        error: 'Local value passes validation but AWS value fails',
        source: 'AWS value takes precedence but is invalid',
        solution: 'Either fix AWS value or change precedence rule to local-first',
      },
    ];

    return {
      message: 'Common validation error scenarios',
      description: 'These are examples of validation errors you might encounter',
      scenarios: errorScenarios,
      debugging: {
        tips: [
          'Enable logging to see which source provided each value',
          'Use precedence rules to control which source takes priority',
          'Test validation with local values first before adding AWS sources',
          'Use the /config/source/:key endpoint to debug specific values',
        ],
      },
    };
  }
}