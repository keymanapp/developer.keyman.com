import { Module, HttpModule } from '@nestjs/common';

import { TokenModule } from '../token/token.module';
import { ConfigModule } from '../config/config.module';
import { GithubService } from './github.service';

@Module({
  imports: [ConfigModule, HttpModule, TokenModule],
  providers: [GithubService],
  exports: [GithubService],
})
export class GithubModule {}
