import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@dyanet/nestjs-config-aws';
import type { AppConfig } from './config.schema';

@Controller()
export class AppController {
  constructor(private readonly config: ConfigService<AppConfig>) {}

  @Get('/')
  hello() {
    return {
      app: this.config.get('APP_NAME'),
      port: this.config.get('PORT'),
      featureFlag: this.config.get('FEATURE_FLAG'),
    };
  }

  @Get('/config')
  all() {
    return this.config.getAll();
  }
}
