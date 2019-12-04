import { Injectable } from '@nestjs/common';
import { GitService } from '../git/git.service';

@Injectable()
export class PullRequestService {
  constructor(private gitService: GitService) {}

  public async extractPatches(localRepo: string): Promise<string[]> {
    return this.gitService.export(localRepo, 'HEAD', '--root');
  }
}
