export class AccessTokenDto {
         public error?: string;

         constructor(public readonly accessToken: string = '') {
         }
       }
