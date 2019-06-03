import { Observable } from 'rxjs';
import { HttpException } from '@nestjs/common';
import { AxiosResponse } from 'axios';

export type NoParamConstructor<T> = new () => T;

// GitHub sometimes returns 200 when we actually get an error. This function
// deals with that and converts the error to a HttpException.
export async function callWithErrorHandling<T extends { error?: string}, R>(
  method: () => Observable<AxiosResponse<R>>,
  extractData: (response: AxiosResponse<R>) => T,
  type: NoParamConstructor<T>,
): Promise<T> {
    let token: T;
    let status = 200;
    try {
      const response = await method().toPromise();
      if (
        typeof response.data === 'string' &&
        (response.data as string).startsWith('error=')
      ) {
        // console.log('*** got error string:');
        // console.log(response.data);
        token = new type();
        token.error = response.data as string;
        status = 400;
      } else {
        // console.log('**** got response:');
        // console.log(response);
        token = extractData(response);
      }
    } catch (error) {
      // console.log('*** caught error:');
      // console.log(error);
      token = new type();
      token.error = error.message;
      if (error.response != null) {
        status = error.response.status;
      } else {
        status = 400;
      }
    }

    if (token.error == null) {
      return token;
    }
    throw new HttpException(token, status);
}
