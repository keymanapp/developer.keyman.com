import { Injectable, Inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { SESSION_STORAGE, WebStorageService } from 'angular-webstorage-service';
import { Observable, of, Subject } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';

import { GitHubUser } from '../model/git-hub-user';
import { environment } from '../../environments/environment';

const AccessTokenKey = 'access_token';
const GitHubCodeKey = 'github_code';
const GitHubStateKey = 'github_state';
const ProfileKey = 'userprofile';

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private loginUrl = `${environment.apiUrl}/auth/login`;
  private userProfileUrl = `${environment.apiUrl}/auth/user`;
  private token: string;
  private gitHubUserProfile: GitHubUser;

  constructor(
    private http: HttpClient,

    @Inject(SESSION_STORAGE)
    private storage: WebStorageService,
  ) {}

  private log(message: any): void {
    console.log(message);
  }

  /**
   * Handle Http operation that failed.
   * Let the app continue.
   * @param operation - name of the operation that failed
   * @param result - optional value to return as the observable result
   */
  private handleError<T>(operation = 'operation', result?: T) {
    return (error: any): Observable<T> => {
      // TODO: send the error to remote logging infrastructure
      console.error('got error:');
      console.error(error); // log to console instead

      // TODO: better job of transforming error for user consumption
      this.log(`${operation} failed: ${error.message}`);

      // Let the app keep running by returning an empty result.
      return of(result as T);
    };
  }

  public login(): Observable<string> {
    return this.http.get<{ url: string }>(this.loginUrl).pipe(
      catchError(this.handleError('GET login REST API', { url: '' })),
      map(obj => obj.url),
    );
  }

  private getUrl(): Observable<string> {
    return this.http.get<{ url: string }>(this.loginUrl).pipe(
      catchError(this.handleError('GET getUrl REST API', { url: '' })),
      map(obj => obj.url),
    );
  }

  public getAccessToken(code: string, state: string): Observable<string> {
    return this.http
      .post<{ accessToken: string }>(this.loginUrl, {
        code,
        state,
      })
      .pipe(
        catchError(
          this.handleError(
            `POST getAccessToken(${code}, ${state}) REST API`,
            { accessToken: '' },
          )),
        map(obj => obj.accessToken),
      );
  }

  public getUserProfile(): Observable<GitHubUser> {
    return this.http.get<GitHubUser>(this.userProfileUrl, {
      headers: { Authorization: `token ${this.token}` },
    });
  }

  public get accessToken(): string {
    if (this.token == null) {
      this.token = this.storage.get(AccessTokenKey);
    }
    return this.token;
  }

  public set accessToken(value: string) {
    this.token = value;
    this.storage.set(AccessTokenKey, value);
  }

  public get gitHubCode(): string {
    return this.storage.get(GitHubCodeKey);
  }

  public set gitHubCode(value: string) {
    this.storage.set(GitHubCodeKey, value);
  }

  public get gitHubState(): string {
    return this.storage.get(GitHubStateKey);
  }

  public set gitHubState(value: string) {
    this.storage.set(GitHubStateKey, value);
  }

  public get userProfile(): GitHubUser {
    if (this.gitHubUserProfile == null) {
      this.gitHubUserProfile = this.storage.get(ProfileKey);
    }
    return this.gitHubUserProfile;
  }

  public set userProfile(value: GitHubUser) {
    this.storage.set(ProfileKey, value);
  }

  public logout(): Observable<string> {
    this.storage.remove(AccessTokenKey);
    this.storage.remove(ProfileKey);
    this.storage.remove(GitHubCodeKey);
    this.storage.remove(GitHubStateKey);

    return this.http.delete<{ url: string }>(this.loginUrl).pipe(
      catchError(this.handleError('DELETE login REST API', { url: '' })),
      map(obj => obj.url),
    );
  }
}
