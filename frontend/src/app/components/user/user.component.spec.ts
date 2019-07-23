import { APP_BASE_HREF } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterModule } from '@angular/router';
import { StorageServiceModule } from 'angular-webstorage-service';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';

import { UserComponent } from './user.component';

describe('UserComponent', () => {
  let component: UserComponent;
  let fixture: ComponentFixture<UserComponent>;

  beforeEach(() => {
    return TestBed.configureTestingModule({
      imports: [
        FontAwesomeModule,
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
