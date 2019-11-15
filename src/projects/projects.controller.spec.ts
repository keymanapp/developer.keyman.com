import { Test, TestingModule } from '@nestjs/testing';
import { ProjectsController } from './projects.controller';
import { HttpModule } from '@nestjs/common/http';
import { of, empty, from } from 'rxjs';
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

describe('Projects Controller', () => {
  let sut: ProjectsController;
  let githubService: GithubService;
  let gitService: GitService;
  let config: ConfigService;

  beforeEach(async () => {
    jest.setTimeout(10000 /*10s*/);
    const module: TestingModule = await Test.createTestingModule({
      imports: [HttpModule, ConfigModule, BackendProjectModule],
      controllers: [ProjectsController],
      providers: [
        TokenService,
        {
          provide: GithubService,
          useFactory: () => ({
            getRepos: jest.fn(() => true),
            forkRepo: jest.fn(() => of({ name: 'foo' })),
            organizationName: jest.fn(() => 'keymanapp'),
          }),
        },
        GitService,
      ],
    }).compile();

    sut = module.get<ProjectsController>(ProjectsController);
    githubService = module.get<GithubService>(GithubService);
    gitService = module.get<GitService>(GitService);
    config = module.get<ConfigService>(ConfigService);
  });

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
      const repoDir = await gitService.createRepo(path.join(gitHubDir, 'tmpTestRepo'));
      const filePath1 = path.join(repoDir, 'somefile1.txt');
      const filePath2 = path.join(repoDir, 'somefile2.txt');
      fs.appendFileSync(filePath1, 'some text');
      fs.appendFileSync(filePath2, 'other text');
      await Promise.all([
        gitService.addFile(repoDir, filePath1),
        gitService.addFile(repoDir, filePath2),
      ]);
      await gitService.commit(repoDir, 'Initial commit');

      await gitService.clone(
        repoDir,
        path.join(gitHubDir, 'foo', 'remoteTestRepo.git'),
        true,
      );
    });

    afterEach(() => {
      deleteFolderRecursive(gitHubDir);
      deleteFolderRecursive(workDir);
    });

    async function createDummyKeyboardsRepo(): Promise<string> {
      fs.mkdirSync(path.join(gitHubDir, 'dummy'));
      const keyboardsDummyRepo = await gitService.createRepo(
        path.join(gitHubDir, 'dummy', 'keyboards'),
      );
      const readme = path.join(keyboardsDummyRepo, 'README.md');
      fs.appendFileSync(readme, 'Readme');
      await gitService.addFile(keyboardsDummyRepo, readme);
      await gitService.commit(keyboardsDummyRepo, 'Initial commit');
      return keyboardsDummyRepo;
    }

    async function createKeyboardsRepoForUser(user: string): Promise<void> {
      // create keyboards repo for user
      const keyboardsDummyRepo = await createDummyKeyboardsRepo();
      await gitService.clone(
        keyboardsDummyRepo,
        path.join(gitHubDir, user, 'keyboards.git'),
        true,
      );
    }

    async function createGlobalKeyboardsRepo(): Promise<void> {
      const keyboardsDummyRepo = await createDummyKeyboardsRepo();

      await gitService.clone(
        keyboardsDummyRepo,
        path.join(gitHubDir, 'keymanapp', 'keyboards.git'),
        true,
      );
    }

    it('clones single-keyboard and keyboards repos', async () => {
      expect.assertions(4);

      // Setup
      const session = { login: 'foo' };
      await createKeyboardsRepoForUser('foo');

      // Execute
      const project = await sut.createRepo(session, 'token 12345', { repo: 'remoteTestRepo' }).toPromise();

      // Verify
      // Should clone single-keyboards repo
      const expectedRepo = path.join(workDir, 'foo-remoteTestRepo');
      expect(fs.existsSync(path.join(expectedRepo, '.git'))).toBe(true);
      expect(project).toEqual({ repoUrl: expectedRepo, name: 'remoteTestRepo' });

      // Should clone keyboards repo
      const expectedKeyboardsRepo = path.join(workDir, 'keyboards');
      expect(fs.existsSync(path.join(expectedKeyboardsRepo, '.git'))).toBe(true);
      expect(await gitService.currentBranch(expectedKeyboardsRepo)).toEqual('foo-remoteTestRepo');
    });

    it('clones single-keyboard repo and forks keyboards repo', async () => {
      expect.assertions(5);

      // Setup
      const session = { login: 'foo' };
      await createGlobalKeyboardsRepo();

      jest
        .spyOn(githubService, 'forkRepo')
        .mockImplementation(() => {
          return from(gitService.clone(
              path.join(gitHubDir, 'dummy', 'keyboards'),
              path.join(gitHubDir, 'foo', 'keyboards.git'),
              true,
          )).pipe(
            map(() => ({ name: 'foo' })),
          );
        });

      // Execute
      const project = await sut
        .createRepo(session, 'token 12345', { repo: 'remoteTestRepo' })
        .toPromise();

      // Verify
      // Should clone single-keyboards repo
      const expectedRepo = path.join(workDir, 'foo-remoteTestRepo');
      expect(fs.existsSync(path.join(expectedRepo, '.git'))).toBe(true);
      expect(project).toEqual({
        repoUrl: expectedRepo,
        name: 'remoteTestRepo',
      });

      // should create fork of keyboards repo
      expect(fs.existsSync(path.join(gitHubDir, 'foo', 'keyboards.git'))).toBe(true);

      // Should clone keyboards repo
      const expectedKeyboardsRepo = path.join(workDir, 'keyboards');
      expect(fs.existsSync(path.join(expectedKeyboardsRepo, '.git'))).toBe(true);
      expect(await gitService.currentBranch(expectedKeyboardsRepo)).toEqual('foo-remoteTestRepo');
    });
  });
});
