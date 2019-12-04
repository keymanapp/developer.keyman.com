import { Test, TestingModule } from '@nestjs/testing';

import fs = require('fs');
import os = require('os');
import path = require('path');

import { GitService } from '../git/git.service';
import { ConfigService } from '../config/config.service';
import { ConfigModule } from '../config/config.module';
import { deleteFolderRecursive } from '../utils/delete-folder';
import { PullRequestService } from './pull-request.service';

describe('PullRequestService', () => {
  let sut: PullRequestService;
  let gitService: GitService;
  let config: ConfigService;
  let workDir: string;
  let singleKeyboardRepo: string;
  let keyboardsRepo: string;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule],
      providers: [PullRequestService, GitService],
    }).compile();

    sut = module.get<PullRequestService>(PullRequestService);
    gitService = module.get<GitService>(GitService);
    config = module.get<ConfigService>(ConfigService);

    workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'workdir-'));
    jest.spyOn(config, 'workDirectory', 'get').mockReturnValue(workDir);

    singleKeyboardRepo = await gitService.createRepo(
      path.join(workDir, 'myKeyboard'),
    );
    const filePath1 = path.join(singleKeyboardRepo, 'somefile1.txt');
    fs.appendFileSync(filePath1, 'some text');
    await gitService.addFile(singleKeyboardRepo, filePath1);
    await gitService.commit(singleKeyboardRepo, 'Initial commit');

    fs.appendFileSync(filePath1, '\nsome more text');
    const filePath2 = path.join(singleKeyboardRepo, 'somefile2.txt');
    fs.appendFileSync(filePath2, 'other text');
    await Promise.all([
      gitService.addFile(singleKeyboardRepo, filePath1),
      gitService.addFile(singleKeyboardRepo, filePath2),
    ]);
    await gitService.commit(singleKeyboardRepo, 'Second commit');

    keyboardsRepo = await gitService.createRepo(
      path.join(workDir, 'keyboards'),
    );
  });

  afterEach(() => {
    deleteFolderRecursive(workDir);
  });

  it('should be defined', () => {
    expect(sut).toBeDefined();
  });

  describe('extractPatch', () => {
    it('can extract patches for all commits', async () => {
      // Execute
      const patches = await sut.extractPatches(singleKeyboardRepo);

      // Verify
      expect(patches.length).toEqual(2);
    });
  });

  describe('convertPatches', () => {
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
      sut.convertPatches(workDir, [patchFileFullPath], 'myKeyboard').subscribe({
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
      sut.convertPatches([patchFileFullPath], 'myKeyboard').subscribe({
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
      sut.convertPatches([patchFileFullPath], 'myKeyboard').subscribe({
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
      sut.convertPatches([patchFileFullPath], 'myKeyboard').subscribe({
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
      sut.convertPatches([patchFileFullPath], 'myKeyboard').subscribe({
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
  });

  describe('template', () => {
    it('template', async () => {
      // Setup
      // Execute
      // Verify
    });
  });
});
