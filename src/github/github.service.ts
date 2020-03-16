import { HttpService, Injectable } from '@nestjs/common';
import { AxiosResponse, AxiosRequestConfig } from 'axios';
import { Observable, of, empty, interval, from } from 'rxjs';
import { map, expand, concatMap, catchError, mapTo, switchMap, takeWhile, takeLast, tap } from 'rxjs/operators';

import { TokenService } from '../token/token.service';
import { ConfigService } from '../config/config.service';

import { GitHubAccessToken } from '../interfaces/github-access-token.interface';
import { GitHubUser } from '../interfaces/git-hub-user.interface';
import { GitHubProject } from '../interfaces/git-hub-project.interface';
import { GitHubPullRequest } from '../interfaces/git-hub-pull-request.interface';

const redirectUri = '/index.html';
const scope = 'repo read:user user:email';

@Injectable()
export class GithubService {
  constructor(
    private readonly config: ConfigService,
    private readonly tokenService: TokenService,
    private readonly httpService: HttpService,
  ) {}

  private getRedirectUri(): string {
    return `${this.config.redirectHost}${redirectUri}`;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public login(session: any): Observable<{ url: string }> {
    // session.state = this.tokenService.createRandomString(10);
    const state = this.tokenService.createRandomString(10);
    const url = {
      url:
        `https://github.com/login/oauth/authorize?client_id=${this.config.clientId}&` +
        `redirect_uri=${this.getRedirectUri()}&scope=${scope}&state=${state}`,
    };
    return of(url);
  }

  public getAccessToken(
    code: string,
    state: string,
  ): Observable<AxiosResponse<GitHubAccessToken | string>> {
    // REVIEW: The GitHub documentation
    // (https://developer.github.com/apps/building-oauth-apps/authorizing-oauth-apps/#2-users-are-redirected-back-to-your-site-by-github)
    // mentions to use POST to get the access token, but I can't get that to work whereas
    // GET works.
    /*
    const options: AxiosRequestConfig = {
      headers: {
        accept: 'application/json',
        'Content-Type': 'application/json',
      },
      data: {
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        code: { code },
        redirect_uri: this.getRedirectUri(),
        state: { state },
      },
    };

    return this.httpService.post(
      'https://github.com/login/oauth/access_token',
      options,
    );
    */
    const opt: AxiosRequestConfig = {
      headers: {
        accept: 'application/json',
      },
    };
    return this.httpService.get(
      'https://github.com/login/oauth/access_token' +
        `?client_id=${this.config.clientId}&client_secret=${this.config.clientSecret}` +
        `&code=${code}&state=${state}`,
      opt,
    );
  }

  public logout(): Observable<{ url: string }> {
    return of({ url: `${this.config.redirectHost}/` });
  }

  public getUserInformation(
    token: string,
  ): Observable<AxiosResponse<GitHubUser | string>> {
    if (token == null || token.length === 0) {
      return of(null);
    }
    return this.httpService.get('https://api.github.com/user', {
      headers: { Authorization: token },
    });
  }

  public getRepos(
    token: string,
    page: number,
    pageSize: number,
  ): Observable<GitHubProject> {
    if (token == null || token.length === 0) {
      return of(null);
    }

    const url = `https://api.github.com/user/repos?type=public&sort=full_name&page=${page}&per_page=${pageSize}`;
    return this.getReposPage(url, token).pipe(
      expand(({ nextPageUrl }) =>
        nextPageUrl ? this.getReposPage(nextPageUrl, token) : empty(),
      ),
      concatMap(({ content }) => content),
    );
  }

  // Get one page full of repos
  private getReposPage(
    url: string,
    token: string,
  ): Observable<{ content: GitHubProject[]; nextPageUrl: string | null }> {
    return this.httpService
      .get(url, { headers: { Authorization: token } })
      .pipe(
        map(response => ({
          content: response.data,
          nextPageUrl: this.getUrlOfNextPage(response),
        })),
      );
  }

  // Extract the URL of the next page from the headers
  private getUrlOfNextPage(response: AxiosResponse): string | null {
    let url: string | null = null;
    const link = response.headers.link;
    if (link) {
      const match = link.match(/<([^>]+)>;\s*rel="next"/);
      if (match) {
        [, url] = match;
      }
    }
    return url;
  }

  // When we fork a project on GitHub the API call immediately returns before the
  // repo actually exists. This method waits until the project appears (or timeout).
  public waitForRepoToExist(
    owner: string,
    repo: string,
    timeoutSeconds = 300,
  ): Observable<void> {
    let firstCheck = true;
    return interval(1000).pipe(
      switchMap((x: number) => {
        if (x >= timeoutSeconds) {
          throw new Error(
            `GitHubService.waitForRepoToExist(${owner}/${repo}): timeout after ${timeoutSeconds} seconds without seeing repo`,
          );
        }

        return this.repoExists(owner, repo);
      }),
      takeWhile(exists => !exists || firstCheck),
      tap(() => { firstCheck = false; }),
      takeLast(1),
      map(() => { return; }),
    );
  }

  public repoExists(owner: string, repo: string): Observable<boolean> {
    return this.httpService.get(`https://github.com/${owner}/${repo}`).pipe(
      mapTo(true),
      catchError(() => of(false)),
    );
  }

  public forkRepo(
    token: string,
    upstreamOwner: string,
    repo: string,
    user: string,
  ): Observable<GitHubProject> {
    if (token == null || token.length === 0) {
      return of(null);
    }

    return this.repoExists(user, repo).pipe(
      switchMap(exists => {
        if (exists) {
          return of({ name: repo, 'full_name': `${user}/${repo}` });
        }

        let project: GitHubProject = null;

        return this.httpService
          .post(
            `https://api.github.com/repos/${upstreamOwner}/${repo}/forks`,
            null,
            {
              headers: { authorization: token },
            },
          )
          .pipe(
            catchError(() => of({ data: null, 'full_name': 'error' })),
            switchMap(result => {
              project = result.data;
              return this.waitForRepoToExist(user, repo).pipe(
                map(() => project),
              );
            }),
            catchError(() => of({ name: null })),
          );
      }),
    );
  }

  public createPullRequest(
    token: string, // the token used to authorize with GitHub
    owner: string, // owner of the repo where the PR will be created in
    repoName: string, // name of the repo
    head: string, // name of the branch that contains the new commits. Use `username:branch` for cross-repo PRs
    base: string, // name of the branch to merge the changes in
    title: string, // title of the PR
    description: string, // description of the PR
  ): Observable<GitHubPullRequest> {
    if (token == null || token.length === 0) {
      return of(null);
    }

    return this.httpService
      .post(`https://api.github.com/repos/${owner}/${repoName}/pulls`, null, {
        headers: { authorization: token },
        data: {
          title,
          head,
          base,
          body: description,
        },
      })
      .pipe(
        map(result => ({
          'number': result.data.number,
          url: result.data.url,
          state: result.data.state,
        })),
        catchError(err => { throw err.response.data.errors; }),
      );
  }

  public listPullRequests(
    token: string, // the token used to authorize with GitHub
    owner: string, // owner of the repo whose PRs to list
    repoName: string, // name of the repo
  ): Observable<GitHubPullRequest> {
    if (token == null || token.length === 0) {
      return of(null);
    }

    return this.httpService
      .get(`https://api.github.com/repos/${owner}/${repoName}/pulls`, {
        headers: {
          'authorization': token,
          'Content-Type': 'application/json',
        },
      })
      .pipe(
        catchError(err => { throw err.response.data.errors; }),
        map(result => result.data),
        concatMap((pullRequests: GitHubPullRequest[]) => from(pullRequests)),
      );
  }

  public closePullRequest(
    token: string, // the token used to authorize with GitHub
    owner: string, // owner of the repo whose PRs to list
    repoName: string, // name of the repo
    pullNumber: number, // PR#
  ): Observable<GitHubPullRequest> {
    if (token == null || token.length === 0) {
      return of(null);
    }

    return this.httpService
      .patch(
        `https://api.github.com/repos/${owner}/${repoName}/pulls/${pullNumber}`, null, {
          headers: { authorization: token },
          data: { state: 'closed' },
        },
      )
      .pipe(
        map(result => ({
          'number': result.data.number,
          url: result.data.url,
          state: result.data.state,
        })),
      );
  }
}
