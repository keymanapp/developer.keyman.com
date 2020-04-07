import { GitHubUser } from '../../interfaces/git-hub-user.interface';

export class GitHubUserDto {
  constructor(data: GitHubUser | null = null) {
    if (data != null) {
      this.login = data.login;
      this.name = data.name;
      this.avatarUrl = data.avatar_url;
    } else {
      this.login = '';
      this.name = '';
      this.avatarUrl = '';
    }
   }

  login: string;

  name: string;

  avatarUrl: string;

  error?: string;
}
