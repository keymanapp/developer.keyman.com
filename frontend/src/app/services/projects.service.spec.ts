import { APP_BASE_HREF } from '@angular/common';
import { TestBed, inject } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { RouterModule } from '@angular/router';
import { StorageServiceModule } from 'ngx-webstorage-service';

import { ProjectsService } from './projects.service';
import { Project } from '../model/project';

describe('ProjectsService', () => {

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        StorageServiceModule,
        HttpClientTestingModule,
        RouterModule.forRoot([
          {
            path: '',
            redirectTo: '/',
            pathMatch: 'full',
          },
        ]),
      ],
      providers: [ProjectsService, { provide: APP_BASE_HREF, useValue: './' }],
    });
  });

  it('should be created', () => {
    const sut = TestBed.inject(ProjectsService);
    expect(sut).toBeTruthy();
  });

  it('should return an array of repos', inject([HttpTestingController, ProjectsService],
    async (httpMock: HttpTestingController, sut: ProjectsService) => {

      const promise = expect(sut.getRepos().toPromise()).resolves.toEqual([
        new Project('project1', true),
        new Project('project2', true),
        new Project('keyboards', false),
      ]);

      // We set the expectations for the HttpClient mock
      const req = httpMock.expectOne('http://localhost:3000/api/projects/all');
      expect(req.request.method).toEqual('GET');

      // Then we set the fake data to be returned by the mock
      req.flush([{ name: 'project1' }, { name: 'project2' }, { name: 'keyboards' }]);

      await promise;
    }
  ));
});
