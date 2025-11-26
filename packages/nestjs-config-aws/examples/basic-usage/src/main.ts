import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from 'nest-config-aws';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Get configuration service to demonstrate usage
  const configService = app.get(ConfigService);
  
  // Get port from configuration (with fallback)
  const port = configService.get('PORT') || 3000;
  
  console.log(`🚀 Application starting on port ${port}`);
  console.log(`📊 Environment: ${configService.get('APP_ENV')}`);
  console.log(`🔧 Node Environment: ${configService.get('NODE_ENV')}`);
  
  await app.listen(port);
  
  console.log(`✅ Application is running on: http://localhost:${port}`);
}

bootstrap().catch((error) => {
  console.error('❌ Failed to start application:', error);
  process.exit(1);
});