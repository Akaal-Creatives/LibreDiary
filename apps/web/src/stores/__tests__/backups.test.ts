import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useBackupsStore } from '../backups';
import { backupsService } from '@/services/backups.service';

vi.mock('@/services/backups.service', () => ({
  backupsService: {
    listOrgBackups: vi.fn(),
    createOrgBackup: vi.fn(),
    getOrgBackup: vi.fn(),
    downloadOrgBackup: vi.fn(),
    deleteOrgBackup: vi.fn(),
    listAllBackups: vi.fn(),
    getBackupSettings: vi.fn(),
    checkPgDump: vi.fn(),
    createSystemBackup: vi.fn(),
    downloadSystemBackup: vi.fn(),
    deleteSystemBackup: vi.fn(),
  },
}));

vi.mock('../auth', () => ({
  useAuthStore: () => ({
    currentOrganizationId: 'org-1',
  }),
}));

const mockedService = vi.mocked(backupsService);

describe('useBackupsStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  // ===========================================
  // FETCH ORG BACKUPS
  // ===========================================

  describe('fetchOrgBackups', () => {
    it('should populate orgBackups list', async () => {
      const mockBackups = [createMockBackup(), createMockBackup('backup-2')];
      mockedService.listOrgBackups.mockResolvedValue({ backups: mockBackups });

      const store = useBackupsStore();
      await store.fetchOrgBackups();

      expect(store.orgBackups).toHaveLength(2);
      expect(mockedService.listOrgBackups).toHaveBeenCalledWith('org-1');
    });

    it('should set loading state', async () => {
      mockedService.listOrgBackups.mockResolvedValue({ backups: [] });

      const store = useBackupsStore();
      const promise = store.fetchOrgBackups();

      expect(store.loading).toBe(true);
      await promise;
      expect(store.loading).toBe(false);
    });

    it('should set error on failure', async () => {
      mockedService.listOrgBackups.mockRejectedValue(new Error('Network error'));

      const store = useBackupsStore();
      await store.fetchOrgBackups();

      expect(store.error).toBe('Network error');
      expect(store.loading).toBe(false);
    });
  });

  // ===========================================
  // CREATE ORG BACKUP
  // ===========================================

  describe('createOrgBackup', () => {
    it('should create backup and add to list', async () => {
      const mockBackup = createMockBackup();
      mockedService.createOrgBackup.mockResolvedValue({ backup: mockBackup });

      const store = useBackupsStore();
      const result = await store.createOrgBackup();

      expect(result.id).toBe('backup-1');
      expect(store.orgBackups).toContainEqual(mockBackup);
      expect(mockedService.createOrgBackup).toHaveBeenCalledWith('org-1', {
        encrypt: false,
        password: undefined,
      });
    });

    it('should track creating state', async () => {
      mockedService.createOrgBackup.mockResolvedValue({ backup: createMockBackup() });

      const store = useBackupsStore();
      const promise = store.createOrgBackup();

      expect(store.creating).toBe(true);
      await promise;
      expect(store.creating).toBe(false);
    });

    it('should pass encryption options', async () => {
      mockedService.createOrgBackup.mockResolvedValue({ backup: createMockBackup() });

      const store = useBackupsStore();
      await store.createOrgBackup({ encrypt: true, password: 'secret' });

      expect(mockedService.createOrgBackup).toHaveBeenCalledWith('org-1', {
        encrypt: true,
        password: 'secret',
      });
    });

    it('should set error on failure', async () => {
      mockedService.createOrgBackup.mockRejectedValue(new Error('Create failed'));

      const store = useBackupsStore();
      await expect(store.createOrgBackup()).rejects.toThrow('Create failed');
      expect(store.error).toBe('Create failed');
      expect(store.creating).toBe(false);
    });
  });

  // ===========================================
  // DELETE ORG BACKUP
  // ===========================================

  describe('deleteOrgBackup', () => {
    it('should remove backup from list', async () => {
      const mockBackup = createMockBackup();
      mockedService.listOrgBackups.mockResolvedValue({ backups: [mockBackup] });
      mockedService.deleteOrgBackup.mockResolvedValue({ message: 'deleted' });

      const store = useBackupsStore();
      await store.fetchOrgBackups();
      expect(store.orgBackups).toHaveLength(1);

      await store.deleteOrgBackup('backup-1');
      expect(store.orgBackups).toHaveLength(0);
      expect(mockedService.deleteOrgBackup).toHaveBeenCalledWith('org-1', 'backup-1');
    });
  });

  // ===========================================
  // FETCH ALL BACKUPS (ADMIN)
  // ===========================================

  describe('fetchAllBackups', () => {
    it('should populate allBackups list', async () => {
      const mockBackups = [
        createMockBackup('sys-1', 'SYSTEM'),
        createMockBackup('org-1', 'ORGANISATION'),
      ];
      mockedService.listAllBackups.mockResolvedValue({ backups: mockBackups });

      const store = useBackupsStore();
      await store.fetchAllBackups();

      expect(store.allBackups).toHaveLength(2);
    });

    it('should set loading state', async () => {
      mockedService.listAllBackups.mockResolvedValue({ backups: [] });

      const store = useBackupsStore();
      const promise = store.fetchAllBackups();

      expect(store.loading).toBe(true);
      await promise;
      expect(store.loading).toBe(false);
    });
  });

  // ===========================================
  // CREATE SYSTEM BACKUP (ADMIN)
  // ===========================================

  describe('createSystemBackup', () => {
    it('should create system backup and add to allBackups', async () => {
      const mockBackup = createMockBackup('sys-1', 'SYSTEM');
      mockedService.createSystemBackup.mockResolvedValue({ backup: mockBackup });

      const store = useBackupsStore();
      const result = await store.createSystemBackup();

      expect(result.type).toBe('SYSTEM');
      expect(store.allBackups).toContainEqual(mockBackup);
    });

    it('should track creating state', async () => {
      mockedService.createSystemBackup.mockResolvedValue({
        backup: createMockBackup('sys-1', 'SYSTEM'),
      });

      const store = useBackupsStore();
      const promise = store.createSystemBackup();

      expect(store.creating).toBe(true);
      await promise;
      expect(store.creating).toBe(false);
    });
  });

  // ===========================================
  // FETCH SETTINGS (ADMIN)
  // ===========================================

  describe('fetchSettings', () => {
    it('should populate settings and pgDumpAvailable', async () => {
      mockedService.getBackupSettings.mockResolvedValue({
        settings: {
          enabled: true,
          storageType: 'LOCAL',
          schedule: '0 2 * * *',
          retentionDays: 30,
          maxSizeMb: 500,
          pgDumpAvailable: true,
        },
      });

      const store = useBackupsStore();
      await store.fetchSettings();

      expect(store.settings?.enabled).toBe(true);
      expect(store.settings?.storageType).toBe('LOCAL');
      expect(store.pgDumpAvailable).toBe(true);
    });
  });

  // ===========================================
  // CHECK PG_DUMP
  // ===========================================

  describe('checkPgDump', () => {
    it('should set pgDumpAvailable', async () => {
      mockedService.checkPgDump.mockResolvedValue({ available: true });

      const store = useBackupsStore();
      await store.checkPgDump();

      expect(store.pgDumpAvailable).toBe(true);
    });

    it('should set pgDumpAvailable to false on error', async () => {
      mockedService.checkPgDump.mockRejectedValue(new Error('Network error'));

      const store = useBackupsStore();
      await store.checkPgDump();

      expect(store.pgDumpAvailable).toBe(false);
    });
  });

  // ===========================================
  // RESET
  // ===========================================

  describe('reset', () => {
    it('should clear all state', async () => {
      mockedService.listOrgBackups.mockResolvedValue({
        backups: [createMockBackup()],
      });

      const store = useBackupsStore();
      await store.fetchOrgBackups();
      expect(store.orgBackups).toHaveLength(1);

      store.reset();

      expect(store.orgBackups).toHaveLength(0);
      expect(store.allBackups).toHaveLength(0);
      expect(store.settings).toBeNull();
      expect(store.loading).toBe(false);
      expect(store.creating).toBe(false);
      expect(store.error).toBeNull();
      expect(store.pgDumpAvailable).toBeNull();
    });
  });
});

// ===========================================
// HELPER
// ===========================================

function createMockBackup(id = 'backup-1', type = 'ORGANISATION') {
  return {
    id,
    type,
    status: 'PENDING',
    organizationId: type === 'ORGANISATION' ? 'org-1' : null,
    fileName: null,
    fileSize: null,
    storagePath: null,
    storageType: null,
    isEncrypted: false,
    errorMessage: null,
    triggeredById: 'user-1',
    startedAt: null,
    completedAt: null,
    createdAt: new Date().toISOString(),
  };
}
