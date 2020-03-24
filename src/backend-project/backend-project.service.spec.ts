import { Test, TestingModule } from '@nestjs/testing';

import fs = require('fs');
import os = require('os');
import path = require('path');

import { ConfigService } from '../config/config.service';
import { ConfigModule } from '../config/config.module';
import { GitService } from '../git/git.service';
import { deleteFolderRecursive } from '../utils/delete-folder';

import { BackendProjectService } from './backend-project.service';
import { tap, switchMap } from 'rxjs/operators';
import { CommitSummary } from 'simple-git/typings/response';

describe('BackendProjectService', () => {
  let sut: BackendProjectService;
  let gitService: GitService;
  let config: ConfigService;
  let tmpDir: string;
  let workDir: string;
  let remoteRepo: string;

  beforeEach(async () => {
    jest.setTimeout(10000/* 10s */);
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule],
      providers: [
        BackendProjectService,
        GitService,
      ],
    }).compile();

    sut = module.get<BackendProjectService>(BackendProjectService);
    gitService = module.get<GitService>(GitService);
    config = module.get<ConfigService>(ConfigService);

    workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'workdir-'));
    jest.spyOn(config, 'workDirectory', 'get').mockReturnValue(workDir);

    const prefix = path.join(os.tmpdir(), 'BackendProjectTests-');
    tmpDir = fs.mkdtempSync(prefix);
    const repoDir = await gitService.createRepo(path.join(tmpDir, 'tmpTestRepo')).toPromise();
    const filePath1 = path.join(repoDir, 'somefile1.txt');
    const filePath2 = path.join(repoDir, 'somefile2.txt');
    fs.appendFileSync(filePath1, 'some text');
    fs.appendFileSync(filePath2, 'other text');
    await Promise.all([
      gitService.addFile(repoDir, filePath1).toPromise(),
      gitService.addFile(repoDir, filePath2).toPromise(),
    ]);
    await gitService.commit(repoDir, 'Initial commit').toPromise();

    remoteRepo = await gitService.clone(repoDir, path.join(tmpDir, 'remoteTestRepo'), true).toPromise();
  });

  afterEach(() => {
    deleteFolderRecursive(tmpDir);
    deleteFolderRecursive(workDir);
  });

  it('should be defined', () => {
    expect(sut).toBeDefined();
  });

  it('returns expected reponame', () => {
    expect(sut.getProjectRepo('jdoe', 'testproject')).toEqual(
      path.join(workDir, 'jdoe', 'testproject'),
    );
  });

  describe('cloneOrUpdateProject', () => {
    it('does clone remote project if it does not exist locally', async () => {
      // Setup
      expect.assertions(3);
      const expectedCloneDir = path.join(config.workDirectory, 'jdoe', 'testproject');

      // Execute
      const cloneDir = await sut.cloneOrUpdateProject(remoteRepo, expectedCloneDir, 'master', 'jdoe').toPromise();

      // Verify
      expect(cloneDir).toEqual(expectedCloneDir);
      expect(fs.existsSync(path.join(cloneDir, '.git'))).toBe(true);
      expect(await gitService.currentBranch(cloneDir).toPromise()).toEqual(
        'master',
      );
    });

    it('updates local project if it does exist locally', async () => {
      // Setup
      expect.assertions(4);
      const expectedCloneDir = path.join(config.workDirectory, 'jdoe', 'testproject');
      let setupRepo: string;
      let secondCommit: CommitSummary;
      await gitService.clone(remoteRepo, path.join(config.workDirectory, 'setuprepo')).pipe(
        tap(repo => setupRepo = repo),
        switchMap(() => gitService.clone(remoteRepo, expectedCloneDir)),
        switchMap(() => gitService.commit(setupRepo, 'empty commit', { '--allow-empty': null })),
        tap(commit => secondCommit = commit),
        switchMap(() => gitService.push(setupRepo, 'origin', 'master', 'tokenvalue')),
      ).toPromise();

      // Execute
      const cloneDir = await sut.cloneOrUpdateProject(remoteRepo, expectedCloneDir, 'master', 'jdoe').toPromise();

      // Verify
      expect(cloneDir).toEqual(expectedCloneDir);
      expect(fs.existsSync(path.join(cloneDir, '.git'))).toBe(true);
      expect(await gitService.currentBranch(cloneDir).toPromise()).toEqual(
        'master',
      );
      const log = await gitService.log(cloneDir).toPromise();
      const expected = new RegExp(`^${secondCommit.commit}.+`);
      expect(log.latest.hash).toMatch(expected);
    });

    it('works with different local branch name if it does not exist locally', async () => {
      // Setup
      expect.assertions(3);
      const expectedCloneDir = path.join(config.workDirectory, 'jdoe', 'testproject');

      // Execute
      const cloneDir = await sut.cloneOrUpdateProject(remoteRepo, expectedCloneDir, 'local-branch', 'jdoe', 'master').toPromise();

      // Verify
      expect(cloneDir).toEqual(expectedCloneDir);
      expect(fs.existsSync(path.join(cloneDir, '.git'))).toBe(true);
      expect(await gitService.currentBranch(cloneDir).toPromise()).toEqual(
        'local-branch',
      );
    });

    it('works with different local branch name if it does exist locally', async () => {
      // Setup
      expect.assertions(4);
      const setupRepo = await gitService
        .clone(remoteRepo, path.join(config.workDirectory, 'setuprepo'))
        .toPromise();
      const expectedCloneDir = path.join(config.workDirectory, 'jdoe', 'testproject');
      await gitService.clone(remoteRepo, expectedCloneDir).toPromise();
      const secondCommit = await gitService
        .commit(setupRepo, 'empty commit', { '--allow-empty': null })
        .toPromise();
      await gitService.push(setupRepo, 'origin', 'master', 'tokenvalue').toPromise();

      // Execute
      const cloneDir = await sut.cloneOrUpdateProject(remoteRepo, expectedCloneDir, 'local-branch', 'jdoe', 'master').toPromise();

      // Verify
      expect(cloneDir).toEqual(expectedCloneDir);
      expect(fs.existsSync(path.join(cloneDir, '.git'))).toBe(true);
      expect(await gitService.currentBranch(cloneDir).toPromise()).toEqual(
        'local-branch',
      );
      const log = await gitService.log(cloneDir).toPromise();
      const expected = new RegExp(`^${secondCommit.commit}.+`);
      expect(log.latest.hash).toMatch(expected);
    });
  });

  describe('clone', () => {
    it('updates project if it does exist locally', async () => {
      expect.assertions(3);

      // Setup
      const setupRepo = await gitService
        .clone(remoteRepo, path.join(config.workDirectory, 'setuprepo'))
        .toPromise();
      const expectedCloneDir = path.join(config.workDirectory, 'jdoe', 'testproject');
      await gitService.clone(remoteRepo, expectedCloneDir).toPromise();
      const secondCommit = await gitService
        .commit(setupRepo, 'empty commit', { '--allow-empty': null })
        .toPromise();
      await gitService.push(setupRepo, 'origin', 'master', 'tokenvalue').toPromise();

      // Execute
      const cloneDir = await sut.cloneOrUpdateProject(remoteRepo, expectedCloneDir, 'master', 'jdoe').toPromise();

      // Verify
      expect(cloneDir).toEqual(expectedCloneDir);
      expect(fs.existsSync(path.join(expectedCloneDir, '.git'))).toBe(true);
      const log = await gitService.log(cloneDir).toPromise();
      const expected = new RegExp(`^${secondCommit.commit}.+`);
      expect(log.latest.hash).toMatch(expected);
    });
  });

  describe('Helper methods', () => {
    it('Returns expected branch name', () => {
      expect(sut.branchName).toEqual('master');
    });

    it('Returns expected path of the keyboards repo', () => {
      expect(sut.localKeyboardsRepo).toEqual(path.join(workDir, 'keyboards'));
    });
  });

  describe('getKeyboardId', () => {
    let testDir: string;

    beforeEach(() => {
      const prefix = path.join(os.tmpdir(), 'backendprojecttests-');
      testDir = fs.mkdtempSync(prefix);
    });

    afterEach(() => {
      deleteFolderRecursive(tmpDir);
    });

    it('extracts id from keyboard_info file if it has an id', () => {
      // Setup
      expect.assertions(1);
      fs.appendFileSync(path.join(testDir, 'enga.keyboard_info'), `{
        "id": "test",
        "license": "mit",
        "languages": [ "enq-Latn" ],
        "description": "The Enga keyboard supports the Enga language of Papua New Guinea"
      }`);

      // Execute
      const id = sut.getKeyboardId('enga', testDir);

      // Verify
      expect(id).toEqual('test');
    });

    it('gets id from repo name if keyboard_info file does not have id', () => {
      // Setup
      expect.assertions(1);
      fs.appendFileSync(path.join(testDir, 'enga.keyboard_info'), `{
        "license": "mit",
        "languages": [ "enq-Latn" ],
        "description": "The Enga keyboard supports the Enga language of Papua New Guinea"
      }`);

      // Execute
      const id = sut.getKeyboardId('enga', testDir);

      // Verify
      expect(id).toEqual('enga');
    });

    it('gets id from repo name if keyboard_info file does not exist', () => {
      // Setup
      expect.assertions(1);

      // Execute
      const id = sut.getKeyboardId('enga', testDir);

      // Verify
      expect(id).toEqual('enga');
    });

    it('extracts id from keyboard_info file if it has an id but a different name', () => {
      // Setup
      expect.assertions(1);
      fs.appendFileSync(path.join(testDir, 'keyboard_enga.keyboard_info'), `{
        "id": "test",
        "license": "mit",
        "languages": [ "enq-Latn" ],
        "description": "The Enga keyboard supports the Enga language of Papua New Guinea"
      }`);

      // Execute
      const id = sut.getKeyboardId('enga', testDir);

      // Verify
      expect(id).toEqual('test');
    });

  });

});
