import { Injectable } from '@nestjs/common';

@Injectable()
export class MigrationExampleService {
  getFromNestjsConfigMigration() {
    return {
      title: 'Migrating from @nestjs/config only',
      description: 'Add AWS capabilities to existing @nestjs/config setup',
      
      before: {
        description: 'Current setup using only @nestjs/config',
        code: `
// app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
  ],
})
export class AppModule {}

// app.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppService {
  constructor(private configService: ConfigService) {}
  
  getDatabaseUrl(): string {
    return this.configService.get('DATABASE_URL');
  }
}`,
        limitations: [
          'Configuration only comes from environment variables and .env files',
          'No AWS integration for secrets management',
          'Manual secret rotation required',
          'No centralized configuration management',
        ],
      },

      after: {
        description: 'Enhanced setup with AWS integration',
        code: `
// app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NestConfigAwsIntegrationModule } from 'nest-config-aws';

@Module({
  imports: [
    // Add AWS integration BEFORE ConfigModule
    NestConfigAwsIntegrationModule.forRoot({
      secretsManagerConfig: {
        enabled: true,
        paths: {
          production: '/myapp/prod/secrets'
        }
      },
      precedence: 'aws-first'
    }),
    
    // Your existing ConfigModule setup
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
  ],
})
export class AppModule {}

// app.service.ts - NO CHANGES NEEDED!
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppService {
  constructor(private configService: ConfigService) {}
  
  getDatabaseUrl(): string {
    // Now can come from AWS Secrets Manager
    return this.configService.get('DATABASE_URL');
  }
}`,
        benefits: [
          'Existing code continues to work unchanged',
          'Configuration can now come from AWS sources',
          'Automatic secret rotation support',
          'Centralized configuration management',
          'Environment-specific configuration paths',
        ],
      },

      steps: [
        {
          step: 1,
          title: 'Install nest-config-aws',
          command: 'npm install nest-config-aws',
          description: 'Add the integration package',
        },
        {
          step: 2,
          title: 'Add integration module',
          description: 'Import NestConfigAwsIntegrationModule before ConfigModule',
          code: `NestConfigAwsIntegrationModule.forRoot({
  secretsManagerConfig: { enabled: true }
})`,
        },
        {
          step: 3,
          title: 'Configure AWS resources',
          description: 'Add secrets to AWS Secrets Manager or SSM Parameter Store',
          command: 'aws secretsmanager create-secret --name "/myapp/prod/secrets" --secret-string \'{"DATABASE_URL":"..."}\'',
        },
        {
          step: 4,
          title: 'Test configuration',
          description: 'Verify that AWS values are accessible through existing ConfigService',
          code: 'console.log(configService.get("DATABASE_URL")); // Now from AWS',
        },
      ],

      notes: [
        'No changes to existing service code required',
        'AWS integration is additive - local .env files still work',
        'Use precedence rules to control which source takes priority',
        'Enable logging during migration to see which sources are used',
      ],
    };
  }

  getFromNestConfigAwsMigration() {
    return {
      title: 'Migrating from nest-config-aws only',
      description: 'Add @nestjs/config compatibility to existing nest-config-aws setup',
      
      before: {
        description: 'Current setup using only nest-config-aws',
        code: `
// app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from 'nest-config-aws';

@Module({
  imports: [
    ConfigModule.forRoot({
      secretsManagerConfig: { enabled: true },
      schema: mySchema,
    }),
  ],
})
export class AppModule {}

// app.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from 'nest-config-aws';

@Injectable()
export class AppService {
  constructor(private configService: ConfigService) {}
  
  getDatabaseUrl(): string {
    return this.configService.get('DATABASE_URL');
  }
}`,
        limitations: [
          'Custom ConfigService implementation',
          'Limited ecosystem compatibility',
          'No @nestjs/config features like registerAs',
          'No validation integration with standard tools',
        ],
      },

      after: {
        description: 'Migrated setup using standard @nestjs/config with AWS integration',
        code: `
// app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NestConfigAwsIntegrationModule } from 'nest-config-aws';

@Module({
  imports: [
    // Replace ConfigModule import with integration
    NestConfigAwsIntegrationModule.forRoot({
      secretsManagerConfig: { enabled: true },
      // Your existing nest-config-aws options
    }),
    
    // Add standard @nestjs/config
    ConfigModule.forRoot({
      isGlobal: true,
      // Can now use standard @nestjs/config features
    }),
  ],
})
export class AppModule {}

// app.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config'; // Changed import

@Injectable()
export class AppService {
  constructor(private configService: ConfigService) {}
  
  getDatabaseUrl(): string {
    return this.configService.get('DATABASE_URL');
  }
}`,
        benefits: [
          'Standard @nestjs/config compatibility',
          'Access to full @nestjs/config ecosystem',
          'Better TypeScript support',
          'Validation integration with Joi/class-validator',
          'Support for registerAs and namespaced configuration',
        ],
      },

      steps: [
        {
          step: 1,
          title: 'Install @nestjs/config',
          command: 'npm install @nestjs/config',
          description: 'Add the standard configuration package',
        },
        {
          step: 2,
          title: 'Update module imports',
          description: 'Replace nest-config-aws ConfigModule with integration module',
          before: `import { ConfigModule } from 'nest-config-aws';`,
          after: `import { ConfigModule } from '@nestjs/config';
import { NestConfigAwsIntegrationModule } from 'nest-config-aws';`,
        },
        {
          step: 3,
          title: 'Update module configuration',
          description: 'Split configuration between integration and standard modules',
          code: `
// AWS integration
NestConfigAwsIntegrationModule.forRoot({
  // Your existing AWS options
}),

// Standard @nestjs/config
ConfigModule.forRoot({
  isGlobal: true,
})`,
        },
        {
          step: 4,
          title: 'Update service imports',
          description: 'Change ConfigService import to use standard @nestjs/config',
          before: `import { ConfigService } from 'nest-config-aws';`,
          after: `import { ConfigService } from '@nestjs/config';`,
        },
        {
          step: 5,
          title: 'Test and validate',
          description: 'Ensure all configuration values are still accessible',
          code: 'console.log(configService.get("DATABASE_URL")); // Should still work',
        },
      ],

      notes: [
        'Configuration loading behavior remains the same',
        'AWS integration continues to work as before',
        'Gain access to @nestjs/config features like validation',
        'Can now use registerAs for namespaced configuration',
        'Better integration with NestJS ecosystem',
      ],
    };
  }

  getFromCustomMigration() {
    return {
      title: 'Migrating from custom configuration',
      description: 'Replace custom configuration setup with standardized approach',
      
      before: {
        description: 'Custom configuration implementation',
        code: `
// config.service.ts
import { Injectable } from '@nestjs/common';

@Injectable()
export class CustomConfigService {
  private config: Record<string, any> = {};
  
  constructor() {
    this.loadConfig();
  }
  
  private loadConfig() {
    // Custom loading logic
    this.config = {
      ...process.env,
      // Custom AWS loading
    };
  }
  
  get(key: string): any {
    return this.config[key];
  }
}

// app.module.ts
@Module({
  providers: [CustomConfigService],
  exports: [CustomConfigService],
})
export class ConfigModule {}`,
        issues: [
          'Custom implementation requires maintenance',
          'No standardization across projects',
          'Limited validation capabilities',
          'No ecosystem integration',
          'Potential security issues',
        ],
      },

      after: {
        description: 'Standardized configuration with AWS integration',
        code: `
// app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NestConfigAwsIntegrationModule } from 'nest-config-aws';

@Module({
  imports: [
    NestConfigAwsIntegrationModule.forRoot({
      secretsManagerConfig: { enabled: true },
      ssmConfig: { enabled: true },
    }),
    
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateConfig, // Built-in validation
    }),
  ],
})
export class AppModule {}

// Any service
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AnyService {
  constructor(private configService: ConfigService) {}
  
  getSomeConfig(): string {
    return this.configService.get('SOME_CONFIG');
  }
}`,
        benefits: [
          'Standardized approach across all projects',
          'Built-in validation and type safety',
          'Automatic AWS integration',
          'Better error handling and logging',
          'Full NestJS ecosystem compatibility',
        ],
      },

      steps: [
        {
          step: 1,
          title: 'Analyze current implementation',
          description: 'Document all configuration sources and loading logic',
          checklist: [
            'List all configuration keys used',
            'Identify configuration sources (env, files, APIs)',
            'Document validation rules',
            'Note any custom transformation logic',
          ],
        },
        {
          step: 2,
          title: 'Install required packages',
          command: 'npm install @nestjs/config nest-config-aws',
          description: 'Add standardized configuration packages',
        },
        {
          step: 3,
          title: 'Create validation schema',
          description: 'Convert custom validation to Joi or class-validator',
          code: `
const configSchema = Joi.object({
  PORT: Joi.number().port().default(3000),
  DATABASE_URL: Joi.string().required(),
  // Add all your configuration keys
});`,
        },
        {
          step: 4,
          title: 'Replace custom service',
          description: 'Remove custom ConfigService and use standard @nestjs/config',
          before: `constructor(private customConfig: CustomConfigService)`,
          after: `constructor(private configService: ConfigService)`,
        },
        {
          step: 5,
          title: 'Update all usages',
          description: 'Replace custom config calls with standard ConfigService',
          before: `this.customConfig.get('KEY')`,
          after: `this.configService.get('KEY')`,
        },
        {
          step: 6,
          title: 'Add AWS integration',
          description: 'Configure AWS sources for sensitive configuration',
          code: `
NestConfigAwsIntegrationModule.forRoot({
  secretsManagerConfig: {
    enabled: true,
    paths: { production: '/myapp/prod/secrets' }
  }
})`,
        },
      ],

      notes: [
        'Migration can be done incrementally',
        'Keep custom logic for complex transformations',
        'Use validation to catch configuration issues early',
        'Test thoroughly in all environments',
        'Document the new configuration approach',
      ],
    };
  }

  getMigrationChecklist() {
    return {
      title: 'Migration Checklist',
      description: 'Complete checklist for any configuration migration',
      
      preMigration: {
        title: 'Pre-Migration Preparation',
        tasks: [
          {
            task: 'Document current configuration',
            description: 'List all configuration keys, sources, and validation rules',
            completed: false,
          },
          {
            task: 'Identify sensitive configuration',
            description: 'Mark secrets that should move to AWS Secrets Manager',
            completed: false,
          },
          {
            task: 'Plan AWS resource structure',
            description: 'Design AWS Secrets Manager and SSM Parameter Store hierarchy',
            completed: false,
          },
          {
            task: 'Set up AWS resources',
            description: 'Create secrets and parameters in AWS',
            completed: false,
          },
          {
            task: 'Configure AWS permissions',
            description: 'Ensure application has access to AWS resources',
            completed: false,
          },
        ],
      },

      migration: {
        title: 'Migration Steps',
        tasks: [
          {
            task: 'Install required packages',
            description: 'Add @nestjs/config and/or nest-config-aws',
            completed: false,
          },
          {
            task: 'Update module imports',
            description: 'Add integration modules to app.module.ts',
            completed: false,
          },
          {
            task: 'Create validation schema',
            description: 'Set up Joi or class-validator schema',
            completed: false,
          },
          {
            task: 'Update service imports',
            description: 'Change ConfigService imports in all services',
            completed: false,
          },
          {
            task: 'Configure precedence rules',
            description: 'Set up aws-first, local-first, or merge strategy',
            completed: false,
          },
          {
            task: 'Enable logging',
            description: 'Turn on debug logging for migration testing',
            completed: false,
          },
        ],
      },

      testing: {
        title: 'Testing and Validation',
        tasks: [
          {
            task: 'Test local development',
            description: 'Verify configuration works without AWS',
            completed: false,
          },
          {
            task: 'Test AWS integration',
            description: 'Verify configuration loads from AWS sources',
            completed: false,
          },
          {
            task: 'Test precedence rules',
            description: 'Verify correct values are used when conflicts exist',
            completed: false,
          },
          {
            task: 'Test validation',
            description: 'Verify validation catches configuration errors',
            completed: false,
          },
          {
            task: 'Test error scenarios',
            description: 'Verify graceful handling of AWS unavailability',
            completed: false,
          },
          {
            task: 'Performance testing',
            description: 'Ensure configuration loading performance is acceptable',
            completed: false,
          },
        ],
      },

      postMigration: {
        title: 'Post-Migration Cleanup',
        tasks: [
          {
            task: 'Remove custom configuration code',
            description: 'Clean up old configuration implementations',
            completed: false,
          },
          {
            task: 'Update documentation',
            description: 'Document new configuration approach',
            completed: false,
          },
          {
            task: 'Update deployment scripts',
            description: 'Ensure AWS permissions in deployment pipeline',
            completed: false,
          },
          {
            task: 'Train team members',
            description: 'Educate team on new configuration patterns',
            completed: false,
          },
          {
            task: 'Monitor in production',
            description: 'Watch for configuration-related issues',
            completed: false,
          },
        ],
      },

      troubleshooting: {
        title: 'Common Issues and Solutions',
        issues: [
          {
            issue: 'Configuration not loading from AWS',
            solutions: [
              'Check AWS credentials and permissions',
              'Verify resource paths match configuration',
              'Enable debug logging to see loading process',
              'Check precedence rules',
            ],
          },
          {
            issue: 'Validation errors after migration',
            solutions: [
              'Compare old vs new configuration values',
              'Check data types and formats',
              'Verify all required keys are present',
              'Update validation schema if needed',
            ],
          },
          {
            issue: 'Performance issues',
            solutions: [
              'Enable configuration caching',
              'Optimize AWS resource structure',
              'Consider async loading for non-critical config',
              'Monitor AWS API call patterns',
            ],
          },
        ],
      },
    };
  }
}