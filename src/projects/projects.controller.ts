import { Controller, Get, Headers } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map, toArray } from 'rxjs/operators';
import { GithubService } from '../github/github.service';

interface GitHubProject { name: string; }

@Controller('projects')
export class ProjectsController {
  constructor(private readonly githubService: GithubService) {}

  @Get('all')
  public getRepos(
    @Headers('authorization') token: string,
    page: number = 1,
    pageSize: number = 100,
  ): Observable<GitHubProject[]> {
    return this.githubService.getRepos(token, page, pageSize).pipe(
      map(project => ({ name: project.name })),
      toArray(),
    );
  }
}
