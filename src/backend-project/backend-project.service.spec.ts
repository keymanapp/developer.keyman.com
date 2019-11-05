import { Test, TestingModule } from '@nestjs/testing';

import fs = require('fs');
import os = require('os');
import path = require('path');

import { ConfigService } from '../config/config.service';
import { ConfigModule } from '../config/config.module';
import { GitService } from '../git/git.service';
import { deleteFolderRecursive } from '../utils/delete-folder';

import { BackendProjectService } from './backend-project.service';

describe('BackendProjectService', () => {
  let sut: BackendProjectService;
  let gitService: GitService;
  let config: ConfigService;
  let tmpDir: string;
  let workDir: string;
  let remoteRepo: string;

  beforeEach(async () => {
    jest.setTimeout(10000/*10s*/);
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
    const repoDir = await gitService.createRepo(path.join(tmpDir, 'tmpTestRepo'));
    const filePath1 = path.join(repoDir, 'somefile1.txt');
    const filePath2 = path.join(repoDir, 'somefile2.txt');
    fs.appendFileSync(filePath1, 'some text');
    fs.appendFileSync(filePath2, 'other text');
    await Promise.all([
      gitService.addFile(repoDir, filePath1),
      gitService.addFile(repoDir, filePath2),
    ]);
    await gitService.commit(repoDir, 'Initial commit');

    remoteRepo = await gitService.clone(repoDir, path.join(tmpDir, 'remoteTestRepo'), ['--bare']);
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
      path.join(workDir, 'jdoe-testproject'),
    );
  });

  it('does clone remote project if it does not exist locally', async () => {
    expect.assertions(2);

    // Setup
    const expectedCloneDir = path.join(config.workDirectory, 'jdoe-testproject');

    // Execute
    const cloneDir = await sut.cloneOrUpdateProject(remoteRepo, expectedCloneDir, 'master');

    // Verify
    expect(cloneDir).toEqual(expectedCloneDir);
    expect(fs.existsSync(path.join(expectedCloneDir, '.git'))).toBeTruthy();
  });

  it('updates project if it does exist locally', async () => {
    expect.assertions(3);

    // Setup
    const setupRepo = await gitService.clone(remoteRepo, path.join(config.workDirectory, 'setuprepo'));
    const expectedCloneDir = path.join(config.workDirectory, 'jdoe-testproject');
    await gitService.clone(remoteRepo, expectedCloneDir);
    const secondCommit = await gitService.commit(setupRepo, 'empty commit', { '--allow-empty': null });
    await gitService.push(setupRepo, 'origin', 'master');

    // Execute
    const cloneDir = await sut.cloneOrUpdateProject(remoteRepo, expectedCloneDir, 'master');

    // Verify
    expect(cloneDir).toEqual(expectedCloneDir);
    expect(fs.existsSync(path.join(expectedCloneDir, '.git'))).toBeTruthy();
    const log = await gitService.log(cloneDir);
    const expected = new RegExp(`^${secondCommit.commit}.+`);
    expect(log.latest.hash).toMatch(expected);
  });

  it('Returns expected branch name', () => {
    expect(sut.branchName).toEqual('master');
  });

  it('Returns expected name of keyboards repo', () => {
    expect(sut.keyboardsRepoName).toEqual('keyboards');
  });

  it('Returns expected path of the keyboards repo', () => {
    expect(sut.localKeyboardsRepo).toEqual(`${workDir}/keyboards`);
  });

});
