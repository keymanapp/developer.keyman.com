import { NestFactory } from '@nestjs/core';
import * as cookieParser from 'cookie-parser';
import * as csurf from 'csurf';
import * as helmet from 'helmet';
import * as rateLimit from 'express-rate-limit';
import * as session from 'express-session';
import { AppModule } from './app.module';
import { ConfigService } from './config/config.service';

async function bootstrap() {
  const config = new ConfigService();
  const app = await NestFactory.create(AppModule);

  app.use(cookieParser(config.sessionSecret));

  const expires = new Date(
    new Date().getTime() +
      config.expiresDays * 24 * 60 * 60 * 1000, // 24 hrs * 60 min * 60 sec * 1000 ms
  );

  const cookie = {
    maxAge: config.cookieMaxAge,
    httpOnly: false,
    secure: true,
    expires,
  };

  if (process.env.NODE_ENV !== 'production') {
    cookie.secure = false;
  }

  const sessionConfig = {
    secret: config.sessionSecret,
    cookie,
    saveUninitialized: false,
    resave: false,
  };

  app.use(session(sessionConfig));
  app.enableCors();
  app.use(
    csurf(),
    helmet(),
    new rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 100,
    }),
  );
  app.setGlobalPrefix('api');
  await app.listen(config.port);
}
bootstrap();
