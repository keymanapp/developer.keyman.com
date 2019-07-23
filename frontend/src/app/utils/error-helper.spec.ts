import { APP_BASE_HREF } from '@angular/common';
import { NgZone } from '@angular/core';
import { TestBed, inject } from '@angular/core/testing';
import { Router, RouterModule } from '@angular/router';
import { StorageServiceModule } from 'angular-webstorage-service';
import { EMPTY } from 'rxjs';
import { User } from '../model/user';

import { ErrorHelper } from './error-helper';

describe('ErrorHelper', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
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

  it('should create an instance', inject([User, Router], (user: User, router: Router) => {
    expect(new ErrorHelper(user, router)).toBeTruthy();
  }));

  it('errorHandle clears user and navigates to "/" on 403', inject(
    [User, Router, NgZone], (user: User, router: Router, ngZone: NgZone) => {
      expect.assertions(4);
      global.console.error = jest.fn();
      const clearSpy = jest.spyOn(user, 'clear');
      const navigateSpy = jest.spyOn(router, 'navigate');

      const sut = new ErrorHelper(user, router);
      const logSpy = jest.spyOn(sut, 'log').mockImplementation(() => {});
      ngZone.run(() => {
        expect(
          sut
            .handleError('test', null)
            .call(sut, { status: 403 }),
        ).toBe(EMPTY);
        expect(clearSpy).toBeCalled();
        expect(navigateSpy).toBeCalledWith(['/'], { replaceUrl: true });
        expect(logSpy).not.toBeCalled();
      });
    }
  ));

  it('errorHandle logs error if not 403', inject(
    [User, Router, NgZone],
    (user: User, router: Router, ngZone: NgZone) => {
      expect.assertions(4);
      global.console.error = jest.fn();
      const clearSpy = jest.spyOn(user, 'clear');
      const navigateSpy = jest.spyOn(router, 'navigate');

      const sut = new ErrorHelper(user, router);
      const logSpy = jest.spyOn(sut, 'log').mockImplementation(() => {});
      ngZone.run(() => {
        expect(
          sut
            .handleError('test', 'foo')
            .call(sut, { status: 401, message: 'msg' })
            .toPromise()
        ).resolves.toEqual('foo');
        expect(clearSpy).not.toBeCalled();
        expect(navigateSpy).not.toBeCalled();
        expect(logSpy).toBeCalledWith('test failed: msg');
      });
    },
  ));
});
