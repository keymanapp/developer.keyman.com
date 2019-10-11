import { Injectable } from '@nestjs/common';
import fs = require('fs');
import path = require('path');

import { ConfigService } from '../config/config.service';
import { GitService } from '../git/git.service';

@Injectable()
export class BackendProjectService {
  constructor(private config: ConfigService, private gitService: GitService) {}

  public getProjectRepo(userName: string, projectName: string): string {
    return path.join(this.config.workDirectory, `${userName}-${projectName}`);
  }

  public async cloneOrUpdateProject(
    remoteRepo: string,
    localRepo: string,
    branch: string,
  ): Promise<string> {
    if (fs.existsSync(localRepo)) {
      return this.gitService.pull(localRepo, remoteRepo, branch).then(() => localRepo);
    } else {
      return this.gitService.clone(remoteRepo, localRepo).then(async () => {
        await this.gitService.checkoutBranch(localRepo, branch);
        return localRepo;
      });
    }
  }
}
