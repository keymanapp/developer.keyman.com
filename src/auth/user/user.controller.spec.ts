import {
  HttpModule,
  HttpService,
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
  HttpException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import MockAdapter from 'axios-mock-adapter';
import { of } from 'rxjs';
import { ConfigModule } from '../../config/config.module';
import { GithubService } from '../../github/github.service';
import { TokenService } from '../../token/token.service';
import { UserController } from './user.controller';
import { LoginDto } from '../model/login-dto';
import { AccessTokenDto } from '../model/access-token-dto';
import { GitHubUserDto } from '../model/git-hub-user-dto';
import { GitHubAccessToken } from '../../interfaces/github-access-token.interface';
import '../../utils/to-contain-exception-matcher';

describe('User Controller', () => {
  let sut: UserController;
  let githubService: GithubService;
  let httpService: HttpService;
  let mockAdapter: MockAdapter;

  beforeEach(async () => {
    // NOTE: we mock the Axios HttpService instead of GithubService because that's easier
    // than trying to create the correct AxiosResult values returned from GithubService.
    httpService = new HttpService();
    mockAdapter = new MockAdapter(httpService.axiosRef);
    const module: TestingModule = await Test.createTestingModule({
      imports: [HttpModule, ConfigModule],
      controllers: [UserController],
      providers: [
        GithubService,
        TokenService,
        {
          provide: HttpService,
          useValue: httpService,
        },
      ],
    }).compile();

    sut = module.get<UserController>(UserController);
    githubService = module.get<GithubService>(GithubService);
  });

  it('should be defined', () => {
    expect(sut).toBeDefined();
  });

  describe('login', () => {
    it('should return url', async () => {
      const result = {
        url: 'https://github.com/login/oauth/authorize?client_id=12345&more',
      };
      jest.spyOn(githubService, 'login').mockImplementation(() => of(result));

      await expect(
        sut.login({ state: '' }).toPromise(),
      ).resolves.toEqual(result);
    });
  });

  describe('getAccessToken', () => {
    it('should return access token', async () => {
      const loginDto = { code: 'code987', state: '9876543210' };
      const result: GitHubAccessToken = {
        access_token: '12345',
        scope: 'repo,read:user,user:email',
        token_type: 'bearer',
      };
      mockAdapter
        .onGet('https://github.com/login/oauth/access_token' +
          '?client_id=abcxyz&client_secret=secret&code=code987&state=9876543210')
        .reply(200, result);

      await expect(
        sut.getAccessToken(loginDto),
      ).resolves.toEqual(new AccessTokenDto('12345'));
    });

    it('should return error if wrong state', async () => {
      const loginDto = new LoginDto('code987', 'wrongstate');
      mockAdapter
        .onGet(
          'https://github.com/login/oauth/access_token' +
            '?client_id=abcxyz&client_secret=secret&code=code987&state=wrongstate',
        )
        .reply(403, 'Forbidden');

      await expect(
        sut.getAccessToken(loginDto),
      ).rejects.toContainException(
        new ForbiddenException({
          accessToken: '',
          error: 'Request failed with status code 403',
        }),
      );
    });

    it('should return error if wrong dto object', async () => {
      const loginDto = new LoginDto('', '9876543210');
      mockAdapter
        .onGet(
          'https://github.com/login/oauth/access_token' +
            '?client_id=abcxyz&client_secret=secret&code=&state=9876543210',
        )
        .reply(401, 'Unauthorized');

      await expect(
        sut.getAccessToken(loginDto),
      ).rejects.toContainException(
        new UnauthorizedException({
          accessToken: '',
          error: 'Request failed with status code 401',
        }),
      );
    });

    it('should return error if network not available', async () => {
      const loginDto = new LoginDto('code987', '9876543210');
      mockAdapter
        .onGet(
          'https://github.com/login/oauth/access_token' +
            '?client_id=abcxyz&client_secret=secret&code=code987&state=9876543210',
        )
        .networkError();

      await expect(
        sut.getAccessToken(loginDto),
      ).rejects.toContainException(
        new HttpException(
          {
            accessToken: '',
            error: 'Network Error',
          },
          400,
        ),
      );
    });

    it('should return error when GitHub returns an error', async () => {
      const loginDto = { code: 'code987', state: '9876543210' };
      mockAdapter
        .onGet(
          'https://github.com/login/oauth/access_token' +
            '?client_id=abcxyz&client_secret=secret&code=code987&state=9876543210',
        )
        .reply(
          200,
          'error=bad_verification_code&error_description=The+code+passed+is+incorrect+or+expired.',
        );

      await expect(
        sut.getAccessToken(loginDto),
      ).rejects.toContainException(
        new BadRequestException({
          accessToken: '',
          error:
            'error=bad_verification_code&error_description=The+code+passed+is+incorrect+or+expired.',
        }),
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
    it('happy path', async () => {
      const userInfo = {
        login: 'johndoe',
        name: 'john doe',
        avatar_url: 'example.com/myavatar',
      };
      mockAdapter.onGet('https://api.github.com/user').reply(200, userInfo);

      await expect(
        sut.getUserInformation('token 12345'),
      ).resolves.toEqual(new GitHubUserDto(userInfo));
    });

    it('should return error when token is wrong', async () => {
      mockAdapter
        .onGet('https://api.github.com/user')
        .reply(401, 'invalid token');

      await expect(
        sut.getUserInformation('token invalid'),
      ).rejects.toContainException(
        new UnauthorizedException({
          login: '',
          name: '',
          avatarUrl: '',
          error: 'Request failed with status code 401',
        }),
      );
    });
  });
});
