import { Injectable } from '@nestjs/common';

@Injectable()
export class TokenService {
  createRandomString(length: number): string {
    const alphabet =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let text = '';
    for (let i = 0; i < length; i++) {
      text += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
    }
    return text;
  }

}
