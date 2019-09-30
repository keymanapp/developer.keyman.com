import { Injectable } from '@nestjs/common';
import * as simplegit from 'simple-git/promise';

import fs = require('fs');
import path = require('path');
import { CommitSummary, FetchResult, PullResult } from 'simple-git/promise';
import { ListLogSummary, DefaultLogFields, BranchSummary } from 'simple-git/typings/response';

@Injectable()
export class GitService {
  private workDir: string;
  private repoDir: string;
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

  public set workingDirectory(dir: string) {
    this.workDir = dir;
  }

  public get workingDirectory(): string {
    return this.workDir;
  }

  public async setRepoDirectory(dir: string): Promise<string> {
    this.repoDir = dir;
    return this.git.cwd(dir);
  }

  public get repoDirectory(): string {
    return this.repoDir;
  }

  public async createRepo(name: string, bare: boolean = false): Promise<string> {
    this.repoDir = path.join(this.workDir, name);
    fs.mkdirSync(this.repoDir);
    await this.git.cwd(this.repoDir).then(async () => {
      await this.git.init(bare);
    });
    return this.repoDir;
  }

  public addFile(filename: string): Promise<void> {
    return this.git.add(filename);
  }

  public commit(message: string): Promise<CommitSummary> {
    return this.git.commit(message);
  }

  public async clone(
    repoPath: string,
    localPath: string,
    options: string[] = null,
  ): Promise<string> {
    this.repoDir = path.join(this.workDir, localPath);
    return this.git.clone(repoPath, this.repoDir, options).then(async () => {
      await this.git.cwd(this.repoDir);
      return this.repoDir;
    });
  }

  public async export(commit: string): Promise<string> {
    return this.git.raw(['format-patch', '-1', commit]).then(patchName => path.join(this.repoDirectory, patchName.trim()));
  }

  public async import(patchFile: string): Promise<void> {
    return this.git.raw(['am', patchFile]).then(output => { return; });
  }

  public async log(): Promise<ListLogSummary<DefaultLogFields>> {
    return this.git.log({ '-1': null });
  }

  public async checkoutBranch(name: string): Promise<void> {
    if (await this.isBranch(name)) {
      return this.git.checkout(name);
    }

    return this.git.checkoutLocalBranch(name);
  }

  public async getBranches(): Promise<BranchSummary> {
    return this.git.branchLocal();
  }

  public async isBranch(name: string): Promise<boolean> {
    return this.git.branchLocal().then(branchSummary => branchSummary.all.findIndex((value) => value === name) !== -1);
  }

  public async currentBranch(): Promise<string> {
    return this.git.branchLocal().then(branchSummary => branchSummary.current);
  }

  public async push(remote: string, branch: string): Promise<void> {
    return this.git.push(remote, branch);
  }

  public async fetch(remote: string): Promise<FetchResult> {
    return this.git.fetch(remote);
  }

  public async pull(remote: string, branch: string): Promise<PullResult> {
    return this.git.pull(remote, branch);
  }
}
