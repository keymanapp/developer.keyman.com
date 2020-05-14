import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';

import { Observable } from 'rxjs';

@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    if (request.url.startsWith('/api/auth/login') ||
      (request.session.login && request.headers.authorization) ||
      (request.url.startsWith('/api/auth/user/test') && request.headers.authorization)) {
      return true;
    }
    throw new UnauthorizedException();
  }
}
