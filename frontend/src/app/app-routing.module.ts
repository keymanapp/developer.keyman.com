import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { RedirectGuard } from './guards/redirect.guard';
import { LoginComponent } from './components/login/login.component';
import { ProjectsComponent } from './components/projects/projects.component';
import { AuthGuard } from './guards/auth.guard';
import { ProjectDetailComponent } from './components/project-detail/project-detail.component';
import { PullRequestComponent } from './components/pull-request/pull-request.component';

const routes: Routes = [
  {
    path: '',
    component: LoginComponent,
    pathMatch: 'full',
    canActivate: [RedirectGuard],
  },
  {
    path: 'projects/:name/pr',
    component: PullRequestComponent,
    canActivate: [AuthGuard],
  },
  {
    path: 'projects/:name',
    component: ProjectDetailComponent,
    canActivate: [AuthGuard],
  },
  {
    path: 'projects',
    component: ProjectsComponent,
    canActivate: [AuthGuard],
  },
  {
    path: '**',
    component: LoginComponent,
    canActivate: [RedirectGuard],
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
