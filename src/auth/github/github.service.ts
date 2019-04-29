import { HttpService, Injectable } from '@nestjs/common';
import { AxiosResponse } from 'axios';
import { Observable, of } from 'rxjs';
import { TokenService } from '../token/token.service';
import { ConfigService } from '../../config/config.service';
import { GitHubAccessToken } from '../interfaces/github-access-token.interface';
import { GitHubUser } from '../interfaces/git-hub-user.interface';

const redirectUri = '/api/auth/redirect';
const scope = 'repo read:user user:email';

@Injectable()
export class GithubService {
  constructor(
    private readonly config: ConfigService,
    private readonly tokenService: TokenService,
    private readonly httpService: HttpService,
  ) {}

  private getRedirectUri(): string {
    return `${this.config.redirectHost}:${this.config.port}${redirectUri}`;
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
    const data = {
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      code: { code },
      redirect_uri: this.getRedirectUri(),
      state: { state },
    };

    return this.httpService.post(
      'https://github.com/login/oauth/access_token',
      data,
    );
  }

  public logout(): Observable<{ url: string }> {
    return of({ url: `${this.config.redirectHost}:${this.config.port}/` });
  }

  public getUserInformation(token: string): Observable<AxiosResponse<GitHubUser>> {
    return this.httpService.get(
      'https://api.github.com/user',
      { headers: { Authorization: token } },
    );
  }
}
