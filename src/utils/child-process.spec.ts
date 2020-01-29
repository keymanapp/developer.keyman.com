import fs = require('fs');
import os = require('os');
import path = require('path');

import { deleteFolderRecursive } from './delete-folder';
import { fileExists } from './file';
import { exec } from './child-process';

describe('Observable child-process methods', () => {
  let tmpDir: string;

  beforeAll(() => {
    const prefix = path.join(os.tmpdir(), 'fileTests-');
    tmpDir = fs.mkdtempSync(prefix);
  });

  afterAll(() => {
    deleteFolderRecursive(tmpDir);
  });

  describe('exec', () => {
    it('executes the command with absolute path', async () => {
      // Setup
      const file = path.join(tmpDir, 'exec-file1');

      // Execute
      await exec(`echo "Hello world" > ${file}`, { }).toPromise();

      // Verify
      expect(await fileExists(file).toPromise()).toBe(true);
    });

    it('executes the command in workdir', async () => {
      // Setup
      const file = path.join(tmpDir, 'exec-file2');

      // Execute
      await exec(`echo "Hello world" > exec-file2`, { cwd: tmpDir }).toPromise();

      // Verify
      expect(await fileExists(file).toPromise()).toBe(true);
    });

  });
});
