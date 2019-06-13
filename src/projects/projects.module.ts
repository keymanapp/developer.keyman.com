import { Module } from '@nestjs/common';
import { GithubModule } from '../github/github.module';
import { ProjectsController } from './projects.controller';

@Module({
  imports: [GithubModule],
  controllers: [ProjectsController],
})
export class ProjectsModule {}
