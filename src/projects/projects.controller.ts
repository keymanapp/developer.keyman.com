import { Controller, Get, Headers, Session, Post, Param, Put } from '@nestjs/common';
import { Observable, forkJoin } from 'rxjs';
import { map, toArray, filter, switchMap, last, tap } from 'rxjs/operators';
import path = require('path');
import debugModule = require('debug');
const debug = debugModule('kdo:projects');

import { GithubService } from '../github/github.service';
import { BackendProjectService } from '../backend-project/backend-project.service';
import { ConfigService } from '../config/config.service';
import { GitHubPullRequest } from '../interfaces/git-hub-pull-request.interface';
import { PullRequestService } from '../pull-request/pull-request.service';
import { GitService } from '../git/git.service';

interface Project { name: string; repoUrl?: string }

const prTitle = 'Add ${repo} keyboard';
const prDescription = 'Merge the single keyboard repo ${repo} into the keyboards repo. Courtesy of Keyman Developer Online.';

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
    page = 1,
    pageSize = 100,
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

    debug(`In createRepo: login: ${session.login}, repo: ${params.repo}, localRepo: ${localRepo}, \\`);
    debug(`    remoteRepo: ${ remoteRepo }, branch: ${ this.backendService.branchName }`);

    const createSingleProject = this.backendService.cloneOrUpdateProject(
        remoteRepo,
        localRepo,
        this.backendService.branchName,
        session.login,
    ).pipe(
      tap(project => debug(`cloneOrUpdateProject(singleProj) created in ${project}`)),
      map(() => ({
        name: this.backendService.getKeyboardId(params.repo, localRepo),
        repoUrl: remoteRepo,
      })),
    );

    const createKeyboardsRepo = this.forkCloneAndUpdateProject(
      token, session.login, this.configService.keyboardsRepoName, params.repo, 'master',
    ).pipe(
      tap(project => debug(`forkCloneAndUpdateProject(keyboards) created in ${project}`)),
      map(project => ({ name: params.repo, repoUrl: project })),
    );

    return forkJoin({
      result1: createSingleProject,
      result2: createKeyboardsRepo,
    }).pipe(
      map((obj) => obj.result1),
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
      .pipe(
        switchMap(() => {
          const remoteKeyboardsRepo = `${this.gitHubUrl}/${gitHubUser}/${this.configService.keyboardsRepoName}.git`;
          const localKeyboardsRepo = this.backendService.localKeyboardsRepo;
          return this.backendService.cloneOrUpdateProject(
            remoteKeyboardsRepo,
            localKeyboardsRepo,
            `${gitHubUser}-${branchName}`,
            gitHubUser,
            remoteBranch,
          );
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
    debug(`createPullRequest for ${params.repo}`);
    return this.pullRequestService
      .transferChanges(
        path.join(this.configService.workDirectory, session.login, params.repo),
        this.backendService.localKeyboardsRepo,
      )
      .pipe(
        last(),
        tap(() => debug(`pushing changes in ${this.backendService.localKeyboardsRepo}`)),
        switchMap(() =>
          this.gitService.push(
            this.backendService.localKeyboardsRepo,
            session.login,
            `${session.login}-${params.repo}`,
            token,
          ),
        ),
        tap(() => debug('create PR on keyboards repo')),
        switchMap(() =>
          this.pullRequestService.createPullRequestOnKeyboardsRepo(
            token,
            head,
            prTitle.replace('${repo}', params.repo),
            prDescription.replace('${repo}', params.repo),
          ),
        ),
      );
  }
}
