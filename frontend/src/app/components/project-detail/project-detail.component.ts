import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, ParamMap } from '@angular/router';

import { map, switchMap } from 'rxjs/operators';

import { GitHubPullRequest } from '../../model/git-hub-pull-request';
import { Project } from '../../model/project';
import { SingleProjectService } from '../../services/single-project.service';

@Component({
  selector: 'app-project-detail',
  templateUrl: './project-detail.component.html',
  styleUrls: ['./project-detail.component.scss']
})
export class ProjectDetailComponent implements OnInit {
  public project: Project;
  public pullRequest: GitHubPullRequest;

  constructor(
    private readonly route: ActivatedRoute,
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
    ).subscribe(pullRequest => {
      this.pullRequest = pullRequest;
    });
  }
}
