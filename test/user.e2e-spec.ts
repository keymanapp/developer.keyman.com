import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { INestApplication } from '@nestjs/common';
import { GithubService } from '../src/auth/github/github.service';
import { TokenService } from '../src/auth/token/token.service';

describe('UserController (e2e)', () => {
  const url = {
    url: 'https://github.com/login/oauth/authorize?client_id=12345&' +
      'redirect_uri=http://foo&scope=repo%20read:user%20user:email&state=9876',
  };
  let app: INestApplication;
  const mockedGithubService = { login: () => url };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).overrideProvider(GithubService)
      .useValue(mockedGithubService)
      .compile();

    const tokenService = new TokenService();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });

  it('/api/auth/login (GET)', () => {
    return request(app.getHttpServer())
      .get('/api/auth/login')
      .set('Accept', 'application/json')
      .expect(200)
      .expect('Content-Type', /json/)
      .expect(url);
  });

  it('/api/auth/login (POST) - happy path', () => {
    return request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ code: '12345', state: 'mystate' })
      .set('Accept', 'application/json')
      .expect(200)
      .expect('Content-Type', /json/)
      .expect({ access_token: 'whatever'} );
  });

  it('/api/auth/login (POST) -  wrong data', () => {
    return request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ name: 'john' })
      .set('Accept', 'application/json')
      .expect(400);
  });

  it('/api/auth/login (POST) -  wrong state', () => {
    return request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ code: '12345', state: 'mystate' })
      .set('Accept', 'application/json')
      .expect(403);
  });

  afterAll(async () => {
    await app.close();
  });
});
