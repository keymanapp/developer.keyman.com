import { HttpService, Injectable } from '@nestjs/common';
import { AxiosResponse, AxiosRequestConfig } from 'axios';
import { Observable, of, empty } from 'rxjs';
import { map, expand, concatMap } from 'rxjs/operators';

import { TokenService } from '../token/token.service';
import { ConfigService } from '../config/config.service';

import { GitHubAccessToken } from '../interfaces/github-access-token.interface';
import { GitHubUser } from '../interfaces/git-hub-user.interface';

const redirectUri = '/index.html';
const scope = 'repo read:user user:email';
interface GitHubProject { name: string; full_name?: string; owner?: { login: string; }; }

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

  public login(session: any): Observable<{ url: string }> {
    // session.state = this.tokenService.createRandomString(10);
    const state = this.tokenService.createRandomString(10);
    const url = {
      url:
        `https://github.com/login/oauth/authorize?client_id=${
          this.config.clientId
        }&` +
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
        `?client_id=${this.config.clientId}&client_secret=${
          this.config.clientSecret
        }` +
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
      return null;
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
      return null;
    }

    const url = `https://api.github.com/user/repos?type=public&sort=full_name&page=${page}&per_page=${pageSize}`;
    return this.getReposPage(url, token).pipe(
      expand(({ nextPageUrl }) => nextPageUrl ? this.getReposPage(nextPageUrl, token) : empty()),
      concatMap(({ content }) => content),
    );
  }

  private getReposPage(url: string, token: string): Observable<{ content: GitHubProject[], nextPageUrl: string | null }> {
    return this.httpService
      .get(url, { headers: { Authorization: token } })
      .pipe(
        map(response => ({
          content: response.data,
          nextPageUrl: this.getUrlOfNextPage(response),
        })),
      );
  }

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

  public forkRepo(
    token: string,
    owner: string,
    repo: string,
  ): Observable<GitHubProject> {
    if (token == null || token.length === 0) {
      return null;
    }

    return this.httpService.post(`https://api.github.com/repos/${owner}/${repo}/forks`, {
      headers: { Authorization: token },
    }).pipe(map(result => result.data));
  }
}
