import { Component, OnInit } from '@angular/core';



import { Project } from '../../model/project';
import { ProjectsService } from '../../services/projects.service';

@Component({
  selector: 'app-projects',
  templateUrl: './projects.component.html',
  styleUrls: ['./projects.component.scss']
})
export class ProjectsComponent implements OnInit {
  public projects: Project[] = [];
  public loadedProjects = false;

  constructor(private projectsService: ProjectsService) { }

  ngOnInit() {
    this.getProjects();
  }

  private getProjects(): void {
    this.projectsService.getRepos().subscribe(projects => {
      this.projects = projects;
      this.loadedProjects = true;
    });
  }
}
