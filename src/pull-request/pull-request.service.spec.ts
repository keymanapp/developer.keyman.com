import { Test, TestingModule } from '@nestjs/testing';

import fs = require('fs');
import os = require('os');
import path = require('path');

import { PullRequestService } from './pull-request.service';
import { GitService } from '../git/git.service';
import { ConfigService } from '../config/config.service';
import { ConfigModule } from '../config/config.module';
import { deleteFolderRecursive } from '../utils/delete-folder';

describe('PullRequestService', () => {
  let sut: PullRequestService;
  let gitService: GitService;
  let config: ConfigService;
  let workDir: string;
  let singleKeyboardRepo: string;
  let keyboardsRepo: string;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule],
      providers: [PullRequestService, GitService],
    }).compile();

    sut = module.get<PullRequestService>(PullRequestService);
    gitService = module.get<GitService>(GitService);
    config = module.get<ConfigService>(ConfigService);

    workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'workdir-'));
    jest.spyOn(config, 'workDirectory', 'get').mockReturnValue(workDir);

    singleKeyboardRepo = await gitService.createRepo(
      path.join(workDir, 'myKeyboard'),
    );
    const filePath1 = path.join(singleKeyboardRepo, 'somefile1.txt');
    fs.appendFileSync(filePath1, 'some text');
    await gitService.addFile(singleKeyboardRepo, filePath1);
    await gitService.commit(singleKeyboardRepo, 'Initial commit');

    fs.appendFileSync(filePath1, 'some more text');
    const filePath2 = path.join(singleKeyboardRepo, 'somefile2.txt');
    fs.appendFileSync(filePath2, 'other text');
    await Promise.all([
      gitService.addFile(singleKeyboardRepo, filePath1),
      gitService.addFile(singleKeyboardRepo, filePath2),
    ]);
    await gitService.commit(singleKeyboardRepo, 'Second commit');

    keyboardsRepo = await gitService.createRepo(
      path.join(workDir, 'keyboards'),
    );
  });

  afterEach(() => {
    deleteFolderRecursive(workDir);
  });

  it('should be defined', () => {
    expect(sut).toBeDefined();
  });

  describe('extractPatch', () => {
    it('can extract patches for all commits', async () => {
      // Execute
      const patches = await sut.extractPatches(singleKeyboardRepo);

      // Verify
      expect(patches.length).toEqual(2);
    });

    it('', async () => {
      // Setup

      // Execute

      // Verify

    });
  });
});
