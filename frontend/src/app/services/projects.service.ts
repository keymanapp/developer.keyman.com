import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { environment } from '../../environments/environment';
import { UserService } from './user.service';
import { ErrorHelper } from '../utils/error-helper';
import { Project } from '../model/project';

@Injectable({
  providedIn: 'root',
})
export class ProjectsService {
  constructor(private http: HttpClient, private userService: UserService) {}

  public getRepos(): Observable<Project[]> {
    return this.http.get<{ project }[]>(`${environment.apiUrl}/projects/all`, {
      headers: { Authorization: `token ${this.userService.accessToken}` },
    }).pipe(
      catchError(ErrorHelper.handleError('GET projects/all REST API', null)),
      map(obj => obj.map(({ name }) => new Project(name, name !== 'keyboards'))),
    );
  }
}
