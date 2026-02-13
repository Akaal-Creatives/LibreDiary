import { describe, it, expect, vi, beforeEach } from 'vitest';

// ======================================================
// MOCKS
// ======================================================

const {
  mockPrisma,
  mockBackupStorage,
  mockFileStorage,
  mockExtractTarGz,
  mockDecryptBuffer,
  resetMocks,
} = vi.hoisted(() => {
  const mockPrismaBackup = {
    findFirst: vi.fn(),
  };

  const mockPrismaPage = {
    create: vi.fn(),
  };

  const mockPrismaDatabase = {
    create: vi.fn(),
  };

  const mockPrismaDatabaseProperty = {
    create: vi.fn(),
  };

  const mockPrismaDatabaseView = {
    create: vi.fn(),
  };

  const mockPrismaDatabaseRow = {
    create: vi.fn(),
  };

  const mockPrismaFile = {
    create: vi.fn(),
  };

  const mockPrisma = {
    backup: mockPrismaBackup,
    page: mockPrismaPage,
    database: mockPrismaDatabase,
    databaseProperty: mockPrismaDatabaseProperty,
    databaseView: mockPrismaDatabaseView,
    databaseRow: mockPrismaDatabaseRow,
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

  const mockExtractTarGz = vi.fn();
  const mockDecryptBuffer = vi.fn();

  function resetMocks() {
    Object.values(mockPrismaBackup).forEach((m) => m.mockReset());
    Object.values(mockPrismaPage).forEach((m) => m.mockReset());
    Object.values(mockPrismaDatabase).forEach((m) => m.mockReset());
    Object.values(mockPrismaDatabaseProperty).forEach((m) => m.mockReset());
    Object.values(mockPrismaDatabaseView).forEach((m) => m.mockReset());
    Object.values(mockPrismaDatabaseRow).forEach((m) => m.mockReset());
    Object.values(mockPrismaFile).forEach((m) => m.mockReset());
    Object.values(mockBackupStorage).forEach((m) => m.mockReset());
    Object.values(mockFileStorage).forEach((m) => m.mockReset());
    mockExtractTarGz.mockReset();
    mockDecryptBuffer.mockReset();
  }

  return {
    mockPrisma,
    mockBackupStorage,
    mockFileStorage,
    mockExtractTarGz,
    mockDecryptBuffer,
    resetMocks,
  };
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

vi.mock('../utils/compress.js', () => ({
  extractTarGz: mockExtractTarGz,
}));

vi.mock('../utils/encrypt.js', () => ({
  decryptBuffer: mockDecryptBuffer,
}));

vi.mock('../../../config/index.js', () => ({
  env: {
    STORAGE_TYPE: 'LOCAL',
  },
}));

// Mock fs for reading extracted files
const mockFs = vi.hoisted(() => ({
  readFileSync: vi.fn(),
  existsSync: vi.fn(),
  rmSync: vi.fn(),
  mkdtempSync: vi.fn(),
}));

vi.mock('node:fs', async (importOriginal) => {
  const original = (await importOriginal()) as Record<string, unknown>;
  return {
    ...original,
    readFileSync: mockFs.readFileSync,
    existsSync: mockFs.existsSync,
    rmSync: mockFs.rmSync,
    mkdtempSync: mockFs.mkdtempSync,
    default: {
      ...original,
      readFileSync: mockFs.readFileSync,
      existsSync: mockFs.existsSync,
      rmSync: mockFs.rmSync,
      mkdtempSync: mockFs.mkdtempSync,
    },
  };
});

// Mock audit service
vi.mock('../../audit/audit.service.js', () => ({
  logAudit: vi.fn(),
}));

import { restoreOrgBackup } from '../backup-restore.service.js';

// ======================================================
// HELPERS
// ======================================================

function createManifest(overrides: Record<string, unknown> = {}) {
  return {
    version: 1,
    type: 'organisation',
    exportedAt: '2025-01-15T10:30:00.000Z',
    organisation: { id: 'old-org-1', name: 'Test Org', slug: 'test-org' },
    pages: [],
    databases: [],
    files: [],
    ...overrides,
  };
}

function createBackupRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: 'backup-1',
    type: 'ORGANISATION',
    status: 'COMPLETED',
    organizationId: 'org-1',
    fileName: 'org-test-2025-01-15.tar.gz',
    fileSize: 1024,
    storagePath: 'organisations/org-1/backup.tar.gz',
    storageType: 'LOCAL',
    isEncrypted: false,
    errorMessage: null,
    triggeredById: 'user-1',
    startedAt: new Date(),
    completedAt: new Date(),
    createdAt: new Date(),
    ...overrides,
  };
}

// ======================================================
// TESTS
// ======================================================

describe('Backup Restore Service', () => {
  beforeEach(() => {
    resetMocks();
    mockFs.mkdtempSync.mockReturnValue('/tmp/restore-test');
  });

  // ===========================================
  // BASIC RESTORATION
  // ===========================================

  describe('restoreOrgBackup', () => {
    it('should download backup from storage and extract it', async () => {
      const backup = createBackupRecord();
      const manifest = createManifest();
      const archiveBuffer = Buffer.from('fake-archive');

      mockPrisma.backup.findFirst.mockResolvedValue(backup);
      mockBackupStorage.download.mockResolvedValue(archiveBuffer);
      mockExtractTarGz.mockResolvedValue(undefined);
      mockFs.readFileSync.mockReturnValue(Buffer.from(JSON.stringify(manifest)));

      const result = await restoreOrgBackup('backup-1', 'org-1');

      expect(mockBackupStorage.download).toHaveBeenCalledWith(backup.storagePath);
      expect(mockExtractTarGz).toHaveBeenCalled();
      expect(result.success).toBe(true);
    });

    it('should throw if backup is not found', async () => {
      mockPrisma.backup.findFirst.mockResolvedValue(null);

      await expect(restoreOrgBackup('nonexistent', 'org-1')).rejects.toThrow('BACKUP_NOT_FOUND');
    });

    it('should throw if backup is not completed', async () => {
      mockPrisma.backup.findFirst.mockResolvedValue(createBackupRecord({ status: 'IN_PROGRESS' }));

      await expect(restoreOrgBackup('backup-1', 'org-1')).rejects.toThrow('BACKUP_NOT_AVAILABLE');
    });

    it('should clean up temp directory after restoration', async () => {
      const manifest = createManifest();
      mockPrisma.backup.findFirst.mockResolvedValue(createBackupRecord());
      mockBackupStorage.download.mockResolvedValue(Buffer.from('archive'));
      mockExtractTarGz.mockResolvedValue(undefined);
      mockFs.readFileSync.mockReturnValue(Buffer.from(JSON.stringify(manifest)));

      await restoreOrgBackup('backup-1', 'org-1');

      expect(mockFs.rmSync).toHaveBeenCalledWith('/tmp/restore-test', {
        recursive: true,
        force: true,
      });
    });
  });

  // ===========================================
  // ENCRYPTED BACKUPS
  // ===========================================

  describe('encrypted backups', () => {
    it('should decrypt backup when encrypted and password provided', async () => {
      const backup = createBackupRecord({ isEncrypted: true });
      const manifest = createManifest();
      const encryptedData = Buffer.from('encrypted-data');
      const decryptedData = Buffer.from('decrypted-archive');

      mockPrisma.backup.findFirst.mockResolvedValue(backup);
      mockBackupStorage.download.mockResolvedValue(encryptedData);
      mockDecryptBuffer.mockReturnValue(decryptedData);
      mockExtractTarGz.mockResolvedValue(undefined);
      mockFs.readFileSync.mockReturnValue(Buffer.from(JSON.stringify(manifest)));

      await restoreOrgBackup('backup-1', 'org-1', { password: 'mypassword' });

      expect(mockDecryptBuffer).toHaveBeenCalledWith(encryptedData, 'mypassword');
      expect(mockExtractTarGz).toHaveBeenCalledWith(decryptedData, expect.any(String));
    });

    it('should throw if encrypted but no password provided', async () => {
      const backup = createBackupRecord({ isEncrypted: true });
      mockPrisma.backup.findFirst.mockResolvedValue(backup);

      await expect(restoreOrgBackup('backup-1', 'org-1')).rejects.toThrow(
        'Password required for encrypted backup'
      );
    });
  });

  // ===========================================
  // PAGE RESTORATION
  // ===========================================

  describe('page restoration', () => {
    it('should create pages from manifest', async () => {
      const manifest = createManifest({
        pages: [
          {
            id: 'page-1',
            title: 'Test Page',
            icon: '📄',
            parentId: null,
            position: 0,
            htmlContent: '<p>Hello</p>',
            isPublic: false,
            createdAt: '2025-01-10T00:00:00.000Z',
            updatedAt: '2025-01-10T00:00:00.000Z',
          },
        ],
      });

      mockPrisma.backup.findFirst.mockResolvedValue(createBackupRecord());
      mockBackupStorage.download.mockResolvedValue(Buffer.from('archive'));
      mockExtractTarGz.mockResolvedValue(undefined);
      mockFs.readFileSync.mockReturnValue(Buffer.from(JSON.stringify(manifest)));
      mockPrisma.page.create.mockResolvedValue({ id: 'new-page-1' });

      const result = await restoreOrgBackup('backup-1', 'org-1');

      expect(mockPrisma.page.create).toHaveBeenCalledTimes(1);
      expect(mockPrisma.page.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          organizationId: 'org-1',
          title: 'Test Page',
          htmlContent: '<p>Hello</p>',
          icon: '📄',
          position: 0,
          isPublic: false,
        }),
      });
      expect(result.pagesRestored).toBe(1);
    });

    it('should restore page hierarchy by mapping old parent IDs to new ones', async () => {
      const manifest = createManifest({
        pages: [
          {
            id: 'parent-page',
            title: 'Parent',
            icon: null,
            parentId: null,
            position: 0,
            htmlContent: '',
            isPublic: false,
            createdAt: '2025-01-10T00:00:00.000Z',
            updatedAt: '2025-01-10T00:00:00.000Z',
          },
          {
            id: 'child-page',
            title: 'Child',
            icon: null,
            parentId: 'parent-page',
            position: 0,
            htmlContent: '',
            isPublic: false,
            createdAt: '2025-01-10T00:00:00.000Z',
            updatedAt: '2025-01-10T00:00:00.000Z',
          },
        ],
      });

      mockPrisma.backup.findFirst.mockResolvedValue(createBackupRecord());
      mockBackupStorage.download.mockResolvedValue(Buffer.from('archive'));
      mockExtractTarGz.mockResolvedValue(undefined);
      mockFs.readFileSync.mockReturnValue(Buffer.from(JSON.stringify(manifest)));
      mockPrisma.page.create
        .mockResolvedValueOnce({ id: 'new-parent-id' })
        .mockResolvedValueOnce({ id: 'new-child-id' });

      await restoreOrgBackup('backup-1', 'org-1');

      // Second page should reference new parent ID
      const secondCall = mockPrisma.page.create.mock.calls[1]![0];
      expect(secondCall.data.parentId).toBe('new-parent-id');
    });
  });

  // ===========================================
  // DATABASE RESTORATION
  // ===========================================

  describe('database restoration', () => {
    it('should create databases with properties, views, and rows', async () => {
      const manifest = createManifest({
        databases: [
          {
            id: 'db-1',
            name: 'Tasks',
            pageId: null,
            properties: [{ id: 'prop-1', name: 'Title', type: 'TEXT', position: 0, config: {} }],
            views: [{ id: 'view-1', name: 'Table', type: 'TABLE', position: 0, config: {} }],
            rows: [
              {
                id: 'row-1',
                position: 0,
                cells: { 'prop-1': 'Task 1' },
                createdAt: '2025-01-10T00:00:00.000Z',
              },
            ],
          },
        ],
      });

      mockPrisma.backup.findFirst.mockResolvedValue(createBackupRecord());
      mockBackupStorage.download.mockResolvedValue(Buffer.from('archive'));
      mockExtractTarGz.mockResolvedValue(undefined);
      mockFs.readFileSync.mockReturnValue(Buffer.from(JSON.stringify(manifest)));
      mockPrisma.database.create.mockResolvedValue({ id: 'new-db-1' });
      mockPrisma.databaseProperty.create.mockResolvedValue({ id: 'new-prop-1' });
      mockPrisma.databaseView.create.mockResolvedValue({ id: 'new-view-1' });
      mockPrisma.databaseRow.create.mockResolvedValue({ id: 'new-row-1' });

      const result = await restoreOrgBackup('backup-1', 'org-1');

      expect(mockPrisma.database.create).toHaveBeenCalledTimes(1);
      expect(mockPrisma.databaseProperty.create).toHaveBeenCalledTimes(1);
      expect(mockPrisma.databaseView.create).toHaveBeenCalledTimes(1);
      expect(mockPrisma.databaseRow.create).toHaveBeenCalledTimes(1);
      expect(result.databasesRestored).toBe(1);
    });
  });

  // ===========================================
  // FILE RESTORATION
  // ===========================================

  describe('file restoration', () => {
    it('should upload files to storage and create DB records', async () => {
      const manifest = createManifest({
        files: [
          {
            id: 'file-1',
            name: 'doc.pdf',
            originalName: 'document.pdf',
            mimeType: 'application/pdf',
            size: 1024,
            pageId: null,
            archivePath: 'files/doc.pdf',
            createdAt: '2025-01-10T00:00:00.000Z',
          },
        ],
      });

      mockPrisma.backup.findFirst.mockResolvedValue(createBackupRecord());
      mockBackupStorage.download.mockResolvedValue(Buffer.from('archive'));
      mockExtractTarGz.mockResolvedValue(undefined);
      mockFs.readFileSync.mockReturnValue(Buffer.from(JSON.stringify(manifest)));
      mockFs.existsSync.mockReturnValue(true);
      mockFileStorage.upload.mockResolvedValue('org-1/doc.pdf');
      mockFileStorage.getUrl.mockResolvedValue('/uploads/org-1/doc.pdf');
      mockPrisma.file.create.mockResolvedValue({ id: 'new-file-1' });

      const result = await restoreOrgBackup('backup-1', 'org-1');

      expect(mockFileStorage.upload).toHaveBeenCalledTimes(1);
      expect(mockPrisma.file.create).toHaveBeenCalledTimes(1);
      expect(result.filesRestored).toBe(1);
    });

    it('should skip files that are missing from the archive', async () => {
      const manifest = createManifest({
        files: [
          {
            id: 'file-1',
            name: 'missing.pdf',
            originalName: 'missing.pdf',
            mimeType: 'application/pdf',
            size: 1024,
            pageId: null,
            archivePath: 'files/missing.pdf',
            createdAt: '2025-01-10T00:00:00.000Z',
          },
        ],
      });

      mockPrisma.backup.findFirst.mockResolvedValue(createBackupRecord());
      mockBackupStorage.download.mockResolvedValue(Buffer.from('archive'));
      mockExtractTarGz.mockResolvedValue(undefined);
      mockFs.readFileSync.mockReturnValue(Buffer.from(JSON.stringify(manifest)));
      mockFs.existsSync.mockReturnValue(false);

      const result = await restoreOrgBackup('backup-1', 'org-1');

      expect(mockFileStorage.upload).not.toHaveBeenCalled();
      expect(result.filesRestored).toBe(0);
    });
  });

  // ===========================================
  // RESULT SUMMARY
  // ===========================================

  describe('result summary', () => {
    it('should return counts of all restored items', async () => {
      const manifest = createManifest({
        pages: [
          {
            id: 'p1',
            title: 'Page',
            icon: null,
            parentId: null,
            position: 0,
            htmlContent: '',
            isPublic: false,
            createdAt: '2025-01-10T00:00:00.000Z',
            updatedAt: '2025-01-10T00:00:00.000Z',
          },
        ],
        databases: [
          {
            id: 'db1',
            name: 'DB',
            pageId: null,
            properties: [],
            views: [],
            rows: [],
          },
        ],
      });

      mockPrisma.backup.findFirst.mockResolvedValue(createBackupRecord());
      mockBackupStorage.download.mockResolvedValue(Buffer.from('archive'));
      mockExtractTarGz.mockResolvedValue(undefined);
      mockFs.readFileSync.mockReturnValue(Buffer.from(JSON.stringify(manifest)));
      mockPrisma.page.create.mockResolvedValue({ id: 'np1' });
      mockPrisma.database.create.mockResolvedValue({ id: 'ndb1' });

      const result = await restoreOrgBackup('backup-1', 'org-1');

      expect(result).toEqual({
        success: true,
        pagesRestored: 1,
        databasesRestored: 1,
        filesRestored: 0,
      });
    });
  });

  // ===========================================
  // MANIFEST VALIDATION
  // ===========================================

  describe('manifest validation', () => {
    it('should throw for unsupported manifest version', async () => {
      const manifest = createManifest({ version: 99 });

      mockPrisma.backup.findFirst.mockResolvedValue(createBackupRecord());
      mockBackupStorage.download.mockResolvedValue(Buffer.from('archive'));
      mockExtractTarGz.mockResolvedValue(undefined);
      mockFs.readFileSync.mockReturnValue(Buffer.from(JSON.stringify(manifest)));

      await expect(restoreOrgBackup('backup-1', 'org-1')).rejects.toThrow(
        'Unsupported backup manifest version: 99'
      );
    });
  });

  // ===========================================
  // TEMP DIR CLEANUP ON ERROR
  // ===========================================

  describe('temp directory cleanup', () => {
    it('should clean up temp directory even when extraction fails', async () => {
      mockPrisma.backup.findFirst.mockResolvedValue(createBackupRecord());
      mockBackupStorage.download.mockResolvedValue(Buffer.from('archive'));
      mockExtractTarGz.mockRejectedValue(new Error('Corrupt archive'));

      await expect(restoreOrgBackup('backup-1', 'org-1')).rejects.toThrow('Corrupt archive');

      expect(mockFs.rmSync).toHaveBeenCalledWith('/tmp/restore-test', {
        recursive: true,
        force: true,
      });
    });

    it('should clean up temp directory when page restoration fails', async () => {
      const manifest = createManifest({
        pages: [
          {
            id: 'p1',
            title: 'Page',
            icon: null,
            parentId: null,
            position: 0,
            htmlContent: '',
            isPublic: false,
            createdAt: '2025-01-10T00:00:00.000Z',
            updatedAt: '2025-01-10T00:00:00.000Z',
          },
        ],
      });

      mockPrisma.backup.findFirst.mockResolvedValue(createBackupRecord());
      mockBackupStorage.download.mockResolvedValue(Buffer.from('archive'));
      mockExtractTarGz.mockResolvedValue(undefined);
      mockFs.readFileSync.mockReturnValue(Buffer.from(JSON.stringify(manifest)));
      mockPrisma.page.create.mockRejectedValue(new Error('DB constraint violation'));

      await expect(restoreOrgBackup('backup-1', 'org-1')).rejects.toThrow(
        'DB constraint violation'
      );

      expect(mockFs.rmSync).toHaveBeenCalledWith('/tmp/restore-test', {
        recursive: true,
        force: true,
      });
    });
  });

  // ===========================================
  // BACKUP STATUS VALIDATION
  // ===========================================

  describe('backup status validation', () => {
    it('should throw BACKUP_NOT_AVAILABLE for PENDING backups', async () => {
      mockPrisma.backup.findFirst.mockResolvedValue(createBackupRecord({ status: 'PENDING' }));

      await expect(restoreOrgBackup('backup-1', 'org-1')).rejects.toThrow('BACKUP_NOT_AVAILABLE');
    });

    it('should throw BACKUP_NOT_AVAILABLE for FAILED backups', async () => {
      mockPrisma.backup.findFirst.mockResolvedValue(createBackupRecord({ status: 'FAILED' }));

      await expect(restoreOrgBackup('backup-1', 'org-1')).rejects.toThrow('BACKUP_NOT_AVAILABLE');
    });
  });

  // ===========================================
  // DEEP PAGE HIERARCHY
  // ===========================================

  describe('deep page hierarchy', () => {
    it('should correctly map three-level grandparent-parent-child hierarchy', async () => {
      const manifest = createManifest({
        pages: [
          {
            id: 'gp',
            title: 'Grandparent',
            icon: null,
            parentId: null,
            position: 0,
            htmlContent: '',
            isPublic: false,
            createdAt: '2025-01-10T00:00:00.000Z',
            updatedAt: '2025-01-10T00:00:00.000Z',
          },
          {
            id: 'parent',
            title: 'Parent',
            icon: null,
            parentId: 'gp',
            position: 0,
            htmlContent: '',
            isPublic: false,
            createdAt: '2025-01-10T00:00:00.000Z',
            updatedAt: '2025-01-10T00:00:00.000Z',
          },
          {
            id: 'child',
            title: 'Child',
            icon: null,
            parentId: 'parent',
            position: 0,
            htmlContent: '',
            isPublic: false,
            createdAt: '2025-01-10T00:00:00.000Z',
            updatedAt: '2025-01-10T00:00:00.000Z',
          },
        ],
      });

      mockPrisma.backup.findFirst.mockResolvedValue(createBackupRecord());
      mockBackupStorage.download.mockResolvedValue(Buffer.from('archive'));
      mockExtractTarGz.mockResolvedValue(undefined);
      mockFs.readFileSync.mockReturnValue(Buffer.from(JSON.stringify(manifest)));
      mockPrisma.page.create
        .mockResolvedValueOnce({ id: 'new-gp' })
        .mockResolvedValueOnce({ id: 'new-parent' })
        .mockResolvedValueOnce({ id: 'new-child' });

      await restoreOrgBackup('backup-1', 'org-1');

      // Grandparent has no parent
      expect(mockPrisma.page.create.mock.calls[0]![0].data.parentId).toBeNull();
      // Parent references new grandparent ID
      expect(mockPrisma.page.create.mock.calls[1]![0].data.parentId).toBe('new-gp');
      // Child references new parent ID
      expect(mockPrisma.page.create.mock.calls[2]![0].data.parentId).toBe('new-parent');
    });

    it('should set parentId to null when parent is not in the manifest (orphan)', async () => {
      const manifest = createManifest({
        pages: [
          {
            id: 'orphan',
            title: 'Orphan Page',
            icon: null,
            parentId: 'nonexistent-parent',
            position: 0,
            htmlContent: '',
            isPublic: false,
            createdAt: '2025-01-10T00:00:00.000Z',
            updatedAt: '2025-01-10T00:00:00.000Z',
          },
        ],
      });

      mockPrisma.backup.findFirst.mockResolvedValue(createBackupRecord());
      mockBackupStorage.download.mockResolvedValue(Buffer.from('archive'));
      mockExtractTarGz.mockResolvedValue(undefined);
      mockFs.readFileSync.mockReturnValue(Buffer.from(JSON.stringify(manifest)));
      mockPrisma.page.create.mockResolvedValue({ id: 'new-orphan' });

      await restoreOrgBackup('backup-1', 'org-1');

      expect(mockPrisma.page.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          parentId: null,
        }),
      });
    });
  });

  // ===========================================
  // EMPTY MANIFEST
  // ===========================================

  describe('empty manifest', () => {
    it('should return zero counts when manifest has no data', async () => {
      const manifest = createManifest();

      mockPrisma.backup.findFirst.mockResolvedValue(createBackupRecord());
      mockBackupStorage.download.mockResolvedValue(Buffer.from('archive'));
      mockExtractTarGz.mockResolvedValue(undefined);
      mockFs.readFileSync.mockReturnValue(Buffer.from(JSON.stringify(manifest)));

      const result = await restoreOrgBackup('backup-1', 'org-1');

      expect(result).toEqual({
        success: true,
        pagesRestored: 0,
        databasesRestored: 0,
        filesRestored: 0,
      });
      expect(mockPrisma.page.create).not.toHaveBeenCalled();
      expect(mockPrisma.database.create).not.toHaveBeenCalled();
      expect(mockFileStorage.upload).not.toHaveBeenCalled();
    });
  });

  // ===========================================
  // NON-ENCRYPTED PATH
  // ===========================================

  describe('non-encrypted backups', () => {
    it('should not call decryptBuffer for non-encrypted backups', async () => {
      const manifest = createManifest();
      mockPrisma.backup.findFirst.mockResolvedValue(createBackupRecord({ isEncrypted: false }));
      mockBackupStorage.download.mockResolvedValue(Buffer.from('archive'));
      mockExtractTarGz.mockResolvedValue(undefined);
      mockFs.readFileSync.mockReturnValue(Buffer.from(JSON.stringify(manifest)));

      await restoreOrgBackup('backup-1', 'org-1');

      expect(mockDecryptBuffer).not.toHaveBeenCalled();
    });

    it('should pass raw archive data to extractTarGz when not encrypted', async () => {
      const manifest = createManifest();
      const rawArchive = Buffer.from('raw-archive-data');
      mockPrisma.backup.findFirst.mockResolvedValue(createBackupRecord({ isEncrypted: false }));
      mockBackupStorage.download.mockResolvedValue(rawArchive);
      mockExtractTarGz.mockResolvedValue(undefined);
      mockFs.readFileSync.mockReturnValue(Buffer.from(JSON.stringify(manifest)));

      await restoreOrgBackup('backup-1', 'org-1');

      expect(mockExtractTarGz).toHaveBeenCalledWith(rawArchive, '/tmp/restore-test');
    });
  });

  // ===========================================
  // DECRYPTION ERROR PROPAGATION
  // ===========================================

  describe('decryption errors', () => {
    it('should propagate decryption errors', async () => {
      const backup = createBackupRecord({ isEncrypted: true });
      mockPrisma.backup.findFirst.mockResolvedValue(backup);
      mockBackupStorage.download.mockResolvedValue(Buffer.from('encrypted'));
      mockDecryptBuffer.mockImplementation(() => {
        throw new Error('Decryption failed: invalid password');
      });

      await expect(
        restoreOrgBackup('backup-1', 'org-1', { password: 'wrongpassword' })
      ).rejects.toThrow('Decryption failed: invalid password');
    });
  });

  // ===========================================
  // MULTIPLE DATABASES
  // ===========================================

  describe('multiple databases', () => {
    it('should restore multiple databases independently', async () => {
      const manifest = createManifest({
        databases: [
          {
            id: 'db-1',
            name: 'Tasks',
            pageId: null,
            properties: [{ id: 'p1', name: 'Title', type: 'TEXT', position: 0, config: {} }],
            views: [],
            rows: [],
          },
          {
            id: 'db-2',
            name: 'Projects',
            pageId: null,
            properties: [],
            views: [{ id: 'v1', name: 'Board', type: 'KANBAN', position: 0, config: {} }],
            rows: [
              {
                id: 'r1',
                position: 0,
                cells: { title: 'Project A' },
                createdAt: '2025-01-10T00:00:00.000Z',
              },
            ],
          },
        ],
      });

      mockPrisma.backup.findFirst.mockResolvedValue(createBackupRecord());
      mockBackupStorage.download.mockResolvedValue(Buffer.from('archive'));
      mockExtractTarGz.mockResolvedValue(undefined);
      mockFs.readFileSync.mockReturnValue(Buffer.from(JSON.stringify(manifest)));
      mockPrisma.database.create
        .mockResolvedValueOnce({ id: 'new-db-1' })
        .mockResolvedValueOnce({ id: 'new-db-2' });
      mockPrisma.databaseProperty.create.mockResolvedValue({ id: 'new-prop' });
      mockPrisma.databaseView.create.mockResolvedValue({ id: 'new-view' });
      mockPrisma.databaseRow.create.mockResolvedValue({ id: 'new-row' });

      const result = await restoreOrgBackup('backup-1', 'org-1');

      expect(mockPrisma.database.create).toHaveBeenCalledTimes(2);
      expect(mockPrisma.databaseProperty.create).toHaveBeenCalledTimes(1);
      expect(mockPrisma.databaseView.create).toHaveBeenCalledTimes(1);
      expect(mockPrisma.databaseRow.create).toHaveBeenCalledTimes(1);
      expect(result.databasesRestored).toBe(2);

      // Verify each database gets the correct new ID for its children
      expect(mockPrisma.databaseProperty.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ databaseId: 'new-db-1' }),
      });
      expect(mockPrisma.databaseView.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ databaseId: 'new-db-2' }),
      });
      expect(mockPrisma.databaseRow.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ databaseId: 'new-db-2' }),
      });
    });
  });

  // ===========================================
  // FILE RESTORATION DETAILS
  // ===========================================

  describe('file restoration details', () => {
    it('should upload with correct path and pass all fields to DB record', async () => {
      const manifest = createManifest({
        files: [
          {
            id: 'file-1',
            name: 'image.png',
            originalName: 'my-photo.png',
            mimeType: 'image/png',
            size: 2048,
            pageId: null,
            archivePath: 'files/image.png',
            createdAt: '2025-01-10T00:00:00.000Z',
          },
        ],
      });

      mockPrisma.backup.findFirst.mockResolvedValue(createBackupRecord());
      mockBackupStorage.download.mockResolvedValue(Buffer.from('archive'));
      mockExtractTarGz.mockResolvedValue(undefined);
      mockFs.readFileSync.mockReturnValue(Buffer.from(JSON.stringify(manifest)));
      mockFs.existsSync.mockReturnValue(true);
      mockFileStorage.upload.mockResolvedValue('org-1/image.png');
      mockFileStorage.getUrl.mockResolvedValue('/uploads/org-1/image.png');
      mockPrisma.file.create.mockResolvedValue({ id: 'new-file-1' });

      await restoreOrgBackup('backup-1', 'org-1');

      // Verify upload path format
      expect(mockFileStorage.upload).toHaveBeenCalledWith(
        'org-1/image.png',
        expect.any(Buffer),
        'image/png'
      );

      // Verify all DB fields
      expect(mockPrisma.file.create).toHaveBeenCalledWith({
        data: {
          organizationId: 'org-1',
          name: 'image.png',
          originalName: 'my-photo.png',
          mimeType: 'image/png',
          size: 2048,
          storagePath: 'org-1/image.png',
          storageType: 'LOCAL',
          url: '/uploads/org-1/image.png',
        },
      });
    });

    it('should restore multiple files and count correctly', async () => {
      const manifest = createManifest({
        files: [
          {
            id: 'f1',
            name: 'a.pdf',
            originalName: 'a.pdf',
            mimeType: 'application/pdf',
            size: 100,
            pageId: null,
            archivePath: 'files/a.pdf',
            createdAt: '2025-01-10T00:00:00.000Z',
          },
          {
            id: 'f2',
            name: 'b.jpg',
            originalName: 'b.jpg',
            mimeType: 'image/jpeg',
            size: 200,
            pageId: null,
            archivePath: 'files/b.jpg',
            createdAt: '2025-01-10T00:00:00.000Z',
          },
          {
            id: 'f3',
            name: 'c.txt',
            originalName: 'c.txt',
            mimeType: 'text/plain',
            size: 50,
            pageId: null,
            archivePath: 'files/c.txt',
            createdAt: '2025-01-10T00:00:00.000Z',
          },
        ],
      });

      mockPrisma.backup.findFirst.mockResolvedValue(createBackupRecord());
      mockBackupStorage.download.mockResolvedValue(Buffer.from('archive'));
      mockExtractTarGz.mockResolvedValue(undefined);
      mockFs.readFileSync.mockReturnValue(Buffer.from(JSON.stringify(manifest)));
      // First and third files exist, second is missing
      mockFs.existsSync
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(true);
      mockFileStorage.upload.mockResolvedValue('path');
      mockFileStorage.getUrl.mockResolvedValue('/url');
      mockPrisma.file.create.mockResolvedValue({ id: 'new-file' });

      const result = await restoreOrgBackup('backup-1', 'org-1');

      expect(result.filesRestored).toBe(2);
      expect(mockFileStorage.upload).toHaveBeenCalledTimes(2);
      expect(mockPrisma.file.create).toHaveBeenCalledTimes(2);
    });
  });

  // ===========================================
  // DATABASE PROPERTY/VIEW/ROW DETAILS
  // ===========================================

  describe('database child entity details', () => {
    it('should pass correct fields for properties, views, and rows', async () => {
      const manifest = createManifest({
        databases: [
          {
            id: 'db-1',
            name: 'Tracker',
            pageId: null,
            properties: [
              {
                id: 'prop-1',
                name: 'Status',
                type: 'SELECT',
                position: 1,
                config: { options: ['Todo', 'Done'] },
              },
            ],
            views: [
              {
                id: 'view-1',
                name: 'Board View',
                type: 'KANBAN',
                position: 0,
                config: { groupBy: 'Status' },
              },
            ],
            rows: [
              {
                id: 'row-1',
                position: 0,
                cells: { 'prop-1': 'Todo' },
                createdAt: '2025-01-10T00:00:00.000Z',
              },
            ],
          },
        ],
      });

      mockPrisma.backup.findFirst.mockResolvedValue(createBackupRecord());
      mockBackupStorage.download.mockResolvedValue(Buffer.from('archive'));
      mockExtractTarGz.mockResolvedValue(undefined);
      mockFs.readFileSync.mockReturnValue(Buffer.from(JSON.stringify(manifest)));
      mockPrisma.database.create.mockResolvedValue({ id: 'new-db-1' });
      mockPrisma.databaseProperty.create.mockResolvedValue({ id: 'new-prop' });
      mockPrisma.databaseView.create.mockResolvedValue({ id: 'new-view' });
      mockPrisma.databaseRow.create.mockResolvedValue({ id: 'new-row' });

      await restoreOrgBackup('backup-1', 'org-1');

      expect(mockPrisma.databaseProperty.create).toHaveBeenCalledWith({
        data: {
          databaseId: 'new-db-1',
          name: 'Status',
          type: 'SELECT',
          position: 1,
          config: { options: ['Todo', 'Done'] },
        },
      });

      expect(mockPrisma.databaseView.create).toHaveBeenCalledWith({
        data: {
          databaseId: 'new-db-1',
          name: 'Board View',
          type: 'KANBAN',
          position: 0,
          config: { groupBy: 'Status' },
        },
      });

      expect(mockPrisma.databaseRow.create).toHaveBeenCalledWith({
        data: {
          databaseId: 'new-db-1',
          position: 0,
          cells: { 'prop-1': 'Todo' },
        },
      });
    });
  });
});
