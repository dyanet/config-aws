import { Controller, Get, Param } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly configService: ConfigService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: this.configService.get('NODE_ENV'),
      port: this.configService.get('PORT'),
    };
  }

  @Get('config')
  getAllConfig() {
    // Note: In production, be careful about exposing sensitive configuration
    return {
      port: this.configService.get('PORT'),
      nodeEnv: this.configService.get('NODE_ENV'),
      databaseHost: this.configService.get('DATABASE_HOST'),
      databasePort: this.configService.get('DATABASE_PORT'),
      hasApiKey: !!this.configService.get('API_KEY'),
      hasRedisUrl: !!this.configService.get('REDIS_URL'),
      logLevel: this.configService.get('LOG_LEVEL'),
      debugMode: this.configService.get('DEBUG_MODE'),
    };
  }

  @Get('config/database')
  getDatabaseConfig() {
    const databaseConfig = this.configService.get('database');
    return {
      ...databaseConfig,
      // Mask sensitive information
      password: databaseConfig?.password ? '***masked***' : undefined,
    };
  }

  @Get('config/app')
  getAppConfig() {
    return this.configService.get('app');
  }

  @Get('config/source/:key')
  getConfigSource(@Param('key') key: string) {
    const value = this.configService.get(key);
    
    // This is a demonstration - in a real implementation,
    // you would need to track configuration sources
    return {
      key,
      value: value || null,
      hasValue: value !== undefined,
      // Note: Source tracking would require additional implementation
      // in the integration module to track where each value came from
      source: 'unknown (source tracking not implemented in this example)',
    };
  }
}