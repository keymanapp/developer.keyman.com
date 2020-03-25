export class Project {
  public keyboardId: string;
  public repoName: string;
  public url: string;
  public enabled: boolean;

  public constructor(
    keyboardId: string,
    enabled: boolean,
    repoName: string = keyboardId,
    url: string | null = null,
  ) {
    this.keyboardId = keyboardId;
    this.repoName = repoName;
    this.enabled = enabled;
    this.url = url;
  }

}
