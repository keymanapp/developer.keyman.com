import { Injectable } from '@nestjs/common';
import * as simplegit from 'simple-git/promise';

import fs = require('fs');
import path = require('path');
import { CommitSummary, FetchResult, PullResult, Options } from 'simple-git/promise';
import { ListLogSummary, DefaultLogFields, BranchSummary } from 'simple-git/typings/response';

@Injectable()
export class GitService {
  private git: simplegit.SimpleGit;

  constructor() {
    this.git = simplegit();
  }

  /*
  constructor() {
    this.git = simplegit();
    this.git.outputHandler((command, stdout, stderr) => {
      console.log(command);
      stdout.pipe(process.stdout);
      stderr.pipe(process.stderr);
    });
  }
  */

  private async addDefaultConfig(): Promise<void> {
    // Set default values
    await this.git.addConfig('user.name', 'Keyman Developer Online');
    await this.git.addConfig('user.email', 'kdo@example.com');
    await this.git.addConfig('commit.gpgSign', 'false');
  }

  public async createRepo(
    repoPath: string,
    bare: boolean = false,
  ): Promise<string> {
    return new Promise((resolve) => {
      fs.mkdir(repoPath, async () => {
        await this.git.cwd(repoPath);
        await this.git.init(bare);
        await this.addDefaultConfig();
        resolve(repoPath);
      });
    });
  }

  public async addFile(repoDir: string, filename: string): Promise<void> {
    await this.git.cwd(repoDir);
    return await this.git.add(filename);
  }

  public async commit(
    repoDir: string,
    message: string,
    options?: Options,
  ): Promise<CommitSummary> {
    await this.git.cwd(repoDir);
    return await this.git.commit(message, null, options);
  }

  public async clone(
    repoPath: string,
    localPath: string,
    options: string[] = null,
  ): Promise<string> {
    if (!path.isAbsolute(localPath)) {
      throw new Error('relative path');
    }
    return this.git.clone(repoPath, localPath, options).then(async () => {
      await this.git.cwd(localPath);

      await this.addDefaultConfig();
      return localPath;
    });
  }

  public async export(repoDir: string, commit: string): Promise<string> {
    await this.git.cwd(repoDir);
    return this.git
      .raw(['format-patch', '-1', commit])
      .then(patchName => path.join(repoDir, patchName.trim()));
  }

  public async import(repoDir: string, patchFile: string): Promise<void> {
    await this.git.cwd(repoDir);
    return this.git.raw(['am', patchFile]).then(output => {
      return;
    });
  }

  public async log(repoDir: string): Promise<ListLogSummary<DefaultLogFields>> {
    await this.git.cwd(repoDir);
    return this.git.log({ '-1': null });
  }

  public async checkoutBranch(repoDir: string, name: string): Promise<void> {
    await this.git.cwd(repoDir);
    if (await this.isBranch(repoDir, name)) {
      return this.git.checkout(name);
    }

    return this.git.checkoutLocalBranch(name);
  }

  public async getBranches(repoDir: string): Promise<BranchSummary> {
    await this.git.cwd(repoDir);
    return this.git.branchLocal();
  }

  public async isBranch(repoDir: string, name: string): Promise<boolean> {
    await this.git.cwd(repoDir);
    return this.git
      .branchLocal()
      .then(
        branchSummary =>
          branchSummary.all.findIndex(value => value === name) !== -1,
      );
  }

  public async currentBranch(repoDir: string): Promise<string> {
    await this.git.cwd(repoDir);
    return this.git.branchLocal().then(branchSummary => branchSummary.current);
  }

  public async push(
    repoDir: string,
    remote: string,
    branch: string,
  ): Promise<void> {
    await this.git.cwd(repoDir);
    return this.git.push(remote, branch);
  }

  public async fetch(repoDir: string, remote: string): Promise<FetchResult> {
    await this.git.cwd(repoDir);
    return this.git.fetch(remote);
  }

  public async pull(
    repoDir: string,
    remote: string,
    branch: string,
  ): Promise<PullResult> {
    await this.git.cwd(repoDir);
    return this.git.pull(remote, branch);
  }

  public async isGitRepo(repoDir: string): Promise<boolean> {
    return new Promise((resolve) => {
      fs.access(repoDir, fs.constants.R_OK, async (err) => {
        if (err) {
          resolve(false);
        } else {
          await this.git.cwd(repoDir);
          resolve(await this.git.checkIsRepo());
        }
      });
    });
  }
}
