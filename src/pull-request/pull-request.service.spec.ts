import { Test, TestingModule } from '@nestjs/testing';

import { map } from 'rxjs/operators';

import { ConfigModule } from '../config/config.module';
import { ConfigService } from '../config/config.service';
import { GitService } from '../git/git.service';
import { GithubModule } from '../github/github.module';
import { TransferInfo } from '../interfaces/transfer-info';
import { deleteFolderRecursive } from '../utils/delete-folder';
import { PullRequestService } from './pull-request.service';

import fs = require('fs');
import os = require('os');
import path = require('path');
import debugModule = require('debug');
const debug = debugModule('kdo:pullRequestTests');

describe('PullRequestService', () => {
  let sut: PullRequestService;
  let gitService: GitService;
  let config: ConfigService;
  let workDir: string;
  let singleKeyboardRepo: string;
  let keyboardsRepo: string;

  beforeEach(async () => {
    jest.setTimeout(60000 /* 60s */);

    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule, GithubModule],
      providers: [PullRequestService, GitService],
    }).compile();

    sut = module.get<PullRequestService>(PullRequestService);
    gitService = module.get<GitService>(GitService);
    config = module.get<ConfigService>(ConfigService);

    workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'workdir-'));
    jest.spyOn(config, 'workDirectory', 'get').mockReturnValue(workDir);

    singleKeyboardRepo = await gitService
      .createRepo(path.join(workDir, 'myKeyboard'))
      .toPromise();
    const filePath1 = path.join(singleKeyboardRepo, 'somefile1.txt');
    fs.appendFileSync(filePath1, 'some text');
    await gitService.addFile(singleKeyboardRepo, filePath1).toPromise();
    await gitService.commit(singleKeyboardRepo, 'Initial commit').toPromise();

    fs.appendFileSync(filePath1, `${os.EOL}some more text`);
    const filePath2 = path.join(singleKeyboardRepo, 'somefile2.txt');
    fs.appendFileSync(filePath2, 'other text');
    await Promise.all([
      gitService.addFile(singleKeyboardRepo, filePath1).toPromise(),
      gitService.addFile(singleKeyboardRepo, filePath2).toPromise(),
    ]);
    await gitService.commit(singleKeyboardRepo, 'Second commit').toPromise();

    keyboardsRepo = await gitService
      .createRepo(path.join(workDir, 'keyboards'))
      .toPromise();
  });

  afterEach(() => {
    try {
      deleteFolderRecursive(workDir);
    } catch (e) {
      // simply ignore error
    }
  });

  it('should be defined', () => {
    expect(sut).toBeDefined();
  });

  describe('extractPatch', () => {
    it('can extract patches for all commits', async () => {
      // Execute
      expect.assertions(1);
      const [, patches] = await sut.extractPatches(singleKeyboardRepo).toPromise();

      // Verify
      expect(patches.length).toEqual(2);
    });

    it('can extract new patches since last import', async () => {
      // Setup
      expect.assertions(3);
      await sut.transferChanges(singleKeyboardRepo, keyboardsRepo, { name: 'myKeyboard'}).toPromise();
      const filePath1 = path.join(singleKeyboardRepo, 'somefile1.txt');
      fs.appendFileSync(filePath1, `${os.EOL}Text for the third commit`);
      await gitService.addFile(singleKeyboardRepo, filePath1).toPromise();
      const thirdCommit = await gitService.commit(singleKeyboardRepo, 'Third commit').toPromise();

      // Execute
      const [commit, patches] = await sut.extractPatches(singleKeyboardRepo).toPromise();

      // Verify
      expect(patches.length).toEqual(1);
      expect(patches[0]).toBe(path.join(singleKeyboardRepo, '0001-Third-commit.patch'));
      expect(commit).toMatch(new RegExp(`^${thirdCommit.commit}`));
    });
  });

  describe('convertPatch', () => {
    it('adjusts the paths of modified files', done => {
      // Setup
      expect.assertions(1);
      const patchFile = '0001-Initial-commit.patch';
      const patchFileFullPath = path.join(workDir, patchFile);
      fs.appendFileSync(
        patchFileFullPath,
        /* #region source patch file */
        `From 28132549f15a430017bbb6121813387f0f0f84b6 Mon Sep 17 00:00:00 2001
From: Keyman Developer Online <kdo@example.com>
Date: Wed, 4 Dec 2019 16:03:16 +0100
Subject: [PATCH] Second commit

---
 dir1/file1.txt | 3 ++-
 file1.txt      | 2 +-
 2 files changed, 5 insertions(+), 4 deletions(-)

diff --git a/dir1/file1.txt b/dir1/file1.txt
index 24cf2db..52a21ff 100644
--- a/dir1/file1.txt
+++ b/dir1/file1.txt
@@ -1 +1,2 @@
-This is file1 in dir1
+This is file1 in dir1.
+It has more text now.
diff --git a/file1.txt b/file1.txt
index c278a75..c048aca 100644
--- a/file1.txt
+++ b/file1.txt
@@ -1 +1 @@
-This is file1
+This is file1 in root directory
--
2.24.0
`,
        /* #endregion */
      );

      // Execute/Verify
      sut.convertPatch(patchFileFullPath, 'myKeyboard', null).subscribe({
        next: newPatchFile => {
          const data: string = fs.readFileSync(newPatchFile).toString();
          expect(data).toEqual(
            /* #region expected patch file */
            `From 28132549f15a430017bbb6121813387f0f0f84b6 Mon Sep 17 00:00:00 2001
From: Keyman Developer Online <kdo@example.com>
Date: Wed, 4 Dec 2019 16:03:16 +0100
Subject: [PATCH] Second commit

---
 release/m/myKeyboard/dir1/file1.txt | 3 ++-
 release/m/myKeyboard/file1.txt      | 2 +-
 2 files changed, 5 insertions(+), 4 deletions(-)

diff --git a/release/m/myKeyboard/dir1/file1.txt b/release/m/myKeyboard/dir1/file1.txt
index 24cf2db..52a21ff 100644
--- a/release/m/myKeyboard/dir1/file1.txt
+++ b/release/m/myKeyboard/dir1/file1.txt
@@ -1 +1,2 @@
-This is file1 in dir1
+This is file1 in dir1.
+It has more text now.
diff --git a/release/m/myKeyboard/file1.txt b/release/m/myKeyboard/file1.txt
index c278a75..c048aca 100644
--- a/release/m/myKeyboard/file1.txt
+++ b/release/m/myKeyboard/file1.txt
@@ -1 +1 @@
-This is file1
+This is file1 in root directory
--
2.24.0
`,
            /* #endregion */
          );
        },
        complete: () => done(),
      });
    });

    it('adjusts the paths of deleted files', done => {
      // Setup
      expect.assertions(1);
      const patchFile = '0001-Initial-commit.patch';
      const patchFileFullPath = path.join(workDir, patchFile);
      fs.appendFileSync(
        patchFileFullPath,
        /* #region source patch file */
        `Subject: [PATCH] Second commit

---
 dir1/file2.txt | 1 -
 file2.txt      | 1 -
 7 files changed, 5 insertions(+), 4 deletions(-)
 delete mode 100644 dir1/file2.txt
 delete mode 100644 file2.txt

diff --git a/dir1/file2.txt b/dir1/file2.txt
deleted file mode 100644
index d3de5be..0000000
--- a/dir1/file2.txt
+++ /dev/null
@@ -1 +0,0 @@
-This is file2 in dir1
diff --git a/file2.txt b/file2.txt
deleted file mode 100644
index 095ee29..0000000
--- a/file2.txt
+++ /dev/null
@@ -1 +0,0 @@
-This is file2
--
2.24.0
`,
        /* #endregion */
      );

      // Execute/Verify
      sut.convertPatch(patchFileFullPath, 'myKeyboard', null).subscribe({
        next: newPatchFile => {
          const data: string = fs.readFileSync(newPatchFile).toString();
          expect(data).toEqual(
            /* #region expected patch file */
            `Subject: [PATCH] Second commit

---
 release/m/myKeyboard/dir1/file2.txt | 1 -
 release/m/myKeyboard/file2.txt      | 1 -
 7 files changed, 5 insertions(+), 4 deletions(-)
 delete mode 100644 release/m/myKeyboard/dir1/file2.txt
 delete mode 100644 release/m/myKeyboard/file2.txt

diff --git a/release/m/myKeyboard/dir1/file2.txt b/release/m/myKeyboard/dir1/file2.txt
deleted file mode 100644
index d3de5be..0000000
--- a/release/m/myKeyboard/dir1/file2.txt
+++ /dev/null
@@ -1 +0,0 @@
-This is file2 in dir1
diff --git a/release/m/myKeyboard/file2.txt b/release/m/myKeyboard/file2.txt
deleted file mode 100644
index 095ee29..0000000
--- a/release/m/myKeyboard/file2.txt
+++ /dev/null
@@ -1 +0,0 @@
-This is file2
--
2.24.0
`,
            /* #endregion */
          );
        },
        complete: () => done(),
      });
    });

    it('adjusts the paths of added files', done => {
      // Setup
      expect.assertions(1);
      const patchFile = '0001-Initial-commit.patch';
      const patchFileFullPath = path.join(workDir, patchFile);
      fs.appendFileSync(
        patchFileFullPath,
        /* #region source patch file */
        `Subject: [PATCH] Second commit

---
 dir2/file1.txt | 1 +
 file3.txt      | 1 +
 7 files changed, 5 insertions(+), 4 deletions(-)
 create mode 100644 dir2/file1.txt
 create mode 100644 file3.txt

diff --git a/dir2/file1.txt b/dir2/file1.txt
new file mode 100644
index 0000000..458aeac
--- /dev/null
+++ b/dir2/file1.txt
@@ -0,0 +1 @@
+This is file1 in dir2
diff --git a/file3.txt b/file3.txt
new file mode 100644
index 0000000..c44fd7c
--- /dev/null
+++ b/file3.txt
@@ -0,0 +1 @@
+This is file3
--
2.24.0
`,
        /* #endregion */
      );

      // Execute/Verify
      sut.convertPatch(patchFileFullPath, 'myKeyboard', null).subscribe({
        next: newPatchFile => {
          const data: string = fs.readFileSync(newPatchFile).toString();
          expect(data).toEqual(
            /* #region expected patch file */
            `Subject: [PATCH] Second commit

---
 release/m/myKeyboard/dir2/file1.txt | 1 +
 release/m/myKeyboard/file3.txt      | 1 +
 7 files changed, 5 insertions(+), 4 deletions(-)
 create mode 100644 release/m/myKeyboard/dir2/file1.txt
 create mode 100644 release/m/myKeyboard/file3.txt

diff --git a/release/m/myKeyboard/dir2/file1.txt b/release/m/myKeyboard/dir2/file1.txt
new file mode 100644
index 0000000..458aeac
--- /dev/null
+++ b/release/m/myKeyboard/dir2/file1.txt
@@ -0,0 +1 @@
+This is file1 in dir2
diff --git a/release/m/myKeyboard/file3.txt b/release/m/myKeyboard/file3.txt
new file mode 100644
index 0000000..c44fd7c
--- /dev/null
+++ b/release/m/myKeyboard/file3.txt
@@ -0,0 +1 @@
+This is file3
--
2.24.0
`,
            /* #endregion */
          );
        },
        complete: () => done(),
      });
    });

    it('adjusts the paths of renamed files', done => {
      // Setup
      expect.assertions(1);
      const patchFile = '0001-Initial-commit.patch';
      const patchFileFullPath = path.join(workDir, patchFile);
      fs.appendFileSync(
        patchFileFullPath,
        /* #region source patch file */
        `Subject: [PATCH] Second commit

---
 somefile2.txt => somefile3.txt | 0
 7 files changed, 5 insertions(+), 4 deletions(-)
 rename somefile2.txt => somefile3.txt (100%)

diff --git a/somefile2.txt b/somefile3.txt
similarity index 100%
rename from somefile2.txt
rename to somefile3.txt
--
2.24.0
`,
        /* #endregion */
      );

      // Execute/Verify
      sut.convertPatch(patchFileFullPath, 'myKeyboard', null).subscribe({
        next: newPatchFile => {
          const data: string = fs.readFileSync(newPatchFile).toString();
          expect(data).toEqual(
            /* #region expected patch file */
            `Subject: [PATCH] Second commit

---
 release/m/myKeyboard/somefile2.txt => release/m/myKeyboard/somefile3.txt | 0
 7 files changed, 5 insertions(+), 4 deletions(-)
 rename release/m/myKeyboard/somefile2.txt => release/m/myKeyboard/somefile3.txt (100%)

diff --git a/release/m/myKeyboard/somefile2.txt b/release/m/myKeyboard/somefile3.txt
similarity index 100%
rename from release/m/myKeyboard/somefile2.txt
rename to release/m/myKeyboard/somefile3.txt
--
2.24.0
`,
            /* #endregion */
          );
        },
        complete: () => done(),
      });
    });

    it('adjusts the paths of renamed files with braces', done => {
      // Setup
      expect.assertions(1);
      const patchFile = '0001-Initial-commit.patch';
      const patchFileFullPath = path.join(workDir, patchFile);
      fs.appendFileSync(
        patchFileFullPath,
        /* #region source patch file */
        `Subject: [PATCH] Second commit

---
 this/is/a/long/path/{somefile2.txt => somefile3.txt} | 0
 7 files changed, 5 insertions(+), 4 deletions(-)
 rename this/is/a/long/path/{somefile2.txt => somefile3.txt} (100%)

diff --git a/this/is/a/long/path/somefile2.txt b/this/is/a/long/path/somefile3.txt
similarity index 100%
rename from this/is/a/long/path/somefile2.txt
rename to this/is/a/long/path/somefile3.txt
--
2.24.0
`,
        /* #endregion */
      );

      // Execute/Verify
      sut.convertPatch(patchFileFullPath, 'myKeyboard', null).subscribe({
        next: newPatchFile => {
          const data: string = fs.readFileSync(newPatchFile).toString();
          expect(data).toEqual(
            /* #region expected patch file */
            `Subject: [PATCH] Second commit

---
 release/m/myKeyboard/this/is/a/long/path/{somefile2.txt => somefile3.txt} | 0
 7 files changed, 5 insertions(+), 4 deletions(-)
 rename release/m/myKeyboard/this/is/a/long/path/{somefile2.txt => somefile3.txt} (100%)

diff --git a/release/m/myKeyboard/this/is/a/long/path/somefile2.txt b/release/m/myKeyboard/this/is/a/long/path/somefile3.txt
similarity index 100%
rename from release/m/myKeyboard/this/is/a/long/path/somefile2.txt
rename to release/m/myKeyboard/this/is/a/long/path/somefile3.txt
--
2.24.0
`,
            /* #endregion */
          );
        },
        complete: () => done(),
      });
    });

    it('adjusts the paths of modified files if prefix is specified', done => {
      // Setup
      expect.assertions(1);
      const patchFile = '0001-Initial-commit.patch';
      const patchFileFullPath = path.join(workDir, patchFile);
      fs.appendFileSync(
        patchFileFullPath,
        /* #region source patch file */
        `From 28132549f15a430017bbb6121813387f0f0f84b6 Mon Sep 17 00:00:00 2001
From: Keyman Developer Online <kdo@example.com>
Date: Wed, 4 Dec 2019 16:03:16 +0100
Subject: [PATCH] Second commit

---
 dir1/file1.txt | 3 ++-
 file1.txt      | 2 +-
 2 files changed, 5 insertions(+), 4 deletions(-)

diff --git a/dir1/file1.txt b/dir1/file1.txt
index 24cf2db..52a21ff 100644
--- a/dir1/file1.txt
+++ b/dir1/file1.txt
@@ -1 +1,2 @@
-This is file1 in dir1
+This is file1 in dir1.
+It has more text now.
diff --git a/file1.txt b/file1.txt
index c278a75..c048aca 100644
--- a/file1.txt
+++ b/file1.txt
@@ -1 +1 @@
-This is file1
+This is file1 in root directory
--
2.24.0
`,
        /* #endregion */
      );

      // Execute/Verify
      sut.convertPatch(patchFileFullPath, 'myKeyboard', 'xyz').subscribe({
        next: newPatchFile => {
          const data: string = fs.readFileSync(newPatchFile).toString();
          expect(data).toEqual(
            /* #region expected patch file */
            `From 28132549f15a430017bbb6121813387f0f0f84b6 Mon Sep 17 00:00:00 2001
From: Keyman Developer Online <kdo@example.com>
Date: Wed, 4 Dec 2019 16:03:16 +0100
Subject: [PATCH] Second commit

---
 release/xyz/myKeyboard/dir1/file1.txt | 3 ++-
 release/xyz/myKeyboard/file1.txt      | 2 +-
 2 files changed, 5 insertions(+), 4 deletions(-)

diff --git a/release/xyz/myKeyboard/dir1/file1.txt b/release/xyz/myKeyboard/dir1/file1.txt
index 24cf2db..52a21ff 100644
--- a/release/xyz/myKeyboard/dir1/file1.txt
+++ b/release/xyz/myKeyboard/dir1/file1.txt
@@ -1 +1,2 @@
-This is file1 in dir1
+This is file1 in dir1.
+It has more text now.
diff --git a/release/xyz/myKeyboard/file1.txt b/release/xyz/myKeyboard/file1.txt
index c278a75..c048aca 100644
--- a/release/xyz/myKeyboard/file1.txt
+++ b/release/xyz/myKeyboard/file1.txt
@@ -1 +1 @@
-This is file1
+This is file1 in root directory
--
2.24.0
`,
            /* #endregion */
          );
        },
        complete: () => done(),
      });
    });

    it('adjusts the paths of modified files for keyboard with special prefix', done => {
      // Setup
      expect.assertions(1);
      const patchFile = '0001-Initial-commit.patch';
      const patchFileFullPath = path.join(workDir, patchFile);
      fs.appendFileSync(
        patchFileFullPath,
        /* #region source patch file */
        `From 28132549f15a430017bbb6121813387f0f0f84b6 Mon Sep 17 00:00:00 2001
From: Keyman Developer Online <kdo@example.com>
Date: Wed, 4 Dec 2019 16:03:16 +0100
Subject: [PATCH] Second commit

---
 dir1/file1.txt | 3 ++-
 file1.txt      | 2 +-
 2 files changed, 5 insertions(+), 4 deletions(-)

diff --git a/dir1/file1.txt b/dir1/file1.txt
index 24cf2db..52a21ff 100644
--- a/dir1/file1.txt
+++ b/dir1/file1.txt
@@ -1 +1,2 @@
-This is file1 in dir1
+This is file1 in dir1.
+It has more text now.
diff --git a/file1.txt b/file1.txt
index c278a75..c048aca 100644
--- a/file1.txt
+++ b/file1.txt
@@ -1 +1 @@
-This is file1
+This is file1 in root directory
--
2.24.0
`,
        /* #endregion */
      );

      // Execute/Verify
      sut.convertPatch(patchFileFullPath, 'sil_myKeyboard', null).subscribe({
        next: newPatchFile => {
          const data: string = fs.readFileSync(newPatchFile).toString();
          expect(data).toEqual(
            /* #region expected patch file */
            `From 28132549f15a430017bbb6121813387f0f0f84b6 Mon Sep 17 00:00:00 2001
From: Keyman Developer Online <kdo@example.com>
Date: Wed, 4 Dec 2019 16:03:16 +0100
Subject: [PATCH] Second commit

---
 release/sil/sil_myKeyboard/dir1/file1.txt | 3 ++-
 release/sil/sil_myKeyboard/file1.txt      | 2 +-
 2 files changed, 5 insertions(+), 4 deletions(-)

diff --git a/release/sil/sil_myKeyboard/dir1/file1.txt b/release/sil/sil_myKeyboard/dir1/file1.txt
index 24cf2db..52a21ff 100644
--- a/release/sil/sil_myKeyboard/dir1/file1.txt
+++ b/release/sil/sil_myKeyboard/dir1/file1.txt
@@ -1 +1,2 @@
-This is file1 in dir1
+This is file1 in dir1.
+It has more text now.
diff --git a/release/sil/sil_myKeyboard/file1.txt b/release/sil/sil_myKeyboard/file1.txt
index c278a75..c048aca 100644
--- a/release/sil/sil_myKeyboard/file1.txt
+++ b/release/sil/sil_myKeyboard/file1.txt
@@ -1 +1 @@
-This is file1
+This is file1 in root directory
--
2.24.0
`,
            /* #endregion */
          );
        },
        complete: () => done(),
      });
    });

  });

  describe('importPatches', () => {
    it('imports patches', done => {
      // Setup
      expect.assertions(5);
      const patchFile1 = '0001-Initial-commit.patch';
      const patchFile1FullPath = path.join(keyboardsRepo, patchFile1);
      fs.appendFileSync(
        patchFile1FullPath,
        /* #region patch file 1 */
        `From 28132549f15a430017bbb6121813387f0f0f84b6 Mon Sep 17 00:00:00 2001
From: Keyman Developer Online <kdo@example.com>
Date: Thu, 5 Dec 2019 12:13:34 +0100
Subject: [PATCH 1/2] Initial commit

---
 release/m/myKeyboard/somefile1.txt | 1 +
 1 file changed, 1 insertion(+)
 create mode 100644 release/m/myKeyboard/somefile1.txt

diff --git a/release/m/myKeyboard/somefile1.txt b/release/m/myKeyboard/somefile1.txt
new file mode 100644
index 0000000..7b57bd2
--- /dev/null
+++ b/release/m/myKeyboard/somefile1.txt
@@ -0,0 +1 @@
+some text
--
2.24.0
`,
        /* #endregion */
      );
      const patchFile2 = '0002-Second-commit.patch';
      const patchFile2FullPath = path.join(keyboardsRepo, patchFile2);
      fs.appendFileSync(
        patchFile2FullPath,
        /* #region patch file 2 */
        `From d1aa96fc48496cbf535faefee63c914506a846b7 Mon Sep 17 00:00:00 2001
From: Keyman Developer Online <kdo@example.com>
Date: Thu, 5 Dec 2019 12:14:04 +0100
Subject: [PATCH 2/2] Second commit

---
 release/m/myKeyboard/somefile1.txt | 1 +
 release/m/myKeyboard/somefile2.txt | 1 +
 2 files changed, 2 insertions(+)
 create mode 100644 release/m/myKeyboard/somefile2.txt

diff --git a/release/m/myKeyboard/somefile1.txt b/release/m/myKeyboard/somefile1.txt
index 7b57bd2..1f89c65 100644
--- a/release/m/myKeyboard/somefile1.txt
+++ b/release/m/myKeyboard/somefile1.txt
@@ -1 +1,2 @@
 some text
+some more text
diff --git a/release/m/myKeyboard/somefile2.txt b/release/m/myKeyboard/somefile2.txt
new file mode 100644
index 0000000..4d3b8c1
--- /dev/null
+++ b/release/m/myKeyboard/somefile2.txt
@@ -0,0 +1 @@
+other text
--
2.24.0
`,
        /* #endregion */
      );

      // Execute/Verify
      const patchFiles = [patchFile1, patchFile2];
      sut.importPatch(keyboardsRepo, patchFiles)
        .subscribe((commit: string) => {
          debug(`got commit=${commit}`);
          const firstFile = path.join(keyboardsRepo, 'release', 'm', 'myKeyboard', 'somefile1.txt');
          expect(fs.existsSync(firstFile)).toBe(true);
          expect(fs.readFileSync(firstFile).toString()).toEqual(`some text${os.EOL}some more text${os.EOL}`);
          const secondFile = path.join(keyboardsRepo, 'release', 'm', 'myKeyboard', 'somefile2.txt');
          expect(fs.existsSync(secondFile)).toBe(true);
          expect(fs.readFileSync(secondFile).toString()).toEqual(`other text${os.EOL}`);
          gitService.log(keyboardsRepo, { '-1': null }).subscribe(logs => {
            expect(commit).toBe(logs.latest.hash);
            done();
          });
        },
      );
    });
  });

  describe('transferChanges', () => {
    it('applies the changes to keyboards repo', async () => {
      // Setup
      expect.assertions(6);

      // Execute
      await sut.transferChanges(singleKeyboardRepo, keyboardsRepo, { name: 'myKeyboard' }).toPromise();

      // Verify
      const firstFile = path.join(keyboardsRepo, 'release', 'm', 'myKeyboard', 'somefile1.txt');
      expect(fs.existsSync(firstFile)).toBe(true);
      expect(fs.readFileSync(firstFile).toString()).toEqual(`some text${os.EOL}some more text`);
      const secondFile = path.join(keyboardsRepo, 'release', 'm', 'myKeyboard', 'somefile2.txt');
      expect(fs.existsSync(secondFile)).toBe(true);
      expect(fs.readFileSync(secondFile).toString()).toEqual('other text');

      const singleKbNote = await sut.readLastNote(singleKeyboardRepo).toPromise();
      const keyboardsNote = await sut.readLastNote(keyboardsRepo).toPromise();
      expect(singleKbNote.noteInfo.msg).toBe(`KDO exported to ${keyboardsNote.commitSha}`);
      expect(keyboardsNote.noteInfo.msg).toBe(`KDO imported from ${singleKbNote.commitSha}`);
    });

    it('throws an error when there are no new changes', async () => {
      // Setup
      expect.assertions(2);
      await sut.transferChanges(singleKeyboardRepo, keyboardsRepo, { name: 'myKeyboard' }).toPromise();

      // Execute
      try {
        await sut.transferChanges(singleKeyboardRepo, keyboardsRepo, { name: 'myKeyboard' }).toPromise();
      } catch (e) {
        // Verify
        expect(e.message).toEqual('No new changes in the single-keyboard repo.');
        expect(e.status).toEqual(304);
      }
    });

    it('throws an error when it encounters force-pushes on single kb repo', async () => {
      // Setup
      expect.assertions(2);
      await sut.transferChanges(singleKeyboardRepo, keyboardsRepo, { name: 'myKeyboard' }).toPromise();
      const logs = await gitService.log(singleKeyboardRepo, { '-1': null }).toPromise();
      const commitOfFirstTransfer = logs.latest.hash;

      // Add third commit
      const filePath1 = path.join(singleKeyboardRepo, 'somefile1.txt');
      fs.appendFileSync(filePath1, `${os.EOL}Text for the third commit`);
      await gitService.addFile(singleKeyboardRepo, filePath1).toPromise();
      await gitService.commit(singleKeyboardRepo, 'Third commit').toPromise();
      await sut.transferChanges(singleKeyboardRepo, keyboardsRepo, { name: 'myKeyboard' }).toPromise();

      // Reset singleKeyboardRepo to HEAD^ and add new third commit
      await gitService.reset(singleKeyboardRepo, commitOfFirstTransfer).toPromise();
      fs.appendFileSync(filePath1, `${os.EOL}Text for the new third commit`);
      await gitService.addFile(singleKeyboardRepo, filePath1).toPromise();
      await gitService.commit(singleKeyboardRepo, 'New third commit').toPromise();

      // Execute
      try {
        await sut.transferChanges(singleKeyboardRepo, keyboardsRepo, { name: 'myKeyboard' }).toPromise();
      } catch (e) {
        // Verify
        expect(e.message).toMatch(/Non-linear history in single-keyboard repo. Force-push is not allowed./);
        expect(e.status).toEqual(412);
      }
    });

    it('throws an error with force-push on single kb repo if no other notes available', async () => {
      // Setup
      expect.assertions(2);
      await sut.transferChanges(singleKeyboardRepo, keyboardsRepo, { name: 'myKeyboard' }).toPromise();
      await gitService.commit(singleKeyboardRepo, 'New second commit', { '--amend': null }).toPromise();

      // Execute
      try {
        await sut.transferChanges(singleKeyboardRepo, keyboardsRepo, { name: 'myKeyboard' }).toPromise();
      } catch (e) {
        // Verify
        expect(e.message).toMatch(/Non-linear history in single-keyboard repo. Force-push is not allowed./);
        expect(e.status).toEqual(412);
      }
    });

    it('throws an error when it encounters new changes on keyboards repo', async () => {
      // Setup
      expect.assertions(2);
      await sut.transferChanges(singleKeyboardRepo, keyboardsRepo, { name: 'myKeyboard' }).toPromise();

      // Add third commit on keyboardsRepo
      const filePath1 = path.join(keyboardsRepo, 'release', 'm', 'myKeyboard', 'somefile1.txt');
      fs.appendFileSync(filePath1, `${os.EOL}Text for the third commit`);
      await gitService.addFile(keyboardsRepo, filePath1).toPromise();
      await gitService.commit(keyboardsRepo, 'Third commit').toPromise();

      // Execute
      try {
        await sut.transferChanges(singleKeyboardRepo, keyboardsRepo, { name: 'myKeyboard' }).toPromise();
      } catch (e) {
        // Verify
        expect(e.message).toMatch(/Keyboards repo has new changes in the single-keyboard directory. This is not allowed./);
        expect(e.status).toEqual(409);
      }
    });

    it('throws an error if project is not specified', async () => {
      // Setup
      expect.assertions(2);

      // Execute
      try {
        await sut.transferChanges(singleKeyboardRepo, keyboardsRepo, null).toPromise();
      } catch (e) {
        // Verify
        expect(e.message).toMatch(/Missing project data in request body/);
        expect(e.status).toEqual(400);
      }
    });
  });

  describe('getPrefix', () => {
    it.each([
      [null,         null,  null],
      [null,         'a',   null],
      ['foo',        null,  'f'],
      ['foo',        '',    'f'],
      ['foo',        'a',   'a'],
      ['foo',        'sil', 'sil'],
      ['basic_foo]', null,  'basic'],
      ['bj_foo',     null,  'bj'],
      ['el_foo',     null,  'el'],
      ['fv_foo',     null,  'fv'],
      ['gff_foo',    null,  'gff'],
      ['itrans_foo', null,  'itrans'],
      ['nlci_foo',   null,  'nlci'],
      ['nrc_foo',    null,  'nrc'],
      ['rac_foo',    null,  'rac'],
      ['sil_foo',    null,  'sil'],
      ['sil_foo',    'a',   'a'],
      ['sil',        null,  's'],
      ['silfoo',     null,  's'],
      ['xyz_foo',    null,  'x'],
    ])('returns the expected prefix', (keyboardId, prefix, expectedPrefix) => {
      expect(sut.getPrefix(keyboardId, prefix)).toEqual(expectedPrefix);
    });
  });

  describe('createNote', () => {
    it('can create notes', async () => {
      // Setup
      const headCommit = await gitService.getHeadCommit(singleKeyboardRepo).toPromise();
      const transferInfo = new TransferInfo('a', 'b', 'c');

      // Execute
      await sut.createNote(singleKeyboardRepo, headCommit, transferInfo).toPromise();

      // Verify
      const note = await gitService.log(
        singleKeyboardRepo,
        ['--notes=kdo', '--pretty=format: \'%N\'']
      ).pipe(
        map(list => list.latest),
        map(logLine => logLine.hash),
        map(msg => /^'([^\n]+)/.exec(msg)[1]),
      ).toPromise();
      expect(note).toEqual('{"msg":"a","prefix":"b","keyboardName":"c"}');
    });
  });

  describe('readLastNote', () => {
    it('can roundtrip notes', async () => {
      // Setup
      const headCommit = await gitService.getHeadCommit(singleKeyboardRepo).toPromise();
      const transferInfo = new TransferInfo('a', 'b', 'c');
      await sut.createNote(singleKeyboardRepo, headCommit, transferInfo).toPromise();

      // Execute
      const note = await sut.readLastNote(singleKeyboardRepo).toPromise();

      // Verify
      expect(note.commitSha).toEqual(headCommit);
      expect(note.noteInfo).toEqual(transferInfo);
    });
  });
});
