import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientModule } from '@angular/common/http';
import { RouterTestingModule } from '@angular/router/testing';
import { StorageServiceModule } from 'ngx-webstorage-service';
import { FontAwesomeTestingModule } from '../../font-awesome-testing.module';

import { ProjectsComponent } from './projects.component';

describe('ProjectsComponent', () => {
  let component: ProjectsComponent;
  let fixture: ComponentFixture<ProjectsComponent>;

  beforeEach((() => {
    TestBed.configureTestingModule({
      imports: [
        HttpClientModule,
        StorageServiceModule,
        RouterTestingModule,
        FontAwesomeTestingModule,
      ],
      declarations: [ProjectsComponent],
    }).compileComponents();
  }));

  it('should create', () => {
    fixture = TestBed.createComponent(ProjectsComponent);
    component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });
});
