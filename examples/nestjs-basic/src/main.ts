import 'reflect-metadata';
import 'dotenv/config'; // populates process.env from .env before Nest bootstraps

import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@dyanet/nestjs-config-aws';

import { AppModule } from './app.module';
import type { AppConfig } from './config.schema';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService) as ConfigService<AppConfig>;
  const port = config.get('PORT');
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`Listening on http://localhost:${port}`);
}

void bootstrap();
