import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockPrisma, mockBackupStorage, mockFileStorage, resetMocks } = vi.hoisted(() => {
  const mockPrismaBackup = {
    create: vi.fn(),
    update: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
  };

  const mockPrismaOrg = {
    findUnique: vi.fn(),
  };

  const mockPrismaPage = {
    findMany: vi.fn(),
  };

  const mockPrismaDatabase = {
    findMany: vi.fn(),
  };

  const mockPrismaFile = {
    findMany: vi.fn(),
  };

  const mockPrisma = {
    backup: mockPrismaBackup,
    organization: mockPrismaOrg,
    page: mockPrismaPage,
    database: mockPrismaDatabase,
    file: mockPrismaFile,
  };

  const mockBackupStorage = {
    upload: vi.fn(),
    download: vi.fn(),
    delete: vi.fn(),
    exists: vi.fn(),
    getDownloadUrl: vi.fn(),
    testConnection: vi.fn(),
    listKeys: vi.fn(),
  };

  const mockFileStorage = {
    upload: vi.fn(),
    download: vi.fn(),
    delete: vi.fn(),
    exists: vi.fn(),
    getUrl: vi.fn(),
    testConnection: vi.fn(),
  };

  function resetMocks() {
    Object.values(mockPrismaBackup).forEach((m) => m.mockReset());
    Object.values(mockPrismaOrg).forEach((m) => m.mockReset());
    Object.values(mockPrismaPage).forEach((m) => m.mockReset());
    Object.values(mockPrismaDatabase).forEach((m) => m.mockReset());
    Object.values(mockPrismaFile).forEach((m) => m.mockReset());
    Object.values(mockBackupStorage).forEach((m) => m.mockReset());
    Object.values(mockFileStorage).forEach((m) => m.mockReset());
  }

  return { mockPrisma, mockBackupStorage, mockFileStorage, resetMocks };
});

vi.mock('../../../lib/prisma.js', () => ({
  prisma: mockPrisma,
}));

vi.mock('../storage/index.js', () => ({
  getBackupStorageProvider: () => mockBackupStorage,
}));

vi.mock('../../files/storage/index.js', () => ({
  getStorageProvider: () => mockFileStorage,
}));

vi.mock('../../../config/index.js', () => ({
  env: {
    BACKUP_STORAGE_TYPE: 'LOCAL',
    BACKUP_LOCAL_PATH: './backups',
    BACKUP_MAX_SIZE_MB: 500,
    BACKUP_RETENTION_DAYS: 30,
  },
}));

vi.mock('../utils/compress.js', () => ({
  createTarGz: vi.fn().mockResolvedValue(Buffer.from('compressed-data')),
}));

vi.mock('../utils/encrypt.js', () => ({
  encryptBuffer: vi.fn().mockReturnValue(Buffer.from('encrypted-data')),
}));

import {
  createOrgBackup,
  executeOrgBackup,
  getBackup,
  listOrgBackups,
  downloadBackup,
  deleteBackup,
  cleanupOldBackups,
} from '../backup.service.js';

describe('Backup Service', () => {
  beforeEach(() => {
    resetMocks();
  });

  // ===========================================
  // CREATE ORG BACKUP
  // ===========================================

  describe('createOrgBackup', () => {
    it('should create a PENDING backup record', async () => {
      const mockBackup = {
        id: 'backup-1',
        type: 'ORGANISATION',
        status: 'PENDING',
        organizationId: 'org-1',
        triggeredById: 'user-1',
        isEncrypted: false,
      };
      mockPrisma.backup.create.mockResolvedValue(mockBackup);
      // Mock executeOrgBackup dependencies
      mockPrisma.backup.update.mockResolvedValue({ ...mockBackup, status: 'IN_PROGRESS' });

      const result = await createOrgBackup('org-1', 'user-1');

      expect(result.status).toBe('PENDING');
      expect(result.type).toBe('ORGANISATION');
      expect(mockPrisma.backup.create).toHaveBeenCalledWith({
        data: {
          type: 'ORGANISATION',
          status: 'PENDING',
          organizationId: 'org-1',
          triggeredById: 'user-1',
          isEncrypted: false,
        },
      });
    });

    it('should set isEncrypted when encrypt option is true', async () => {
      mockPrisma.backup.create.mockResolvedValue({
        id: 'backup-1',
        isEncrypted: true,
      });
      mockPrisma.backup.update.mockResolvedValue({});

      await createOrgBackup('org-1', 'user-1', { encrypt: true, password: 'test12345' });

      expect(mockPrisma.backup.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ isEncrypted: true }),
        })
      );
    });
  });

  // ===========================================
  // EXECUTE ORG BACKUP
  // ===========================================

  describe('executeOrgBackup', () => {
    it('should transition through IN_PROGRESS to COMPLETED', async () => {
      mockPrisma.backup.update
        .mockResolvedValueOnce({
          id: 'backup-1',
          organizationId: 'org-1',
          isEncrypted: false,
          status: 'IN_PROGRESS',
        })
        .mockResolvedValueOnce({
          id: 'backup-1',
          status: 'COMPLETED',
        });

      mockPrisma.organization.findUnique.mockResolvedValue({
        id: 'org-1',
        name: 'Test Org',
        slug: 'test-org',
      });
      mockPrisma.page.findMany.mockResolvedValue([]);
      mockPrisma.database.findMany.mockResolvedValue([]);
      mockPrisma.file.findMany.mockResolvedValue([]);
      mockBackupStorage.upload.mockResolvedValue('path');

      await executeOrgBackup('backup-1');

      // First update: IN_PROGRESS
      expect(mockPrisma.backup.update.mock.calls[0][0].data.status).toBe('IN_PROGRESS');
      // Second update: COMPLETED
      expect(mockPrisma.backup.update.mock.calls[1][0].data.status).toBe('COMPLETED');
      expect(mockBackupStorage.upload).toHaveBeenCalledTimes(1);
    });

    it('should set status to FAILED on error', async () => {
      mockPrisma.backup.update.mockResolvedValueOnce({
        id: 'backup-1',
        organizationId: 'org-1',
        isEncrypted: false,
        status: 'IN_PROGRESS',
      });

      mockPrisma.organization.findUnique.mockRejectedValue(new Error('DB error'));
      mockPrisma.backup.update.mockResolvedValueOnce({
        id: 'backup-1',
        status: 'FAILED',
      });

      await expect(executeOrgBackup('backup-1')).rejects.toThrow('DB error');

      expect(mockPrisma.backup.update.mock.calls[1][0].data.status).toBe('FAILED');
    });
  });

  // ===========================================
  // GET BACKUP
  // ===========================================

  describe('getBackup', () => {
    it('should return backup by ID', async () => {
      mockPrisma.backup.findFirst.mockResolvedValue({ id: 'backup-1' });

      const result = await getBackup('backup-1');

      expect(result.id).toBe('backup-1');
    });

    it('should scope by orgId when provided', async () => {
      mockPrisma.backup.findFirst.mockResolvedValue({ id: 'backup-1' });

      await getBackup('backup-1', 'org-1');

      expect(mockPrisma.backup.findFirst).toHaveBeenCalledWith({
        where: { id: 'backup-1', organizationId: 'org-1' },
      });
    });

    it('should throw BACKUP_NOT_FOUND when not found', async () => {
      mockPrisma.backup.findFirst.mockResolvedValue(null);

      await expect(getBackup('nonexistent')).rejects.toThrow('BACKUP_NOT_FOUND');
    });
  });

  // ===========================================
  // LIST ORG BACKUPS
  // ===========================================

  describe('listOrgBackups', () => {
    it('should return backups for an organisation', async () => {
      mockPrisma.backup.findMany.mockResolvedValue([{ id: 'backup-1' }]);

      const result = await listOrgBackups('org-1');

      expect(result).toHaveLength(1);
      expect(mockPrisma.backup.findMany).toHaveBeenCalledWith({
        where: { organizationId: 'org-1', type: 'ORGANISATION' },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  // ===========================================
  // DOWNLOAD BACKUP
  // ===========================================

  describe('downloadBackup', () => {
    it('should return buffer and fileName', async () => {
      mockPrisma.backup.findFirst.mockResolvedValue({
        id: 'backup-1',
        storagePath: 'org/backup.tar.gz',
        fileName: 'backup.tar.gz',
        status: 'COMPLETED',
      });
      mockBackupStorage.download.mockResolvedValue(Buffer.from('data'));

      const result = await downloadBackup('backup-1');

      expect(result.buffer).toEqual(Buffer.from('data'));
      expect(result.fileName).toBe('backup.tar.gz');
    });

    it('should throw BACKUP_NOT_AVAILABLE if not completed', async () => {
      mockPrisma.backup.findFirst.mockResolvedValue({
        id: 'backup-1',
        storagePath: null,
        status: 'PENDING',
      });

      await expect(downloadBackup('backup-1')).rejects.toThrow('BACKUP_NOT_AVAILABLE');
    });
  });

  // ===========================================
  // DELETE BACKUP
  // ===========================================

  describe('deleteBackup', () => {
    it('should delete from storage and database', async () => {
      mockPrisma.backup.findFirst.mockResolvedValue({
        id: 'backup-1',
        storagePath: 'org/backup.tar.gz',
      });
      mockBackupStorage.delete.mockResolvedValue(undefined);
      mockPrisma.backup.delete.mockResolvedValue({});

      await deleteBackup('backup-1');

      expect(mockBackupStorage.delete).toHaveBeenCalledWith('org/backup.tar.gz');
      expect(mockPrisma.backup.delete).toHaveBeenCalledWith({ where: { id: 'backup-1' } });
    });
  });

  // ===========================================
  // CLEANUP OLD BACKUPS
  // ===========================================

  describe('cleanupOldBackups', () => {
    it('should delete backups older than retention period', async () => {
      const oldBackups = [
        { id: 'old-1', storagePath: 'path1' },
        { id: 'old-2', storagePath: 'path2' },
      ];
      mockPrisma.backup.findMany.mockResolvedValue(oldBackups);
      mockBackupStorage.delete.mockResolvedValue(undefined);
      mockPrisma.backup.deleteMany.mockResolvedValue({ count: 2 });

      const count = await cleanupOldBackups();

      expect(count).toBe(2);
      expect(mockBackupStorage.delete).toHaveBeenCalledTimes(2);
      expect(mockPrisma.backup.deleteMany).toHaveBeenCalledWith({
        where: { id: { in: ['old-1', 'old-2'] } },
      });
    });

    it('should return 0 when no old backups exist', async () => {
      mockPrisma.backup.findMany.mockResolvedValue([]);
      mockPrisma.backup.deleteMany.mockResolvedValue({ count: 0 });

      const count = await cleanupOldBackups();

      expect(count).toBe(0);
    });
  });
});
