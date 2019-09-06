import { TestBed } from '@angular/core/testing';
import { HttpClientModule } from '@angular/common/http';
import { StorageServiceModule } from 'angular-webstorage-service';

import { UserService } from './user.service';

describe('UserService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientModule, StorageServiceModule],
    });
  });

  it('should be created', () => {
    const service: UserService = TestBed.get(UserService);
    expect(service).toBeTruthy();
  });

  it('isLoggedIn should return true if we have an accesstoken', () => {
    const service: UserService = TestBed.get(UserService);
    service.accessToken = 'foo';

    expect(service.isLoggedIn()).toBeTruthy();
  });

  it('isLoggedIn should return false if we don\'t have an accesstoken', () => {
    const service: UserService = TestBed.get(UserService);
    service.accessToken = null;

    expect(service.isLoggedIn()).toBeFalsy();
  });
});
