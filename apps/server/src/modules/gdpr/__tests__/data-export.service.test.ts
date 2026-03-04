import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockPrisma, mockFs, mockEnv, resetMocks } = vi.hoisted(() => {
  const mockPrisma = {
    dataExport: {
      count: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    organizationMember: {
      findMany: vi.fn(),
    },
    page: {
      findMany: vi.fn(),
    },
    comment: {
      findMany: vi.fn(),
    },
    database: {
      findMany: vi.fn(),
    },
    databaseRow: {
      findMany: vi.fn(),
    },
    file: {
      findMany: vi.fn(),
    },
    favorite: {
      findMany: vi.fn(),
    },
    notification: {
      findMany: vi.fn(),
    },
    session: {
      findMany: vi.fn(),
    },
    apiToken: {
      findMany: vi.fn(),
    },
    template: {
      findMany: vi.fn(),
    },
  };

  const mockFs = {
    mkdtempSync: vi.fn(),
    readFileSync: vi.fn(),
    writeFileSync: vi.fn(),
    copyFileSync: vi.fn(),
    statSync: vi.fn(),
    mkdirSync: vi.fn(),
    rmSync: vi.fn(),
    existsSync: vi.fn(),
    unlinkSync: vi.fn(),
    createWriteStream: vi.fn(),
    createReadStream: vi.fn(),
  };

  const mockEnv = {
    BACKUP_LOCAL_PATH: '/tmp/backups',
    STORAGE_LOCAL_PATH: '/tmp/storage',
  };

  function resetMocks() {
    for (const model of Object.values(mockPrisma)) {
      for (const method of Object.values(model)) {
        (method as ReturnType<typeof vi.fn>).mockReset();
      }
    }
    for (const method of Object.values(mockFs)) {
      (method as ReturnType<typeof vi.fn>).mockReset();
    }
  }

  return { mockPrisma, mockFs, mockEnv, resetMocks };
});

vi.mock('../../../lib/prisma.js', () => ({
  prisma: mockPrisma,
}));

vi.mock('node:fs', () => ({
  ...mockFs,
  default: mockFs,
}));

vi.mock('node:path', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...(actual as object), default: actual };
});

vi.mock('node:os', () => ({
  tmpdir: () => '/tmp',
  default: { tmpdir: () => '/tmp' },
}));

vi.mock('archiver', () => {
  const mockArchive = {
    pipe: vi.fn(),
    append: vi.fn(),
    file: vi.fn(),
    finalize: vi.fn(),
    on: vi.fn(),
  };
  return {
    default: vi.fn(() => mockArchive),
    __mockArchive: mockArchive,
  };
});

vi.mock('../../../config/index.js', () => ({
  env: mockEnv,
}));

import {
  requestDataExport,
  listDataExports,
  getDataExport,
  getExportArchive,
  cleanupExpiredExports,
  executeDataExport,
} from '../data-export.service.js';

describe('Data Export Service', () => {
  beforeEach(() => {
    resetMocks();
  });

  // ===========================================
  // requestDataExport
  // ===========================================

  describe('requestDataExport', () => {
    it('should create a PENDING export record', async () => {
      const mockExport = {
        id: 'export-1',
        userId: 'user-1',
        status: 'PENDING',
        expiresAt: new Date(),
      };

      mockPrisma.dataExport.count.mockResolvedValue(0);
      mockPrisma.dataExport.create.mockResolvedValue(mockExport);
      // Mock executeDataExport dependencies so the fire-and-forget does not fail hard
      mockPrisma.dataExport.update.mockResolvedValue({ ...mockExport, status: 'PROCESSING' });
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await requestDataExport('user-1');

      expect(result).toEqual(mockExport);
      expect(mockPrisma.dataExport.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          status: 'PENDING',
          expiresAt: expect.any(Date),
        },
      });
    });

    it('should check pending/processing count before creating', async () => {
      mockPrisma.dataExport.count.mockResolvedValue(0);
      mockPrisma.dataExport.create.mockResolvedValue({ id: 'export-1' });
      mockPrisma.dataExport.update.mockResolvedValue({});
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await requestDataExport('user-1');

      expect(mockPrisma.dataExport.count).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          status: { in: ['PENDING', 'PROCESSING'] },
        },
      });
    });

    it('should throw EXPORT_LIMIT_REACHED when 3 pending/processing exports exist', async () => {
      mockPrisma.dataExport.count.mockResolvedValue(3);

      await expect(requestDataExport('user-1')).rejects.toThrow('EXPORT_LIMIT_REACHED');
      expect(mockPrisma.dataExport.create).not.toHaveBeenCalled();
    });

    it('should throw EXPORT_LIMIT_REACHED when more than 3 pending exports exist', async () => {
      mockPrisma.dataExport.count.mockResolvedValue(5);

      await expect(requestDataExport('user-1')).rejects.toThrow('EXPORT_LIMIT_REACHED');
    });

    it('should allow creation when fewer than 3 pending exports exist', async () => {
      mockPrisma.dataExport.count.mockResolvedValue(2);
      mockPrisma.dataExport.create.mockResolvedValue({ id: 'export-1' });
      mockPrisma.dataExport.update.mockResolvedValue({});
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(requestDataExport('user-1')).resolves.toBeDefined();
      expect(mockPrisma.dataExport.create).toHaveBeenCalled();
    });

    it('should set expiresAt to 48 hours in the future', async () => {
      const now = Date.now();
      vi.spyOn(Date, 'now').mockReturnValue(now);

      mockPrisma.dataExport.count.mockResolvedValue(0);
      mockPrisma.dataExport.create.mockResolvedValue({ id: 'export-1' });
      mockPrisma.dataExport.update.mockResolvedValue({});
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await requestDataExport('user-1');

      const createCall = mockPrisma.dataExport.create.mock.calls[0][0];
      const expectedExpiry = new Date(now + 48 * 60 * 60 * 1000);
      expect(createCall.data.expiresAt).toEqual(expectedExpiry);

      vi.restoreAllMocks();
    });

    it('should fire executeDataExport asynchronously without blocking', async () => {
      const mockExport = { id: 'export-1', userId: 'user-1', status: 'PENDING' };
      mockPrisma.dataExport.count.mockResolvedValue(0);
      mockPrisma.dataExport.create.mockResolvedValue(mockExport);
      // Make execute fail -- requestDataExport should still return successfully
      mockPrisma.dataExport.update.mockRejectedValue(new Error('fail'));

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await requestDataExport('user-1');

      expect(result).toEqual(mockExport);

      consoleSpy.mockRestore();
    });
  });

  // ===========================================
  // listDataExports
  // ===========================================

  describe('listDataExports', () => {
    it('should return exports for the given user', async () => {
      const mockExports = [
        { id: 'export-2', userId: 'user-1', status: 'COMPLETED' },
        { id: 'export-1', userId: 'user-1', status: 'PENDING' },
      ];
      mockPrisma.dataExport.findMany.mockResolvedValue(mockExports);

      const result = await listDataExports('user-1');

      expect(result).toEqual(mockExports);
      expect(result).toHaveLength(2);
    });

    it('should order by requestedAt descending and limit to 20', async () => {
      mockPrisma.dataExport.findMany.mockResolvedValue([]);

      await listDataExports('user-1');

      expect(mockPrisma.dataExport.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { requestedAt: 'desc' },
        take: 20,
      });
    });

    it('should return empty array when no exports exist', async () => {
      mockPrisma.dataExport.findMany.mockResolvedValue([]);

      const result = await listDataExports('user-1');

      expect(result).toEqual([]);
    });
  });

  // ===========================================
  // getDataExport
  // ===========================================

  describe('getDataExport', () => {
    it('should return export scoped to user', async () => {
      const mockExport = { id: 'export-1', userId: 'user-1', status: 'COMPLETED' };
      mockPrisma.dataExport.findFirst.mockResolvedValue(mockExport);

      const result = await getDataExport('export-1', 'user-1');

      expect(result).toEqual(mockExport);
      expect(mockPrisma.dataExport.findFirst).toHaveBeenCalledWith({
        where: { id: 'export-1', userId: 'user-1' },
      });
    });

    it('should return null when export does not exist', async () => {
      mockPrisma.dataExport.findFirst.mockResolvedValue(null);

      const result = await getDataExport('nonexistent', 'user-1');

      expect(result).toBeNull();
    });

    it('should return null when export belongs to a different user', async () => {
      mockPrisma.dataExport.findFirst.mockResolvedValue(null);

      const result = await getDataExport('export-1', 'other-user');

      expect(result).toBeNull();
      expect(mockPrisma.dataExport.findFirst).toHaveBeenCalledWith({
        where: { id: 'export-1', userId: 'other-user' },
      });
    });
  });

  // ===========================================
  // getExportArchive
  // ===========================================

  describe('getExportArchive', () => {
    it('should return stream, fileName, and fileSize for a completed, non-expired export', async () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const mockExport = {
        id: 'export-1',
        userId: 'user-1',
        status: 'COMPLETED',
        storagePath: '/tmp/backups/exports/user-1/export.zip',
        fileName: 'librediary-export-2025-01-01.zip',
        expiresAt: futureDate,
      };
      const mockStream = { pipe: vi.fn() };
      mockPrisma.dataExport.findFirst.mockResolvedValue(mockExport);
      mockFs.existsSync.mockReturnValue(true);
      mockFs.statSync.mockReturnValue({ size: 4096 });
      mockFs.createReadStream.mockReturnValue(mockStream);
      mockPrisma.dataExport.update.mockResolvedValue({});

      const result = await getExportArchive('export-1', 'user-1');

      expect(result).not.toBeNull();
      expect(result!.stream).toBe(mockStream);
      expect(result!.fileSize).toBe(4096);
      expect(result!.fileName).toBe('librediary-export-2025-01-01.zip');
    });

    it('should mark as downloaded after successful retrieval', async () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const mockExport = {
        id: 'export-1',
        userId: 'user-1',
        status: 'COMPLETED',
        storagePath: '/tmp/backups/exports/user-1/export.zip',
        fileName: 'export.zip',
        expiresAt: futureDate,
      };
      mockPrisma.dataExport.findFirst.mockResolvedValue(mockExport);
      mockFs.existsSync.mockReturnValue(true);
      mockFs.statSync.mockReturnValue({ size: 1024 });
      mockFs.createReadStream.mockReturnValue({ pipe: vi.fn() });
      mockPrisma.dataExport.update.mockResolvedValue({});

      await getExportArchive('export-1', 'user-1');

      expect(mockPrisma.dataExport.update).toHaveBeenCalledWith({
        where: { id: 'export-1' },
        data: { downloadedAt: expect.any(Date) },
      });
    });

    it('should return null when export is not found', async () => {
      mockPrisma.dataExport.findFirst.mockResolvedValue(null);

      const result = await getExportArchive('nonexistent', 'user-1');

      expect(result).toBeNull();
    });

    it('should return null when storagePath is missing', async () => {
      mockPrisma.dataExport.findFirst.mockResolvedValue({
        id: 'export-1',
        status: 'COMPLETED',
        storagePath: null,
        fileName: null,
      });

      const result = await getExportArchive('export-1', 'user-1');

      expect(result).toBeNull();
    });

    it('should return null when fileName is missing', async () => {
      mockPrisma.dataExport.findFirst.mockResolvedValue({
        id: 'export-1',
        status: 'COMPLETED',
        storagePath: '/tmp/path',
        fileName: null,
      });

      const result = await getExportArchive('export-1', 'user-1');

      expect(result).toBeNull();
    });

    it('should return null and mark as EXPIRED when expiresAt is in the past', async () => {
      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
      mockPrisma.dataExport.findFirst.mockResolvedValue({
        id: 'export-1',
        status: 'COMPLETED',
        storagePath: '/tmp/path',
        fileName: 'export.zip',
        expiresAt: pastDate,
      });
      mockPrisma.dataExport.update.mockResolvedValue({});

      const result = await getExportArchive('export-1', 'user-1');

      expect(result).toBeNull();
      expect(mockPrisma.dataExport.update).toHaveBeenCalledWith({
        where: { id: 'export-1' },
        data: { status: 'EXPIRED' },
      });
    });

    it('should return null when file does not exist on disk', async () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
      mockPrisma.dataExport.findFirst.mockResolvedValue({
        id: 'export-1',
        status: 'COMPLETED',
        storagePath: '/tmp/missing-file.zip',
        fileName: 'export.zip',
        expiresAt: futureDate,
      });
      mockFs.existsSync.mockReturnValue(false);

      const result = await getExportArchive('export-1', 'user-1');

      expect(result).toBeNull();
    });

    it('should scope query to COMPLETED exports only', async () => {
      mockPrisma.dataExport.findFirst.mockResolvedValue(null);

      await getExportArchive('export-1', 'user-1');

      expect(mockPrisma.dataExport.findFirst).toHaveBeenCalledWith({
        where: { id: 'export-1', userId: 'user-1', status: 'COMPLETED' },
      });
    });
  });

  // ===========================================
  // cleanupExpiredExports
  // ===========================================

  describe('cleanupExpiredExports', () => {
    it('should find completed exports with expired expiresAt', async () => {
      mockPrisma.dataExport.findMany.mockResolvedValue([]);

      await cleanupExpiredExports();

      expect(mockPrisma.dataExport.findMany).toHaveBeenCalledWith({
        where: {
          status: 'COMPLETED',
          expiresAt: { lt: expect.any(Date) },
        },
      });
    });

    it('should delete files from disk and mark as EXPIRED', async () => {
      const expiredExports = [
        { id: 'exp-1', storagePath: '/tmp/exports/file1.zip' },
        { id: 'exp-2', storagePath: '/tmp/exports/file2.zip' },
      ];
      mockPrisma.dataExport.findMany.mockResolvedValue(expiredExports);
      mockFs.existsSync.mockReturnValue(true);
      mockPrisma.dataExport.update.mockResolvedValue({});

      const count = await cleanupExpiredExports();

      expect(count).toBe(2);
      expect(mockFs.unlinkSync).toHaveBeenCalledTimes(2);
      expect(mockFs.unlinkSync).toHaveBeenCalledWith('/tmp/exports/file1.zip');
      expect(mockFs.unlinkSync).toHaveBeenCalledWith('/tmp/exports/file2.zip');
      expect(mockPrisma.dataExport.update).toHaveBeenCalledTimes(2);
      expect(mockPrisma.dataExport.update).toHaveBeenCalledWith({
        where: { id: 'exp-1' },
        data: { status: 'EXPIRED' },
      });
      expect(mockPrisma.dataExport.update).toHaveBeenCalledWith({
        where: { id: 'exp-2' },
        data: { status: 'EXPIRED' },
      });
    });

    it('should skip file deletion when storagePath is null', async () => {
      mockPrisma.dataExport.findMany.mockResolvedValue([{ id: 'exp-1', storagePath: null }]);
      mockPrisma.dataExport.update.mockResolvedValue({});

      const count = await cleanupExpiredExports();

      expect(count).toBe(1);
      expect(mockFs.existsSync).not.toHaveBeenCalled();
      expect(mockFs.unlinkSync).not.toHaveBeenCalled();
      expect(mockPrisma.dataExport.update).toHaveBeenCalledWith({
        where: { id: 'exp-1' },
        data: { status: 'EXPIRED' },
      });
    });

    it('should skip file deletion when file does not exist on disk', async () => {
      mockPrisma.dataExport.findMany.mockResolvedValue([
        { id: 'exp-1', storagePath: '/tmp/missing.zip' },
      ]);
      mockFs.existsSync.mockReturnValue(false);
      mockPrisma.dataExport.update.mockResolvedValue({});

      const count = await cleanupExpiredExports();

      expect(count).toBe(1);
      expect(mockFs.unlinkSync).not.toHaveBeenCalled();
      expect(mockPrisma.dataExport.update).toHaveBeenCalledWith({
        where: { id: 'exp-1' },
        data: { status: 'EXPIRED' },
      });
    });

    it('should return 0 when no expired exports exist', async () => {
      mockPrisma.dataExport.findMany.mockResolvedValue([]);

      const count = await cleanupExpiredExports();

      expect(count).toBe(0);
    });
  });

  // ===========================================
  // executeDataExport
  // ===========================================

  describe('executeDataExport', () => {
    const mockUser = {
      id: 'user-1',
      email: 'test@example.com',
      name: 'Test User',
      locale: 'en',
      emailVerified: true,
      avatarUrl: null,
      notificationPrefs: '{}',
      createdAt: new Date('2025-01-01'),
      updatedAt: new Date('2025-06-01'),
    };

    function setupAllDataMocks() {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.organizationMember.findMany.mockResolvedValue([]);
      mockPrisma.page.findMany.mockResolvedValue([]);
      mockPrisma.comment.findMany.mockResolvedValue([]);
      mockPrisma.database.findMany.mockResolvedValue([]);
      mockPrisma.databaseRow.findMany.mockResolvedValue([]);
      mockPrisma.file.findMany.mockResolvedValue([]);
      mockPrisma.favorite.findMany.mockResolvedValue([]);
      mockPrisma.notification.findMany.mockResolvedValue([]);
      mockPrisma.session.findMany.mockResolvedValue([]);
      mockPrisma.apiToken.findMany.mockResolvedValue([]);
      mockPrisma.template.findMany.mockResolvedValue([]);
    }

    function setupFsMocks() {
      mockFs.mkdtempSync.mockReturnValue('/tmp/librediary-export-abc123');
      mockFs.copyFileSync.mockImplementation(() => {});
      mockFs.statSync.mockReturnValue({ size: 11 }); // length of 'zip-content'
      mockFs.mkdirSync.mockImplementation(() => {});
      mockFs.rmSync.mockImplementation(() => {});
      // For the archiver createWriteStream
      const mockWriteStream = {
        on: vi.fn((event: string, cb: () => void) => {
          if (event === 'close') {
            // Trigger the close event asynchronously to resolve the archive promise
            setTimeout(cb, 0);
          }
          return mockWriteStream;
        }),
      };
      mockFs.createWriteStream.mockReturnValue(mockWriteStream);
    }

    it('should transition status to PROCESSING at start', async () => {
      mockPrisma.dataExport.update
        .mockResolvedValueOnce({
          id: 'export-1',
          userId: 'user-1',
          status: 'PROCESSING',
          user: mockUser,
        })
        .mockResolvedValue({});

      setupAllDataMocks();
      setupFsMocks();

      await executeDataExport('export-1');

      expect(mockPrisma.dataExport.update.mock.calls[0][0]).toEqual({
        where: { id: 'export-1' },
        data: { status: 'PROCESSING', startedAt: expect.any(Date) },
        include: { user: true },
      });
    });

    it('should gather all user data in parallel', async () => {
      mockPrisma.dataExport.update
        .mockResolvedValueOnce({
          id: 'export-1',
          userId: 'user-1',
          status: 'PROCESSING',
          user: mockUser,
        })
        .mockResolvedValue({});

      setupAllDataMocks();
      setupFsMocks();

      await executeDataExport('export-1');

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({ where: { id: 'user-1' } });
      expect(mockPrisma.organizationMember.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'user-1' } })
      );
      expect(mockPrisma.page.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { createdById: 'user-1' } })
      );
      expect(mockPrisma.comment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { createdById: 'user-1' } })
      );
      expect(mockPrisma.database.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { createdById: 'user-1' } })
      );
      expect(mockPrisma.databaseRow.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { createdById: 'user-1' } })
      );
      expect(mockPrisma.file.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { uploadedById: 'user-1' } })
      );
      expect(mockPrisma.favorite.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'user-1' } })
      );
      expect(mockPrisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'user-1' } })
      );
      expect(mockPrisma.session.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'user-1' } })
      );
      expect(mockPrisma.apiToken.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'user-1' } })
      );
      expect(mockPrisma.template.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { createdById: 'user-1' } })
      );
    });

    it('should throw and mark as FAILED when user is not found', async () => {
      mockPrisma.dataExport.update
        .mockResolvedValueOnce({
          id: 'export-1',
          userId: 'user-1',
          status: 'PROCESSING',
          user: null,
        })
        .mockResolvedValue({});

      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.organizationMember.findMany.mockResolvedValue([]);
      mockPrisma.page.findMany.mockResolvedValue([]);
      mockPrisma.comment.findMany.mockResolvedValue([]);
      mockPrisma.database.findMany.mockResolvedValue([]);
      mockPrisma.databaseRow.findMany.mockResolvedValue([]);
      mockPrisma.file.findMany.mockResolvedValue([]);
      mockPrisma.favorite.findMany.mockResolvedValue([]);
      mockPrisma.notification.findMany.mockResolvedValue([]);
      mockPrisma.session.findMany.mockResolvedValue([]);
      mockPrisma.apiToken.findMany.mockResolvedValue([]);
      mockPrisma.template.findMany.mockResolvedValue([]);

      await expect(executeDataExport('export-1')).rejects.toThrow('User not found');

      // Should have been called with FAILED status
      const failedCall = mockPrisma.dataExport.update.mock.calls.find(
        (call) => call[0].data.status === 'FAILED'
      );
      expect(failedCall).toBeDefined();
      expect(failedCall![0].data.errorMessage).toBe('User not found');
      expect(failedCall![0].data.completedAt).toBeInstanceOf(Date);
    });

    it('should update status to COMPLETED with file info on success', async () => {
      mockPrisma.dataExport.update
        .mockResolvedValueOnce({
          id: 'export-1',
          userId: 'user-1',
          status: 'PROCESSING',
          user: mockUser,
        })
        .mockResolvedValue({});

      setupAllDataMocks();
      setupFsMocks();

      await executeDataExport('export-1');

      // Find the COMPLETED update call
      const completedCall = mockPrisma.dataExport.update.mock.calls.find(
        (call) => call[0].data.status === 'COMPLETED'
      );
      expect(completedCall).toBeDefined();
      expect(completedCall![0].where).toEqual({ id: 'export-1' });
      expect(completedCall![0].data.fileName).toMatch(/^librediary-export-.*\.zip$/);
      expect(completedCall![0].data.fileSize).toBe(11);
      expect(completedCall![0].data.storagePath).toBeDefined();
      expect(completedCall![0].data.completedAt).toBeInstanceOf(Date);
    });

    it('should create storage directory recursively', async () => {
      mockPrisma.dataExport.update
        .mockResolvedValueOnce({
          id: 'export-1',
          userId: 'user-1',
          status: 'PROCESSING',
          user: mockUser,
        })
        .mockResolvedValue({});

      setupAllDataMocks();
      setupFsMocks();

      await executeDataExport('export-1');

      expect(mockFs.mkdirSync).toHaveBeenCalledWith(
        expect.stringContaining('/tmp/backups/exports/user-1'),
        { recursive: true }
      );
    });

    it('should clean up temporary directory even on failure', async () => {
      mockPrisma.dataExport.update
        .mockResolvedValueOnce({
          id: 'export-1',
          userId: 'user-1',
          status: 'PROCESSING',
          user: mockUser,
        })
        .mockResolvedValue({});

      setupAllDataMocks();
      setupFsMocks();
      // Make the archive copy fail after the temp dir is created
      mockFs.mkdtempSync.mockReturnValue('/tmp/librediary-export-abc123');
      mockFs.copyFileSync.mockImplementation(() => {
        throw new Error('Copy failed');
      });

      await expect(executeDataExport('export-1')).rejects.toThrow('Copy failed');

      expect(mockFs.rmSync).toHaveBeenCalledWith('/tmp/librediary-export-abc123', {
        recursive: true,
        force: true,
      });
    });

    it('should mark status as FAILED with error message on error', async () => {
      mockPrisma.dataExport.update
        .mockResolvedValueOnce({
          id: 'export-1',
          userId: 'user-1',
          status: 'PROCESSING',
          user: mockUser,
        })
        .mockResolvedValue({});

      // Make one of the data fetches fail
      mockPrisma.user.findUnique.mockRejectedValue(new Error('DB connection lost'));
      mockPrisma.organizationMember.findMany.mockResolvedValue([]);
      mockPrisma.page.findMany.mockResolvedValue([]);
      mockPrisma.comment.findMany.mockResolvedValue([]);
      mockPrisma.database.findMany.mockResolvedValue([]);
      mockPrisma.databaseRow.findMany.mockResolvedValue([]);
      mockPrisma.file.findMany.mockResolvedValue([]);
      mockPrisma.favorite.findMany.mockResolvedValue([]);
      mockPrisma.notification.findMany.mockResolvedValue([]);
      mockPrisma.session.findMany.mockResolvedValue([]);
      mockPrisma.apiToken.findMany.mockResolvedValue([]);
      mockPrisma.template.findMany.mockResolvedValue([]);

      await expect(executeDataExport('export-1')).rejects.toThrow('DB connection lost');

      const failedCall = mockPrisma.dataExport.update.mock.calls.find(
        (call) => call[0].data.status === 'FAILED'
      );
      expect(failedCall).toBeDefined();
      expect(failedCall![0].data.errorMessage).toBe('DB connection lost');
    });

    it('should copy the archive to the correct storage path', async () => {
      mockPrisma.dataExport.update
        .mockResolvedValueOnce({
          id: 'export-1',
          userId: 'user-1',
          status: 'PROCESSING',
          user: mockUser,
        })
        .mockResolvedValue({});

      setupAllDataMocks();
      setupFsMocks();

      await executeDataExport('export-1');

      expect(mockFs.copyFileSync).toHaveBeenCalledWith(
        expect.stringContaining('/tmp/librediary-export-abc123/'),
        expect.stringContaining('/tmp/backups/exports/user-1/')
      );
    });
  });
});
