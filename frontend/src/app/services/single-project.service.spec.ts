import { TestBed } from '@angular/core/testing';

import { SingleProjectService } from './single-project.service';
import { HttpClientModule } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { APP_BASE_HREF } from '@angular/common';

describe('SingleProjectService', () => {
  let service: SingleProjectService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        HttpClientModule,
        RouterModule.forRoot([
          {
            path: '',
            redirectTo: '/',
            pathMatch: 'full',
          },
        ]),
      ],
      providers: [{ provide: APP_BASE_HREF, useValue: './' }],
    });
    service = TestBed.inject(SingleProjectService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
