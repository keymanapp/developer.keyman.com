import { Component, OnInit } from '@angular/core';
import { UserService } from '../../services/user.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent implements OnInit {
  constructor(private userService: UserService) {}

  ngOnInit() {
    // empty
  }

  public login(): void {
    this.userService.login().subscribe(url => {
      window.location.href = url;
    });
  }

  public get isLoggedIn(): boolean {
    return this.userService.accessToken != null;
  }
}
