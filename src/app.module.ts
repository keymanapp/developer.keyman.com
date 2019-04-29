import { Module, NestModule, MiddlewareConsumer, HttpModule } from '@nestjs/common';
import { HelmetMiddleware } from '@nest-middlewares/helmet';
import { AppController } from './app.controller';
import { AppService } from './app.service';

import { AngularModule } from './angular/angular.module';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from './config/config.module';

@Module({
  imports: [
    AngularModule.forRoot({
      rootPath: 'frontend/dist/frontend',
    }),
    AuthModule,
    ConfigModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(HelmetMiddleware).forRoutes('/');
  }
}
