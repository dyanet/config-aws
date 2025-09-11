import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppService {
  constructor(private readonly configService: ConfigService) {}

  getHello(): string {
    const nodeEnv = this.configService.get<string>('NODE_ENV', 'development');
    const port = this.configService.get<number>('PORT', 3000);
    
    return `Hello World! Running in ${nodeEnv} mode on port ${port}`;
  }

  getConfigValue<T = any>(key: string, defaultValue?: T): T {
    return this.configService.get<T>(key, defaultValue);
  }

  getRequiredConfigValue<T = any>(key: string): T {
    const value = this.configService.get<T>(key);
    if (value === undefined || value === null) {
      throw new Error(`Required configuration key '${key}' is missing`);
    }
    return value;
  }

  isConfigured(key: string): boolean {
    const value = this.configService.get(key);
    return value !== undefined && value !== null && value !== '';
  }
}