export class Project {
  public name: string;
  public enabled: boolean;

  public constructor(name: string, enabled: boolean) {
    this.name = name;
    this.enabled = enabled;
  }
}
