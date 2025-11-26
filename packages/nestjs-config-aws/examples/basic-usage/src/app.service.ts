import { Injectable } from '@nestjs/common';
import { ConfigService } from 'nest-config-aws';

@Injectable()
export class AppService {
  constructor(private configService: ConfigService) {}

  getHello(): string {
    const appName = this.configService.get('APP_NAME') || 'nest-config-aws Basic Example';
    const environment = this.configService.get('APP_ENV');
    
    return `Hello from ${appName} running in ${environment} mode!`;
  }

  getConfigInfo() {
    // Demonstrate accessing various configuration values
    return {
      environment: {
        app_env: this.configService.get('APP_ENV'),
        node_env: this.configService.get('NODE_ENV'),
        aws_region: this.configService.get('AWS_REGION'),
      },
      server: {
        port: this.configService.get('PORT'),
        host: this.configService.get('HOST') || 'localhost',
      },
      features: {
        debug: this.configService.get('DEBUG') || false,
        logging: this.configService.get('ENABLE_LOGGING') || true,
      },
      // Note: Sensitive values like API keys should not be exposed in real applications
      metadata: {
        initialized: this.configService.isInitialized(),
        timestamp: new Date().toISOString(),
      },
    };
  }

  getEnvironment(): string {
    return this.configService.get('APP_ENV') || 'unknown';
  }

  // Example of type-safe configuration access
  getPort(): number {
    const port = this.configService.get('PORT');
    return port ? parseInt(port.toString(), 10) : 3000;
  }

  // Example of configuration with fallback values
  isDebugEnabled(): boolean {
    const debug = this.configService.get('DEBUG');
    if (typeof debug === 'boolean') return debug;
    if (typeof debug === 'string') return debug.toLowerCase() === 'true';
    return false;
  }
}