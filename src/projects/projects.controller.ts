import { Controller, Get, Headers, Session } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map, toArray, filter } from 'rxjs/operators';
import { GithubService } from '../github/github.service';

interface GitHubProject { name: string; full_name?: string; owner?: { login: string; }; }
interface Project { name: string; }

@Controller('projects')
export class ProjectsController {
  constructor(private readonly githubService: GithubService) {}

  @Get('all')
  public getRepos(
    @Session() session: any,
    @Headers('authorization') token: string,
    page: number = 1,
    pageSize: number = 100,
  ): Observable<Project[]> {
    return this.githubService.getRepos(token, page, pageSize).pipe(
      filter(project => project.owner.login === session.login),
      map(project => ({ name: project.name })),
      toArray(),
    );
  }
}
