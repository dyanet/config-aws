import { Module } from '@nestjs/common';
import { MigrationExampleController } from './migration-example.controller';
import { MigrationExampleService } from './migration-example.service';

@Module({
  controllers: [MigrationExampleController],
  providers: [MigrationExampleService],
})
export class MigrationExampleModule {}