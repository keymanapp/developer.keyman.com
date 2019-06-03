import { HttpService } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '../../config/config.module';
import { GithubService } from '../github/github.service';
import { TokenService } from '../token/token.service';

describe('GitHub Service', () => {
  let sut: GithubService;
  let spyHttpService: HttpService;

  beforeEach(async () => {
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
    it('should invoke get on HttpService', async () => {
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
});
