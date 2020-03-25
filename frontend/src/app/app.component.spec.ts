import { HttpClientModule } from '@angular/common/http';
import { APP_BASE_HREF } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { StorageServiceModule } from 'ngx-webstorage-service';

import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';
import { UserComponent } from './components/user/user.component';
import { LoginComponent } from './components/login/login.component';
import { ProjectsComponent } from './components/projects/projects.component';
import { ProjectDetailComponent } from './components/project-detail/project-detail.component';
import { FontAwesomeTestingModule } from './font-awesome-testing.module';
import { PullRequestComponent } from './components/pull-request/pull-request.component';

describe('AppComponent', () => {
  beforeEach(() => {
    return TestBed.configureTestingModule({
      imports: [
        StorageServiceModule,
        BrowserModule,
        HttpClientModule,
        FontAwesomeTestingModule,
        AppRoutingModule,
        FormsModule,
      ],
      declarations: [
        AppComponent,
        UserComponent,
        LoginComponent,
        ProjectsComponent,
        ProjectDetailComponent,
        PullRequestComponent,
      ],
      providers: [{ provide: APP_BASE_HREF, useValue: './' }],
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
