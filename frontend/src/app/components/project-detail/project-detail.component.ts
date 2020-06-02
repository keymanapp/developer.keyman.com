import { HttpErrorResponse } from '@angular/common/http';
import { Component, Input, OnInit } from '@angular/core';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';

import { map, switchMap } from 'rxjs/operators';

import { GitHubPullRequest } from '../../model/git-hub-pull-request';
import { Project } from '../../model/project';
import { SingleProjectService } from '../../services/single-project.service';
import { ErrorHelper } from '../../utils/error-helper';

@Component({
  selector: 'app-project-detail',
  templateUrl: './project-detail.component.html',
  styleUrls: ['./project-detail.component.scss']
})
export class ProjectDetailComponent implements OnInit {
  @Input() public project: Project;
  public pullRequest: GitHubPullRequest;
  public message: string;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly errorHelper: ErrorHelper,
    private readonly router: Router,
    private readonly service: SingleProjectService,
  ) { }

  ngOnInit() {
    let name: string;
    this.route.paramMap.pipe(
      switchMap((params: ParamMap) => {
        name = params.get('name');
        return this.service.cloneProject(name);
      }),
      map((project: Project) => { this.project = project; }),
      switchMap(() => this.service.getPullRequest(name)),
    ).subscribe(
      (pullRequest: GitHubPullRequest) => this.pullRequest = pullRequest,
      (err: HttpErrorResponse) => {
        if (err.status === 400) {
          this.message = `${name} is not a single-keyboard repo.`;
        } else if (err.status === 401 || err.status === 403) {
          this.errorHelper.handleUnauthorized();
        } else {
          this.message = `ERROR ${err.status}: ${err.statusText}.`;
        }
      }
    );
  }

  public get keyboardPath(): string {
    return `release/${this.project.prefix}/${this.project.keyboardId}`;
  }

  public createOrUpdatePullRequest(project: Project) {
    this.router.navigate(['/projects', project.name, 'pr',{
      prefix: project.prefix,
      keyboardId: project.keyboardId,
      prExists: this.pullRequest.action,
    }]);
  }
}
