import { Observable, of, EMPTY } from 'rxjs';
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { User } from '../model/user';

@Injectable({
  providedIn: 'root',
})
export class ErrorHelper {
  constructor(private user: User, private router: Router) {}

  public log(message: any): void {
    // tslint:disable-next-line: no-console
    console.log(message);
  }

  /**
   * Handle Http operation that failed.
   * Let the app continue.
   * @param operation - name of the operation that failed
   * @param result - optional value to return as the observable result
   */
  public handleError<T>(operation = 'operation', result?: T) {
    return (error: any): Observable<T> => {
      // TODO: send the error to remote logging infrastructure
      // tslint:disable-next-line: no-console
      console.error('got error:');
      // tslint:disable-next-line: no-console
      console.error(error); // log to console instead

      if (error.status === 401 || error.status === 403) {
        this.user.clear();
        this.router.navigate(['/'], { replaceUrl: true });
        return EMPTY;
      } else {
        // TODO: better job of transforming error for user consumption
        this.log(`${operation} failed: ${error.message}`);
      }

      // Let the app keep running by returning an empty result.
      return of(result as T);
    };
  }
}
