import { Module } from '@nestjs/common';
import { ExamplesController } from './examples.controller';
import { AsyncConfigExampleModule } from './async-config/async-config-example.module';
import { ValidationExampleModule } from './validation/validation-example.module';
import { MigrationExampleModule } from './migration/migration-example.module';

@Module({
  imports: [
    AsyncConfigExampleModule,
    ValidationExampleModule,
    MigrationExampleModule,
  ],
  controllers: [ExamplesController],
})
export class ExamplesModule {}