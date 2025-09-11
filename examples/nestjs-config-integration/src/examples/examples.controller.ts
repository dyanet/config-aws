import { Controller, Get } from '@nestjs/common';

@Controller('examples')
export class ExamplesController {
  @Get()
  getExamples() {
    return {
      message: 'Available integration examples',
      examples: [
        {
          name: 'Basic Integration',
          description: 'Simple setup with AWS integration',
          endpoint: '/config',
        },
        {
          name: 'Async Configuration',
          description: 'Dynamic configuration loading',
          endpoint: '/examples/async-config',
        },
        {
          name: 'Validation Examples',
          description: 'Configuration validation with Joi and class-validator',
          endpoint: '/examples/validation',
        },
        {
          name: 'Migration Examples',
          description: 'Migration patterns from existing setups',
          endpoint: '/examples/migration',
        },
        {
          name: 'Namespaced Configuration',
          description: 'Using registerAs with AWS sources',
          endpoint: '/config/database',
        },
      ],
    };
  }
}