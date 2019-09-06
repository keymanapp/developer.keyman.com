import { HttpClientModule } from '@angular/common/http';
import { APP_BASE_HREF } from '@angular/common';
import { BrowserModule } from '@angular/platform-browser';
import { TestBed } from '@angular/core/testing';
import { StorageServiceModule } from 'angular-webstorage-service';
import { library } from '@fortawesome/fontawesome-svg-core';
import { faSignOutAlt } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';

import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';
import { UserComponent } from './components/user/user.component';
import { LoginComponent } from './components/login/login.component';
import { ProjectsComponent } from './components/projects/projects.component';

describe('AppComponent', () => {
  beforeEach(() => {
    library.add(faSignOutAlt);
    return TestBed.configureTestingModule({
      imports: [
        StorageServiceModule,
        BrowserModule,
        HttpClientModule,
        FontAwesomeModule,
        AppRoutingModule,
      ],
      declarations: [AppComponent, UserComponent, LoginComponent, ProjectsComponent],
      providers: [ {provide: APP_BASE_HREF, useValue: './' } ]
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.debugElement.componentInstance;
    expect(app).toBeTruthy();
  });

  it(`should have as title 'Keyman Developer Online'`, () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.debugElement.componentInstance;
    expect(app.title).toEqual('Keyman Developer Online');
  });

  it('should render title in a h1 tag', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    const compiled = fixture.debugElement.nativeElement;
    expect(compiled.querySelector('h1').textContent).toContain(
      'Keyman Developer Online',
    );
  });
});
