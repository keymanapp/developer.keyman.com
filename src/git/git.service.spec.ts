import { Test, TestingModule } from '@nestjs/testing';
import { from } from 'rxjs';
import { CommitSummary } from 'simple-git/promise';
import * as simplegit from 'simple-git/promise';
import { deleteFolderRecursive } from '../utils/delete-folder';
import { GitService } from './git.service';

import fs = require('fs');
import os = require('os');
import path = require('path');

describe('GitService', () => {
  let sut: GitService;
  let tmpDir: string;
  let module: TestingModule;
  let git: simplegit.SimpleGit;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [GitService],
    }).compile();

    const prefix = path.join(os.tmpdir(), 'gitrepotest-');
    tmpDir = fs.mkdtempSync(prefix);
    sut = module.get<GitService>(GitService);
    git = simplegit();
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

  describe('createRepo', () => {
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
  });

  describe('log', () => {
    it('can determine latest commit', async () => {
      // Setup
      expect.assertions(2);
      const repoDir = await sut.createRepo(path.join(tmpDir, 'mytest'));
      await createInitialCommit(sut, repoDir);
      const secondCommit = await addCommit(sut, repoDir, path.join(repoDir, 'somefile1.txt'), 'Additional text', 'second commit');

      // Execute
      const log = await sut.log(repoDir, { '-1': null });

      // Verify
      const expected = new RegExp(`^${secondCommit.commit}.+`);
      expect(log.latest.hash).toMatch(expected);
      expect(log.total).toEqual(1);
    });

    it('gets all commits', async () => {
      // Setup
      expect.assertions(1);
      const repoDir = await sut.createRepo(path.join(tmpDir, 'mytest'));
      await createInitialCommit(sut, repoDir);
      await addCommit(sut, repoDir, path.join(repoDir, 'somefile1.txt'), 'Additional text', 'second commit');

      // Execute
      const log = await sut.log(repoDir);

      // Verify
      expect(log.total).toEqual(2);
    });
  });

  describe('clone', () => {
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

      // Execute
      const cloneDir = await sut.clone(repoDir, path.join(tmpDir, 'clonedRepo'));

      // Verify
      expect(cloneDir).toEqual(path.join(tmpDir, 'clonedRepo'));
      expect(fs.existsSync(path.join(cloneDir, '.git'))).toBeTruthy();
      expect(fs.existsSync(path.join(cloneDir, 'somefile1.txt'))).toBeTruthy();
      expect(fs.existsSync(path.join(cloneDir, 'somefile2.txt'))).toBeTruthy();
    });

    it('sets expected remote when cloning', async () => {
      // Setup
      expect.assertions(3);
      const repoDir = await sut.createRepo(path.join(tmpDir, 'mytest'));
      await createInitialCommit(sut, repoDir);

      // Execute
      const cloneDir = await sut.clone(repoDir, path.join(tmpDir, 'clonedRepo'), false, 'foo');

      // Verify
      expect(cloneDir).toEqual(path.join(tmpDir, 'clonedRepo'));
      expect(fs.existsSync(path.join(cloneDir, '.git'))).toBeTruthy();
      await git.cwd(cloneDir);
      const remotes = await git.getRemotes(false);
      expect(remotes[0].name).toEqual('foo');
    });
  });

  describe('export and import', () => {
    it('can export and import patch', async () => {
      expect.assertions(4);

      // Setup 1+2
      const repoDir = await sut.createRepo(path.join(tmpDir, 'mytest'));
      await createInitialCommit(sut, repoDir);
      const secondRepoDir = await sut.clone(repoDir, path.join(tmpDir, 'secondRepo'));
      await addCommit(
        sut,
        repoDir,
        path.join(repoDir, 'somefile1.txt'),
        'Additional text',
        'second commit',
      );
      let log = await sut.log(secondRepoDir);
      expect(log.total).toEqual(1);

      // Execute 1
      const patches = await sut.export(repoDir, 'HEAD', '-1');

      // Verify 1
      expect(patches.length).toEqual(1);
      expect(patches[0]).toEqual(path.join(repoDir, '0001-second-commit.patch'));

      // Execute 2
      await sut.import(secondRepoDir, patches);

      // Verify 2
      log = await sut.log(secondRepoDir);
      expect(log.total).toEqual(2);
    });

    it('can export and import multiple patches', async () => {
      // Setup 1
      expect.assertions(4);
      const repoDir = await sut.createRepo(path.join(tmpDir, 'mytest'));
      await createInitialCommit(sut, repoDir);
      await addCommit(sut, repoDir, path.join(repoDir, 'somefile1.txt'), 'Additional text', 'second commit');

      // Execute 1
      const patches = await sut.export(repoDir, 'HEAD', '--root');

      // Verify 1
      expect(patches.length).toEqual(2);
      expect(patches[0]).toEqual(path.join(repoDir, '0001-my-commit-message.patch'));
      expect(patches[1]).toEqual(path.join(repoDir, '0002-second-commit.patch'));

      // Setup 2
      const secondRepoDir = await sut.createRepo(path.join(tmpDir, 'secondRepo'));

      // Execute 2
      await sut.import(secondRepoDir, patches);

      // Verify 2
      const log = await sut.log(secondRepoDir);
      expect(log.total).toEqual(2);
    });

    it('can export a range of commits', async () => {
      // Setup
      expect.assertions(3);
      const repoDir = await sut.createRepo(path.join(tmpDir, 'mytest'));
      await createInitialCommit(sut, repoDir);
      await addCommit(
        sut,
        repoDir,
        path.join(repoDir, 'somefile1.txt'),
        'Additional text',
        'second commit',
      );
      await addCommit(
        sut,
        repoDir,
        path.join(repoDir, 'somefile1.txt'),
        'Some more text',
        'third commit',
      );

      // Execute
      const patches = await sut.export(repoDir, 'HEAD^^..HEAD');

      // Verify
      expect(patches.length).toEqual(2);
      expect(patches[0]).toEqual(
        path.join(repoDir, '0001-second-commit.patch'),
      );
      expect(patches[1]).toEqual(
        path.join(repoDir, '0002-third-commit.patch'),
      );
    });

    it('can import patches', async () => {
      expect.assertions(1);

      // Setup
      const repoDir = await sut.createRepo(path.join(tmpDir, 'mytest'));
      await createInitialCommit(sut, repoDir);
      await addCommit(
        sut,
        repoDir,
        path.join(repoDir, 'somefile1.txt'),
        'Additional text',
        'second commit',
      );
      const patches = await sut.export(repoDir, 'HEAD', '--root');
      const secondRepoDir = await sut.createRepo(path.join(tmpDir, 'secondRepo'));

      // Execute
      await sut.importFiles(secondRepoDir, from(patches)).toPromise();

      // Verify
      const log = await sut.log(secondRepoDir);
      expect(log.total).toEqual(2);
    });

  });

  describe('checkoutBranch', () => {
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

    it('can checkout existing branch with different local name', async () => {
      expect.assertions(6);

      // Setup
      const upstreamRepoDir = await sut.createRepo(path.join(tmpDir, 'upstreamRepo'), true);
      const repoDir = await sut.clone(upstreamRepoDir, path.join(tmpDir, 'mytest'));
      await createInitialCommit(sut, repoDir);
      await sut.push(repoDir, 'origin', 'master');

      // Execute
      await sut.checkoutBranch(repoDir, 'test', 'origin/master');

      // Verify
      await sut.checkoutBranch(repoDir, 'master');
      await addCommit(
        sut,
        repoDir,
        path.join(repoDir, 'somefile1.txt'),
        'Additional text',
        'commit on master branch',
      );
      await sut.push(repoDir, 'origin', 'master');
      await sut.checkoutBranch(repoDir, 'test');
      await sut.pull(repoDir);

      const branchSummary = await sut.getBranches(repoDir);
      expect(branchSummary.all).toContain('test');
      expect(branchSummary.all).toContain('master');
      expect(branchSummary.current).toEqual('test');
      expect(branchSummary.branches.test.label).toEqual('commit on master branch');
      expect(branchSummary.branches.test.label).toEqual('commit on master branch');
      expect(branchSummary.branches.test.commit).toEqual(branchSummary.branches.master.commit);
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
  });

  describe('isBranch', () => {
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
  });

  describe('push', () => {
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
  });

  describe('pull', () => {
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

    it('can pull from default', async () => {
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
      await sut.pull(clonedDir);

      // Verify
      const log = await sut.log(clonedDir);
      const expected = new RegExp(`^${commit.commit}.+`);
      expect(log.latest.hash).toMatch(expected);
    });
  });

  describe('fetch', () => {
    it('can fetch from remote', async () => {
      // Setup
      expect.assertions(1);
      const repoDir = await sut.createRepo(path.join(tmpDir, 'mytest'));
      await createInitialCommit(sut, repoDir);
      const clonedDir = await sut.clone(repoDir, path.join(tmpDir, 'clonedRepo'), false, 'upstream');
      const commit = await addCommit(
        sut,
        repoDir,
        path.join(repoDir, 'somefile1.txt'),
        'Additional text',
        'commit on test branch',
      );

      // Execute
      await sut.fetch(clonedDir, 'upstream', 'master');

      // Verify
      await sut.checkoutBranch(clonedDir, 'foo', 'upstream/master');
      const log = await sut.log(clonedDir);
      const expected = new RegExp(`^${commit.commit}.+`);
      expect(log.latest.hash).toMatch(expected);
    });
  });

  describe('isGitRepo', () => {
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

  describe('hasRemote', () => {

    it('returns false if remote is not set', async () => {
      // Setup
      expect.assertions(1);
      const repoDir = await sut.createRepo(path.join(tmpDir, 'mytest'));
      await createInitialCommit(sut, repoDir);
      const cloneDir = await sut.clone(repoDir, path.join(tmpDir, 'clonedRepo'), false, 'foo');

      // Execute
      const hasBar = await sut.hasRemote(cloneDir, 'bar');

      // Verify
      expect(hasBar).toBe(false);
    });

    it('returns true if remote is set', async () => {
      // Setup
      expect.assertions(1);
      const repoDir = await sut.createRepo(path.join(tmpDir, 'mytest'));
      await createInitialCommit(sut, repoDir);
      const cloneDir = await sut.clone(repoDir, path.join(tmpDir, 'clonedRepo'), false, 'foo');

      // Execute
      const hasFoo = await sut.hasRemote(cloneDir, 'foo');

      // Verify
      expect(hasFoo).toBe(true);
    });
  });

  describe('addRemote', () => {
    it('can add a new remote', async () => {
      // Setup
      expect.assertions(2);
      const repoDir = await sut.createRepo(path.join(tmpDir, 'mytest'));
      await createInitialCommit(sut, repoDir);
      const cloneDir = await sut.clone(repoDir, path.join(tmpDir, 'clonedRepo'));

      // Execute
      await sut.addRemote(cloneDir, 'jdoe', 'https://url.to/remote/repo.git');

      // Verify
      expect(await sut.hasRemote(cloneDir, 'origin')).toBe(true);
      expect(await sut.hasRemote(cloneDir, 'jdoe')).toBe(true);
    });
  });
});
