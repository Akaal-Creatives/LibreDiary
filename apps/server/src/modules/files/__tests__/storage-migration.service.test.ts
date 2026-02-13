import { describe, it, expect, vi, beforeEach } from 'vitest';

// ======================================================
// MOCKS
// ======================================================

const { mockPrisma, mockSourceProvider, mockTargetProvider, resetMocks } = vi.hoisted(() => {
  const mockPrismaFile = {
    findMany: vi.fn(),
    update: vi.fn(),
  };

  const mockPrisma = { file: mockPrismaFile };

  const createMockProvider = () => ({
    upload: vi.fn(),
    download: vi.fn(),
    delete: vi.fn(),
    exists: vi.fn(),
    getUrl: vi.fn(),
    testConnection: vi.fn(),
  });

  const mockSourceProvider = createMockProvider();
  const mockTargetProvider = createMockProvider();

  function resetMocks() {
    Object.values(mockPrismaFile).forEach((m) => m.mockReset());
    Object.values(mockSourceProvider).forEach((m) => m.mockReset());
    Object.values(mockTargetProvider).forEach((m) => m.mockReset());
  }

  return { mockPrisma, mockSourceProvider, mockTargetProvider, resetMocks };
});

vi.mock('../../../lib/prisma.js', () => ({
  prisma: mockPrisma,
}));

vi.mock('../storage/index.js', () => ({
  createStorageProvider: vi.fn((type: string) => {
    if (type === 'LOCAL') return mockSourceProvider;
    if (type === 'S3') return mockTargetProvider;
    if (type === 'MINIO') return mockTargetProvider;
    return mockSourceProvider;
  }),
  getStorageProvider: () => mockSourceProvider,
}));

vi.mock('../../../config/index.js', () => ({
  env: {
    STORAGE_TYPE: 'LOCAL',
  },
}));

import { migrateStorage } from '../storage-migration.service.js';

// ======================================================
// HELPERS
// ======================================================

function createMockFile(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'file-1',
    organizationId: 'org-1',
    pageId: null,
    name: 'abc123.pdf',
    originalName: 'document.pdf',
    mimeType: 'application/pdf',
    size: 1024,
    storageType: 'LOCAL',
    storagePath: 'org-1/abc123.pdf',
    url: '/uploads/org-1/abc123.pdf',
    uploadedById: 'user-1',
    createdAt: new Date(),
    ...overrides,
  };
}

// ======================================================
// TESTS
// ======================================================

describe('Storage Migration Service', () => {
  beforeEach(() => {
    resetMocks();
    // Default: target provider connection succeeds
    mockTargetProvider.testConnection.mockResolvedValue({
      success: true,
      message: 'Connected',
    });
  });

  // ===========================================
  // BASIC MIGRATION
  // ===========================================

  describe('migrateStorage', () => {
    it('should migrate files from source provider to target provider', async () => {
      const file = createMockFile();
      mockPrisma.file.findMany.mockResolvedValue([file]);
      mockSourceProvider.download.mockResolvedValue(Buffer.from('pdf content'));
      mockTargetProvider.upload.mockResolvedValue('org-1/abc123.pdf');
      mockTargetProvider.getUrl.mockResolvedValue('https://s3.example.com/org-1/abc123.pdf');
      mockPrisma.file.update.mockResolvedValue({
        ...file,
        storageType: 'S3',
        url: 'https://s3.example.com/org-1/abc123.pdf',
      });

      const result = await migrateStorage({ targetType: 'S3' });

      expect(result.total).toBe(1);
      expect(result.migrated).toBe(1);
      expect(result.failed).toBe(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should download from source and upload to target provider', async () => {
      const file = createMockFile();
      const content = Buffer.from('file content');
      mockPrisma.file.findMany.mockResolvedValue([file]);
      mockSourceProvider.download.mockResolvedValue(content);
      mockTargetProvider.upload.mockResolvedValue('org-1/abc123.pdf');
      mockTargetProvider.getUrl.mockResolvedValue('https://s3.example.com/org-1/abc123.pdf');
      mockPrisma.file.update.mockResolvedValue({ ...file, storageType: 'S3' });

      await migrateStorage({ targetType: 'S3' });

      expect(mockSourceProvider.download).toHaveBeenCalledWith('org-1/abc123.pdf');
      expect(mockTargetProvider.upload).toHaveBeenCalledWith(
        'org-1/abc123.pdf',
        content,
        'application/pdf'
      );
    });

    it('should update file record with new storage type and URL', async () => {
      const file = createMockFile();
      mockPrisma.file.findMany.mockResolvedValue([file]);
      mockSourceProvider.download.mockResolvedValue(Buffer.from('content'));
      mockTargetProvider.upload.mockResolvedValue('org-1/abc123.pdf');
      mockTargetProvider.getUrl.mockResolvedValue('https://s3.example.com/org-1/abc123.pdf');
      mockPrisma.file.update.mockResolvedValue({ ...file, storageType: 'S3' });

      await migrateStorage({ targetType: 'S3' });

      expect(mockPrisma.file.update).toHaveBeenCalledWith({
        where: { id: 'file-1' },
        data: {
          storageType: 'S3',
          storagePath: 'org-1/abc123.pdf',
          url: 'https://s3.example.com/org-1/abc123.pdf',
        },
      });
    });

    it('should delete source file after successful migration', async () => {
      const file = createMockFile();
      mockPrisma.file.findMany.mockResolvedValue([file]);
      mockSourceProvider.download.mockResolvedValue(Buffer.from('content'));
      mockTargetProvider.upload.mockResolvedValue('org-1/abc123.pdf');
      mockTargetProvider.getUrl.mockResolvedValue('https://s3.example.com/org-1/abc123.pdf');
      mockPrisma.file.update.mockResolvedValue({ ...file, storageType: 'S3' });

      await migrateStorage({ targetType: 'S3' });

      expect(mockSourceProvider.delete).toHaveBeenCalledWith('org-1/abc123.pdf');
    });

    it('should only migrate files matching the current storage type', async () => {
      mockPrisma.file.findMany.mockResolvedValue([]);

      await migrateStorage({ targetType: 'S3' });

      expect(mockPrisma.file.findMany).toHaveBeenCalledWith({
        where: { storageType: 'LOCAL' },
        orderBy: { createdAt: 'asc' },
      });
    });

    it('should return zero counts when no files need migration', async () => {
      mockPrisma.file.findMany.mockResolvedValue([]);

      const result = await migrateStorage({ targetType: 'S3' });

      expect(result.total).toBe(0);
      expect(result.migrated).toBe(0);
      expect(result.failed).toBe(0);
    });

    it('should reject migration to the same storage type', async () => {
      await expect(migrateStorage({ targetType: 'LOCAL' })).rejects.toThrow(
        'Cannot migrate to the same storage type'
      );
    });
  });

  // ===========================================
  // MULTIPLE FILES
  // ===========================================

  describe('batch migration', () => {
    it('should migrate multiple files', async () => {
      const files = [
        createMockFile({ id: 'file-1', storagePath: 'org-1/a.pdf' }),
        createMockFile({ id: 'file-2', storagePath: 'org-1/b.pdf' }),
        createMockFile({ id: 'file-3', storagePath: 'org-2/c.pdf' }),
      ];
      mockPrisma.file.findMany.mockResolvedValue(files);
      mockSourceProvider.download.mockResolvedValue(Buffer.from('content'));
      mockTargetProvider.upload.mockImplementation((key: string) => Promise.resolve(key));
      mockTargetProvider.getUrl.mockImplementation((key: string) =>
        Promise.resolve(`https://s3.example.com/${key}`)
      );
      mockPrisma.file.update.mockResolvedValue({});

      const result = await migrateStorage({ targetType: 'S3' });

      expect(result.total).toBe(3);
      expect(result.migrated).toBe(3);
      expect(result.failed).toBe(0);
      expect(mockSourceProvider.download).toHaveBeenCalledTimes(3);
      expect(mockTargetProvider.upload).toHaveBeenCalledTimes(3);
      expect(mockPrisma.file.update).toHaveBeenCalledTimes(3);
    });
  });

  // ===========================================
  // ERROR HANDLING
  // ===========================================

  describe('error handling', () => {
    it('should continue migration when a single file fails to download', async () => {
      const files = [
        createMockFile({ id: 'file-1', storagePath: 'org-1/a.pdf' }),
        createMockFile({ id: 'file-2', storagePath: 'org-1/b.pdf' }),
      ];
      mockPrisma.file.findMany.mockResolvedValue(files);
      mockSourceProvider.download
        .mockRejectedValueOnce(new Error('File not found on disk'))
        .mockResolvedValueOnce(Buffer.from('content'));
      mockTargetProvider.upload.mockResolvedValue('org-1/b.pdf');
      mockTargetProvider.getUrl.mockResolvedValue('https://s3.example.com/org-1/b.pdf');
      mockPrisma.file.update.mockResolvedValue({});

      const result = await migrateStorage({ targetType: 'S3' });

      expect(result.total).toBe(2);
      expect(result.migrated).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toEqual({
        fileId: 'file-1',
        fileName: 'document.pdf',
        error: 'File not found on disk',
      });
    });

    it('should continue migration when a single file fails to upload', async () => {
      const files = [
        createMockFile({ id: 'file-1', storagePath: 'org-1/a.pdf' }),
        createMockFile({ id: 'file-2', storagePath: 'org-1/b.pdf' }),
      ];
      mockPrisma.file.findMany.mockResolvedValue(files);
      mockSourceProvider.download.mockResolvedValue(Buffer.from('content'));
      mockTargetProvider.upload
        .mockRejectedValueOnce(new Error('S3 upload failed'))
        .mockResolvedValueOnce('org-1/b.pdf');
      mockTargetProvider.getUrl.mockResolvedValue('https://s3.example.com/org-1/b.pdf');
      mockPrisma.file.update.mockResolvedValue({});

      const result = await migrateStorage({ targetType: 'S3' });

      expect(result.total).toBe(2);
      expect(result.migrated).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.errors[0]!.error).toBe('S3 upload failed');
    });

    it('should not delete source file when upload fails', async () => {
      const file = createMockFile();
      mockPrisma.file.findMany.mockResolvedValue([file]);
      mockSourceProvider.download.mockResolvedValue(Buffer.from('content'));
      mockTargetProvider.upload.mockRejectedValue(new Error('Upload failed'));

      await migrateStorage({ targetType: 'S3' });

      expect(mockSourceProvider.delete).not.toHaveBeenCalled();
    });

    it('should not update DB record when upload fails', async () => {
      const file = createMockFile();
      mockPrisma.file.findMany.mockResolvedValue([file]);
      mockSourceProvider.download.mockResolvedValue(Buffer.from('content'));
      mockTargetProvider.upload.mockRejectedValue(new Error('Upload failed'));

      await migrateStorage({ targetType: 'S3' });

      expect(mockPrisma.file.update).not.toHaveBeenCalled();
    });
  });

  // ===========================================
  // DRY RUN
  // ===========================================

  describe('dry run', () => {
    it('should return counts without performing any operations', async () => {
      const files = [createMockFile({ id: 'file-1' }), createMockFile({ id: 'file-2' })];
      mockPrisma.file.findMany.mockResolvedValue(files);

      const result = await migrateStorage({ targetType: 'S3', dryRun: true });

      expect(result.total).toBe(2);
      expect(result.migrated).toBe(0);
      expect(result.failed).toBe(0);
      expect(result.dryRun).toBe(true);
      expect(mockSourceProvider.download).not.toHaveBeenCalled();
      expect(mockTargetProvider.upload).not.toHaveBeenCalled();
      expect(mockPrisma.file.update).not.toHaveBeenCalled();
    });
  });

  // ===========================================
  // PROGRESS CALLBACK
  // ===========================================

  describe('progress callback', () => {
    it('should invoke onProgress for each file processed', async () => {
      const files = [
        createMockFile({ id: 'file-1', storagePath: 'org-1/a.pdf' }),
        createMockFile({ id: 'file-2', storagePath: 'org-1/b.pdf' }),
      ];
      mockPrisma.file.findMany.mockResolvedValue(files);
      mockSourceProvider.download.mockResolvedValue(Buffer.from('content'));
      mockTargetProvider.upload.mockImplementation((key: string) => Promise.resolve(key));
      mockTargetProvider.getUrl.mockResolvedValue('https://s3.example.com/file');
      mockPrisma.file.update.mockResolvedValue({});

      const onProgress = vi.fn();

      await migrateStorage({ targetType: 'S3', onProgress });

      expect(onProgress).toHaveBeenCalledTimes(2);
      expect(onProgress).toHaveBeenCalledWith({
        current: 1,
        total: 2,
        fileId: 'file-1',
        status: 'migrated',
      });
      expect(onProgress).toHaveBeenCalledWith({
        current: 2,
        total: 2,
        fileId: 'file-2',
        status: 'migrated',
      });
    });

    it('should report failed status in onProgress for errored files', async () => {
      const file = createMockFile();
      mockPrisma.file.findMany.mockResolvedValue([file]);
      mockSourceProvider.download.mockRejectedValue(new Error('Disk error'));

      const onProgress = vi.fn();

      await migrateStorage({ targetType: 'S3', onProgress });

      expect(onProgress).toHaveBeenCalledWith({
        current: 1,
        total: 1,
        fileId: 'file-1',
        status: 'failed',
      });
    });
  });

  // ===========================================
  // TARGET PROVIDER CONNECTION TEST
  // ===========================================

  describe('target provider validation', () => {
    it('should test target provider connection before migrating', async () => {
      mockTargetProvider.testConnection.mockResolvedValue({
        success: true,
        message: 'Connected',
      });
      mockPrisma.file.findMany.mockResolvedValue([]);

      await migrateStorage({ targetType: 'S3' });

      expect(mockTargetProvider.testConnection).toHaveBeenCalledTimes(1);
    });

    it('should reject migration when target provider connection fails', async () => {
      mockTargetProvider.testConnection.mockResolvedValue({
        success: false,
        message: 'Invalid credentials',
      });

      await expect(migrateStorage({ targetType: 'S3' })).rejects.toThrow(
        'Target storage connection failed: Invalid credentials'
      );
    });
  });
});
