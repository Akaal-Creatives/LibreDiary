import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { constants } from 'node:fs';
import { LocalBackupStorage } from '../local-backup-storage.js';

// Mock the entire node:fs module, preserving constants and other non-function exports
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
    readdirSync: vi.fn(),
  };
});

const mockedFs = vi.mocked(fs);

describe('LocalBackupStorage', () => {
  const basePath = '/tmp/test-backups';
  let storage: LocalBackupStorage;

  beforeEach(() => {
    vi.clearAllMocks();
    storage = new LocalBackupStorage(basePath);
  });

  // ===========================================
  // UPLOAD
  // ===========================================

  describe('upload', () => {
    it('should write file data to the correct path and return the key', async () => {
      const data = Buffer.from('backup content');
      const key = 'daily/backup-2024-06-15.tar.gz';

      const result = await storage.upload(key, data);

      expect(result).toBe(key);
      expect(mockedFs.writeFileSync).toHaveBeenCalledWith(path.resolve(basePath, key), data);
    });

    it('should create parent directories recursively before writing', async () => {
      const data = Buffer.from('nested backup');
      const key = 'org/tenant-1/weekly/backup.tar.gz';

      await storage.upload(key, data);

      expect(mockedFs.mkdirSync).toHaveBeenCalledWith(path.dirname(path.resolve(basePath, key)), {
        recursive: true,
      });
      // Ensure mkdir is called before writeFile
      const mkdirOrder = mockedFs.mkdirSync.mock.invocationCallOrder[0];
      const writeOrder = mockedFs.writeFileSync.mock.invocationCallOrder[0];
      expect(mkdirOrder).toBeLessThan(writeOrder);
    });

    it('should handle a key with no subdirectory', async () => {
      const data = Buffer.from('root-level backup');
      const key = 'backup.tar.gz';

      const result = await storage.upload(key, data);

      expect(result).toBe(key);
      expect(mockedFs.mkdirSync).toHaveBeenCalledWith(path.dirname(path.resolve(basePath, key)), {
        recursive: true,
      });
      expect(mockedFs.writeFileSync).toHaveBeenCalledWith(path.resolve(basePath, key), data);
    });

    it('should reject keys that attempt directory traversal', async () => {
      const data = Buffer.from('malicious payload');

      await expect(storage.upload('../../../etc/passwd', data)).rejects.toThrow(
        'Invalid storage key: path traversal detected'
      );

      expect(mockedFs.mkdirSync).not.toHaveBeenCalled();
      expect(mockedFs.writeFileSync).not.toHaveBeenCalled();
    });
  });

  // ===========================================
  // DOWNLOAD
  // ===========================================

  describe('download', () => {
    it('should read the file and return its contents as a Buffer', async () => {
      const content = Buffer.from('downloaded backup data');
      mockedFs.readFileSync.mockReturnValue(content);

      const result = await storage.download('system/backup.tar.gz');

      expect(result).toEqual(content);
      expect(mockedFs.readFileSync).toHaveBeenCalledWith(
        path.resolve(basePath, 'system/backup.tar.gz')
      );
    });

    it('should propagate errors when the file does not exist', async () => {
      mockedFs.readFileSync.mockImplementation(() => {
        throw new Error('ENOENT: no such file or directory');
      });

      await expect(storage.download('missing/backup.tar.gz')).rejects.toThrow('ENOENT');
    });

    it('should reject keys that attempt directory traversal', async () => {
      await expect(storage.download('../../sensitive-file.txt')).rejects.toThrow(
        'Invalid storage key: path traversal detected'
      );

      expect(mockedFs.readFileSync).not.toHaveBeenCalled();
    });
  });

  // ===========================================
  // DELETE
  // ===========================================

  describe('delete', () => {
    it('should remove the file when it exists on disc', async () => {
      mockedFs.existsSync.mockReturnValue(true);

      await storage.delete('system/old-backup.tar.gz');

      expect(mockedFs.existsSync).toHaveBeenCalledWith(
        path.resolve(basePath, 'system/old-backup.tar.gz')
      );
      expect(mockedFs.unlinkSync).toHaveBeenCalledWith(
        path.resolve(basePath, 'system/old-backup.tar.gz')
      );
    });

    it('should do nothing when the file does not exist', async () => {
      mockedFs.existsSync.mockReturnValue(false);

      await expect(storage.delete('nonexistent.tar.gz')).resolves.not.toThrow();

      expect(mockedFs.unlinkSync).not.toHaveBeenCalled();
    });

    it('should reject keys that attempt directory traversal', async () => {
      await expect(storage.delete('../../../etc/shadow')).rejects.toThrow(
        'Invalid storage key: path traversal detected'
      );

      expect(mockedFs.existsSync).not.toHaveBeenCalled();
      expect(mockedFs.unlinkSync).not.toHaveBeenCalled();
    });
  });

  // ===========================================
  // EXISTS
  // ===========================================

  describe('exists', () => {
    it('should return true when the file exists', async () => {
      mockedFs.existsSync.mockReturnValue(true);

      const result = await storage.exists('system/backup.tar.gz');

      expect(result).toBe(true);
      expect(mockedFs.existsSync).toHaveBeenCalledWith(
        path.resolve(basePath, 'system/backup.tar.gz')
      );
    });

    it('should return false when the file does not exist', async () => {
      mockedFs.existsSync.mockReturnValue(false);

      const result = await storage.exists('nonexistent.tar.gz');

      expect(result).toBe(false);
    });

    it('should reject keys that attempt directory traversal', async () => {
      await expect(storage.exists('../../../etc/passwd')).rejects.toThrow(
        'Invalid storage key: path traversal detected'
      );
    });
  });

  // ===========================================
  // GET DOWNLOAD URL
  // ===========================================

  describe('getDownloadUrl', () => {
    it('should return /backups/{key} for a given key', async () => {
      const key = 'system/backup-2024-01-01.tar.gz';

      const url = await storage.getDownloadUrl(key);

      expect(url).toBe('/backups/system/backup-2024-01-01.tar.gz');
    });

    it('should return correct URL for a key without subdirectory', async () => {
      const key = 'backup.tar.gz';

      const url = await storage.getDownloadUrl(key);

      expect(url).toBe('/backups/backup.tar.gz');
    });

    it('should return correct URL for deeply nested keys', async () => {
      const key = 'org/tenant/daily/2024/01/backup.tar.gz';

      const url = await storage.getDownloadUrl(key);

      expect(url).toBe('/backups/org/tenant/daily/2024/01/backup.tar.gz');
    });
  });

  // ===========================================
  // TEST CONNECTION
  // ===========================================

  describe('testConnection', () => {
    it('should return success when the directory exists and is writable', async () => {
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.accessSync.mockReturnValue(undefined);

      const result = await storage.testConnection();

      expect(result).toEqual({
        success: true,
        message: 'Local backup storage is accessible and writable',
      });
      expect(mockedFs.accessSync).toHaveBeenCalledWith(basePath, constants.W_OK);
    });

    it('should create the directory when it does not exist', async () => {
      mockedFs.existsSync.mockReturnValue(false);
      mockedFs.accessSync.mockReturnValue(undefined);

      const result = await storage.testConnection();

      expect(mockedFs.mkdirSync).toHaveBeenCalledWith(basePath, { recursive: true });
      expect(result.success).toBe(true);
    });

    it('should return failure when the directory is not writable', async () => {
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.accessSync.mockImplementation(() => {
        throw new Error('EACCES: permission denied');
      });

      const result = await storage.testConnection();

      expect(result).toEqual({
        success: false,
        message: 'Local backup storage test failed: EACCES: permission denied',
      });
    });

    it('should return failure when directory creation itself fails', async () => {
      mockedFs.existsSync.mockReturnValue(false);
      mockedFs.mkdirSync.mockImplementation(() => {
        throw new Error('EACCES: permission denied, mkdir');
      });

      const result = await storage.testConnection();

      expect(result.success).toBe(false);
      expect(result.message).toContain('EACCES');
    });
  });

  // ===========================================
  // LIST KEYS
  // ===========================================

  describe('listKeys', () => {
    it('should return file names in the directory when called with a prefix', async () => {
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readdirSync.mockReturnValue([
        { name: 'backup-001.tar.gz', isFile: () => true, isDirectory: () => false },
        { name: 'backup-002.tar.gz', isFile: () => true, isDirectory: () => false },
        { name: 'backup-003.tar.gz', isFile: () => true, isDirectory: () => false },
      ] as unknown as fs.Dirent[]);

      const keys = await storage.listKeys('system');

      expect(keys).toEqual([
        'system/backup-001.tar.gz',
        'system/backup-002.tar.gz',
        'system/backup-003.tar.gz',
      ]);
      expect(mockedFs.readdirSync).toHaveBeenCalledWith(path.resolve(basePath, 'system'), {
        withFileTypes: true,
      });
    });

    it('should return file names without a prefix when called without arguments', async () => {
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readdirSync.mockReturnValue([
        { name: 'root-backup.tar.gz', isFile: () => true, isDirectory: () => false },
      ] as unknown as fs.Dirent[]);

      const keys = await storage.listKeys();

      expect(keys).toEqual(['root-backup.tar.gz']);
      expect(mockedFs.readdirSync).toHaveBeenCalledWith(basePath, { withFileTypes: true });
    });

    it('should return an empty array when the directory does not exist', async () => {
      mockedFs.existsSync.mockReturnValue(false);

      const keys = await storage.listKeys('nonexistent');

      expect(keys).toEqual([]);
      expect(mockedFs.readdirSync).not.toHaveBeenCalled();
    });

    it('should filter out directories and only return files', async () => {
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readdirSync.mockReturnValue([
        { name: 'backup.tar.gz', isFile: () => true, isDirectory: () => false },
        { name: 'archive-subdir', isFile: () => false, isDirectory: () => true },
        { name: 'another-backup.tar.gz', isFile: () => true, isDirectory: () => false },
      ] as unknown as fs.Dirent[]);

      const keys = await storage.listKeys('system');

      expect(keys).toEqual(['system/backup.tar.gz', 'system/another-backup.tar.gz']);
    });

    it('should return an empty array when the directory contains no files', async () => {
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readdirSync.mockReturnValue([
        { name: 'subdir-only', isFile: () => false, isDirectory: () => true },
      ] as unknown as fs.Dirent[]);

      const keys = await storage.listKeys('system');

      expect(keys).toEqual([]);
    });

    it('should reject prefixes that attempt directory traversal', async () => {
      await expect(storage.listKeys('../../etc')).rejects.toThrow(
        'Invalid storage key: path traversal detected'
      );

      expect(mockedFs.readdirSync).not.toHaveBeenCalled();
    });
  });

  // ===========================================
  // SAFE PATH (directory traversal prevention)
  // ===========================================

  describe('safePath (path traversal prevention)', () => {
    it('should reject keys starting with ../', async () => {
      await expect(storage.upload('../outside.txt', Buffer.from('data'))).rejects.toThrow(
        'Invalid storage key: path traversal detected'
      );
    });

    it('should reject keys containing /../ in the middle', async () => {
      await expect(storage.download('valid/../../outside.txt')).rejects.toThrow(
        'Invalid storage key: path traversal detected'
      );
    });

    it('should reject absolute path keys that escape the base directory', async () => {
      await expect(storage.exists('/etc/passwd')).rejects.toThrow(
        'Invalid storage key: path traversal detected'
      );
    });

    it('should reject multiple levels of traversal', async () => {
      await expect(storage.delete('../../../../../../../etc/shadow')).rejects.toThrow(
        'Invalid storage key: path traversal detected'
      );
    });

    it('should allow keys within the base directory hierarchy', async () => {
      mockedFs.existsSync.mockReturnValue(true);

      // This should not throw - it is a valid nested key
      const result = await storage.exists('org/tenant/backups/file.tar.gz');

      expect(result).toBe(true);
    });

    it('should allow simple file names without subdirectories', async () => {
      mockedFs.existsSync.mockReturnValue(false);

      const result = await storage.exists('simple-file.tar.gz');

      expect(result).toBe(false);
    });
  });
});
