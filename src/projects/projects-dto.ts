import { ApiProperty } from '@nestjs/swagger';

export class ProjectsDto {
  constructor() {
    this.data = [];
  }

  @ApiProperty({
    description: 'A URL',
    example: 'https://keyman-developer-online.azurewebsites.net/',
  })
  data: string[];

  @ApiProperty({
    description: 'A URL',
    example: 'https://keyman-developer-online.azurewebsites.net/',
  })
  error?: string;
}
