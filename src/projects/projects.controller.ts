import { Controller, Get, Headers, Session, Post, Param, Put } from '@nestjs/common';
import { Observable, from, combineLatest } from 'rxjs';
import { map, toArray, filter, switchMap, flatMap } from 'rxjs/operators';
import path = require('path');

import { GithubService } from '../github/github.service';
import { BackendProjectService } from '../backend-project/backend-project.service';
import { ConfigService } from '../config/config.service';
import { GitHubPullRequest } from '../interfaces/git-hub-pull-request.interface';
import { PullRequestService } from '../pull-request/pull-request.service';
import { GitService } from '../git/git.service';

interface Project { name: string; repoUrl?: string; }

@Controller('projects')
export class ProjectsController {
  constructor(
    private readonly githubService: GithubService,
    private readonly backendService: BackendProjectService,
    private readonly configService: ConfigService,
    private readonly pullRequestService: PullRequestService,
    private readonly gitService: GitService,
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
      this.backendService.cloneOrUpdateProject(
        remoteRepo,
        localRepo,
        this.backendService.branchName,
        session.login,
      ),
    ).pipe(map(project => ({
      name: this.backendService.getKeyboardId(params.repo, localRepo),
      repoUrl: project,
    })));

    const createKeyboardsRepo = from(
      this.forkCloneAndUpdateProject(token, session.login, this.configService.keyboardsRepoName, params.repo, 'master'),
    ).pipe(map(project => ({ name: params.repo, repoUrl: project })));

    return combineLatest(
      createSingleProject,
      createKeyboardsRepo,
      result1 => result1,
    );
  }

  private forkCloneAndUpdateProject(
    token: string,
    gitHubUser: string,
    repoName: string,
    branchName: string,
    remoteBranch: string,
  ): Observable<string> {
    return this.githubService
      .forkRepo(token, this.configService.organizationName, repoName, gitHubUser)
      .pipe(switchMap(() => {
        const remoteKeyboardsRepo = `${this.gitHubUrl}/${gitHubUser}/${this.configService.keyboardsRepoName}.git`;
        const localKeyboardsRepo = this.backendService.localKeyboardsRepo;
        return from(this.backendService.cloneOrUpdateProject(
          remoteKeyboardsRepo,
          localKeyboardsRepo,
          `${gitHubUser}-${branchName}`,
          gitHubUser,
          remoteBranch,
        ));
      }),
    );
  }

  @Put(':repo')
  public createPullRequest(
    @Session() session: any,
    @Headers('authorization') token: string,
    @Param() params,
  ): Observable<GitHubPullRequest> {
    const head = `${session.login}:${session.login}-${params.repo}`;
    return this.pullRequestService
      .transferChanges(
        path.join(this.configService.workDirectory, session.login, params.repo),
        this.backendService.localKeyboardsRepo,
      )
      .pipe(
        flatMap(() =>
          from(
            this.gitService.push(
              this.backendService.localKeyboardsRepo,
              session.login,
              `${session.login}-${params.repo}`,
            ),
          ),
        ),
        flatMap(() =>
          this.pullRequestService.createPullRequestOnKeyboardsRepo(
            token,
            head,
            `Add ${params.repo} keyboard`,
            `Merge the single keyboard repo ${params.repo} into the keyboards repo. Courtesy of Keyman Developer Online.`,
          ),
        ),
      );
  }
}
