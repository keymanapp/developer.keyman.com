import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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

  @ApiProperty({
    description: 'The GitHub userid',
    example: 'johndoe',
  })
  public login: string;

  @ApiProperty({
    description: 'The GitHub user name',
    example: 'John Doe',
  })
  public name: string;

  @ApiProperty({
    description: 'The URL of the avatar',
    example: 'https://github.com/images/error/octocat_happy.gif',
  })
  public avatarUrl: string;

  @ApiPropertyOptional({
    description: 'The error that happened',
    example: null,
  })
  public error?: string;
}
