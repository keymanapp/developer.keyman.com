import { Injectable } from '@nestjs/common';
import { Observable, from } from 'rxjs';
import { map, flatMap } from 'rxjs/operators';
import * as simplegit from 'simple-git/promise';
import { CommitSummary, FetchResult, PullResult, Options } from 'simple-git/promise';
import { ListLogSummary, DefaultLogFields, BranchSummary } from 'simple-git/typings/response';

import fs = require('fs');
import path = require('path');

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
      console.log(`calling: git ${command}`);
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
    return new Promise(resolve => {
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
    remoteUrl: string,
    localPath: string,
    bare: boolean = false,
    remoteName?: string,
  ): Promise<string> {
    if (!path.isAbsolute(localPath)) {
      throw new Error('relative path');
    }

    const options = [];
    if (bare) {
      options.push('--bare');
    }
    if (remoteName) {
      options.push(`--origin=${remoteName}`);
    }

    await this.git.clone(remoteUrl, localPath, options);
    await this.git.cwd(localPath);
    await this.addDefaultConfig();
    return localPath;
  }

  public async export(
    repoDir: string,
    commit: string,
    rangeOption: string = null,
  ): Promise<string[]> {
    const args = [];
    args.push('format-patch');
    if (rangeOption) {
      args.push(rangeOption);
    }
    args.push(commit);
    await this.git.cwd(repoDir);
    return this.git.raw(args).then(patchNames => {
      const result = [];
      for (const patch of patchNames.trim().split('\n')) {
        result.push(path.join(repoDir, patch.trim()));
      }
      return result;
    });
  }

  public async import(repoDir: string, patchFiles: string[]): Promise<void> {
    await this.git.cwd(repoDir);
    for (const patchFile of patchFiles) {
      await this.git.raw(['am', patchFile]);
    }
    return;
  }

  public importFiles(repoDir: string, patchFiles: Observable<string>): Observable<void> {
    return from(this.git.cwd(repoDir)).pipe(
      flatMap(() => patchFiles),
      flatMap(patchFile => this.git.raw(['am', patchFile])),
      map(() => { return; }),
    );
  }

  public async log(
    repoDir: string,
    options?: {},
  ): Promise<ListLogSummary<DefaultLogFields>> {
    await this.git.cwd(repoDir);
    if (options) {
      return this.git.log(options);
    }
    return this.git.log();
  }

  public async checkoutBranch(
    repoDir: string,
    name: string,
    trackingBranch?: string,
  ): Promise<void> {
    await this.git.cwd(repoDir);
    if (await this.isBranch(repoDir, name)) {
      return this.git.checkout(name);
    }

    if (trackingBranch) {
      return this.git.checkoutBranch(name, trackingBranch);
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

  public async fetch(
    repoDir: string,
    remote: string,
    remoteBranch: string,
  ): Promise<FetchResult> {
    await this.git.cwd(repoDir);
    return this.git.fetch(remote, remoteBranch);
  }

  public async pull(
    repoDir: string,
    remote?: string,
    branch?: string,
  ): Promise<PullResult> {
    await this.git.cwd(repoDir);
    if (remote) {
      return this.git.pull(remote, branch);
    }
    return this.git.pull();
  }

  public async isGitRepo(repoDir: string): Promise<boolean> {
    return new Promise(resolve => {
      fs.access(repoDir, fs.constants.R_OK, async err => {
        if (err) {
          resolve(false);
        } else {
          await this.git.cwd(repoDir);
          resolve(await this.git.checkIsRepo());
        }
      });
    });
  }

  public async hasRemote(
    repoDir: string,
    remoteName: string,
  ): Promise<boolean> {
    await this.git.cwd(repoDir);
    const remotes = await this.git.getRemotes(false);
    for (const remote of remotes) {
      if (remote.name === remoteName) {
        return true;
      }
    }
    return false;
  }

  public async addRemote(
    repoDir: string,
    remoteName: string,
    remoteRepo: string,
  ): Promise<void> {
    await this.git.cwd(repoDir);
    return this.git.addRemote(remoteName, remoteRepo);
  }
}
