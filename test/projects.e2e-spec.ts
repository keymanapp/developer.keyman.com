import { HttpService, INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as base64 from 'base-64';
import { empty, Observable, interval, from, forkJoin, of } from 'rxjs';
import { catchError, switchMap, takeWhile, takeLast, map, tap, mapTo } from 'rxjs/operators';
import session = require('supertest-session');
import * as simplegit from 'simple-git/promise';
import { AppModule } from '../src/app.module';
import { describeIf } from '../src/utils/test-utils';
import { fileExists } from '../src/utils/file';
import { GithubService } from '../src/github/github.service';
import { ConfigService } from '../src/config/config.service';
import { GitHubPullRequest } from '../src/interfaces/git-hub-pull-request.interface';
import { deleteFolderRecursive } from '../src/utils/delete-folder';

import fs = require('fs');
import path = require('path');
import debugModule = require('debug');
const debug = debugModule('debug');

function canRunTheseTests(): boolean {
  return (
    process.env.TEST_GITHUB_TOKEN != null &&
    process.env.TEST_GITHUB_USER != null
  );
}

describeIf('ProjectsController (e2e)', canRunTheseTests(), () => {
  let app: INestApplication;
  let httpService: HttpService;
  let token: string;
  let user: string;
  let testSession: any;
  let authenticatedSession: any;
  let githubService: GithubService;
  let configService: ConfigService;
  let git: simplegit.SimpleGit;

  function deleteKeyboardsRepo(): Observable<void> {
    const keyboardsRepo = `https://api.github.com/repos/${user}/${configService.keyboardsRepoName}`;
    return httpService.delete(keyboardsRepo, {
      headers: { Authorization: token },
    }).pipe(
      catchError(err => of({ data: err })),
      // when we try to fork a repo that already exists GitHub creates a repo-1, so we delete
      // that as well
      switchMap(() => httpService.delete(`${keyboardsRepo}-1`, {
        headers: { Authorization: token },
      })),
      catchError(err => of({ data: err })),
      switchMap(() => {
        const keyboardsRepoGone = waitForRepoToNotExist(user, configService.keyboardsRepoName);
        const keyboardsRepo1Gone = waitForRepoToNotExist(user, `${configService.keyboardsRepoName}-1`);
        return forkJoin({ keyboardsRepoGone, keyboardsRepo1Gone });
      }),
      catchError(err => empty()),
      map(() => { return; }),
    );
  }

  function waitForRepoToNotExist(
    owner: string,
    repo: string,
    timeoutSeconds = 300,
  ): Observable<void> {
    return interval(1000).pipe(
      switchMap((x: number) => {
        if (x >= timeoutSeconds) {
          throw new Error(`timeout after ${timeoutSeconds} seconds without seeing repo`);
        }

        return githubService.repoExists(owner, repo);
      }),
      takeWhile(exists => exists),
      takeLast(1),
      map(() => { /* empty */ }),
    );
  }

  function authenticate(): Promise<void> {
    return new Promise((resolve, reject) => {
    testSession
      .get(`/api/auth/user/test/${user}`)
      .set('Authorization', token)
      .expect(200)
      .end((err: any, res: any) => {
          if (err) {
            reject(err);
          } else {
            authenticatedSession = testSession;
            resolve(res);
          }
      });
    });
  }

  function deleteLocalRepos(): void {
    const keyboardsRepo = path.join(
      configService.workDirectory,
      configService.keyboardsRepoName,
    );
    deleteFolderRecursive(keyboardsRepo);

    const testRepo = path.join(
      configService.workDirectory,
      user,
      'test_kdo_khmer_angkor',
    );
    deleteFolderRecursive(testRepo);
  }

  function cleanKeyboardsRepo(): Observable<void> {
    const keyboardsRepo = path.join(
      configService.workDirectory,
      configService.keyboardsRepoName,
    );
    return from(fileExists(keyboardsRepo)).pipe(
      switchMap(exists => {
        if (!exists) {
          return empty();
        }
        return from(git.cwd(keyboardsRepo)).pipe(
          switchMap(() =>
            fileExists(path.join(keyboardsRepo, '.git', 'rebase-apply')),
          ),
          switchMap(rebaseApplyExists => {
            if (rebaseApplyExists) {
              return from(git.raw(['am', '--abort']));
            }
            return from('');
          }),
          switchMap(() => from(git.clean('f', ['-d', '-x']))),
          switchMap(() => from(git.raw(['reset', '--hard', `${user}/master`]))),
          switchMap(() => empty()),
          catchError(() => empty()),
        );
      }),
    );
  }

  function closeAllPullRequests(): Observable<void> {
    return githubService.listPullRequests(
      token,
      configService.organizationName,
      configService.keyboardsRepoName,
    ).pipe(
      switchMap(pullRequest => githubService.closePullRequest(
          token,
          configService.organizationName,
          configService.keyboardsRepoName,
          pullRequest.number)),
      map(() => { return; }),
    );
  }

  beforeAll(async () => {
    jest.setTimeout(60000 /* 60s */);
    jest.useRealTimers();
    const accessToken = process.env.TEST_GITHUB_TOKEN;
    user = process.env.TEST_GITHUB_USER;

    const tokenString = `${user}:${accessToken}`;
    token = `Basic ${base64.encode(tokenString)}`;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    httpService = moduleFixture.get<HttpService>(HttpService);
    githubService = moduleFixture.get<GithubService>(GithubService);
    configService = moduleFixture.get<ConfigService>(ConfigService);
    git = simplegit();

    jest.spyOn(configService, 'organizationName', 'get')
      .mockImplementation(() => 'keymanapptest');
    jest.spyOn(configService, 'keyboardsRepoName', 'get')
      .mockImplementation(() => 'test_kdo_keyboards');

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();

    testSession = session(app.getHttpServer());
    await authenticate();
    await cleanKeyboardsRepo().toPromise();
    const delKeyboardsRepo = deleteKeyboardsRepo().toPromise();
    deleteLocalRepos();
    await delKeyboardsRepo;
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    jest.resetModules();
    await authenticate();
  });

  afterEach(async () => {
    await closeAllPullRequests().pipe(
      catchError(() => empty()),
      switchMap(() => cleanKeyboardsRepo()),
      catchError(() => empty()),
      switchMap(() => deleteKeyboardsRepo()),
      catchError(() => empty()),
      map(() => deleteLocalRepos()),
    ).toPromise();
  });

  describe('create project: /api/projects/ (POST)', () => {
    it('clones single-keyboard project and forks and clones keyboards repo', () => {
      // Execute/Verify
      return authenticatedSession
        .post('/api/projects/test_kdo_khmer_angkor')
        .set('Authorization', token)
        .expect(201)
        .then(() => {
          const keyboardsRepo = path.join(
            configService.workDirectory,
            configService.keyboardsRepoName,
          );
          expect(fs.existsSync(keyboardsRepo)).toBe(true);
        });
    });

    it('clones single-keyboard project and clones keyboards repo if keyboards repo exists', async () => {
      // Setup
      await githubService.forkRepo(
        token,
        configService.organizationName,
        configService.keyboardsRepoName,
        user,
      ).toPromise();

      // Execute/Verify
      return authenticatedSession
        .post('/api/projects/test_kdo_khmer_angkor')
        .set('Authorization', token)
        .expect(201)
        .then(() => {
          const keyboardsRepo = path.join(
            configService.workDirectory,
            configService.keyboardsRepoName,
          );
          expect(fs.existsSync(keyboardsRepo)).toBe(true);
        });
    });
  });

  describe('create PR: /api/projects/ (PUT)', () => {
    it('can create PR', async () => {
      // Setup
      jest.setTimeout(300000 /* 5m */);
      await from(authenticatedSession
        .post('/api/projects/test_kdo_khmer_angkor')
        .set('Authorization', token)).toPromise();

      // Execute/Verify
      return authenticatedSession
        .put('/api/projects/test_kdo_khmer_angkor')
        .set('Authorization', token)
        .expect(200)
        .then((data: GitHubPullRequest) => {
          expect(data.number).not.toBe(null);
        });
    });
  });
});
