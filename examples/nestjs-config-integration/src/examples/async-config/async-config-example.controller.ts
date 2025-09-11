import { Controller, Get } from '@nestjs/common';
import { AsyncConfigExampleService } from './async-config-example.service';

@Controller('examples/async-config')
export class AsyncConfigExampleController {
  constructor(
    private readonly asyncConfigExampleService: AsyncConfigExampleService,
  ) {}

  @Get()
  getAsyncConfigExample() {
    return {
      message: 'Async configuration example',
      description: 'This demonstrates how to set up async configuration with AWS integration',
      configuration: this.asyncConfigExampleService.getAsyncLoadedConfig(),
    };
  }

  @Get('status')
  getAsyncConfigStatus() {
    return this.asyncConfigExampleService.getConfigurationStatus();
  }
}