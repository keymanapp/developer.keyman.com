import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, ParamMap } from '@angular/router';
import { switchMap } from 'rxjs/operators';

import { Project } from '../../model/project';
import { SingleProjectService } from '../../services/single-project.service';

@Component({
  selector: 'app-project-detail',
  templateUrl: './project-detail.component.html',
  styleUrls: ['./project-detail.component.scss']
})
export class ProjectDetailComponent implements OnInit {
  public project: Project;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly service: SingleProjectService,
  ) { }

  ngOnInit() {
    this.route.paramMap.pipe(
      switchMap((params: ParamMap) => this.service.cloneProject(params.get('name'))),
    ).subscribe(
      (project: Project) => this.project = project,
    );
  }

  public createPullRequest(): void {
  }
}
