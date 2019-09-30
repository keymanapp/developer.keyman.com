import { Test, TestingModule } from '@nestjs/testing';
import { deleteFolderRecursive } from '../utils/delete-folder';
import { GitService } from './git.service';

import fs = require('fs');
import os = require('os');
import path = require('path');
import { CommitSummary } from 'simple-git/promise';

describe('GitService', () => {
  let sut: GitService;
  let tmpDir: string;
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [GitService],
    }).compile();

    const prefix = path.join(os.tmpdir(), 'gitrepotest-');
    tmpDir = fs.mkdtempSync(prefix);
    sut = module.get<GitService>(GitService);
    sut.workingDirectory = tmpDir;
  });

  afterEach(() => {
    deleteFolderRecursive(tmpDir);
  });

  async function createInitialCommit(
    service: GitService,
    repoDir: string,
    msg = 'my commit message',
  ): Promise<CommitSummary> {
    const filePath1 = path.join(repoDir, 'somefile1.txt');
    const filePath2 = path.join(repoDir, 'somefile2.txt');
    fs.appendFileSync(filePath1, 'some text');
    fs.appendFileSync(filePath2, 'other text');
    await Promise.all([service.addFile(filePath1), service.addFile(filePath2)]);
    return service.commit(msg);
  }

  async function addCommit(
    service: GitService,
    file: string,
    textToAppend: string,
    commitMessage: string): Promise<CommitSummary> {
    fs.appendFileSync(file, textToAppend);
    await service.addFile(file);
    return service.commit(commitMessage);
  }

  it('should be defined', () => {
    expect(sut).toBeDefined();
  });

  it('Can set and get workingDirectory', () => {
    sut.workingDirectory = '/tmp/foo';
    expect(sut.workingDirectory).toEqual('/tmp/foo');
  });

  it('Can create git repo', async () => {
    expect.assertions(2);
    const dir = await sut.createRepo('mytest');
    expect(dir).toEqual(path.join(tmpDir, 'mytest'));
    expect(
      fs.existsSync(path.join(tmpDir, 'mytest', '.git')),
    ).toBeTruthy();
  });

  it('can add files and commit', async () => {
    expect.assertions(2);

    const repoDir = await sut.createRepo('mytest');
    const commitSummary = await createInitialCommit(sut, repoDir);

    expect(commitSummary.branch).toEqual('master');
    expect(commitSummary.commit).toBeTruthy();
  });

  it('can determine latest commit', async () => {
    expect.assertions(2);
    const repoDir = await sut.createRepo('mytest');
    await createInitialCommit(sut, repoDir);
    const secondCommit = await addCommit(sut, path.join(repoDir, 'somefile1.txt'), 'Additional text', 'second commit');

    const log = await sut.log();
    const expected = new RegExp(`^${secondCommit.commit}.+`);
    expect(log.latest.hash).toMatch(expected);
    expect(log.total).toEqual(1);
  });

  it('can clone the repo', async () => {
    expect.assertions(3);

    // Setup
    const repoDir = await sut.createRepo('mytest');
    await createInitialCommit(sut, repoDir);

    // Execute/Verify
    await sut.clone(repoDir, 'clonedRepo').then(cloneDir => {
      expect(fs.existsSync(path.join(cloneDir, '.git'))).toBeTruthy();
      expect(fs.existsSync(path.join(cloneDir, 'somefile1.txt'))).toBeTruthy();
      expect(fs.existsSync(path.join(cloneDir, 'somefile2.txt'))).toBeTruthy();
    });
  });

  it('can export and import patch', async () => {
    expect.assertions(2);

    // Setup
    const repoDir = await sut.createRepo('mytest');
    const commit = await createInitialCommit(sut, repoDir);

    // Execute
    const patch = await sut.export('HEAD');
    expect(patch).toEqual(path.join(repoDir, '0001-my-commit-message.patch'));

    const secondRepoDir = await sut.createRepo('secondRepo');
    await sut.import(patch);

    // Verify
    const log = await sut.log();
    expect(log.total).toEqual(1);
  });

  it('can create new branch', async () => {
    expect.assertions(5);

    // Setup
    const repoDir = await sut.createRepo('mytest');
    await createInitialCommit(sut, repoDir);

    // Execute
    await sut.checkoutBranch('test');
    await addCommit(sut, path.join(repoDir, 'somefile1.txt'),
      'Additional text', 'commit on test branch');

    // Verify
    const branchSummary = await sut.getBranches();
    expect(branchSummary.all).toContain('test');
    expect(branchSummary.current).toEqual('test');
    expect(branchSummary.branches.test.label).toEqual('commit on test branch');
    expect(branchSummary.branches.master.label).toEqual('my commit message');
    expect(branchSummary.branches.test.commit).not.toEqual(branchSummary.branches.master.commit);
  });

  it('trying to create an existing branch does not fail', async () => {
    expect.assertions(5);

    // Setup
    const repoDir = await sut.createRepo('mytest');
    await createInitialCommit(sut, repoDir);
    await sut.checkoutBranch('test');
    await addCommit(
      sut,
      path.join(repoDir, 'somefile1.txt'),
      'Additional text',
      'commit on test branch',
    );

    // Execute
    await sut.checkoutBranch('test');

    // Verify
    const branchSummary = await sut.getBranches();
    expect(branchSummary.all).toContain('test');
    expect(branchSummary.current).toEqual('test');
    expect(branchSummary.branches.test.label).toEqual('commit on test branch');
    expect(branchSummary.branches.master.label).toEqual('my commit message');
    expect(branchSummary.branches.test.commit).not.toEqual(
      branchSummary.branches.master.commit,
    );
  });

  it('can check that branch exists', async () => {
    expect.assertions(1);

    // Setup
    const repoDir = await sut.createRepo('mytest');
    await createInitialCommit(sut, repoDir);
    await sut.checkoutBranch('test');

    // Execute
    const isBranch = await sut.isBranch('test');

    // Verify
    expect(isBranch).toBeTruthy();
  });

  it('can get current branch', async () => {
    expect.assertions(2);

    // Setup
    const repoDir = await sut.createRepo('mytest');
    await createInitialCommit(sut, repoDir);
    await sut.checkoutBranch('test');

    // Execute/Verify
    expect(await sut.currentBranch()).toEqual('test');
    await sut.checkoutBranch('master');
    expect(await sut.currentBranch()).toEqual('master');
  });

  it('can push', async () => {
    // Setup
    const bareRepoDir = await sut.createRepo('bareRepo', true);
    const clonedDir = await sut.clone(bareRepoDir, 'clonedRepo');
    await createInitialCommit(sut, clonedDir);
    const commit = await addCommit(
      sut,
      path.join(clonedDir, 'somefile1.txt'),
      'Additional text',
      'commit on test branch',
    );

    // Execute
    await sut.push('origin', 'master');

    // Verify
    await sut.setRepoDirectory(bareRepoDir);
    const log = await sut.log();
    const expected = new RegExp(`^${commit.commit}.+`);
    expect(log.latest.hash).toMatch(expected);
  });

  it('can pull', async () => {
    // Setup
    const repoDir = await sut.createRepo('mytest');
    await createInitialCommit(sut, repoDir);
    const clonedDir = await sut.clone(repoDir, 'clonedRepo');
    await sut.setRepoDirectory(repoDir);
    const commit = await addCommit(
      sut,
      path.join(repoDir, 'somefile1.txt'),
      'Additional text',
      'commit on test branch',
    );
    await sut.setRepoDirectory(clonedDir);

    // Execute (pull from mytest to clonedRepo)
    await sut.pull('origin', 'master');

    // Verify
    const log = await sut.log();
    const expected = new RegExp(`^${commit.commit}.+`);
    expect(log.latest.hash).toMatch(expected);
  });
});
