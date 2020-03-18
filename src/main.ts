import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as rateLimit from 'express-rate-limit';
import express = require('express');

import { AppModule } from './app.module';
import { AuthGuard } from './auth/auth.guard';
import { ConfigService } from './config/config.service';

async function bootstrap(): Promise<void> {
  const config = new ConfigService();
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // see https://expressjs.com/en/guide/behind-proxies.html and
  // https://github.com/expressjs/session/issues/251. In short you'll also
  // have to set `RequestHeader set X-Forwarded-Proto "https"` in Apache.
  app.set('trust proxy', true);

  // Azure uses x-arr-ssl header instead of x-forwarded-proto. Therefore we
  // add middleware that will trick Express into thinking the request is secure.
  // See http://scottksmith.com/blog/2014/08/22/using-secure-cookies-in-node-on-azure/
  app.use((req, res, next) => {
    if (req.headers['x-arr-ssl'] && !req.headers['x-forwarded-proto']) {
      req.headers['x-forwarded-proto'] = 'https';
    }
    return next();
  });

  app.useGlobalGuards(new AuthGuard());
  app.enableCors();
  app.use(
    express.urlencoded({ extended: false }),
    express.json({ type: () => true }),
    rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
    }),
  );
  app.setGlobalPrefix('api');
  await app.listen(config.port, config.bindingHost);
}
bootstrap();
