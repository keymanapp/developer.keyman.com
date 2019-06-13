import { Module, HttpModule, MiddlewareConsumer } from '@nestjs/common';
import { CookieSessionMiddleware } from '@nest-middlewares/cookie-session';
import { UserController } from './user/user.controller';
import { TokenService } from './token/token.service';
import { ConfigModule } from '../config/config.module';
import { GithubModule } from '../github/github.module';

@Module({
  imports: [
    ConfigModule,
    HttpModule,
    GithubModule,
  ],
  controllers: [UserController],
  providers: [TokenService],
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
