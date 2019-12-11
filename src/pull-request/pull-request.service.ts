import { Injectable } from '@nestjs/common';
import { bindNodeCallback, Observable, of, from } from 'rxjs';
import { map, flatMap } from 'rxjs/operators';

import fs = require('fs');
import path = require('path');

import { GitHubPullRequest } from '../interfaces/git-hub-pull-request.interface';
import { ConfigService } from '../config/config.service';
import { GitService } from '../git/git.service';
import { GithubService } from '../github/github.service';

@Injectable()
export class PullRequestService {
  constructor(
    private readonly config: ConfigService,
    private readonly gitService: GitService,
    private readonly githubService: GithubService,
  ) {}

  public transferChanges(singleKbRepoPath: string, keyboardsRepoPath: string) {
    return from(this.extractPatches(singleKbRepoPath)).pipe(
      map(patchFiles => this.convertPatches(patchFiles, path.basename(singleKbRepoPath))),
      flatMap(patchFile => this.importPatches(keyboardsRepoPath, patchFile)),
    );
  }

  public async extractPatches(localRepo: string): Promise<string[]> {
    return this.gitService.export(localRepo, 'HEAD', '--root');
  }

  public importPatches(
    localRepo: string,
    patchFiles: Observable<string>,
  ): Observable<void> {
    return this.gitService.importFiles(localRepo, patchFiles);
  }

  public convertPatches(
    patchFiles: string[],
    singleKbRepoName: string,
  ): Observable<string> {
    const prefix = this.getNewPathPrefix(singleKbRepoName);
    const readFileAsObservable = bindNodeCallback(fs.readFile);
    const writeFileAsObservable = bindNodeCallback(fs.writeFile);
    return from(patchFiles).pipe(
      flatMap(patchFile =>
        readFileAsObservable(patchFile).pipe(
          flatMap(data => this.convertPatchFile(prefix, data.toString())),
          flatMap(content => writeFileAsObservable(patchFile, content)),
          map(() => patchFile),
        ),
      ),
    );
  }

  private getNewPathPrefix(singleRepoName: string): string {
    return path.join('release', singleRepoName.substring(0, 1), singleRepoName);
  }

  // Adjust the paths in the patch file to the location in the keyboards repo
  private convertPatchFile(prefix: string, data: string): Observable<string> {
    data = data.replace(/^ ([0-9A-Za-z_./=> {}-]+ *\| )/gm,
      ` ${prefix}/$1`);                            //  dir1/file1.txt | 3 ++-
    data = data.replace(/^ ([0-9A-Za-z_./ -]+) => ([0-9A-Za-z_./ -]+ *\|)/gm,
      ` $1 => ${prefix}/$2`);                      //  prefix/somefile2.txt => somefile3.txt | 0
    data = data.replace(/^ ([a-z]+ mode [0-9]+) ([0-9A-Za-z_./-]+)$/gm,
      ` $1 ${prefix}/$2`);                         //  delete mode 100644 dir1/file2.txt
    data = data.replace(/^ rename ([0-9A-Za-z_./-]+) => ([0-9A-Za-z_./-]+.+)$/gm,
      ` rename ${prefix}/$1 => ${prefix}/$2`);     //  rename somefile2.txt => somefile3.txt (100%)
    data = data.replace(/^ rename ([0-9A-Za-z_./-]+)\{([0-9A-Za-z_./-]+) => ([0-9A-Za-z_./-]+)\}(.+)$/gm,
      ` rename ${prefix}/$1{$2 => $3}$4`);         //  rename dir/{somefile2.txt => somefile3.txt} (100%)
    data = data.replace(/^diff --git a\/([0-9A-Za-z_./-]+) b\/([0-9A-Za-z_./-]+)/gm,
      `diff --git a/${prefix}/$1 b/${prefix}/$2`); // diff --git a/dir1/file1.txt b/dir1/file1.txt
    data = data.replace(/^(---|\+\+\+) (a|b)\/([0-9A-Za-z_./-]+)/gm,
      `$1 $2/${prefix}/$3`);                       // --- a/dir1/file1.txt
    data = data.replace(/^rename (from|to) ([0-9A-Za-z_./ -]+)$/gm,
      `rename $1 ${prefix}/$2`);                  // rename from somefile2.txt

    return of(data);
  }

  public createPullRequestOnKeyboardsRepo(
    token: string, // the token used to authorize with GitHub
    head: string, // name of the branch that contains the new commits. Use `username:branch` for cross-repo PRs
    title: string, // title of the PR
    description: string, // description of the PR
  ): Observable<GitHubPullRequest> {
    if (token == null || token.length === 0) {
      return null;
    }
    return this.githubService.createPullRequest(
      token,
      this.config.organizationName,
      this.config.keyboardsRepoName,
      head,
      'master',
      title,
      description);
  }
}
