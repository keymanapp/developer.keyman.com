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
    localBranch: string,
    remoteName: string,
    remoteBranch: string = localBranch,
  ): Promise<string> {
    if (fs.existsSync(localRepo)) {
      if (!await this.gitService.hasRemote(localRepo, remoteName)) {
        await this.gitService.addRemote(localRepo, remoteName, remoteRepo);
        await this.gitService.fetch(localRepo, remoteName, remoteBranch);
      }
      const branchExists = await this.gitService.isBranch(localRepo, localBranch);
      if (!branchExists) {
        await this.checkoutBranch(localRepo, localBranch, `${remoteName}/${remoteBranch}`);
      }
      return this.gitService.pull(localRepo, remoteName, remoteBranch).then(() => localRepo);
    } else {
      return this.gitService.clone(remoteRepo, localRepo, false, remoteName).then(async () => {
        return this.checkoutBranch(localRepo, localBranch, `${remoteName}/${remoteBranch}`);
      });
    }
  }

  private async checkoutBranch(
    localRepo: string,
    localBranch: string,
    remoteBranch?: string,
  ): Promise<string> {
    if (remoteBranch) {
      return this.gitService.checkoutBranch(localRepo, localBranch, remoteBranch).then(() => localRepo);
    }
    return this.gitService.checkoutBranch(localRepo, localBranch).then(() => localRepo);
  }

  public get branchName() {
    return 'master';
  }

  public get keyboardsRepoName() {
    return 'keyboards';
  }

  public get localKeyboardsRepo() {
    return path.join(this.config.workDirectory, this.keyboardsRepoName);
  }

  public getKeyboardId(repoName: string, localRepo: string): string {
    const keyboardInfoFile = path.join(localRepo, `${repoName}.keyboard_info`);
    if (fs.existsSync(keyboardInfoFile)) {
      const fileContent = fs.readFileSync(keyboardInfoFile);
      const data = JSON.parse(fileContent.toString());
      if (!!data.id) {
        return data.id;
      }
    }

    return repoName;
  }
}
