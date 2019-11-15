export interface GitHubProject {
  name: string;
  full_name?: string;
  owner?: { login: string; };
}
