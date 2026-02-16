import { describe, it, expect, vi, beforeEach } from 'vitest';

// Hoist the mock send function so it is available to the mock factory
const mockSend = vi.hoisted(() => vi.fn());

vi.mock('@aws-sdk/client-s3', () => {
  // Use a real class so `new S3Client(...)` works as a constructor
  class MockS3Client {
    send = mockSend;
    config: unknown;
    constructor(config: unknown) {
      this.config = config;
      // Record the call so we can assert on it
      MockS3Client.lastConfig = config;
    }
    static lastConfig: unknown = null;
  }

  return {
    S3Client: MockS3Client,
    PutObjectCommand: vi.fn(),
    GetObjectCommand: vi.fn(),
    DeleteObjectCommand: vi.fn(),
    HeadObjectCommand: vi.fn(),
    ListObjectsV2Command: vi.fn(),
    HeadBucketCommand: vi.fn(),
  };
});

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  HeadBucketCommand,
} from '@aws-sdk/client-s3';
import { S3BackupStorage } from '../s3-backup-storage.js';

describe('S3BackupStorage', () => {
  const defaultConfig = {
    bucket: 'test-backup-bucket',
    accessKeyId: 'AKIAIOSFODNN7EXAMPLE',
    secretAccessKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
  };

  let provider: S3BackupStorage;

  beforeEach(() => {
    vi.clearAllMocks();
    (S3Client as unknown as { lastConfig: unknown }).lastConfig = null;
    provider = new S3BackupStorage(defaultConfig);
  });

  // ===========================================
  // CONSTRUCTOR
  // ===========================================

  describe('constructor', () => {
    it('should create S3Client with the correct configuration', () => {
      const config = {
        ...defaultConfig,
        endpoint: 'https://s3.custom-endpoint.example.com',
        region: 'eu-west-2',
      };

      new S3BackupStorage(config);

      expect((S3Client as unknown as { lastConfig: unknown }).lastConfig).toEqual({
        endpoint: 'https://s3.custom-endpoint.example.com',
        region: 'eu-west-2',
        credentials: {
          accessKeyId: config.accessKeyId,
          secretAccessKey: config.secretAccessKey,
        },
        forcePathStyle: true,
      });
    });

    it('should default the region to us-east-1 when not provided', () => {
      new S3BackupStorage(defaultConfig);

      expect((S3Client as unknown as { lastConfig: unknown }).lastConfig.region).toBe('us-east-1');
    });

    it('should pass endpoint as undefined when not provided', () => {
      new S3BackupStorage(defaultConfig);

      expect((S3Client as unknown as { lastConfig: unknown }).lastConfig.endpoint).toBeUndefined();
    });

    it('should always enable forcePathStyle', () => {
      new S3BackupStorage(defaultConfig);

      expect((S3Client as unknown as { lastConfig: unknown }).lastConfig.forcePathStyle).toBe(true);
    });
  });

  // ===========================================
  // UPLOAD
  // ===========================================

  describe('upload', () => {
    it('should send PutObjectCommand with correct bucket, key, body, and content type', async () => {
      const data = Buffer.from('encrypted backup data');
      const key = 'system/backup-2024-01-15.tar.gz.enc';

      mockSend.mockResolvedValue({});

      const result = await provider.upload(key, data);

      expect(PutObjectCommand).toHaveBeenCalledWith({
        Bucket: defaultConfig.bucket,
        Key: key,
        Body: data,
        ContentType: 'application/octet-stream',
      });
      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(result).toBe(key);
    });

    it('should return the key as the storage path', async () => {
      mockSend.mockResolvedValue({});

      const key = 'daily/2024-06-01.tar.gz';
      const result = await provider.upload(key, Buffer.from('data'));

      expect(result).toBe(key);
    });

    it('should propagate errors from S3 on upload failure', async () => {
      mockSend.mockRejectedValue(new Error('Access Denied'));

      await expect(provider.upload('test-key', Buffer.from('data'))).rejects.toThrow(
        'Access Denied'
      );
    });
  });

  // ===========================================
  // DOWNLOAD
  // ===========================================

  describe('download', () => {
    function createMockBody(chunks: Uint8Array[]): AsyncIterable<Uint8Array> {
      return {
        async *[Symbol.asyncIterator]() {
          for (const chunk of chunks) {
            yield chunk;
          }
        },
      };
    }

    it('should send GetObjectCommand and return the collected body as a Buffer', async () => {
      const chunk1 = new Uint8Array([72, 101, 108, 108, 111]); // "Hello"
      const chunk2 = new Uint8Array([32, 87, 111, 114, 108, 100]); // " World"
      const key = 'system/backup.tar.gz';

      mockSend.mockResolvedValue({
        Body: createMockBody([chunk1, chunk2]),
      });

      const result = await provider.download(key);

      expect(GetObjectCommand).toHaveBeenCalledWith({
        Bucket: defaultConfig.bucket,
        Key: key,
      });
      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(result).toBeInstanceOf(Buffer);
      expect(result.toString()).toBe('Hello World');
    });

    it('should handle a single chunk body correctly', async () => {
      const content = Buffer.from('single chunk backup content');

      mockSend.mockResolvedValue({
        Body: createMockBody([new Uint8Array(content)]),
      });

      const result = await provider.download('key.tar.gz');

      expect(result.toString()).toBe('single chunk backup content');
    });

    it('should throw an error when the response body is null', async () => {
      mockSend.mockResolvedValue({ Body: null });

      await expect(provider.download('missing-body.tar.gz')).rejects.toThrow(
        'Empty response body from S3'
      );
    });

    it('should throw an error when the response body is undefined', async () => {
      mockSend.mockResolvedValue({ Body: undefined });

      await expect(provider.download('no-body.tar.gz')).rejects.toThrow(
        'Empty response body from S3'
      );
    });

    it('should propagate errors from S3 on download failure', async () => {
      mockSend.mockRejectedValue(new Error('NoSuchKey'));

      await expect(provider.download('nonexistent.tar.gz')).rejects.toThrow('NoSuchKey');
    });
  });

  // ===========================================
  // DELETE
  // ===========================================

  describe('delete', () => {
    it('should send DeleteObjectCommand with the correct bucket and key', async () => {
      const key = 'system/old-backup.tar.gz';
      mockSend.mockResolvedValue({});

      await provider.delete(key);

      expect(DeleteObjectCommand).toHaveBeenCalledWith({
        Bucket: defaultConfig.bucket,
        Key: key,
      });
      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it('should propagate errors from S3 on deletion failure', async () => {
      mockSend.mockRejectedValue(new Error('Access Denied'));

      await expect(provider.delete('protected-key')).rejects.toThrow('Access Denied');
    });
  });

  // ===========================================
  // EXISTS
  // ===========================================

  describe('exists', () => {
    it('should return true when HeadObjectCommand succeeds', async () => {
      const key = 'system/backup-exists.tar.gz';
      mockSend.mockResolvedValue({});

      const result = await provider.exists(key);

      expect(HeadObjectCommand).toHaveBeenCalledWith({
        Bucket: defaultConfig.bucket,
        Key: key,
      });
      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(result).toBe(true);
    });

    it('should return false when HeadObjectCommand throws an error', async () => {
      mockSend.mockRejectedValue(new Error('NotFound'));

      const result = await provider.exists('nonexistent-key.tar.gz');

      expect(result).toBe(false);
    });

    it('should return false for any type of S3 error', async () => {
      mockSend.mockRejectedValue(new Error('Access Denied'));

      const result = await provider.exists('forbidden-key.tar.gz');

      expect(result).toBe(false);
    });
  });

  // ===========================================
  // GET DOWNLOAD URL
  // ===========================================

  describe('getDownloadUrl', () => {
    it('should return an s3:// URI with the bucket and key', async () => {
      const key = 'system/backup-2024-03-20.tar.gz';

      const url = await provider.getDownloadUrl(key);

      expect(url).toBe(`s3://${defaultConfig.bucket}/${key}`);
    });

    it('should handle keys with nested paths', async () => {
      const key = 'organisation/tenant-123/daily/backup.tar.gz';

      const url = await provider.getDownloadUrl(key);

      expect(url).toBe(`s3://${defaultConfig.bucket}/${key}`);
    });
  });

  // ===========================================
  // TEST CONNECTION
  // ===========================================

  describe('testConnection', () => {
    it('should return a success result when HeadBucketCommand succeeds', async () => {
      mockSend.mockResolvedValue({});

      const result = await provider.testConnection();

      expect(HeadBucketCommand).toHaveBeenCalledWith({
        Bucket: defaultConfig.bucket,
      });
      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        success: true,
        message: 'S3 backup storage connection successful',
      });
    });

    it('should return a failure result when HeadBucketCommand throws an error', async () => {
      mockSend.mockRejectedValue(new Error('Bucket not found'));

      const result = await provider.testConnection();

      expect(result).toEqual({
        success: false,
        message: 'S3 backup storage test failed: Bucket not found',
      });
    });

    it('should include the original error message in the failure result', async () => {
      mockSend.mockRejectedValue(new Error('Access Denied'));

      const result = await provider.testConnection();

      expect(result.success).toBe(false);
      expect(result.message).toContain('Access Denied');
    });
  });

  // ===========================================
  // LIST KEYS
  // ===========================================

  describe('listKeys', () => {
    it('should send ListObjectsV2Command with the prefix and return keys', async () => {
      const prefix = 'system/';
      mockSend.mockResolvedValue({
        Contents: [
          { Key: 'system/backup-001.tar.gz' },
          { Key: 'system/backup-002.tar.gz' },
          { Key: 'system/backup-003.tar.gz' },
        ],
      });

      const keys = await provider.listKeys(prefix);

      expect(ListObjectsV2Command).toHaveBeenCalledWith({
        Bucket: defaultConfig.bucket,
        Prefix: prefix,
      });
      expect(mockSend).toHaveBeenCalledTimes(1);
      expect(keys).toEqual([
        'system/backup-001.tar.gz',
        'system/backup-002.tar.gz',
        'system/backup-003.tar.gz',
      ]);
    });

    it('should return an empty array when Contents is undefined', async () => {
      mockSend.mockResolvedValue({ Contents: undefined });

      const keys = await provider.listKeys('empty-prefix/');

      expect(keys).toEqual([]);
    });

    it('should return an empty array when Contents is an empty list', async () => {
      mockSend.mockResolvedValue({ Contents: [] });

      const keys = await provider.listKeys('no-results/');

      expect(keys).toEqual([]);
    });

    it('should call without a prefix when none is provided', async () => {
      mockSend.mockResolvedValue({
        Contents: [{ Key: 'root-backup.tar.gz' }],
      });

      const keys = await provider.listKeys();

      expect(ListObjectsV2Command).toHaveBeenCalledWith({
        Bucket: defaultConfig.bucket,
        Prefix: undefined,
      });
      expect(keys).toEqual(['root-backup.tar.gz']);
    });

    it('should filter out entries with falsy Key values', async () => {
      mockSend.mockResolvedValue({
        Contents: [{ Key: 'valid-key.tar.gz' }, { Key: '' }, { Key: 'another-valid.tar.gz' }],
      });

      const keys = await provider.listKeys();

      expect(keys).toEqual(['valid-key.tar.gz', 'another-valid.tar.gz']);
    });
  });
});
