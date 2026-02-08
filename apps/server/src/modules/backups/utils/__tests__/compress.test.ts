import { describe, it, expect, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { createTarGz, extractTarGz } from '../compress.js';

describe('Compression Utilities', () => {
  const tmpDirs: string[] = [];

  function makeTmpDir(): string {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'compress-test-'));
    tmpDirs.push(dir);
    return dir;
  }

  afterEach(() => {
    for (const dir of tmpDirs) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
    tmpDirs.length = 0;
  });

  describe('createTarGz + extractTarGz round-trip', () => {
    it('should compress and extract a single file', async () => {
      const entries = [{ name: 'hello.txt', data: Buffer.from('Hello, world!') }];

      const archive = await createTarGz(entries);
      expect(archive.length).toBeGreaterThan(0);

      const outputDir = makeTmpDir();
      await extractTarGz(archive, outputDir);

      const content = fs.readFileSync(path.join(outputDir, 'hello.txt'), 'utf-8');
      expect(content).toBe('Hello, world!');
    });

    it('should handle multiple files with nested paths', async () => {
      const entries = [
        { name: 'manifest.json', data: Buffer.from('{"version": 1}') },
        { name: 'pages/page1.html', data: Buffer.from('<h1>Page 1</h1>') },
        { name: 'pages/page2.html', data: Buffer.from('<h1>Page 2</h1>') },
        { name: 'files/image.bin', data: Buffer.from([0x89, 0x50, 0x4e, 0x47]) },
      ];

      const archive = await createTarGz(entries);
      const outputDir = makeTmpDir();
      await extractTarGz(archive, outputDir);

      expect(fs.readFileSync(path.join(outputDir, 'manifest.json'), 'utf-8')).toBe(
        '{"version": 1}'
      );
      expect(fs.readFileSync(path.join(outputDir, 'pages/page1.html'), 'utf-8')).toBe(
        '<h1>Page 1</h1>'
      );
      expect(fs.readFileSync(path.join(outputDir, 'pages/page2.html'), 'utf-8')).toBe(
        '<h1>Page 2</h1>'
      );
      expect(fs.readFileSync(path.join(outputDir, 'files/image.bin'))).toEqual(
        Buffer.from([0x89, 0x50, 0x4e, 0x47])
      );
    });

    it('should handle empty entries', async () => {
      const archive = await createTarGz([]);
      expect(archive.length).toBeGreaterThan(0);
    });

    it('should handle binary data correctly', async () => {
      const binaryData = Buffer.alloc(1024);
      for (let i = 0; i < 1024; i++) {
        binaryData[i] = i % 256;
      }

      const entries = [{ name: 'binary.bin', data: binaryData }];
      const archive = await createTarGz(entries);
      const outputDir = makeTmpDir();
      await extractTarGz(archive, outputDir);

      const extracted = fs.readFileSync(path.join(outputDir, 'binary.bin'));
      expect(extracted).toEqual(binaryData);
    });
  });
});
