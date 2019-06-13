import { Test, TestingModule } from '@nestjs/testing';
import { ProjectsController } from './projects.controller';
import { HttpModule } from '@nestjs/common/http';
import { of, empty } from 'rxjs';

import { GithubService } from '../github/github.service';
import { ConfigModule } from '../config/config.module';
import { TokenService } from '../token/token.service';

describe('Projects Controller', () => {
  let sut: ProjectsController;
  let githubService: GithubService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [HttpModule, ConfigModule],
      controllers: [ProjectsController],
      providers: [
        TokenService,
        {
          provide: GithubService,
          useFactory: () => ({
            getRepos: jest.fn(() => true),
          }),
        },
      ],
    }).compile();

    sut = module.get<ProjectsController>(ProjectsController);
    githubService = module.get<GithubService>(GithubService);
  });

  it('should be defined', () => {
    expect(sut).toBeDefined();
  });

  describe('getRepos', () => {
    it('should return list of repos', async () => {
      jest.spyOn(githubService, 'getRepos').mockImplementationOnce(() => of({ name: 'foo' }));

      await expect(sut.getRepos('token 12345', 1).toPromise())
        .resolves.toEqual([{ name: 'foo' }]);
    });

    it('should return empty list if requesting behind last page', async () => {
      jest.spyOn(githubService, 'getRepos').mockImplementationOnce(() => empty());

      await expect(sut.getRepos('token 12345', 99).toPromise()).resolves.toEqual([]);
    });
  });
});
