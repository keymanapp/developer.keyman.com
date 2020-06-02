export class Project {
  public keyboardId: string;
  public name: string;
  public prefix: string;
  public repoUrl: string;
  public enabled: boolean;

  public constructor(
    keyboardId: string,
    enabled: boolean,
    repoName: string = keyboardId,
    prefix?: string,
    url?: string,
  ) {
    this.keyboardId = keyboardId;
    this.name = repoName;
    this.prefix = prefix;
    this.enabled = enabled;
    this.repoUrl = url;
  }

}
