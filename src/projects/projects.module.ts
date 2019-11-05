import { Module } from '@nestjs/common';
import { BackendProjectModule } from '../backend-project/backend-project.module';
import { GithubModule } from '../github/github.module';
import { ProjectsController } from './projects.controller';

@Module({
  imports: [GithubModule, BackendProjectModule],
  controllers: [ProjectsController],
})
export class ProjectsModule {}
