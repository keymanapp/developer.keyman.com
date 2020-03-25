import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, ParamMap } from '@angular/router';

import { switchMap } from 'rxjs/operators';

import { GitHubPullRequest } from '../../model/git-hub-pull-request';
import { SingleProjectService } from '../../services/single-project.service';

@Component({
  selector: 'app-pull-request',
  templateUrl: './pull-request.component.html',
  styleUrls: ['./pull-request.component.scss']
})
export class PullRequestComponent implements OnInit {
  public pullRequest: GitHubPullRequest;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly service: SingleProjectService,
  ) { }

  ngOnInit(): void {
    this.route.paramMap.pipe(
      switchMap((params: ParamMap) => this.service.createPullRequest(params.get('name'))),
    ).subscribe(
      (pullRequest: GitHubPullRequest) => this.pullRequest = pullRequest,
    );
  }

  public get appliedAction(): string {
    if (this.pullRequest.action == 'created') {
      return this.pullRequest.action;
    }
    return 'updated';
   }
}
