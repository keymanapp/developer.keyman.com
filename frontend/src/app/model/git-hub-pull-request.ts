export class GitHubPullRequest {
  public keyboardId: string;
  public pullRequest: number;
  public url: string;
  public action: string;

  public constructor(
    keyboardId: string,
    pullRequest: number,
    url: string,
    action: string,
  ) {
    this.keyboardId = keyboardId;
    this.pullRequest = pullRequest;
    this.url = url;
    this.action = action;
  }
}
