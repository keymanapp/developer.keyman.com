import { Module } from '@nestjs/common';
import { GitService } from './git.service';

@Module({
  imports: [],
  providers: [GitService],
  exports: [GitService],
})
export class GitModule {}
