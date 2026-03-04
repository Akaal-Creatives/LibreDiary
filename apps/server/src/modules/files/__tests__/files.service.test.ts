import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockPrisma, mockStorageProvider, resetMocks } = vi.hoisted(() => {
  const mockPrismaFile = {
    create: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
    aggregate: vi.fn(),
  };

  const mockPrisma = {
    file: mockPrismaFile,
  };

  const mockStorageProvider = {
    upload: vi.fn(),
    download: vi.fn(),
    delete: vi.fn(),
    exists: vi.fn(),
    getUrl: vi.fn(),
    testConnection: vi.fn(),
  };

  function resetMocks() {
    Object.values(mockPrismaFile).forEach((m) => m.mockReset());
    Object.values(mockStorageProvider).forEach((m) => m.mockReset());
  }

  return { mockPrisma, mockStorageProvider, resetMocks };
});

vi.mock('../../../lib/prisma.js', () => ({
  prisma: mockPrisma,
}));

vi.mock('../storage/index.js', () => ({
  getStorageProvider: () => mockStorageProvider,
}));

vi.mock('../../../config/index.js', () => ({
  env: {
    STORAGE_TYPE: 'LOCAL',
    STORAGE_MAX_FILE_SIZE: 10485760,
    STORAGE_LOCAL_PATH: './uploads',
  },
}));

import {
  uploadFile,
  getFile,
  downloadFile,
  listFiles,
  deleteFile,
  getStorageInfo,
  testStorageConnection,
} from '../files.service.js';

describe('Files Service', () => {
  beforeEach(() => {
    resetMocks();
  });

  // ===========================================
  // UPLOAD FILE
  // ===========================================

  describe('uploadFile', () => {
    it('should store file via provider and create DB record', async () => {
      mockStorageProvider.upload.mockResolvedValue('org-1/abc123.pdf');
      mockStorageProvider.getUrl.mockResolvedValue('/uploads/org-1/abc123.pdf');
      mockPrisma.file.create.mockResolvedValue({
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
      });

      const result = await uploadFile('org-1', 'user-1', {
        buffer: Buffer.from('pdf content'),
        originalName: 'document.pdf',
        mimeType: 'application/pdf',
        size: 1024,
      });

      expect(mockStorageProvider.upload).toHaveBeenCalledTimes(1);
      expect(mockPrisma.file.create).toHaveBeenCalledTimes(1);
      expect(result.organizationId).toBe('org-1');
      expect(result.originalName).toBe('document.pdf');
    });

    it('should validate file size limit', async () => {
      await expect(
        uploadFile('org-1', 'user-1', {
          buffer: Buffer.alloc(20 * 1024 * 1024), // 20MB
          originalName: 'big-file.zip',
          mimeType: 'application/zip',
          size: 20 * 1024 * 1024,
        })
      ).rejects.toThrow('FILE_TOO_LARGE');
    });

    it('should generate unique storage key', async () => {
      mockStorageProvider.upload.mockResolvedValue('org-1/generated.pdf');
      mockStorageProvider.getUrl.mockResolvedValue('/uploads/org-1/generated.pdf');
      mockPrisma.file.create.mockResolvedValue({
        id: 'file-1',
        organizationId: 'org-1',
        pageId: null,
        name: expect.any(String),
        originalName: 'document.pdf',
        mimeType: 'application/pdf',
        size: 512,
        storageType: 'LOCAL',
        storagePath: expect.any(String),
        url: expect.any(String),
        uploadedById: 'user-1',
        createdAt: new Date(),
      });

      await uploadFile('org-1', 'user-1', {
        buffer: Buffer.from('content'),
        originalName: 'document.pdf',
        mimeType: 'application/pdf',
        size: 512,
      });

      const uploadCall = mockStorageProvider.upload.mock.calls[0];
      // Storage key should contain org ID and have an extension
      expect(uploadCall[0]).toMatch(/^org-1\/.+\.pdf$/);
    });

    it('should block files with dangerous extensions', async () => {
      await expect(
        uploadFile('org-1', 'user-1', {
          buffer: Buffer.from('malicious'),
          originalName: 'payload.exe',
          mimeType: 'application/octet-stream',
          size: 100,
        })
      ).rejects.toThrow('FILE_TYPE_NOT_ALLOWED');

      await expect(
        uploadFile('org-1', 'user-1', {
          buffer: Buffer.from('script'),
          originalName: 'hack.html',
          mimeType: 'text/html',
          size: 100,
        })
      ).rejects.toThrow('FILE_TYPE_NOT_ALLOWED');
    });

    it('should block files with dangerous extensions regardless of claimed MIME type', async () => {
      // Attacker renames .exe but claims it's an image
      await expect(
        uploadFile('org-1', 'user-1', {
          buffer: Buffer.from('MZ'), // PE header start
          originalName: 'innocent.bat',
          mimeType: 'image/jpeg',
          size: 100,
        })
      ).rejects.toThrow('FILE_TYPE_NOT_ALLOWED');
    });

    it('should block files with blocked client MIME type when magic bytes are undetectable', async () => {
      // Text-based files where file-type returns undefined — fallback to client MIME
      await expect(
        uploadFile('org-1', 'user-1', {
          buffer: Buffer.from('<script>alert("xss")</script>'),
          originalName: 'page.xhtml',
          mimeType: 'application/xhtml+xml',
          size: 100,
        })
      ).rejects.toThrow('FILE_TYPE_NOT_ALLOWED');
    });

    it('should optionally associate file with a page', async () => {
      mockStorageProvider.upload.mockResolvedValue('org-1/abc.txt');
      mockStorageProvider.getUrl.mockResolvedValue('/uploads/org-1/abc.txt');
      mockPrisma.file.create.mockResolvedValue({
        id: 'file-1',
        organizationId: 'org-1',
        pageId: 'page-1',
        name: 'abc.txt',
        originalName: 'notes.txt',
        mimeType: 'text/plain',
        size: 100,
        storageType: 'LOCAL',
        storagePath: 'org-1/abc.txt',
        url: '/uploads/org-1/abc.txt',
        uploadedById: 'user-1',
        createdAt: new Date(),
      });

      await uploadFile(
        'org-1',
        'user-1',
        {
          buffer: Buffer.from('notes'),
          originalName: 'notes.txt',
          mimeType: 'text/plain',
          size: 100,
        },
        { pageId: 'page-1' }
      );

      const createCall = mockPrisma.file.create.mock.calls[0][0];
      expect(createCall.data.pageId).toBe('page-1');
    });
  });

  // ===========================================
  // GET FILE
  // ===========================================

  describe('getFile', () => {
    it('should return file metadata from DB', async () => {
      mockPrisma.file.findFirst.mockResolvedValue({
        id: 'file-1',
        organizationId: 'org-1',
        pageId: null,
        name: 'abc.pdf',
        originalName: 'document.pdf',
        mimeType: 'application/pdf',
        size: 1024,
        storageType: 'LOCAL',
        storagePath: 'org-1/abc.pdf',
        url: '/uploads/org-1/abc.pdf',
        uploadedById: 'user-1',
        createdAt: new Date(),
      });

      const result = await getFile('org-1', 'file-1');

      expect(result.id).toBe('file-1');
      expect(mockPrisma.file.findFirst).toHaveBeenCalledWith({
        where: { id: 'file-1', organizationId: 'org-1' },
      });
    });

    it('should throw FILE_NOT_FOUND for wrong org', async () => {
      mockPrisma.file.findFirst.mockResolvedValue(null);

      await expect(getFile('wrong-org', 'file-1')).rejects.toThrow('FILE_NOT_FOUND');
    });
  });

  // ===========================================
  // DOWNLOAD FILE
  // ===========================================

  describe('downloadFile', () => {
    it('should return file buffer from storage provider', async () => {
      mockPrisma.file.findFirst.mockResolvedValue({
        id: 'file-1',
        organizationId: 'org-1',
        pageId: null,
        name: 'abc.pdf',
        originalName: 'document.pdf',
        mimeType: 'application/pdf',
        size: 1024,
        storageType: 'LOCAL',
        storagePath: 'org-1/abc.pdf',
        url: '/uploads/org-1/abc.pdf',
        uploadedById: 'user-1',
        createdAt: new Date(),
      });

      const content = Buffer.from('pdf content');
      mockStorageProvider.download.mockResolvedValue(content);

      const result = await downloadFile('org-1', 'file-1');

      expect(result.buffer).toEqual(content);
      expect(result.mimeType).toBe('application/pdf');
      expect(result.filename).toBe('document.pdf');
    });
  });

  // ===========================================
  // LIST FILES
  // ===========================================

  describe('listFiles', () => {
    it('should return files for an org', async () => {
      mockPrisma.file.findMany.mockResolvedValue([
        {
          id: 'file-1',
          organizationId: 'org-1',
          pageId: null,
          name: 'abc.pdf',
          originalName: 'document.pdf',
          mimeType: 'application/pdf',
          size: 1024,
          storageType: 'LOCAL',
          storagePath: 'org-1/abc.pdf',
          url: '/uploads/org-1/abc.pdf',
          uploadedById: 'user-1',
          createdAt: new Date(),
        },
      ]);

      const result = await listFiles('org-1');

      expect(result).toHaveLength(1);
      expect(mockPrisma.file.findMany).toHaveBeenCalledWith({
        where: { organizationId: 'org-1' },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should filter by pageId when provided', async () => {
      mockPrisma.file.findMany.mockResolvedValue([]);

      await listFiles('org-1', { pageId: 'page-1' });

      expect(mockPrisma.file.findMany).toHaveBeenCalledWith({
        where: { organizationId: 'org-1', pageId: 'page-1' },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  // ===========================================
  // DELETE FILE
  // ===========================================

  describe('deleteFile', () => {
    it('should remove from storage and delete DB record', async () => {
      mockPrisma.file.findFirst.mockResolvedValue({
        id: 'file-1',
        organizationId: 'org-1',
        storagePath: 'org-1/abc.pdf',
      });

      await deleteFile('org-1', 'file-1');

      expect(mockStorageProvider.delete).toHaveBeenCalledWith('org-1/abc.pdf');
      expect(mockPrisma.file.delete).toHaveBeenCalledWith({
        where: { id: 'file-1' },
      });
    });

    it('should throw FILE_NOT_FOUND if file does not exist', async () => {
      mockPrisma.file.findFirst.mockResolvedValue(null);

      await expect(deleteFile('org-1', 'nonexistent')).rejects.toThrow('FILE_NOT_FOUND');
    });
  });

  // ===========================================
  // GET STORAGE INFO
  // ===========================================

  describe('getStorageInfo', () => {
    it('should return storage type and usage stats', async () => {
      mockPrisma.file.count.mockResolvedValue(10);
      mockPrisma.file.aggregate.mockResolvedValue({
        _sum: { size: 102400 },
      });

      const result = await getStorageInfo();

      expect(result.type).toBe('LOCAL');
      expect(result.totalFiles).toBe(10);
      expect(result.totalSize).toBe(102400);
    });

    it('should return 0 for totalSize when no files exist', async () => {
      mockPrisma.file.count.mockResolvedValue(0);
      mockPrisma.file.aggregate.mockResolvedValue({
        _sum: { size: null },
      });

      const result = await getStorageInfo();

      expect(result.totalFiles).toBe(0);
      expect(result.totalSize).toBe(0);
    });
  });

  // ===========================================
  // TEST STORAGE CONNECTION
  // ===========================================

  describe('testStorageConnection', () => {
    it('should delegate to provider.testConnection()', async () => {
      mockStorageProvider.testConnection.mockResolvedValue({
        success: true,
        message: 'Connected',
      });

      const result = await testStorageConnection();

      expect(result.success).toBe(true);
      expect(mockStorageProvider.testConnection).toHaveBeenCalledTimes(1);
    });
  });
});
