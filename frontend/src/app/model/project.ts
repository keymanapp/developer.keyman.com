export class Project {
  public name: string;
  public url: string;
  public enabled: boolean;

  public constructor(
    name: string,
    enabled: boolean,
    url: string | null = null,
  ) {
    this.name = name;
    this.enabled = enabled;
    this.url = url;
  }

}
