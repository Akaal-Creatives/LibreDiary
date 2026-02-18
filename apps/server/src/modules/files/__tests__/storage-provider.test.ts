import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { LocalStorageProvider } from '../storage/local-storage-provider.js';

// Mock fs module
vi.mock('node:fs', async (importOriginal) => {
  const original = (await importOriginal()) as typeof fs;
  return {
    ...original,
    existsSync: vi.fn(),
    mkdirSync: vi.fn(),
    writeFileSync: vi.fn(),
    readFileSync: vi.fn(),
    unlinkSync: vi.fn(),
    accessSync: vi.fn(),
    statSync: vi.fn(),
    // realpathSync is used by the security hardening to canonicalise paths
    realpathSync: vi.fn((p: string) => p),
  };
});

const mockedFs = vi.mocked(fs);

describe('LocalStorageProvider', () => {
  const basePath = '/tmp/test-uploads';
  let provider: LocalStorageProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    // Constructor calls existsSync + realpathSync; ensure base dir "exists"
    mockedFs.existsSync.mockReturnValue(true);
    provider = new LocalStorageProvider(basePath);
    // Reset after constructor so individual tests control their own mocks
    vi.clearAllMocks();
    // Re-apply the realpathSync default (clearAllMocks resets it)
    mockedFs.realpathSync.mockImplementation(((p: string) => p) as typeof fs.realpathSync);
  });

  // ===========================================
  // UPLOAD
  // ===========================================

  describe('upload', () => {
    it('should write file to disk and return storagePath', async () => {
      mockedFs.existsSync.mockReturnValue(true);
      const buffer = Buffer.from('test file content');
      const key = 'org-1/abc123.txt';

      const storagePath = await provider.upload(key, buffer, 'text/plain');

      expect(storagePath).toBe(key);
      expect(mockedFs.mkdirSync).toHaveBeenCalledWith(path.join(basePath, 'org-1'), {
        recursive: true,
      });
      expect(mockedFs.writeFileSync).toHaveBeenCalledWith(path.join(basePath, key), buffer);
    });

    it('should create nested directories if needed', async () => {
      mockedFs.existsSync.mockReturnValue(false);
      const buffer = Buffer.from('data');
      const key = 'org-1/sub/deep/file.pdf';

      await provider.upload(key, buffer, 'application/pdf');

      expect(mockedFs.mkdirSync).toHaveBeenCalledWith(path.join(basePath, 'org-1/sub/deep'), {
        recursive: true,
      });
    });
  });

  // ===========================================
  // DOWNLOAD
  // ===========================================

  describe('download', () => {
    it('should read file from disk and return Buffer', async () => {
      const content = Buffer.from('file content');
      mockedFs.readFileSync.mockReturnValue(content);

      const result = await provider.download('org-1/file.txt');

      expect(result).toEqual(content);
      expect(mockedFs.readFileSync).toHaveBeenCalledWith(path.join(basePath, 'org-1/file.txt'));
    });
  });

  // ===========================================
  // DELETE
  // ===========================================

  describe('delete', () => {
    it('should remove file from disk', async () => {
      mockedFs.existsSync.mockReturnValue(true);

      await provider.delete('org-1/file.txt');

      expect(mockedFs.unlinkSync).toHaveBeenCalledWith(path.join(basePath, 'org-1/file.txt'));
    });

    it('should not throw if file does not exist', async () => {
      mockedFs.existsSync.mockReturnValue(false);

      await expect(provider.delete('nonexistent.txt')).resolves.not.toThrow();
      expect(mockedFs.unlinkSync).not.toHaveBeenCalled();
    });
  });

  // ===========================================
  // EXISTS
  // ===========================================

  describe('exists', () => {
    it('should return true when file exists', async () => {
      mockedFs.existsSync.mockReturnValue(true);

      const result = await provider.exists('org-1/file.txt');

      expect(result).toBe(true);
      expect(mockedFs.existsSync).toHaveBeenCalledWith(path.join(basePath, 'org-1/file.txt'));
    });

    it('should return false when file does not exist', async () => {
      mockedFs.existsSync.mockReturnValue(false);

      const result = await provider.exists('nonexistent.txt');

      expect(result).toBe(false);
    });
  });

  // ===========================================
  // GET URL
  // ===========================================

  describe('getUrl', () => {
    it('should return public URL path', async () => {
      const url = await provider.getUrl('org-1/file.txt');

      expect(url).toBe('/uploads/org-1/file.txt');
    });
  });

  // ===========================================
  // TEST CONNECTION
  // ===========================================

  describe('testConnection', () => {
    it('should succeed when directory exists and is writable', async () => {
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.accessSync.mockReturnValue(undefined);

      const result = await provider.testConnection();

      expect(result).toEqual({
        success: true,
        message: 'Local storage is accessible and writable',
      });
    });

    it('should create directory if it does not exist', async () => {
      mockedFs.existsSync.mockReturnValue(false);
      mockedFs.accessSync.mockReturnValue(undefined);

      const result = await provider.testConnection();

      expect(mockedFs.mkdirSync).toHaveBeenCalledWith(basePath, { recursive: true });
      expect(result.success).toBe(true);
    });

    it('should fail when directory is not writable', async () => {
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.accessSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      const result = await provider.testConnection();

      expect(result.success).toBe(false);
      expect(result.message).toContain('Permission denied');
    });
  });
});
