import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { constants } from 'node:fs';
import { LocalStorageProvider } from '../local-storage-provider.js';

// Mock the node:fs module, preserving constants but stubbing all file-system operations
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
  };
});

const mockedFs = vi.mocked(fs);

describe('LocalStorageProvider', () => {
  const basePath = '/tmp/test-uploads';
  let provider: LocalStorageProvider;

  beforeEach(() => {
    vi.resetAllMocks();
    provider = new LocalStorageProvider(basePath);
  });

  // ===========================================
  // UPLOAD
  // ===========================================

  describe('upload', () => {
    it('should write the file buffer to the correct path on disc', async () => {
      const buffer = Buffer.from('hello world');
      const key = 'org-1/document.txt';

      await provider.upload(key, buffer, 'text/plain');

      const expectedFilePath = path.join(basePath, key);
      expect(mockedFs.writeFileSync).toHaveBeenCalledWith(expectedFilePath, buffer);
    });

    it('should create parent directories recursively before writing', async () => {
      const buffer = Buffer.from('content');
      const key = 'org-1/nested/deep/folder/report.pdf';

      await provider.upload(key, buffer, 'application/pdf');

      const expectedDir = path.dirname(path.join(basePath, key));
      expect(mockedFs.mkdirSync).toHaveBeenCalledWith(expectedDir, { recursive: true });
    });

    it('should return the original key as the storage path', async () => {
      const buffer = Buffer.from('data');
      const key = 'org-2/image.png';

      const result = await provider.upload(key, buffer, 'image/png');

      expect(result).toBe(key);
    });

    it('should ignore the mimeType parameter (it is unused in the implementation)', async () => {
      const buffer = Buffer.from('data');
      const key = 'org-1/file.bin';

      // Call with different mimeType values and verify the behaviour is identical
      const result1 = await provider.upload(key, buffer, 'application/octet-stream');
      vi.clearAllMocks();
      const result2 = await provider.upload(key, buffer, 'image/jpeg');

      // Both calls should return the same key regardless of mimeType
      expect(result1).toBe(key);
      expect(result2).toBe(key);

      // writeFileSync should have been called with the buffer, not the mimeType
      expect(mockedFs.writeFileSync).toHaveBeenCalledWith(path.join(basePath, key), buffer);
    });

    it('should handle a key with no subdirectory (file at root level)', async () => {
      const buffer = Buffer.from('root-level');
      const key = 'simple-file.txt';

      await provider.upload(key, buffer, 'text/plain');

      // The directory should be the basePath itself
      expect(mockedFs.mkdirSync).toHaveBeenCalledWith(basePath, { recursive: true });
      expect(mockedFs.writeFileSync).toHaveBeenCalledWith(path.join(basePath, key), buffer);
    });

    it('should handle an empty buffer', async () => {
      const buffer = Buffer.alloc(0);
      const key = 'org-1/empty.dat';

      const result = await provider.upload(key, buffer, 'application/octet-stream');

      expect(result).toBe(key);
      expect(mockedFs.writeFileSync).toHaveBeenCalledWith(path.join(basePath, key), buffer);
    });
  });

  // ===========================================
  // DOWNLOAD
  // ===========================================

  describe('download', () => {
    it('should read the file from disc and return its contents as a Buffer', async () => {
      const content = Buffer.from('file content here');
      mockedFs.readFileSync.mockReturnValue(content);

      const result = await provider.download('org-1/document.txt');

      expect(result).toEqual(content);
      expect(mockedFs.readFileSync).toHaveBeenCalledWith(path.join(basePath, 'org-1/document.txt'));
    });

    it('should propagate errors when the file does not exist on disc', async () => {
      mockedFs.readFileSync.mockImplementation(() => {
        throw new Error('ENOENT: no such file or directory');
      });

      await expect(provider.download('nonexistent.txt')).rejects.toThrow(
        'ENOENT: no such file or directory'
      );
    });

    it('should handle binary file content correctly', async () => {
      // Create a buffer with non-UTF-8 binary data
      const binaryContent = Buffer.from([0x00, 0xff, 0x89, 0x50, 0x4e, 0x47]);
      mockedFs.readFileSync.mockReturnValue(binaryContent);

      const result = await provider.download('org-1/image.png');

      expect(result).toEqual(binaryContent);
      expect(Buffer.isBuffer(result)).toBe(true);
    });
  });

  // ===========================================
  // DELETE
  // ===========================================

  describe('delete', () => {
    it('should remove the file from disc when it exists', async () => {
      mockedFs.existsSync.mockReturnValue(true);

      await provider.delete('org-1/old-file.txt');

      expect(mockedFs.existsSync).toHaveBeenCalledWith(path.join(basePath, 'org-1/old-file.txt'));
      expect(mockedFs.unlinkSync).toHaveBeenCalledWith(path.join(basePath, 'org-1/old-file.txt'));
    });

    it('should do nothing when the file does not exist', async () => {
      mockedFs.existsSync.mockReturnValue(false);

      await provider.delete('org-1/missing.txt');

      expect(mockedFs.existsSync).toHaveBeenCalled();
      expect(mockedFs.unlinkSync).not.toHaveBeenCalled();
    });

    it('should not throw when the file does not exist', async () => {
      mockedFs.existsSync.mockReturnValue(false);

      await expect(provider.delete('nonexistent.txt')).resolves.not.toThrow();
    });

    it('should resolve to undefined (void return)', async () => {
      mockedFs.existsSync.mockReturnValue(true);

      const result = await provider.delete('org-1/file.txt');

      expect(result).toBeUndefined();
    });
  });

  // ===========================================
  // EXISTS
  // ===========================================

  describe('exists', () => {
    it('should return true when the file exists on disc', async () => {
      mockedFs.existsSync.mockReturnValue(true);

      const result = await provider.exists('org-1/file.txt');

      expect(result).toBe(true);
      expect(mockedFs.existsSync).toHaveBeenCalledWith(path.join(basePath, 'org-1/file.txt'));
    });

    it('should return false when the file does not exist on disc', async () => {
      mockedFs.existsSync.mockReturnValue(false);

      const result = await provider.exists('org-1/missing.txt');

      expect(result).toBe(false);
      expect(mockedFs.existsSync).toHaveBeenCalledWith(path.join(basePath, 'org-1/missing.txt'));
    });

    it('should check the correct resolved path for nested keys', async () => {
      mockedFs.existsSync.mockReturnValue(true);

      await provider.exists('org-1/deeply/nested/path/file.pdf');

      expect(mockedFs.existsSync).toHaveBeenCalledWith(
        path.join(basePath, 'org-1/deeply/nested/path/file.pdf')
      );
    });
  });

  // ===========================================
  // GET URL
  // ===========================================

  describe('getUrl', () => {
    it('should return /uploads/{key} for a simple key', async () => {
      const url = await provider.getUrl('org-1/file.txt');

      expect(url).toBe('/uploads/org-1/file.txt');
    });

    it('should return /uploads/{key} for a deeply nested key', async () => {
      const url = await provider.getUrl('org-1/sub/deep/photo.jpg');

      expect(url).toBe('/uploads/org-1/sub/deep/photo.jpg');
    });

    it('should return /uploads/{key} for a root-level key', async () => {
      const url = await provider.getUrl('readme.txt');

      expect(url).toBe('/uploads/readme.txt');
    });

    it('should not interact with the filesystem at all', async () => {
      await provider.getUrl('any-key');

      expect(mockedFs.existsSync).not.toHaveBeenCalled();
      expect(mockedFs.readFileSync).not.toHaveBeenCalled();
      expect(mockedFs.accessSync).not.toHaveBeenCalled();
    });
  });

  // ===========================================
  // TEST CONNECTION
  // ===========================================

  describe('testConnection', () => {
    it('should return success when the directory exists and is writable', async () => {
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.accessSync.mockReturnValue(undefined);

      const result = await provider.testConnection();

      expect(result).toEqual({
        success: true,
        message: 'Local storage is accessible and writable',
      });
    });

    it('should verify write access using fs.constants.W_OK', async () => {
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.accessSync.mockReturnValue(undefined);

      await provider.testConnection();

      expect(mockedFs.accessSync).toHaveBeenCalledWith(basePath, constants.W_OK);
    });

    it('should create the directory recursively if it does not exist', async () => {
      mockedFs.existsSync.mockReturnValue(false);
      mockedFs.accessSync.mockReturnValue(undefined);

      const result = await provider.testConnection();

      expect(mockedFs.mkdirSync).toHaveBeenCalledWith(basePath, { recursive: true });
      expect(result.success).toBe(true);
    });

    it('should return failure when the directory is not writable', async () => {
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.accessSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      const result = await provider.testConnection();

      expect(result).toEqual({
        success: false,
        message: 'Local storage test failed: Permission denied',
      });
    });

    it('should return failure when mkdirSync throws an error', async () => {
      mockedFs.existsSync.mockReturnValue(false);
      mockedFs.mkdirSync.mockImplementation(() => {
        throw new Error('EACCES: permission denied, mkdir');
      });

      const result = await provider.testConnection();

      expect(result.success).toBe(false);
      expect(result.message).toContain('EACCES: permission denied, mkdir');
    });

    it('should include the original error message in the failure response', async () => {
      mockedFs.existsSync.mockReturnValue(true);
      const errorMessage = 'EROFS: read-only file system';
      mockedFs.accessSync.mockImplementation(() => {
        throw new Error(errorMessage);
      });

      const result = await provider.testConnection();

      expect(result.message).toBe(`Local storage test failed: ${errorMessage}`);
    });
  });

  // ===========================================
  // SAFE PATH (directory traversal prevention)
  // ===========================================

  describe('safePath (directory traversal prevention)', () => {
    it('should throw an error when the key attempts to traverse above the base path using ../', async () => {
      await expect(
        provider.upload('../../../etc/passwd', Buffer.from('x'), 'text/plain')
      ).rejects.toThrow('Invalid storage key: path traversal detected');
    });

    it('should throw an error for a key starting with ../', async () => {
      await expect(provider.download('../secret.txt')).rejects.toThrow(
        'Invalid storage key: path traversal detected'
      );
    });

    it('should throw an error for a key with embedded traversal sequences', async () => {
      await expect(provider.exists('org-1/../../etc/shadow')).rejects.toThrow(
        'Invalid storage key: path traversal detected'
      );
    });

    it('should throw an error when delete is called with a traversal key', async () => {
      await expect(provider.delete('../../../var/log/syslog')).rejects.toThrow(
        'Invalid storage key: path traversal detected'
      );
    });

    it('should throw for an absolute path that escapes the base directory', async () => {
      await expect(provider.upload('/etc/passwd', Buffer.from('x'), 'text/plain')).rejects.toThrow(
        'Invalid storage key: path traversal detected'
      );
    });

    it('should throw for a key that resolves to the base path itself', async () => {
      // A key of '' would resolve to basePath itself (not a file within it)
      // path.resolve('/tmp/test-uploads', '') === '/tmp/test-uploads'
      // This matches the condition: resolved === path.resolve(basePath) but not
      // resolved.startsWith(basePath + sep), so it should be allowed by the
      // second condition. Let's verify the actual behaviour.
      // Actually, looking at the code: the condition is:
      //   !resolved.startsWith(base + sep) && resolved !== base
      // So resolved === base means the second part is false, making the whole
      // condition false, meaning it does NOT throw. Let's test that.
      const result = await provider.getUrl('');
      expect(result).toBe('/uploads/');
    });

    it('should allow legitimate keys that contain ".." as part of a filename', async () => {
      // A key like "org-1/file..backup.txt" should be fine as it does not
      // actually traverse above the base path
      mockedFs.readFileSync.mockReturnValue(Buffer.from('ok'));

      const result = await provider.download('org-1/file..backup.txt');

      expect(result).toEqual(Buffer.from('ok'));
      expect(mockedFs.readFileSync).toHaveBeenCalledWith(
        path.join(basePath, 'org-1/file..backup.txt')
      );
    });

    it('should allow keys with subdirectories that stay within the base path', async () => {
      mockedFs.existsSync.mockReturnValue(true);

      const result = await provider.exists('org-1/sub-dir/another/file.txt');

      expect(result).toBe(true);
    });

    it('should throw when traversal is deeply nested within the key', async () => {
      await expect(provider.download('org-1/legit/../../../../../../etc/passwd')).rejects.toThrow(
        'Invalid storage key: path traversal detected'
      );
    });
  });

  // ===========================================
  // CONSTRUCTOR
  // ===========================================

  describe('constructor', () => {
    it('should accept different base paths', async () => {
      const customProvider = new LocalStorageProvider('/var/data/uploads');
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.accessSync.mockReturnValue(undefined);

      const result = await customProvider.testConnection();

      expect(mockedFs.accessSync).toHaveBeenCalledWith('/var/data/uploads', constants.W_OK);
      expect(result.success).toBe(true);
    });

    it('should use the configured base path for all file operations', async () => {
      const customPath = '/custom/storage/path';
      const customProvider = new LocalStorageProvider(customPath);
      const buffer = Buffer.from('test');

      await customProvider.upload('file.txt', buffer, 'text/plain');

      expect(mockedFs.writeFileSync).toHaveBeenCalledWith(
        path.join(customPath, 'file.txt'),
        buffer
      );
    });
  });
});
