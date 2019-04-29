import { IsString } from 'class-validator';

export class LoginDto {
  @IsString()
  readonly code: string;

  @IsString()
  readonly state: string;

  constructor(codeParam: string = '', stateParam: string = '') {
    this.code = codeParam;
    this.state = stateParam;
  }
}
