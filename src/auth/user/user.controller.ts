import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Session,
  ValidationPipe,
  Delete,
  Headers,
} from '@nestjs/common';
import { GithubService } from '../github/github.service';
import { LoginDto } from '../model/login-dto';
import { Observable } from 'rxjs';
import { AccessTokenDto } from '../model/access-token-dto';
import { GitHubAccessToken } from '../interfaces/github-access-token.interface';
import { GitHubUserDto } from '../model/git-hub-user-dto';
import { callWithErrorHandling } from '../../utils/call-with-error-handling';
import { GitHubUser } from '../interfaces/git-hub-user.interface';

@Controller('auth')
export class UserController {
  constructor(private readonly githubService: GithubService) {}

  @Get('login')
  public login(@Session() session: any): Observable<{ url: string }> {
    return this.githubService.login(session);
  }

  @Post('login')
  @HttpCode(200)
  public async getAccessToken(
    @Body(new ValidationPipe()) loginDto: LoginDto,
  ): Promise<AccessTokenDto> {
    return callWithErrorHandling(
      () => this.githubService.getAccessToken(loginDto.code, loginDto.state),
      (response) => {
        const ghToken = response.data as GitHubAccessToken;
        return new AccessTokenDto(ghToken.access_token);
      },
      AccessTokenDto,
    );
  }

  @Delete('login')
  public logout(): Observable<{ url: string }> {
    return this.githubService.logout();
  }

  @Get('user')
  public async getUserInformation(@Headers('Authorization') token: string): Promise<GitHubUserDto> {
    return callWithErrorHandling(
      () => this.githubService.getUserInformation(token),
      (response) => new GitHubUserDto(response.data as GitHubUser),
      GitHubUserDto,
    );
  }
}
