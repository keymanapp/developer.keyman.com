import { ApiProperty } from '@nestjs/swagger';

import { IsString } from 'class-validator';

export class UrlDto {
  @ApiProperty({
    description: 'A URL',
    example: 'https://keyman-developer-online.azurewebsites.net/',
  })
  @IsString()
  public url: string;
}
