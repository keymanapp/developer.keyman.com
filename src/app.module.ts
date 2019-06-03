import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { CookieParserMiddleware } from '@nest-middlewares/cookie-parser';
import { HelmetMiddleware } from '@nest-middlewares/helmet';
import { ExpressSessionMiddleware } from '@nest-middlewares/express-session';

import { AngularModule } from './angular/angular.module';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from './config/config.module';
import { ConfigService } from './config/config.service';

@Module({
  imports: [
    AngularModule.forRoot({
      rootPath: 'frontend/dist/frontend',
    }),
    AuthModule,
    ConfigModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule implements NestModule {
  constructor(private readonly configService: ConfigService) { }

  configure(consumer: MiddlewareConsumer) {
    CookieParserMiddleware.configure(this.configService.sessionSecret);
    HelmetMiddleware.configure({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
        },
      },
      frameguard: {
        action: 'deny',
      },
    });

    const cookie = {
      maxAge: this.configService.cookieMaxAge,
      httpOnly: false,
      secure: true,
      expires: new Date(
        new Date().getTime() +
        this.configService.expiresDays * 24 * 60 * 60 * 1000, // 24 hrs * 60 min * 60 sec * 1000 ms
      ),
    };

    if (process.env.NODE_ENV !== 'production') {
      cookie.secure = false;
    }

    ExpressSessionMiddleware.configure({
      secret: this.configService.sessionSecret,
      cookie,
      saveUninitialized: false,
      resave: false,
    });

    consumer.apply(CookieParserMiddleware).forRoutes('/');
    consumer.apply(HelmetMiddleware).forRoutes('/');
    consumer.apply(ExpressSessionMiddleware).forRoutes('/');

    // NOTE: Adding CSRF protection for the API is counter productive
    // see https://github.com/pillarjs/understanding-csrf
  }
}
