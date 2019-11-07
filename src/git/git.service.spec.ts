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
    jest.setTimeout(10000/*10s*/);
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
    await Promise.all([service.addFile(repoDir, filePath1), service.addFile(repoDir, filePath2)]);
    return await service.commit(repoDir, msg);
  }

  async function addCommit(
    service: GitService,
    repoDir: string,
    file: string,
    textToAppend: string,
    commitMessage: string): Promise<CommitSummary> {
    fs.appendFileSync(file, textToAppend);
    await service.addFile(repoDir, file);
    return await service.commit(repoDir, commitMessage);
  }

  it('should be defined', () => {
    expect(sut).toBeDefined();
  });

  it('Can create git repo', async () => {
    expect.assertions(2);
    const expectedRepoDir = path.join(tmpDir, 'mytest');
    const dir = await sut.createRepo(expectedRepoDir);
    expect(dir).toEqual(expectedRepoDir);
    expect(fs.existsSync(path.join(expectedRepoDir, '.git'))).toBeTruthy();
  });

  it('can add files and commit', async () => {
    expect.assertions(2);

    const repoDir = await sut.createRepo(path.join(tmpDir, 'mytest'));
    const commitSummary = await createInitialCommit(sut, repoDir);

    expect(commitSummary.branch).toEqual('master');
    expect(commitSummary.commit).toBeTruthy();
  });

  it('can determine latest commit', async () => {
    expect.assertions(2);
    const repoDir = await sut.createRepo(path.join(tmpDir, 'mytest'));
    await createInitialCommit(sut, repoDir);
    const secondCommit = await addCommit(sut, repoDir, path.join(repoDir, 'somefile1.txt'), 'Additional text', 'second commit');

    const log = await sut.log(repoDir);
    const expected = new RegExp(`^${secondCommit.commit}.+`);
    expect(log.latest.hash).toMatch(expected);
    expect(log.total).toEqual(1);
  });

  it('fails clone if relative path', async () => {
    expect.assertions(1);

    // Setup
    const repoDir = await sut.createRepo(path.join(tmpDir, 'mytest'));
    await createInitialCommit(sut, repoDir);

    // Execute/Verify
    await expect(sut.clone(repoDir, 'clonedRepo')).rejects.toEqual(new Error('relative path'));
  });

  it('can clone the repo with correct path if localname contains full path', async () => {
    expect.assertions(4);

    // Setup
    const repoDir = await sut.createRepo(path.join(tmpDir, 'mytest'));
    await createInitialCommit(sut, repoDir);

    // Execute/Verify
    const cloneDir = await sut.clone(repoDir, path.join(tmpDir, 'clonedRepo'));
    expect(cloneDir).toEqual(path.join(tmpDir, 'clonedRepo'));
    expect(fs.existsSync(path.join(cloneDir, '.git'))).toBeTruthy();
    expect(fs.existsSync(path.join(cloneDir, 'somefile1.txt'))).toBeTruthy();
    expect(fs.existsSync(path.join(cloneDir, 'somefile2.txt'))).toBeTruthy();
  });

  it('can export and import patch', async () => {
    expect.assertions(2);

    // Setup
    const repoDir = await sut.createRepo(path.join(tmpDir, 'mytest'));
    const commit = await createInitialCommit(sut, repoDir);

    // Execute
    const patch = await sut.export(repoDir, 'HEAD');
    expect(patch).toEqual(path.join(repoDir, '0001-my-commit-message.patch'));

    const secondRepoDir = await sut.createRepo(path.join(tmpDir, 'secondRepo'));
    await sut.import(secondRepoDir, patch);

    // Verify
    const log = await sut.log(secondRepoDir);
    expect(log.total).toEqual(1);
  });

  it('can create new branch', async () => {
    expect.assertions(5);

    // Setup
    const repoDir = await sut.createRepo(path.join(tmpDir, 'mytest'));
    await createInitialCommit(sut, repoDir);

    // Execute
    await sut.checkoutBranch(repoDir, 'test');
    await addCommit(
      sut,
      repoDir,
      path.join(repoDir, 'somefile1.txt'),
      'Additional text',
      'commit on test branch',
    );

    // Verify
    const branchSummary = await sut.getBranches(repoDir);
    expect(branchSummary.all).toContain('test');
    expect(branchSummary.current).toEqual('test');
    expect(branchSummary.branches.test.label).toEqual('commit on test branch');
    expect(branchSummary.branches.master.label).toEqual('my commit message');
    expect(branchSummary.branches.test.commit).not.toEqual(branchSummary.branches.master.commit);
  });

  it('trying to create an existing branch does not fail', async () => {
    expect.assertions(5);

    // Setup
    const repoDir = await sut.createRepo(path.join(tmpDir, 'mytest'));
    await createInitialCommit(sut, repoDir);
    await sut.checkoutBranch(repoDir, 'test');
    await addCommit(
      sut,
      repoDir,
      path.join(repoDir, 'somefile1.txt'),
      'Additional text',
      'commit on test branch',
    );

    // Execute
    await sut.checkoutBranch(repoDir, 'test');

    // Verify
    const branchSummary = await sut.getBranches(repoDir);
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
    const repoDir = await sut.createRepo(path.join(tmpDir, 'mytest'));
    await createInitialCommit(sut, repoDir);
    await sut.checkoutBranch(repoDir, 'test');

    // Execute
    const isBranch = await sut.isBranch(repoDir, 'test');

    // Verify
    expect(isBranch).toBeTruthy();
  });

  it('can get current branch', async () => {
    expect.assertions(2);

    // Setup
    const repoDir = await sut.createRepo(path.join(tmpDir, 'mytest'));
    await createInitialCommit(sut, repoDir);
    await sut.checkoutBranch(repoDir, 'test');

    // Execute/Verify
    expect(await sut.currentBranch(repoDir)).toEqual('test');
    await sut.checkoutBranch(repoDir, 'master');
    expect(await sut.currentBranch(repoDir)).toEqual('master');
  });

  it('can push', async () => {
    expect.assertions(1);

    // Setup
    const bareRepoDir = await sut.createRepo(path.join(tmpDir, 'bareRepo'), true);
    const clonedDir = await sut.clone(bareRepoDir, path.join(tmpDir, 'clonedRepo'));
    await createInitialCommit(sut, clonedDir);
    const commit = await addCommit(
      sut,
      clonedDir,
      path.join(clonedDir, 'somefile1.txt'),
      'Additional text',
      'commit on test branch',
    );

    // Execute
    await sut.push(clonedDir, 'origin', 'master');

    // Verify
    const log = await sut.log(bareRepoDir);
    const expected = new RegExp(`^${commit.commit}.+`);
    expect(log.latest.hash).toMatch(expected);
  });

  it('can pull', async () => {
    expect.assertions(1);

    // Setup
    const repoDir = await sut.createRepo(path.join(tmpDir, 'mytest'));
    await createInitialCommit(sut, repoDir);
    const clonedDir = await sut.clone(repoDir, path.join(tmpDir, 'clonedRepo'));
    const commit = await addCommit(
      sut,
      repoDir,
      path.join(repoDir, 'somefile1.txt'),
      'Additional text',
      'commit on test branch',
    );

    // Execute (pull from mytest to clonedRepo)
    await sut.pull(clonedDir, 'origin', 'master');

    // Verify
    const log = await sut.log(clonedDir);
    const expected = new RegExp(`^${commit.commit}.+`);
    expect(log.latest.hash).toMatch(expected);
  });

  it('isGitRepo returns false for normal directory', async () => {
    expect.assertions(1);

    // Setup
    const repoPath = path.join(tmpDir, 'normalDir');
    fs.mkdirSync(repoPath);

    // Execute
    const isRepo = await sut.isGitRepo(repoPath);

    // Verify
    expect(isRepo).toEqual(false);
  });

  it('isGitRepo returns false for non-existing directory', async () => {
    expect.assertions(1);

    // Setup
    const repoPath = path.join(tmpDir, 'non-existing');

    // Execute
    const isRepo = await sut.isGitRepo(repoPath);

    // Verify
    expect(isRepo).toEqual(false);
  });

  it('isGitRepo returns true for git directory', async () => {
    expect.assertions(1);

    // Setup
    const repoPath = path.join(tmpDir, 'normalDir');
    await sut.createRepo(repoPath);

    // Execute
    const isRepo = await sut.isGitRepo(repoPath);

    // Verify
    expect(isRepo).toEqual(true);
  });
});
