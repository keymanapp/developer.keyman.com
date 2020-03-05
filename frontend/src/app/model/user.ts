import { Injectable, Inject } from '@angular/core';
import { SESSION_STORAGE, WebStorageService } from 'ngx-webstorage-service';
import { GitHubUser } from './git-hub-user';

const AccessTokenKey = 'access_token';
const GitHubCodeKey = 'github_code';
const GitHubStateKey = 'github_state';
const ProfileKey = 'userprofile';


@Injectable({
  providedIn: 'root',
})
export class User {
  constructor(
    @Inject(SESSION_STORAGE)
    private storage: WebStorageService,
  ) {}

  public get accessToken(): string {
    return this.storage.get(AccessTokenKey);
  }

  public set accessToken(value: string) {
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
    return this.storage.get(ProfileKey);
  }

  public set userProfile(value: GitHubUser) {
    this.storage.set(ProfileKey, value);
  }

  public clear() {
    this.storage.remove(AccessTokenKey);
    this.storage.remove(ProfileKey);
    this.storage.remove(GitHubCodeKey);
    this.storage.remove(GitHubStateKey);
  }
}
