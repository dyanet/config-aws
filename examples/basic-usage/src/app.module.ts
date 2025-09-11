import { Module } from '@nestjs/common';
import { ConfigModule } from 'nest-config-aws';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    // Basic configuration with default settings
    ConfigModule.forRoot({
      // Uses default configuration schema
      // Automatically loads from:
      // 1. Environment variables
      // 2. AWS Secrets Manager (if not in local mode)
      // 3. AWS SSM Parameter Store (if not in local mode)
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}