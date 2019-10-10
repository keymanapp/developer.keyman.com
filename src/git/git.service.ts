import { Injectable } from '@nestjs/common';
import * as simplegit from 'simple-git/promise';

import fs = require('fs');
import path = require('path');
import { CommitSummary, FetchResult, PullResult } from 'simple-git/promise';
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

  public async createRepo(
    repoPath: string,
    bare: boolean = false,
  ): Promise<string> {
    fs.mkdirSync(repoPath);
    await this.git.cwd(repoPath).then(async () => {
      await this.git.init(bare);
    });
    return repoPath;
  }

  public async addFile(repoDir: string, filename: string): Promise<void> {
    await this.git.cwd(repoDir);
    return await this.git.add(filename);
  }

  public async commit(
    repoDir: string,
    message: string,
  ): Promise<CommitSummary> {
    await this.git.cwd(repoDir);
    return await this.git.commit(message);
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
}
