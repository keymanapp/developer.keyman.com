import { Module } from '@nestjs/common';
import { BackendProjectService } from './backend-project.service';
import { ConfigModule } from '../config/config.module';
import { GitModule } from '../git/git.module';

@Module({
  imports: [ConfigModule, GitModule],
  providers: [BackendProjectService],
  exports: [BackendProjectService],
})
export class BackendProjectModule {}
