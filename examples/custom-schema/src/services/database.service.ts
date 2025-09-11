import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from 'nest-config-aws';
import { AppConfig } from '../config/schema';

@Injectable()
export class DatabaseService implements OnModuleInit {
  private isConnected = false;

  constructor(
    private configService: ConfigService<AppConfig>
  ) {}

  async onModuleInit() {
    await this.connect();
  }

  async connect(): Promise<void> {
    const config = this.getDatabaseConfig();
    
    console.log('🔌 Connecting to database...');
    console.log(`   URL: ${this.maskUrl(config.url)}`);
    console.log(`   Pool Size: ${config.poolSize}`);
    console.log(`   Timeout: ${config.timeout}ms`);
    console.log(`   SSL: ${config.ssl ? 'enabled' : 'disabled'}`);
    
    // Simulate database connection
    await new Promise(resolve => setTimeout(resolve, 100));
    
    this.isConnected = true;
    console.log('✅ Database connected successfully');
  }

  async disconnect(): Promise<void> {
    if (this.isConnected) {
      console.log('🔌 Disconnecting from database...');
      // Simulate disconnection
      await new Promise(resolve => setTimeout(resolve, 50));
      this.isConnected = false;
      console.log('✅ Database disconnected');
    }
  }

  getDatabaseConfig() {
    return {
      url: this.configService.get('DATABASE_URL'),
      poolSize: this.configService.get('DATABASE_POOL_SIZE'),
      timeout: this.configService.get('DATABASE_TIMEOUT'),
      ssl: this.configService.get('DATABASE_SSL'),
    };
  }

  getConnectionStatus() {
    return {
      connected: this.isConnected,
      config: {
        ...this.getDatabaseConfig(),
        url: this.maskUrl(this.configService.get('DATABASE_URL')),
      },
    };
  }

  // Example of using configuration for database operations
  async executeQuery(query: string): Promise<any> {
    if (!this.isConnected) {
      throw new Error('Database not connected');
    }

    const timeout = this.configService.get('DATABASE_TIMEOUT');
    
    // Simulate query execution with timeout
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('Query timeout'));
      }, timeout);

      // Simulate query
      setTimeout(() => {
        clearTimeout(timer);
        resolve({ 
          query, 
          result: 'Mock result',
          executionTime: Math.random() * 100,
        });
      }, Math.random() * 50);
    });
  }

  // Example of environment-specific database behavior
  async getOptimizedPoolSize(): Promise<number> {
    const env = this.configService.get('APP_ENV');
    const basePoolSize = this.configService.get('DATABASE_POOL_SIZE');
    
    switch (env) {
      case 'production':
        // Production might need larger pools
        return Math.max(basePoolSize, 20);
      case 'test':
        // Test environment uses smaller pools
        return Math.min(basePoolSize, 5);
      default:
        return basePoolSize;
    }
  }

  // Health check for database
  async healthCheck(): Promise<{ status: string; details: any }> {
    try {
      if (!this.isConnected) {
        return {
          status: 'unhealthy',
          details: { error: 'Not connected to database' },
        };
      }

      // Simulate health check query
      const result = await this.executeQuery('SELECT 1');
      
      return {
        status: 'healthy',
        details: {
          connected: true,
          responseTime: result.executionTime,
          poolSize: await this.getOptimizedPoolSize(),
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: { error: error.message },
      };
    }
  }

  private maskUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      if (urlObj.password) {
        urlObj.password = '***';
      }
      return urlObj.toString();
    } catch {
      return '***';
    }
  }
}