import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  const configService = app.get(ConfigService);
  const logger = new Logger('Bootstrap');
  
  const port = configService.get<number>('PORT', 3000);
  const nodeEnv = configService.get<string>('NODE_ENV', 'development');
  
  logger.log(`Starting application in ${nodeEnv} mode`);
  logger.log(`Server will listen on port ${port}`);
  
  // Log configuration sources for demonstration
  const databaseHost = configService.get<string>('DATABASE_HOST');
  const apiKey = configService.get<string>('API_KEY');
  
  logger.log(`Database host: ${databaseHost}`);
  logger.log(`API key configured: ${apiKey ? 'Yes' : 'No'}`);
  
  await app.listen(port);
  logger.log(`Application is running on: http://localhost:${port}`);
}

bootstrap().catch((error) => {
  console.error('Failed to start application:', error);
  process.exit(1);
});