import { NgZone } from '@angular/core';
import { TestBed, inject } from '@angular/core/testing';
import { APP_BASE_HREF } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { RouterModule, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { StorageServiceModule } from 'ngx-webstorage-service';

import { UserService } from '../services/user.service';
import { AuthGuard } from './auth.guard';

describe('AuthGuard', () => {
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
            canActivate: [AuthGuard],
          },
        ]),
      ],
      providers: [
        AuthGuard,
        UserService,
        { provide: APP_BASE_HREF, useValue: './' },
      ],
    });
  });

  it('should create guard', inject([AuthGuard], (sut: AuthGuard) => {
    expect(sut).toBeTruthy();
  }));

  it('should load if user is logged in', inject(
    [AuthGuard, UserService, NgZone],
    (sut: AuthGuard, userService: UserService, ngZone: NgZone) => {
      jest.spyOn(userService, 'isLoggedIn').mockImplementation(() => true);

      ngZone.run(() => {
        expect(
          sut.canActivate(
            new ActivatedRouteSnapshot(),
            { url: 'testUrl' } as RouterStateSnapshot,
          ),
        ).toBeTruthy();
      });
    }),
  );

  it('should not load if user is not logged in', inject(
    [AuthGuard, UserService, NgZone],
    (sut: AuthGuard, userService: UserService, ngZone: NgZone) => {
      jest.spyOn(userService, 'isLoggedIn').mockImplementation(() => false);

      ngZone.run(() => {
        expect(
          sut.canActivate(
            new ActivatedRouteSnapshot(),
            { url: 'testUrl' } as RouterStateSnapshot,
          ),
        ).toBeFalsy();
      });
    },
  ));
});
