import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AngularModule } from './angular/angular.module';

@Module({
  imports: [
    AngularModule.forRoot({
      rootPath: 'frontend/dist/frontend'
    })
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
