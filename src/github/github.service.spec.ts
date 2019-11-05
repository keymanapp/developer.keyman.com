import { HttpService } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AxiosResponse } from 'axios';
import { of } from 'rxjs';

import { ConfigModule } from '../config/config.module';
import { GithubService } from './github.service';
import { TokenService } from '../token/token.service';

describe('GitHub Service', () => {
  const projectFromGitHub = {
    name: 'foo',
    full_name: 'jdoe/foo',
    private: false,
    owner: {
      login: 'jdoe',
      type: 'User',
      site_admin: false,
    },
    html_url: 'https://github.com/jdoe/foo',
    description: null,
    fork: false,
    url: 'https://api.github.com/repos/jdoe/foo',
    size: 11195,
    default_branch: 'master',
  };
  let sut: GithubService;
  let spyHttpService: HttpService;

  beforeEach(async () => {
    jest.setTimeout(10000 /*10s*/);
    const testingModule: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule],
      providers: [
        GithubService,
        {
          provide: TokenService,
          useFactory: () => ({
            createRandomString: jest.fn(() => '9876543210'),
          }),
        },
        {
          provide: HttpService,
          useFactory: () => ({
            get: jest.fn(() => true),
            post: jest.fn(() => true),
          }),
        },
      ],
    }).compile();

    sut = testingModule.get<GithubService>(GithubService);
    spyHttpService = testingModule.get<HttpService>(HttpService);
  });

  it('should be defined', () => {
    expect(sut).toBeDefined();
  });

  describe('login', () => {
    it('should return url', async () => {
      await expect(sut.login({ state: '' }).toPromise()).resolves.toEqual({
        url:
          `https://github.com/login/oauth/authorize?client_id=abcxyz&redirect_uri=` +
          `http://localhost:3000/index.html&scope=repo read:user user:email&state=9876543210`,
      });
    });
  });

  describe('getAccessToken', () => {
    it('should invoke get on HttpService', async () => {
      await sut.getAccessToken('code987', '9876543210');

      expect(spyHttpService.get)
        .toHaveBeenCalledWith(
          'https://github.com/login/oauth/access_token' +
          '?client_id=abcxyz&client_secret=secret&code=code987&state=9876543210',
          { headers: { accept: 'application/json' }},
        );
    });
  });

  describe('logout', () => {
    it('returns URL of homepage', async () => {
      await expect(sut.logout().toPromise()).resolves.toEqual({
        url: 'http://localhost:3000/',
      });
    });
  });

  describe('getUserInformation', () => {
    it('should invoke GET on HttpService', async () => {
      await sut.getUserInformation('12345');

      expect(spyHttpService.get).toHaveBeenCalledWith(
        'https://api.github.com/user',
        { headers: { Authorization: '12345'} },
      );
    });

    it('should return null when token is null', async () => {
      const result = await sut.getUserInformation(null);
      expect(result).toBeNull();
    });

    it('should return null when token is empty', async () => {
      const result = await sut.getUserInformation('');
      expect(result).toBeNull();
    });
  });

  describe('getRepos', () => {
    it('should return null when token is null', async () => {
      const result = await sut.getRepos(null, 1, 100);
      expect(result).toBeNull();
    });

    it('should return null when token is empty', async () => {
      const result = await sut.getRepos('', 1, 100);
      expect(result).toBeNull();
    });

    it('should invoke GET on HttpService', async () => {
      const result: AxiosResponse = {
        data: {},
        status: 200,
        statusText: '',
        headers: {},
        config: {},
      };
      jest.spyOn(spyHttpService, 'get').mockImplementationOnce(() => of(result));
      await sut.getRepos('12345', 1, 100);

      expect(spyHttpService.get).toHaveBeenCalledWith(
        'https://api.github.com/user/repos?type=public&sort=full_name&page=1&per_page=100',
        { headers: { Authorization: '12345' } },
      );
    });

    it('should return GitHub projects - fits in one page', () => {
      const result: AxiosResponse = {
        data: [projectFromGitHub],
        status: 200,
        statusText: '',
        headers: {
          link:
            '<https://api.github.com/user/repos?type=public&sort=full_name&page=1>; rel="last",' +
            '<https://api.github.com/user/repos?type=public&sort=full_name&page=1>; rel="first"',
        },
        config: {},
      };
      jest.spyOn(spyHttpService, 'get').mockImplementationOnce(() => of(result));

      return expect(sut.getRepos('token 12345', 1, 100).toPromise())
        .resolves.toEqual(projectFromGitHub);
    });

    it('should return GitHub projects - two pages', done => {
      expect.assertions(5);
      const result1: AxiosResponse = {
        data: [projectFromGitHub],
        status: 200,
        statusText: '',
        headers: {
          link:
            '<https://api.github.com/user/repos?type=public&sort=full_name&page=2>; rel="last",' +
            '<https://api.github.com/user/repos?type=public&sort=full_name&page=2>; rel="next"',
        },
        config: {},
      };
      const result2: AxiosResponse = {
        data: [projectFromGitHub],
        status: 200,
        statusText: '',
        headers: {
          link:
            '<https://api.github.com/user/repos?type=public&sort=full_name&page=1>; rel="prev",' +
            '<https://api.github.com/user/repos?type=public&sort=full_name&page=1>; rel="first"',
        },
        config: {},
      };
      jest.spyOn(spyHttpService, 'get')
        .mockImplementationOnce(() => of(result1))
        .mockImplementationOnce(() => of(result2));

      let count = 0;
      const subscription = sut.getRepos('token 12345', 1, 100).subscribe({
        next: val => {
          expect(val).toEqual(projectFromGitHub);
          count++;
        },
        complete: () => {
          expect(count).toEqual(2);
          expect(spyHttpService.get).toHaveBeenCalledWith(
            'https://api.github.com/user/repos?type=public&sort=full_name&page=1&per_page=100',
            { headers: { Authorization: 'token 12345' } },
          );
          expect(spyHttpService.get).toHaveBeenCalledWith(
            'https://api.github.com/user/repos?type=public&sort=full_name&page=2',
            { headers: { Authorization: 'token 12345' } },
          );
          done();
        },
      });
      subscription.unsubscribe();
    });
  });

  describe('fork repo', () => {
    it('creates a fork', async () => {
      // Setup
      expect.assertions(2);

      const result: AxiosResponse = {
        data: projectFromGitHub,
        status: 200,
        statusText: '',
        headers: {},
        config: {},
      };
      jest.spyOn(spyHttpService, 'post').mockImplementationOnce(() => of(result));

      // Execute
      const gitHubProject = await sut.forkRepo('12345', 'upstreamUser', 'myRepo').toPromise();

      // Verify
      expect(gitHubProject).toEqual(projectFromGitHub);
      expect(spyHttpService.post).toHaveBeenCalledWith(
        'https://api.github.com/repos/upstreamUser/myRepo/forks',
        { headers: { Authorization: '12345' } },
      );
    });
  });

});
