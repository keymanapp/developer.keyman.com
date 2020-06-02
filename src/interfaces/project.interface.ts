import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Note: defined as class instead of interface because @nestjs/swagger
// doesn't support interfaces yet
export class Project {
  @ApiProperty({
    description: 'The name of the single-keyboard repo/project',
    example: 'Hello-World',
  })
  public name: string;

  @ApiPropertyOptional({
    description: 'The GitHub URL of the single-keyboard repo',
    example: 'https://github.com/octocat/Hello-World',
  })
  public repoUrl?: string;

  @ApiPropertyOptional({
    description: 'The prefix the single-keyboard will get in the keyboards repo',
    example: 'h',
  })
  public prefix?: string;
}
