import { Module } from '@nestjs/common';
import { ValidationExampleController } from './validation-example.controller';
import { ValidationExampleService } from './validation-example.service';

@Module({
  controllers: [ValidationExampleController],
  providers: [ValidationExampleService],
})
export class ValidationExampleModule {}