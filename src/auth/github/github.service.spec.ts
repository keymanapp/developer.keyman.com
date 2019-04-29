import { HttpService } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import MockAdapter from 'axios-mock-adapter';
import { ConfigService } from '../../config/config.service';
import { TokenService } from '../token/token.service';
import { GithubService } from './github.service';

const mockedCode = '1234567890';
const mockedState = 'abc987';
const mockedToken = {
  access_token: 'e72e16c7e42f292c6912e7710c838347ae178b4a',
  scope: 'repo,read:user,user:email',
  token_type: 'bearer',
};

describe('GithubService', () => {
  let service: GithubService;
  let config: ConfigService;
  let httpService: HttpService;
  let mockAdapter: MockAdapter;
  let tokenService: TokenService;

  beforeEach(async () => {
    httpService = new HttpService();
    mockAdapter = new MockAdapter(httpService.axiosRef);
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GithubService,
        TokenService,
        {
          provide: ConfigService,
          useValue: new ConfigService(),
        },
        {
          provide: HttpService,
          useValue: httpService,
        },
      ],
      exports: [ConfigService],
    }).compile();

    service = module.get<GithubService>(GithubService);
    config = module.get<ConfigService>(ConfigService);
    tokenService = module.get<TokenService>(TokenService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('login', async () => {
    const state = 'deadbeef';
    jest.spyOn(tokenService, 'createRandomString').mockImplementation(() => state);

    const response = await service.login({ state: '' }).toPromise();
    expect(response).toEqual({
      url:
        `https://github.com/login/oauth/authorize?client_id=${config.clientId}&` +
        'redirect_uri=http://localhost:3000/api/auth/redirect&scope=repo read:user' +
        ` user:email&state=${state}`,
    });
  });

  describe('getAccessToken', () => {
    it('happy path', async () => {
      mockAdapter
        .onPost('https://github.com/login/oauth/access_token')
        .reply(200, mockedToken);
      const response = await service.getAccessToken(mockedCode, mockedState).toPromise();
      expect(response.data).toEqual(mockedToken);
    });

    it('wrong state', async () => {
      mockAdapter
        .onPost('https://github.com/login/oauth/access_token')
        .reply(400, 'wrong state');
      const response = await service.getAccessToken(mockedCode, '0000');
      expect(response.toPromise()).rejects.toThrowError('Request failed with status code 400');
    });
  });

  describe('logout', () => {
    it('should return URL of homepage', async () => {
      const response = await service.logout().toPromise();
      expect(response).toEqual({
        url: 'http://localhost:3000/',
      });
    });
  });

  describe('getUserInformation', () => {
    it('happy path', async () => {
      const userInfo = {
        login: 'johndoe',
        name: 'john doe',
        avatar_url: 'example.com/myavatar',
      };
      mockAdapter
        .onGet('https://api.github.com/user')
        .reply(200, userInfo);
      const response = await service.getUserInformation('token 12345')
        .toPromise();
      expect(response.data).toEqual(userInfo);
    });

    it('invalid token', async () => {
      mockAdapter
        .onGet('https://api.github.com/user')
        .reply(401, 'invalid token');
      const response = await service.getUserInformation('token invalid');
      expect(response.toPromise()).rejects.toThrowError('Request failed with status code 401');
    });
  });
});
