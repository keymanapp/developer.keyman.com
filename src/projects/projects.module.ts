import { Module } from '@nestjs/common';
import { BackendProjectModule } from '../backend-project/backend-project.module';
import { ConfigModule } from '../config/config.module';
import { GitModule } from '../git/git.module';
import { GithubModule } from '../github/github.module';
import { PullRequestModule } from '../pull-request/pull-request.module';
import { ProjectsController } from './projects.controller';

@Module({
  imports: [GithubModule, BackendProjectModule, ConfigModule, PullRequestModule, GitModule],
  controllers: [ProjectsController],
})
export class ProjectsModule {}
