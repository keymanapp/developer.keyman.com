import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { Project } from '../model/project';
import { ErrorHelper } from '../utils/error-helper';
import { UserService } from './user.service';
import { catchError, map, tap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class SingleProjectService {

  constructor(
    private readonly http: HttpClient,
    private readonly userService: UserService,
    private readonly errorHelper: ErrorHelper
  ) { }

  public cloneProject(name: string): Observable<Project|null> {
    return this.http.post<{ project }>(`${environment.apiUrl}/projects/${name}`, {
      headers: { Authorization: `token ${this.userService.accessToken}` },
    }).pipe(
      catchError(this.errorHelper.handleError(`POST projects/${name} REST API`, null)),
      tap(obj => { console.log('obj='); console.log(obj); }),
      map(obj => new Project(obj.name, true, obj.repoUrl)),
    );
  }
}
