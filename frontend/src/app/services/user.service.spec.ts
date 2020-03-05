import { APP_BASE_HREF } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { RouterModule } from '@angular/router';
import { StorageServiceModule } from 'ngx-webstorage-service';

import { UserService } from './user.service';

describe('UserService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        HttpClientModule,
        StorageServiceModule,
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
  });

  it('should be created', () => {
    const service: UserService = TestBed.inject(UserService);
    expect(service).toBeTruthy();
  });

  it('isLoggedIn should return true if we have an accesstoken', () => {
    const service: UserService = TestBed.inject(UserService);
    service.accessToken = 'foo';

    expect(service.isLoggedIn()).toBeTruthy();
  });

  it('isLoggedIn should return false if we don\'t have an accesstoken', () => {
    const service: UserService = TestBed.inject(UserService);
    service.accessToken = null;

    expect(service.isLoggedIn()).toBeFalsy();
  });
});
