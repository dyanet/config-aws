import { Injectable } from '@nestjs/common';
import { ConfigService } from 'nest-config-aws';
import { AppConfig } from '../config/schema';

@Injectable()
export class ApiService {
  constructor(
    private configService: ConfigService<AppConfig>
  ) {}

  async makeApiCall(endpoint: string, data?: any): Promise<any> {
    const config = this.getApiConfig();
    const url = `${config.baseUrl}${endpoint}`;
    
    console.log(`🌐 Making API call to: ${url}`);
    
    // Simulate API call with retry logic
    return this.executeWithRetry(async () => {
      // Simulate HTTP request
      await new Promise(resolve => setTimeout(resolve, Math.random() * 1000));
      
      // Simulate occasional failures for retry demonstration
      if (Math.random() < 0.2) {
        throw new Error('Network error');
      }
      
      return {
        url,
        data,
        timestamp: new Date().toISOString(),
        status: 200,
      };
    }, config.retryAttempts);
  }

  getApiConfig() {
    return {
      baseUrl: this.configService.get('API_BASE_URL'),
      timeout: this.configService.get('API_TIMEOUT'),
      retryAttempts: this.configService.get('API_RETRY_ATTEMPTS'),
      hasApiKey: !!this.configService.get('API_KEY'),
    };
  }

  // Example of using API key from configuration
  private getAuthHeaders(): Record<string, string> {
    const apiKey = this.configService.get('API_KEY');
    
    if (!apiKey) {
      throw new Error('API key not configured');
    }
    
    return {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  // Retry logic using configuration
  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    maxAttempts: number
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        if (attempt === maxAttempts) {
          break;
        }
        
        const delay = Math.pow(2, attempt - 1) * 1000; // Exponential backoff
        console.log(`⚠️  API call failed (attempt ${attempt}/${maxAttempts}), retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw new Error(`API call failed after ${maxAttempts} attempts: ${lastError.message}`);
  }

  // Environment-specific API behavior
  async getApiEndpoint(path: string): string {
    const baseUrl = this.configService.get('API_BASE_URL');
    const env = this.configService.get('APP_ENV');
    
    // Add environment-specific prefixes or modifications
    switch (env) {
      case 'development':
        return `${baseUrl}/dev${path}`;
      case 'test':
        return `${baseUrl}/test${path}`;
      case 'production':
        return `${baseUrl}${path}`;
      default:
        return `${baseUrl}/local${path}`;
    }
  }

  // Health check for external API
  async healthCheck(): Promise<{ status: string; details: any }> {
    try {
      const config = this.getApiConfig();
      const startTime = Date.now();
      
      // Simulate health check call
      await this.makeApiCall('/health');
      
      const responseTime = Date.now() - startTime;
      
      return {
        status: 'healthy',
        details: {
          baseUrl: config.baseUrl,
          responseTime,
          timeout: config.timeout,
          retryAttempts: config.retryAttempts,
          hasApiKey: config.hasApiKey,
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        details: {
          error: error.message,
          baseUrl: this.configService.get('API_BASE_URL'),
        },
      };
    }
  }

  // Example of rate limiting based on configuration
  private rateLimitCheck(): boolean {
    const window = this.configService.get('RATE_LIMIT_WINDOW');
    const maxRequests = this.configService.get('RATE_LIMIT_MAX_REQUESTS');
    
    // Simple in-memory rate limiting (in production, use Redis or similar)
    const now = Date.now();
    const windowStart = now - window;
    
    // This is a simplified example - in real applications,
    // you'd track requests per user/IP
    console.log(`Rate limit: ${maxRequests} requests per ${window}ms window`);
    
    return true; // Simplified - always allow for demo
  }

  // File upload configuration example
  validateFileUpload(file: { size: number; type: string }): boolean {
    const maxSize = this.configService.get('MAX_FILE_SIZE');
    const allowedTypes = this.configService.get('ALLOWED_FILE_TYPES');
    
    if (file.size > maxSize) {
      throw new Error(`File size ${file.size} exceeds maximum ${maxSize} bytes`);
    }
    
    const fileExtension = file.type.toLowerCase();
    if (!allowedTypes.includes(fileExtension)) {
      throw new Error(`File type ${fileExtension} not allowed. Allowed types: ${allowedTypes.join(', ')}`);
    }
    
    return true;
  }

  // CORS configuration example
  getCorsConfiguration() {
    const origins = this.configService.get('CORS_ORIGINS');
    
    return {
      origin: origins,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    };
  }
}