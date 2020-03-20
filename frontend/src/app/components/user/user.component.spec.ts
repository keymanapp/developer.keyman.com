import { APP_BASE_HREF } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterModule } from '@angular/router';
import { StorageServiceModule } from 'ngx-webstorage-service';

import { UserComponent } from './user.component';
import { FontAwesomeTestingModule } from '../../font-awesome-testing.module';

describe('UserComponent', () => {
  let component: UserComponent;
  let fixture: ComponentFixture<UserComponent>;

  beforeEach(() => {
    return TestBed.configureTestingModule({
      imports: [
        FontAwesomeTestingModule,
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
      declarations: [UserComponent],
      providers: [{ provide: APP_BASE_HREF, useValue: './' }],
    }).compileComponents();
  });

  it('should create', () => {
    fixture = TestBed.createComponent(UserComponent);
    component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });
});
