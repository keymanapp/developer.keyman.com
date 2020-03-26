import { Injectable } from '@nestjs/common';
import { Observable, of, throwError, forkJoin } from 'rxjs';
import { map, switchMap, tap, catchError } from 'rxjs/operators';

import path = require('path');
import debugModule = require('debug');
const debug = debugModule('kdo:pullRequest');

import { GitHubPullRequest } from '../interfaces/git-hub-pull-request.interface';
import { ConfigService } from '../config/config.service';
import { GitService } from '../git/git.service';
import { GithubService } from '../github/github.service';
import { readFile, writeFile } from '../utils/file';

@Injectable()
export class PullRequestService {
  constructor(
    private readonly config: ConfigService,
    private readonly gitService: GitService,
    private readonly githubService: GithubService,
  ) {}

  public transferChanges(singleKbRepoPath: string, keyboardsRepoPath: string): Observable<void> {
    // Currently we only support importing changes from single-keyboard repo into keyboards
    // repo, not the other way round. We don't support non-linear history (force-push) either.
    // If we ever want to deal with force-pushes on either single-keyboard (s) or keyboards (k)
    // repos:
    // - read last note on s and k
    // - if they reference each other:
    //   - if note is on HEAD on either s or k:
    //     - all good. Import changes from the repo that doesn't have note on HEAD
    //   - else:
    //     - Error: both changed. Can't deal with this automatically.
    // - else (they don't reference each other):
    //   - if note is on HEAD on either s or k:
    //     - the other repo had a force-push. If the force-push happened on s:
    //       - revert all commits on k between note-1..HEAD
    //     - else (force-push on k):
    //       - reset s to note-1
    //   - else (note is not on HEAD on both s and k):
    //     - Error: one changed, the other force-pushed. Can't deal with this automatically

    let exportedCommitInSingleKbRepo: string;
    let singleKbNoteInfo: { commitSha: string; message: string };
    let singleKbHead: string;
    let keyboardsHead: string;

    debug(`transferChanges from ${singleKbRepoPath} to ${keyboardsRepoPath}`);

    return this.gitService.readLastNote(singleKbRepoPath).pipe(
      tap(noteInfo => singleKbNoteInfo = noteInfo),
      switchMap(() => this.gitService.getHeadCommit(singleKbRepoPath)),
      tap(head => singleKbHead = head),
      switchMap(() => this.gitService.getHeadCommit(keyboardsRepoPath)),
      tap(head => keyboardsHead = head),
      switchMap(() => this.gitService.readLastNote(keyboardsRepoPath)),
      map(keyboardsNoteInfo => {
        if (
          (new RegExp(`KDO.+${keyboardsNoteInfo.commitSha}$`).exec(singleKbNoteInfo.message) == null ||
            new RegExp(`KDO.+${singleKbNoteInfo.commitSha}$`).exec(keyboardsNoteInfo.message) == null) &&
          singleKbNoteInfo.message !== '' && keyboardsNoteInfo.message !== ''
        ) {
          throw new Error('Non-linear history. Force-push is not allowed.');
        }

        if (keyboardsHead !== keyboardsNoteInfo.commitSha && keyboardsNoteInfo.commitSha !== '') {
          throw new Error('Keyboards repo has new changes. This is not allowed.');
        }

        if (singleKbHead === singleKbNoteInfo.commitSha) {
          throw new Error('no new changes');
        }
      }),
    // NOTE: I don't understand why I need this pipe() here. But without it it shows an error,
    // and I can't figure out what's wrong.
    ).pipe(
      switchMap(() => this.extractPatches(singleKbRepoPath)),
      switchMap(([sha, patchFiles]) => {
        exportedCommitInSingleKbRepo = sha;
        const observables: Observable<string>[] = [];
        for (const patchFile of patchFiles) {
          debug(`converting ${patchFile}`);
          observables.push(this.convertPatch(patchFile, path.basename(singleKbRepoPath)));
        }
        return forkJoin(observables).pipe(
          tap(val => debug(val)),
        );
      }),
      switchMap(importFile => this.importPatch(keyboardsRepoPath, importFile)),
      switchMap(importedCommitInKeyboardsRepo => this.createNotes(
        singleKbRepoPath,
        keyboardsRepoPath,
        exportedCommitInSingleKbRepo,
        importedCommitInKeyboardsRepo),
      ),
      catchError(err => {
        if (!err.message.match(/no new changes/)) {
          return throwError(new Error(err));
        }
        return of(null);
      }),
    );
  }

  public extractPatches(localRepo: string): Observable<[string, string[]]> {
    return this.gitService.readLastNote(localRepo).pipe(
      switchMap(obj => {
        const commit = obj.commitSha === '' ? 'HEAD' : `${obj.commitSha}..HEAD`;
        const rangeOpt = obj.commitSha === '' ? '--root' : null;
        return this.gitService.export(localRepo, commit, rangeOpt);
      }),
    );
  }

  public importPatch(
    localRepo: string,
    patchFiles: string[],
  ): Observable<string> {
    return this.importPatchInternal(localRepo, patchFiles);
  }

  private importPatchInternal(
    localRepo: string,
    patchFiles: string[],
  ): Observable<string> {
    if (patchFiles.length <= 0) {
      return this.gitService.log(localRepo, { '-1': null }).pipe(
        map(logs => logs.latest.hash),
      );
    }
    const firstPatchFile = patchFiles.shift();
    debug(`importing ${firstPatchFile} into ${localRepo}`);
    return this.gitService.import(localRepo, firstPatchFile).pipe(
      tap(() => debug(`import of ${firstPatchFile} done`)),
      switchMap(() => this.importPatchInternal(localRepo, patchFiles)),
    );
  }

  public convertPatch(
    patchFile: string,
    singleKbRepoName: string,
  ): Observable<string> {
    const prefix = this.getNewPathPrefix(singleKbRepoName);
    return readFile(patchFile).pipe(
      map(data => this.convertPatchFile(prefix, data.toString())),
      switchMap(content => writeFile(patchFile, content)),
      map(() => patchFile),
    );
  }

  private getNewPathPrefix(singleRepoName: string): string {
    // git uses / as directory separator, even on Windows
    return `release/${singleRepoName.substring(0, 1)}/${singleRepoName}`;
  }

  // Adjust the paths in the patch file to the location in the keyboards repo
  private convertPatchFile(prefix: string, data: string): string {
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
      `rename $1 ${prefix}/$2`);                   // rename from somefile2.txt

    return data;
  }

  public createPullRequestOnKeyboardsRepo(
    token: string, // the token used to authorize with GitHub
    head: string, // name of the branch that contains the new commits. Use `username/repo:branch` for cross-repo PRs
    title: string, // title of the PR
    description: string, // description of the PR
  ): Observable<GitHubPullRequest> {
    if (token == null || token.length === 0) {
      return null;
    }
    debug(`createPullRequestOnKeyboardsRepo for ${head}: ${title} - ${description}`);
    return this.githubService.createPullRequest(
      token,
      this.config.organizationName,
      this.config.keyboardsRepoName,
      head,
      'master',
      title,
      description,
    );
  }

  private createNotes(
    singleKbRepoPath: string,
    keyboardsRepoPath: string,
    commitOnSingleKbRepo: string,
    commitOnKeyboardsRepo: string,
  ): Observable<void> {
    return this.gitService.createNote(
      singleKbRepoPath,
      commitOnSingleKbRepo,
      `KDO exported to ${commitOnKeyboardsRepo}`)
      .pipe(
        switchMap(() => this.gitService.createNote(
          keyboardsRepoPath,
          commitOnKeyboardsRepo,
          `KDO imported from ${commitOnSingleKbRepo}`),
        ),
      );
  }

}
