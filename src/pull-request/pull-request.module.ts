import { Module } from '@nestjs/common';
import { GitModule } from '../git/git.module';
import { GithubModule } from '../github/github.module';
import { ConfigModule } from '../config/config.module';
import { PullRequestService } from './pull-request.service';

@Module({
  imports: [GithubModule, ConfigModule, GitModule],
  providers: [PullRequestService],
  exports: [PullRequestService],
})
export class PullRequestModule {}
