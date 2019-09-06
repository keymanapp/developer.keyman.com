import { Injectable } from '@angular/core';
import {
  CanActivate,
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
  UrlTree,
  Params,
  Router,
} from '@angular/router';
import { Observable } from 'rxjs';
import { UserService } from '../services/user.service';

@Injectable({
  providedIn: 'root',
})
export class RedirectGuard implements CanActivate {
  constructor(private userService: UserService, private router: Router) { }

  // REVIEW: would it be better to use a Resolve guard instead of CanActivate?
  public canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot,
  ): Observable<boolean | UrlTree>
    | Promise<boolean | UrlTree>
    | boolean
    | UrlTree {
    this.checkRedirect(route.queryParams);
    return true;
  }

  private checkRedirect(params: Params): void {
    if (params.code != null && params.state != null &&
      this.userService.accessToken == null) {
      this.userService.getAccessToken(params.code, params.state).subscribe(token => {
        if (token != null && token.length > 0) {
          this.userService.accessToken = token;
          this.userService.getUserProfile().subscribe(user => {
            this.userService.userProfile = user;
            this.router.navigate(['/projects'], { replaceUrl: true });
          });
        } else {
          this.router.navigate(['/'], { replaceUrl: true });
        }
      });
    }
  }

}
