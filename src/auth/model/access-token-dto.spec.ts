import { AccessTokenDto } from './access-token-dto';

describe('AccessToken', () => {
  it('should be defined', () => {
    expect(new AccessTokenDto()).toBeDefined();
  });
});
