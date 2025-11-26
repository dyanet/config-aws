import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { AppService } from './app.service';
import { DatabaseService } from './services/database.service';
import { ApiService } from './services/api.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly databaseService: DatabaseService,
    private readonly apiService: ApiService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('info')
  getApplicationInfo() {
    return this.appService.getApplicationInfo();
  }

  @Get('config')
  getConfiguration() {
    return {
      application: this.appService.getApplicationInfo(),
      security: this.appService.getSecurityConfig(),
      database: this.appService.getDatabaseConfig(),
      externalServices: this.appService.getExternalServicesConfig(),
      logging: this.appService.getLoggingConfig(),
      fileUpload: this.appService.getFileUploadConfig(),
      environmentSpecific: this.appService.getEnvironmentSpecificSettings(),
    };
  }

  @Get('health')
  async getHealth() {
    const [dbHealth, apiHealth] = await Promise.all([
      this.databaseService.healthCheck(),
      this.apiService.healthCheck(),
    ]);

    const overallStatus = dbHealth.status === 'healthy' && apiHealth.status === 'healthy' 
      ? 'healthy' 
      : 'unhealthy';

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      environment: this.appService.getApplicationInfo().environment,
      services: {
        database: dbHealth,
        externalApi: apiHealth,
      },
    };
  }

  @Get('database/status')
  getDatabaseStatus() {
    return this.databaseService.getConnectionStatus();
  }

  @Post('database/query')
  async executeQuery(@Body() body: { query: string }) {
    try {
      const result = await this.databaseService.executeQuery(body.query);
      return {
        success: true,
        result,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  @Get('api/config')
  getApiConfiguration() {
    return {
      config: this.apiService.getApiConfig(),
      cors: this.apiService.getCorsConfiguration(),
    };
  }

  @Post('api/call/:endpoint')
  async makeApiCall(@Param('endpoint') endpoint: string, @Body() data?: any) {
    try {
      const result = await this.apiService.makeApiCall(`/${endpoint}`, data);
      return {
        success: true,
        result,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  @Post('upload/validate')
  validateFileUpload(@Body() file: { size: number; type: string }) {
    try {
      const isValid = this.apiService.validateFileUpload(file);
      return {
        valid: isValid,
        message: 'File validation passed',
      };
    } catch (error) {
      return {
        valid: false,
        message: error.message,
      };
    }
  }

  @Get('features')
  getFeatureFlags() {
    const info = this.appService.getApplicationInfo();
    return {
      features: info.features,
      environment: info.environment,
      debug: this.appService.isDebugEnabled(),
      production: this.appService.isProduction(),
      development: this.appService.isDevelopment(),
    };
  }

  @Get('cors')
  getCorsConfiguration() {
    return this.apiService.getCorsConfiguration();
  }

  @Get('tags')
  getTags() {
    return {
      tags: this.appService.getTags(),
      corsOrigins: this.appService.getCorsOrigins(),
    };
  }
}