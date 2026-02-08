import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockPrisma, mockBackupStorage, mockExecFileAsync, resetMocks } = vi.hoisted(() => {
  const mockPrismaBackup = {
    create: vi.fn(),
    update: vi.fn(),
    findMany: vi.fn(),
  };

  const mockPrisma = {
    backup: mockPrismaBackup,
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

  const mockExecFileAsync = vi.fn().mockResolvedValue({ stdout: Buffer.from('pg_dump output') });

  function resetMocks() {
    Object.values(mockPrismaBackup).forEach((m) => m.mockReset());
    Object.values(mockBackupStorage).forEach((m) => m.mockReset());
    mockExecFileAsync.mockReset().mockResolvedValue({ stdout: Buffer.from('pg_dump output') });
  }

  return { mockPrisma, mockBackupStorage, mockExecFileAsync, resetMocks };
});

vi.mock('../../../lib/prisma.js', () => ({
  prisma: mockPrisma,
}));

vi.mock('../storage/index.js', () => ({
  getBackupStorageProvider: () => mockBackupStorage,
}));

vi.mock('../../../config/index.js', () => ({
  env: {
    DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/librediary',
    BACKUP_STORAGE_TYPE: 'LOCAL',
    BACKUP_MAX_SIZE_MB: 500,
  },
}));

vi.mock('../utils/encrypt.js', () => ({
  encryptBuffer: vi.fn().mockReturnValue(Buffer.from('encrypted')),
}));

// Mock child_process.execFile — uses execFile (NOT exec) to prevent shell injection
vi.mock('node:child_process', () => ({
  execFile: vi.fn(),
}));

vi.mock('node:util', () => ({
  promisify: () => mockExecFileAsync,
}));

import {
  createSystemBackup,
  listSystemBackups,
  checkPgDumpAvailable,
} from '../system-backup.service.js';

describe('System Backup Service', () => {
  beforeEach(() => {
    resetMocks();
  });

  // ===========================================
  // CREATE SYSTEM BACKUP
  // ===========================================

  describe('createSystemBackup', () => {
    it('should create a PENDING system backup record', async () => {
      const mockBackup = {
        id: 'sys-backup-1',
        type: 'SYSTEM',
        status: 'PENDING',
        triggeredById: 'user-1',
        isEncrypted: false,
      };
      mockPrisma.backup.create.mockResolvedValue(mockBackup);
      mockPrisma.backup.update.mockResolvedValue({ ...mockBackup, status: 'IN_PROGRESS' });

      const result = await createSystemBackup('user-1');

      expect(result.status).toBe('PENDING');
      expect(result.type).toBe('SYSTEM');
      expect(mockPrisma.backup.create).toHaveBeenCalledWith({
        data: {
          type: 'SYSTEM',
          status: 'PENDING',
          triggeredById: 'user-1',
          isEncrypted: false,
        },
      });
    });

    it('should allow triggeredById to be undefined', async () => {
      mockPrisma.backup.create.mockResolvedValue({
        id: 'sys-backup-1',
        type: 'SYSTEM',
        status: 'PENDING',
        triggeredById: null,
      });
      mockPrisma.backup.update.mockResolvedValue({});

      await createSystemBackup();

      expect(mockPrisma.backup.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ triggeredById: null }),
        })
      );
    });
  });

  // ===========================================
  // LIST SYSTEM BACKUPS
  // ===========================================

  describe('listSystemBackups', () => {
    it('should return system backups ordered by createdAt desc', async () => {
      mockPrisma.backup.findMany.mockResolvedValue([
        { id: 'sys-1', type: 'SYSTEM' },
        { id: 'sys-2', type: 'SYSTEM' },
      ]);

      const result = await listSystemBackups();

      expect(result).toHaveLength(2);
      expect(mockPrisma.backup.findMany).toHaveBeenCalledWith({
        where: { type: 'SYSTEM' },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  // ===========================================
  // CHECK PG_DUMP AVAILABLE
  // ===========================================

  describe('checkPgDumpAvailable', () => {
    it('should return true when pg_dump is available', async () => {
      mockExecFileAsync.mockResolvedValue({ stdout: 'pg_dump (PostgreSQL) 16.1' });

      const result = await checkPgDumpAvailable();

      expect(result).toBe(true);
    });

    it('should return false when pg_dump is not available', async () => {
      mockExecFileAsync.mockRejectedValue(new Error('ENOENT'));

      const result = await checkPgDumpAvailable();

      expect(result).toBe(false);
    });
  });
});
