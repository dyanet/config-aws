import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface DatabaseConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  ssl: boolean;
  poolSize: number;
  connectionTimeout: number;
}

@Injectable()
export class DatabaseService {
  private readonly logger = new Logger(DatabaseService.name);
  private readonly databaseConfig: DatabaseConfig;

  constructor(private readonly configService: ConfigService) {
    // Access namespaced configuration
    this.databaseConfig = this.configService.get<DatabaseConfig>('database');
    
    if (!this.databaseConfig) {
      throw new Error('Database configuration is missing');
    }

    this.logger.log('Database service initialized');
    this.logger.log(`Connecting to: ${this.databaseConfig.host}:${this.databaseConfig.port}`);
    this.logger.log(`Database: ${this.databaseConfig.database}`);
    this.logger.log(`SSL enabled: ${this.databaseConfig.ssl}`);
    this.logger.log(`Pool size: ${this.databaseConfig.poolSize}`);
  }

  async connect(): Promise<void> {
    // Simulate database connection
    this.logger.log('Connecting to database...');
    
    // In a real application, you would use the configuration to connect
    // to your actual database (PostgreSQL, MySQL, etc.)
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    this.logger.log('Database connected successfully');
  }

  async disconnect(): Promise<void> {
    this.logger.log('Disconnecting from database...');
    await new Promise(resolve => setTimeout(resolve, 500));
    this.logger.log('Database disconnected');
  }

  getConnectionInfo() {
    return {
      host: this.databaseConfig.host,
      port: this.databaseConfig.port,
      database: this.databaseConfig.database,
      username: this.databaseConfig.username,
      ssl: this.databaseConfig.ssl,
      poolSize: this.databaseConfig.poolSize,
      connectionTimeout: this.databaseConfig.connectionTimeout,
      // Never expose the actual password
      hasPassword: !!this.databaseConfig.password,
    };
  }

  async healthCheck(): Promise<{ status: string; latency?: number }> {
    const start = Date.now();
    
    try {
      // Simulate health check query
      await new Promise(resolve => setTimeout(resolve, 50));
      const latency = Date.now() - start;
      
      return {
        status: 'healthy',
        latency,
      };
    } catch (error) {
      this.logger.error('Database health check failed', error);
      return {
        status: 'unhealthy',
      };
    }
  }
}