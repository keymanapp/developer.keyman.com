import { Module, HttpModule, MiddlewareConsumer } from '@nestjs/common';
import { CookieSessionMiddleware } from '@nest-middlewares/cookie-session';
import { UserController } from './user/user.controller';
import { GithubService } from './github/github.service';
import { TokenService } from './token/token.service';
import { ConfigModule } from '../config/config.module';

@Module({
  imports: [
    ConfigModule,
    HttpModule,
  ],
  controllers: [UserController],
  providers: [GithubService, TokenService],
})
export class AuthModule {
  constructor(private readonly tokenService: TokenService) { }

  configure(consumer: MiddlewareConsumer) {
    CookieSessionMiddleware.configure({
      name: 'session',
      secret: this.tokenService.createRandomString(15),
    });
    consumer.apply(CookieSessionMiddleware).forRoutes('/api');
  }
}
