import { GitHubUserDto } from './git-hub-user-dto';

describe('AccessToken', () => {
  it('default ctor', () => {
    const ghUser = new GitHubUserDto();
    expect(ghUser.login).toEqual('');
    expect(ghUser.name).toEqual('');
    expect(ghUser.avatarUrl).toEqual('');
    expect(ghUser.error).toBeUndefined();
  });

  it('can access properties', () => {
    const ghUser = new GitHubUserDto({
      login: 'foo',
      name: 'myname',
      'avatar_url': 'http://my.avatar.example.com',
    });
    expect(ghUser.login).toEqual('foo');
    expect(ghUser.name).toEqual('myname');
    expect(ghUser.avatarUrl).toEqual('http://my.avatar.example.com');
    expect(ghUser.error).toBeUndefined();
  });
});
