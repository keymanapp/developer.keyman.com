import { NestFactory } from '@nestjs/core';
import * as rateLimit from 'express-rate-limit';
import express = require('express');

import { AppModule } from './app.module';
import { AuthGuard } from './auth/auth.guard';
import { ConfigService } from './config/config.service';

async function bootstrap() {
  const config = new ConfigService();
  const app = await NestFactory.create(AppModule);

  app.useGlobalGuards(new AuthGuard());
  app.enableCors();
  app.use(
    express.urlencoded({ extended: false }),
    express.json({ type: () => true }),
    new rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
    }),
  );
  app.setGlobalPrefix('api');
  await app.listen(config.port);
}
bootstrap();
