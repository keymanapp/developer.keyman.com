import { Controller, Get, Headers, Session, Post, Param } from '@nestjs/common';
import { Observable, from, combineLatest } from 'rxjs';
import { map, toArray, filter } from 'rxjs/operators';
import { GithubService } from '../github/github.service';
import { BackendProjectService } from '../backend-project/backend-project.service';

interface Project { name: string; repoUrl?: string; }

@Controller('projects')
export class ProjectsController {
  constructor(
    private readonly githubService: GithubService,
    private readonly backendService: BackendProjectService,
  ) {}

  public get gitHubUrl(): string {
    return 'https://github.com';
  }

  @Get('all')
  public getRepos(
    @Session() session: any,
    @Headers('authorization') token: string,
    page: number = 1,
    pageSize: number = 100,
  ): Observable<Project[]> {
    return this.githubService.getRepos(token, page, pageSize).pipe(
      filter(project => project.owner.login === session.login),
      map(project => ({ name: project.name })),
      toArray(),
    );
  }

  @Post(':repo')
  public createRepo(
    @Session() session: any,
    @Headers('authorization') token: string,
    @Param() params,
  ): Observable<Project> {
    const localRepo = this.backendService.getProjectRepo(session.login, params.repo);
    const remoteRepo = `${this.gitHubUrl}/${session.login}/${params.repo}.git`;
    const createSingleProject = from(
      this.backendService.cloneOrUpdateProject(remoteRepo, localRepo, this.backendService.branchName),
    ).pipe(map(project => ({ name: params.repo, repoUrl: project })));

    const remoteKeyboardsRepo = `${this.gitHubUrl}/${session.login}/${this.backendService.keyboardsRepoName}.git`;
    const localKeyboardsRepo = this.backendService.localKeyboardsRepo;
    const createKeyboardsProject = from(
      this.backendService.cloneOrUpdateProject(
        remoteKeyboardsRepo,
        localKeyboardsRepo,
        `${session.login}-${params.repo}`,
      ),
    ).pipe(map(project => ({ name: params.repo, repoUrl: project })));

    return combineLatest(createSingleProject, createKeyboardsProject, (result1) => result1);
  }
}
