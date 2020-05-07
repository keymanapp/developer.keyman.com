import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AccessTokenDto {
  @ApiPropertyOptional({
    description: 'The error that happened',
  })
  public error?: string;

  @ApiProperty({
    description: 'The access token which can be used to access GitHub APIs',
    example: 'whatever',
  })
  public readonly accessToken: string;

  constructor(token = '') {
    this.accessToken = token;
  }
}
