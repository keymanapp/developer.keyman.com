import { Test, TestingModule } from '@nestjs/testing';
import { ProjectsController } from './projects.controller';
import { HttpModule } from '@nestjs/common/http';
import { of, empty } from 'rxjs';
import { map } from 'rxjs/operators';

import fs = require('fs');
import os = require('os');
import path = require('path');

import { GithubService } from '../github/github.service';
import { ConfigModule } from '../config/config.module';
import { ConfigService } from '../config/config.service';
import { TokenService } from '../token/token.service';
import { GitService } from '../git/git.service';
import { deleteFolderRecursive } from '../utils/delete-folder';
import { BackendProjectModule } from '../backend-project/backend-project.module';
import { PullRequestService } from '../pull-request/pull-request.service';

describe('Projects Controller', () => {
  let sut: ProjectsController;
  let githubService: GithubService;
  let gitService: GitService;
  let config: ConfigService;

  beforeEach(async () => {
    jest.setTimeout(10000 /* 10s */);
    const module: TestingModule = await Test.createTestingModule({
      imports: [HttpModule, ConfigModule, BackendProjectModule],
      controllers: [ProjectsController],
      providers: [
        TokenService,
        {
          provide: GithubService,
          useFactory: (): any => ({
            getRepos: jest.fn(() => true),
            forkRepo: jest.fn(() => of({ name: 'foo' })),
            createPullRequest: jest.fn(() => of()),
          }),
        },
        GitService,
        PullRequestService,
      ],
    }).compile();

    sut = module.get<ProjectsController>(ProjectsController);
    githubService = module.get<GithubService>(GithubService);
    gitService = module.get<GitService>(GitService);
    config = module.get<ConfigService>(ConfigService);
  });

  async function createDummyKeyboardsRepo(gitHubDir: string): Promise<string> {
    fs.mkdirSync(path.join(gitHubDir, 'dummy'));
    const keyboardsDummyRepo = await gitService.createRepo(
      path.join(gitHubDir, 'dummy', 'keyboards'),
    ).toPromise();
    const readme = path.join(keyboardsDummyRepo, 'README.md');
    fs.appendFileSync(readme, 'Readme');
    await gitService.addFile(keyboardsDummyRepo, readme).toPromise();
    await gitService.commit(keyboardsDummyRepo, 'Initial commit').toPromise();
    return keyboardsDummyRepo;
  }

  async function createKeyboardsRepoForUser(
    user: string,
    gitHubDir: string,
  ): Promise<string> {
    // create keyboards repo for user
    const keyboardsDummyRepo = await createDummyKeyboardsRepo(gitHubDir);
    return await gitService.clone(
      keyboardsDummyRepo,
      path.join(gitHubDir, user, 'keyboards.git'),
      true,
    ).toPromise();
  }

  async function createGlobalKeyboardsRepo(gitHubDir: string): Promise<void> {
    const keyboardsDummyRepo = await createDummyKeyboardsRepo(gitHubDir);

    await gitService.clone(
      keyboardsDummyRepo,
      path.join(gitHubDir, 'keymanapp', 'keyboards.git'),
      true,
    ).toPromise();
  }

  it('should be defined', () => {
    expect(sut).toBeDefined();
  });

  describe('getRepos', () => {
    it('should return list of repos', async () => {
      jest.spyOn(githubService, 'getRepos').mockImplementationOnce(() => of({
        name: 'foo',
        owner: { login: 'foo' },
      }));

      const session = { login: 'foo' };
      await expect(sut.getRepos(session, 'token 12345', 1).toPromise())
        .resolves.toEqual([{ name: 'foo' }]);
    });

    it('should filter list of repos', async () => {
      jest.spyOn(githubService, 'getRepos').mockImplementationOnce(() =>
        of(
          {
            name: 'foo',
            owner: { login: 'foo' },
          },
          {
            name: 'other',
            owner: { login: 'bar' },
          },
        ),
      );

      const session = { login: 'foo' };
      await expect(
        sut.getRepos(session, 'token 12345', 1).toPromise(),
      ).resolves.toEqual([{ name: 'foo' }]);
    });

    it('should return empty list if requesting behind last page', async () => {
      jest.spyOn(githubService, 'getRepos').mockImplementationOnce(() => empty());

      const session = { login: 'foo' };
      await expect(sut.getRepos(session, 'token 12345', 99).toPromise()).resolves.toEqual([]);
    });
  });

  describe('Create project', () => {
    let gitHubDir: string;
    let workDir: string;

    beforeEach(async () => {
      workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'workdir-'));
      jest.spyOn(config, 'workDirectory', 'get').mockReturnValue(workDir);

      const prefix = path.join(os.tmpdir(), 'projectstests-');
      gitHubDir = fs.mkdtempSync(prefix);
      jest.spyOn(sut, 'gitHubUrl', 'get').mockReturnValue(gitHubDir);

      // create single keyboard repo
      const repoDir = await gitService.createRepo(path.join(gitHubDir, 'tmpTestRepo')).toPromise();
      const filePath1 = path.join(repoDir, 'somefile1.txt');
      const filePath2 = path.join(repoDir, 'somefile2.txt');
      fs.appendFileSync(filePath1, 'some text');
      fs.appendFileSync(filePath2, 'other text');
      await Promise.all([
        gitService.addFile(repoDir, filePath1).toPromise(),
        gitService.addFile(repoDir, filePath2).toPromise(),
      ]);
      await gitService.commit(repoDir, 'Initial commit').toPromise();

      await gitService
        .clone(repoDir, path.join(gitHubDir, 'foo', 'remoteTestRepo.git'), true)
        .toPromise();
    });

    afterEach(() => {
      deleteFolderRecursive(gitHubDir);
      deleteFolderRecursive(workDir);
    });

    it('clones single-keyboard and keyboards repos', async () => {
      expect.assertions(4);

      // Setup
      const session = { login: 'foo' };
      await createKeyboardsRepoForUser('foo', gitHubDir);

      // Execute
      const project = await sut.createRepo(session, 'token 12345', { repo: 'remoteTestRepo' }).toPromise();

      // Verify
      // Should clone single-keyboards repo
      const expectedRepo = path.join(workDir, 'foo', 'remoteTestRepo');
      expect(fs.existsSync(path.join(expectedRepo, '.git'))).toBe(true);
      expect(project).toEqual({
        repoUrl: `${gitHubDir}/foo/remoteTestRepo.git`,
        name: 'remoteTestRepo',
      });

      // Should clone keyboards repo
      const expectedKeyboardsRepo = path.join(workDir, 'keyboards');
      expect(fs.existsSync(path.join(expectedKeyboardsRepo, '.git'))).toBe(true);
      expect(
        await gitService.currentBranch(expectedKeyboardsRepo).toPromise(),
      ).toEqual('foo-remoteTestRepo');
    });

    it('clones single-keyboard repo and forks keyboards repo', async () => {
      expect.assertions(5);

      // Setup
      const session = { login: 'foo' };
      await createGlobalKeyboardsRepo(gitHubDir);

      jest
        .spyOn(githubService, 'forkRepo')
        .mockImplementation(() => {
          return gitService.clone(
              path.join(gitHubDir, 'dummy', 'keyboards'),
              path.join(gitHubDir, 'foo', 'keyboards.git'),
              true,
          ).pipe(
            map(() => ({ name: 'keyboards' })),
          );
        });

      // Execute
      const project = await sut
        .createRepo(session, 'token 12345', { repo: 'remoteTestRepo' })
        .toPromise();

      // Verify
      // Should clone single-keyboards repo
      const expectedRepo = path.join(workDir, 'foo', 'remoteTestRepo');
      expect(fs.existsSync(path.join(expectedRepo, '.git'))).toBe(true);
      expect(project).toEqual({
        repoUrl: `${gitHubDir}/foo/remoteTestRepo.git`,
        name: 'remoteTestRepo',
      });

      // should create fork of keyboards repo
      expect(fs.existsSync(path.join(gitHubDir, 'foo', 'keyboards.git'))).toBe(true);

      // Should clone keyboards repo
      const expectedKeyboardsRepo = path.join(workDir, 'keyboards');
      expect(fs.existsSync(path.join(expectedKeyboardsRepo, '.git'))).toBe(true);
      expect(
        await gitService.currentBranch(expectedKeyboardsRepo).toPromise(),
      ).toEqual('foo-remoteTestRepo');
    });
  });

  describe('createPullRequest', () => {
    let gitHubDir: string;
    let workDir: string;
    let gitHubKeyboardsRepo: string;
    let localKeyboardsRepo: string;

    beforeEach(async () => {
      workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'workdir-'));
      jest.spyOn(config, 'workDirectory', 'get').mockReturnValue(workDir);

      const prefix = path.join(os.tmpdir(), 'projectstests-');
      gitHubDir = fs.mkdtempSync(prefix);
      jest.spyOn(sut, 'gitHubUrl', 'get').mockReturnValue(gitHubDir);

      // create single keyboard repo
      const repoDir = await gitService
        .createRepo(path.join(workDir, 'tmpTestRepo'))
        .toPromise();
      const filePath1 = path.join(repoDir, 'somefile1.txt');
      fs.appendFileSync(filePath1, 'some text');
      await gitService.addFile(repoDir, filePath1).toPromise();
      await gitService.commit(repoDir, 'Initial commit').toPromise();

      await gitService
        .clone(repoDir, path.join(workDir, 'jdoe', 'myKeyboard'), false)
        .toPromise();

      gitHubKeyboardsRepo = await createKeyboardsRepoForUser('jdoe', gitHubDir);
      localKeyboardsRepo = await gitService
        .clone(
          gitHubKeyboardsRepo,
          path.join(workDir, 'keyboards'),
          false,
          'jdoe',
        )
        .toPromise();
      await gitService
        .checkoutBranch(localKeyboardsRepo, 'jdoe-myKeyboard')
        .toPromise();
    });

    afterEach(() => {
      deleteFolderRecursive(gitHubDir);
      deleteFolderRecursive(workDir);
    });

    it('should apply patches and create PR', async () => {
      // Setup
      expect.assertions(4);
      const session = { login: 'jdoe' };
      const mockImplementation = jest
        .spyOn(githubService, 'createPullRequest')
        .mockImplementationOnce(() => of({
          'number': 42,
          url:
            'https://api.github.com/repos/keymanapp/keyboards/pulls/42',
          state: 'open',
        }));

      // Execute
      await sut.createPullRequest(
        session,
        'token 12345',
        { repo: 'myKeyboard' },
      ).toPromise();

      // Verify
      // should apply patches to keyboards repo
      expect(
        fs.existsSync(path.join(localKeyboardsRepo, 'release', 'm', 'myKeyboard', 'somefile1.txt')),
      ).toBe(true);
      expect(await gitService.currentBranch(localKeyboardsRepo).toPromise())
        .toEqual('jdoe-myKeyboard');

      // should have pushed to keyboards repo on GitHub
      const gitHubCommit = await gitService
        .log(gitHubKeyboardsRepo, { '-1': null, 'jdoe-myKeyboard': null })
        .toPromise();
      const expectedCommit = await gitService
        .log(localKeyboardsRepo, { '-1': null })
        .toPromise();
      expect(gitHubCommit.latest.hash).toEqual(expectedCommit.latest.hash);

      // should have created PR
      expect(mockImplementation).toHaveBeenCalledWith(
        'token 12345',
        'keymanapp',
        'keyboards',
        'jdoe:jdoe-myKeyboard',
        'master',
        'Add myKeyboard keyboard',
        'Merge the single keyboard repo myKeyboard into the keyboards repo. Courtesy of Keyman Developer Online.',
      );
    });
  });
});
