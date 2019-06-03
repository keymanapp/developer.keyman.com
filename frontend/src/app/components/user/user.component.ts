import { Component, OnInit } from '@angular/core';

import { GitHubUser } from '../../model/git-hub-user';
import { UserService } from '../../services/user.service';

@Component({
  selector: 'app-user',
  templateUrl: './user.component.html',
  styleUrls: ['./user.component.scss'],
})
export class UserComponent implements OnInit {
  constructor(
    private userService: UserService,
  ) {}

  ngOnInit() {
  }

  public login(): void {
    this.userService.login().subscribe(url => {
      window.location.href = url;
    });
  }

  public get userProfile(): GitHubUser {
    return this.userService.userProfile;
  }

  public get isLoggedIn(): boolean {
    return this.userService.accessToken != null;
  }

  public logout(): void {
    this.userService.logout().subscribe(url => {
      window.location.href = url;
    });
  }
}


