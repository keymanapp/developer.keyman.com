import { Module } from '@nestjs/common';

import { ConfigService } from '../config/config.service';
import { GithubService } from './github.service';

@Module({
  imports: [ConfigService],
  providers: [GithubService],
  exports: [GithubService],
})
export class GithubModule {}
