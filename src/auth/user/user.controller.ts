import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Session,
  ValidationPipe,
  BadRequestException,
  Delete,
  Headers,
} from '@nestjs/common';
import { GithubService } from '../github/github.service';
import { LoginDto } from '../model/login-dto';
import { Observable } from 'rxjs';
import { AccessTokenDto } from '../model/access-token-dto';
import { GitHubAccessToken } from '../interfaces/github-access-token.interface';
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
    @Session() session: any,
    @Body(new ValidationPipe()) loginDto: LoginDto,
  ): Promise<AccessTokenDto> {
    const response = await this.githubService
      .getAccessToken(loginDto.code, loginDto.state)
      .toPromise();
    if (
      typeof response.data === 'string' &&
      (response.data as string).startsWith('error=')
    ) {
      const token = new AccessTokenDto();
      token.error = response.data;
      throw new BadRequestException(token, response.data);
    }

    const ghToken = response.data as GitHubAccessToken;
    return new AccessTokenDto(ghToken.access_token);
  }

  @Delete('login')
  public logout(): Observable<{ url: string }> {
    return this.githubService.logout();
  }

  @Get('user')
  public async getUserInformation(@Headers('Authorization') token: string): Promise<GitHubUser> {
    const response = await this.githubService
      .getUserInformation(token)
      .toPromise();
    return response.data;
  }
}
