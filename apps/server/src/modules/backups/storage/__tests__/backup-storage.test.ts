import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { LocalBackupStorage } from '../local-backup-storage.js';

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
  let provider: LocalBackupStorage;

  beforeEach(() => {
    vi.clearAllMocks();
    provider = new LocalBackupStorage(basePath);
  });

  // ===========================================
  // UPLOAD
  // ===========================================

  describe('upload', () => {
    it('should write data to disk and return key', async () => {
      const data = Buffer.from('backup content');
      const key = 'system/backup-2024-01-01.tar.gz';

      const storagePath = await provider.upload(key, data);

      expect(storagePath).toBe(key);
      expect(mockedFs.mkdirSync).toHaveBeenCalledWith(path.join(basePath, 'system'), {
        recursive: true,
      });
      expect(mockedFs.writeFileSync).toHaveBeenCalledWith(path.join(basePath, key), data);
    });
  });

  // ===========================================
  // DOWNLOAD
  // ===========================================

  describe('download', () => {
    it('should read data from disk', async () => {
      const content = Buffer.from('backup data');
      mockedFs.readFileSync.mockReturnValue(content);

      const result = await provider.download('system/backup.tar.gz');

      expect(result).toEqual(content);
      expect(mockedFs.readFileSync).toHaveBeenCalledWith(
        path.join(basePath, 'system/backup.tar.gz')
      );
    });
  });

  // ===========================================
  // DELETE
  // ===========================================

  describe('delete', () => {
    it('should remove file from disk', async () => {
      mockedFs.existsSync.mockReturnValue(true);

      await provider.delete('system/backup.tar.gz');

      expect(mockedFs.unlinkSync).toHaveBeenCalledWith(path.join(basePath, 'system/backup.tar.gz'));
    });

    it('should not throw if file does not exist', async () => {
      mockedFs.existsSync.mockReturnValue(false);

      await expect(provider.delete('nonexistent.tar.gz')).resolves.not.toThrow();
      expect(mockedFs.unlinkSync).not.toHaveBeenCalled();
    });
  });

  // ===========================================
  // EXISTS
  // ===========================================

  describe('exists', () => {
    it('should return true when file exists', async () => {
      mockedFs.existsSync.mockReturnValue(true);

      const result = await provider.exists('system/backup.tar.gz');

      expect(result).toBe(true);
    });

    it('should return false when file does not exist', async () => {
      mockedFs.existsSync.mockReturnValue(false);

      const result = await provider.exists('nonexistent.tar.gz');

      expect(result).toBe(false);
    });
  });

  // ===========================================
  // LIST KEYS
  // ===========================================

  describe('listKeys', () => {
    it('should list files in directory', async () => {
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readdirSync.mockReturnValue([
        { name: 'backup1.tar.gz', isFile: () => true, isDirectory: () => false },
        { name: 'backup2.tar.gz', isFile: () => true, isDirectory: () => false },
      ] as unknown as fs.Dirent[]);

      const keys = await provider.listKeys('system');

      expect(keys).toEqual(['system/backup1.tar.gz', 'system/backup2.tar.gz']);
    });

    it('should return empty array when directory does not exist', async () => {
      mockedFs.existsSync.mockReturnValue(false);

      const keys = await provider.listKeys('nonexistent');

      expect(keys).toEqual([]);
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
        message: 'Local backup storage is accessible and writable',
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
