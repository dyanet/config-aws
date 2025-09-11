import { Controller, Get } from '@nestjs/common';
import { MigrationExampleService } from './migration-example.service';

@Controller('examples/migration')
export class MigrationExampleController {
  constructor(
    private readonly migrationExampleService: MigrationExampleService,
  ) {}

  @Get()
  getMigrationExamples() {
    return {
      message: 'Migration examples',
      description: 'Examples showing how to migrate from different setups',
      migrations: [
        {
          from: '@nestjs/config only',
          to: '@nestjs/config + nest-config-aws integration',
          endpoint: '/examples/migration/from-nestjs-config',
        },
        {
          from: 'nest-config-aws only',
          to: '@nestjs/config + nest-config-aws integration',
          endpoint: '/examples/migration/from-nest-config-aws',
        },
        {
          from: 'Custom configuration',
          to: '@nestjs/config + nest-config-aws integration',
          endpoint: '/examples/migration/from-custom',
        },
      ],
    };
  }

  @Get('from-nestjs-config')
  getFromNestjsConfigMigration() {
    return this.migrationExampleService.getFromNestjsConfigMigration();
  }

  @Get('from-nest-config-aws')
  getFromNestConfigAwsMigration() {
    return this.migrationExampleService.getFromNestConfigAwsMigration();
  }

  @Get('from-custom')
  getFromCustomMigration() {
    return this.migrationExampleService.getFromCustomMigration();
  }

  @Get('checklist')
  getMigrationChecklist() {
    return this.migrationExampleService.getMigrationChecklist();
  }
}