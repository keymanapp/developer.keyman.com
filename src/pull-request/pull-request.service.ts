import { HttpException, Injectable } from '@nestjs/common';

import { forkJoin, Observable } from 'rxjs';
import { catchError, map, switchMap, tap } from 'rxjs/operators';

import { ConfigService } from '../config/config.service';
import { GitService } from '../git/git.service';
import { GithubService } from '../github/github.service';
import { GitHubPullRequest } from '../interfaces/git-hub-pull-request.interface';
import { Project } from '../interfaces/project.interface';
import { TransferInfo } from '../interfaces/transfer-info';
import { readFile, writeFile } from '../utils/file';

import debugModule = require('debug');
const debug = debugModule('kdo:pullRequest');

@Injectable()
export class PullRequestService {
  constructor(
    private readonly config: ConfigService,
    private readonly gitService: GitService,
    private readonly githubService: GithubService,
  ) {}

  public transferChanges(
    singleKbRepoPath: string,
    keyboardsRepoPath: string,
    project: Project,
  ): Observable<void> {
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

    if (!project || !project.name) {
      throw new HttpException('Missing project data in request body', 400);
    }

    let exportedCommitInSingleKbRepo: string;
    let singleKbNoteInfo: { commitSha: string; noteInfo: TransferInfo };
    let singleKbHead: string;
    let keyboardsHead: string;

    debug(`transferChanges from ${singleKbRepoPath} to ${keyboardsRepoPath}`);

    return this.readLastNote(singleKbRepoPath).pipe(
      tap(noteInfo => singleKbNoteInfo = noteInfo),
      switchMap(() => this.gitService.getHeadCommit(singleKbRepoPath)),
      tap(head => singleKbHead = head),
      switchMap(() => this.gitService.getHeadCommit(keyboardsRepoPath)),
      tap(head => keyboardsHead = head),
      switchMap(() => this.readLastNote(keyboardsRepoPath)),
      map(keyboardsNoteInfo => {
        if (keyboardsHead !== keyboardsNoteInfo.commitSha && keyboardsNoteInfo.commitSha !== '') {
          throw new HttpException('Keyboards repo has new changes in the single-keyboard directory. This is not allowed.', 409);
        }

        if (this.hasNonLinearHistory(singleKbNoteInfo, keyboardsNoteInfo)) {
          throw new HttpException('Non-linear history in single-keyboard repo. Force-push is not allowed.', 412);
        }

        if (singleKbHead === singleKbNoteInfo.commitSha) {
          throw new HttpException('No new changes in the single-keyboard repo.', 304);
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
          observables.push(this.convertPatch(patchFile, project.name, project.prefix));
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
        importedCommitInKeyboardsRepo,
        project),
      ),
    );
  }

  private hasNonLinearHistory(
    singleKbNoteInfo: { commitSha: string; noteInfo: TransferInfo },
    keyboardsNoteInfo: { commitSha: string; noteInfo: TransferInfo },
  ): boolean {
    if (
      (new RegExp(`KDO.+${keyboardsNoteInfo.commitSha}$`).exec(singleKbNoteInfo.noteInfo.msg) == null ||
        new RegExp(`KDO.+${singleKbNoteInfo.commitSha}$`).exec(keyboardsNoteInfo.noteInfo.msg) == null) &&
      singleKbNoteInfo.noteInfo.msg !== '' && keyboardsNoteInfo.noteInfo.msg !== ''
    ) {
      return true;
    }
    if (!singleKbNoteInfo.commitSha && keyboardsNoteInfo.commitSha) {
      return true;
    }
    return false;
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
    keyboardId: string,
    prefix: string,
  ): Observable<string> {
    prefix = this.getNewPathPrefix(keyboardId, prefix);
    return readFile(patchFile).pipe(
      map(data => this.convertPatchFile(prefix, data.toString())),
      switchMap(content => writeFile(patchFile, content)),
      map(() => patchFile),
    );
  }

  private getNewPathPrefix(keyboardId: string, prefix: string): string {
    // git uses / as directory separator, even on Windows
    return `release/${this.getPrefix(keyboardId, prefix)}/${keyboardId}`;
  }

  public getPrefix(keyboardId: string, prefix: string): string {
    if (!keyboardId) {
      return keyboardId;
    }

    if (prefix) {
      return prefix;
    }

    const specialPrefixes = [
      'basic',
      'bj',
      'el',
      'fv',
      'gff',
      'itrans',
      'nlci',
      'nrc',
      'rac',
      'sil',
    ];
    for (const specialPrefix of specialPrefixes) {
      if (keyboardId.startsWith(`${specialPrefix}_`)) {
        return specialPrefix;
      }
    }
    return keyboardId.substring(0, 1);
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
    debug(`createPullRequestOnKeyboardsRepo for ${head}: '${title}' - '${description}'`);
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
    project: Project,
  ): Observable<void> {
    const exportInfo = new TransferInfo(
      `KDO exported to ${commitOnKeyboardsRepo}`,
      project.prefix,
      project.name,
    );
    const importInfo = new TransferInfo(
      `KDO imported from ${commitOnSingleKbRepo}`,
      project.prefix,
      project.name,
    );

    return this.createNote(singleKbRepoPath, commitOnSingleKbRepo, exportInfo).pipe(
      switchMap(() => this.createNote(keyboardsRepoPath, commitOnKeyboardsRepo, importInfo)),
    );
  }

  public createNote(
    localRepoPath: string,
    commitOnRepo: string,
    noteInfo: TransferInfo,
  ): Observable<void> {
    return this.gitService.createNote(
      localRepoPath,
      commitOnRepo,
      JSON.stringify(noteInfo),
    );
  }

  public readLastNote(
    localRepoDir: string,
  ): Observable<{ commitSha: string; noteInfo: TransferInfo }> {
    return this.gitService.readLastNote(localRepoDir).pipe(
      map(obj => {
        try {
          const noteInfo = obj.message ? JSON.parse(obj.message) : new TransferInfo('', '', '');
          return { commitSha: obj.commitSha, noteInfo };
        } catch(err) {
          // Just ignore parse error
          return { commitSha: '', noteInfo: new TransferInfo('', '', '') };
        }
      })
    );
  }

  public getPullRequestOnKeyboardsRepo(
    token: string, // the token used to authorize with GitHub
    head: string, // name of the branch that contains the new commits. Use `username/repo:branch` for cross-repo PRs
  ): Observable<GitHubPullRequest> {
    debug(`checking if we can find a PR for ${head}`);
    return this.githubService.pullRequestExists(
      token,
      this.config.organizationName,
      this.config.keyboardsRepoName,
      head,
    ).pipe(
      catchError(err => { debug(`no existing open PR for ${head}`); throw err}),
      tap(prNumber => {
        if (prNumber < 0) {
          debug(`no existing open PR for ${head}`);
          throw new HttpException('Pull request does not exist', 404);
        }
        debug(`found a PR: #${prNumber}`);
      }),
      switchMap(prNumber => this.githubService.pullRequestDetails(
        token,
        this.config.organizationName,
        this.config.keyboardsRepoName,
        prNumber,
      )),
    );
  }
}
