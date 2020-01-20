import fs = require('fs');
import os = require('os');
import path = require('path');

import { deleteFolderRecursive } from './delete-folder';
import { fileExists, mkdir, readFile, writeFile, appendFile, mkdtemp } from './file';

describe('Observable file methods', () => {
  let tmpDir: string;

  beforeAll(() => {
    const prefix = path.join(os.tmpdir(), 'fileTests-');
    tmpDir = fs.mkdtempSync(prefix);
  });

  afterAll(() => {
    deleteFolderRecursive(tmpDir);
  });

  describe('fileExists', () => {
    it('returns true if file exists', async () => {
      const filePath = path.join(tmpDir, 'fileExists-somefile.txt');
      fs.appendFileSync(filePath, 'some text');
      expect(await fileExists(filePath).toPromise()).toBe(true);
    });

    it('returns false if file does not exists', async () => {
      const filePath = path.join(tmpDir, 'fileExists-nofile.txt');
      expect(await fileExists(filePath).toPromise()).toBe(false);
    });
  });

  describe('mkdir', () => {
    it('creates the directory', async () => {
      const dir = path.join(tmpDir, 'mkdir-newDir');
      await mkdir(dir).toPromise();
      expect(fs.existsSync(dir)).toBe(true);
    });

    it('fails if directory already exists', async () => {
      // Setup
      const dir = path.join(tmpDir, 'mkdir-existingDir');
      fs.mkdirSync(dir);

      // Execute/Verify
      expect(mkdir(dir).toPromise())
        .rejects.toThrow();
    });

    it('creates directory recursive', async () => {
      const dir = path.join(tmpDir, 'mkdir2-newDir', 'subdir');
      await mkdir(dir, { recursive: true }).toPromise();
      expect(fs.existsSync(dir)).toBe(true);
    });
  });

  describe('readFile', () => {
    it('reads file content', async () => {
      const filePath = path.join(tmpDir, 'readFile-somefile.txt');
      fs.appendFileSync(filePath, 'This is the file content.');
      expect(await readFile(filePath).toPromise()).toBe('This is the file content.');
    });
  });

  describe('writeFile', () => {
    it('writes file content', async () => {
      const filePath = path.join(tmpDir, 'writeFile-somefile.txt');

      // Execute
      await writeFile(filePath, 'This is the file content.').toPromise();

      // Verify
      expect(await fileExists(filePath).toPromise()).toBe(true);
      expect(await readFile(filePath).toPromise()).toBe('This is the file content.');
    });
  });

  describe('appendFile', () => {
    it('writes file content', async () => {
      const filePath = path.join(tmpDir, 'appendFile-somefile.txt');

      // Execute
      await appendFile(filePath, 'This is the file content.').toPromise();

      // Verify
      expect(await fileExists(filePath).toPromise()).toBe(true);
      expect(await readFile(filePath).toPromise()).toBe(
        'This is the file content.',
      );
    });

    it('appends file content', async () => {
      const filePath = path.join(tmpDir, 'appendFile-somefile2.txt');
      await writeFile(filePath, 'Initial file content.\n').toPromise();

      // Execute
      await appendFile(filePath, 'Additional file content.').toPromise();

      // Verify
      expect(await fileExists(filePath).toPromise()).toBe(true);
      expect(await readFile(filePath).toPromise()).toBe(
        'Initial file content.\nAdditional file content.',
      );
    });
  });

  describe('mkdtemp', () => {
    it('creates temporary directory', async () => {
      // Setup
      const prefix = path.join(tmpDir, 'mkdtemp');

      // Execute
      const dir = await mkdtemp(prefix).toPromise();

      // Verify
      const expected = new RegExp(`^${prefix}.+`);
      expect(dir).toMatch(expected);
    });
  });
});
