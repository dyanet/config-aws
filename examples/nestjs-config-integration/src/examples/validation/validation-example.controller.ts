import { Controller, Get } from '@nestjs/common';
import { ValidationExampleService } from './validation-example.service';

@Controller('examples/validation')
export class ValidationExampleController {
  constructor(
    private readonly validationExampleService: ValidationExampleService,
  ) {}

  @Get()
  getValidationExample() {
    return {
      message: 'Configuration validation examples',
      description: 'This demonstrates how validation works with AWS-sourced configuration',
      examples: [
        {
          type: 'Joi Validation',
          description: 'Using Joi schema to validate configuration',
          endpoint: '/examples/validation/joi',
        },
        {
          type: 'Class Validator',
          description: 'Using class-validator decorators',
          endpoint: '/examples/validation/class-validator',
        },
        {
          type: 'Custom Validation',
          description: 'Custom validation functions',
          endpoint: '/examples/validation/custom',
        },
      ],
    };
  }

  @Get('joi')
  getJoiValidationExample() {
    return {
      message: 'Joi validation example',
      description: 'Configuration validated using Joi schema',
      validation: this.validationExampleService.getJoiValidationInfo(),
    };
  }

  @Get('class-validator')
  getClassValidatorExample() {
    return {
      message: 'Class-validator example',
      description: 'Configuration validated using class-validator decorators',
      validation: this.validationExampleService.getClassValidatorInfo(),
    };
  }

  @Get('custom')
  getCustomValidationExample() {
    return {
      message: 'Custom validation example',
      description: 'Configuration validated using custom functions',
      validation: this.validationExampleService.getCustomValidationInfo(),
    };
  }

  @Get('errors')
  getValidationErrors() {
    return this.validationExampleService.simulateValidationErrors();
  }
}