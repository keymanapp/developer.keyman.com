
import { ApiProperty } from '@nestjs/swagger';

import { PrAction } from './pr-action.enum';
import { PrState } from './pr-state.enum';

// Note: defined as class instead of interface because @nestjs/swagger
// doesn't support interfaces yet
export class GitHubPullRequest {
  @ApiProperty({
    description: 'the GitHub pull request number',
    type: 'integer',
  })
  'number': number;

  @ApiProperty({
    description: 'the user visible GitHub URL to the pull request',
  })
  url: string;

  @ApiProperty({
    description: 'The state the PR is in',
    enum: PrState,
  })
  state: PrState;

  @ApiProperty({
    description: 'The action the API performed',
    enum: PrAction,
  })
  action: PrAction;
}
