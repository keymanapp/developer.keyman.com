import { HttpService, INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as base64 from 'base-64';
import { empty } from 'rxjs';
import { catchError } from 'rxjs/operators';
import session = require('supertest-session');
import { AppModule } from '../src/app.module';
import { describeIf } from '../src/utils/test-utils';
import { GithubService } from '../src/github/github.service';
import { ConfigService } from '../src/config/config.service';

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

  async function deleteKeyboardsRepo(): Promise<void> {
    const keyboardsRepo = `https://api.github.com/repos/${user}/${configService.keyboardsRepoName}`;
    await httpService.delete(keyboardsRepo, {
      headers: { Authorization: token },
    }).pipe(catchError(() => empty())).toPromise();
    // when we try to fork a repo that already exists GitHub creates a repo-1.
    await httpService.delete(`${keyboardsRepo}-1`, {
      headers: { Authorization: token },
    }).pipe(catchError(() => empty())).toPromise();
  }

  beforeAll(async () => {
    jest.setTimeout(20000);
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
    jest.spyOn(configService, 'organizationName', 'get')
      .mockImplementation(() => 'keymanapptest');
    jest.spyOn(configService, 'keyboardsRepoName', 'get')
      .mockImplementation(() => 'test_kdo_keyboards');

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();

    testSession = session(app.getHttpServer());
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async (done) => {
    await deleteKeyboardsRepo();
    testSession
      .get(`/api/auth/user/test/${user}`)
      .set('Authorization', token)
      .expect(200)
      .end((err: any, res: any) => {
        if (err) { return done(err); }
        authenticatedSession = testSession;
        return done();
      });
  });

  afterEach(async () => {
    await deleteKeyboardsRepo();
  });

  it('clones single-keyboard project and forks and clones keyboards repo', async (done) => {
    // Execute/Verify
    authenticatedSession
      .post('/api/projects/test_kdo_khmer_angkor')
      .set('Authorization', token)
      .expect(201)
      .end((err) => {
        expect(err).toBeNull();
        done();
      });
  });

  it('clones single-keyboard project and clones keyboards repo if keyboards repo exists', async done => {
    // Setup
    await githubService
      .forkRepo(
        token,
        configService.organizationName,
        configService.keyboardsRepoName,
        user,
      )
      .toPromise();

    // Execute/Verify
    authenticatedSession
      .post('/api/projects/test_kdo_khmer_angkor')
      .set('Authorization', token)
      .expect(201)
      .end(err => {
        expect(err).toBeNull();
        done();
      });
  });
});
