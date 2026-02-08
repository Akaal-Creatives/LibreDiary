import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockApi } = vi.hoisted(() => ({
  mockApi: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    upload: vi.fn(),
  },
}));

vi.mock('../api', () => ({
  api: mockApi,
}));

import { backupsService } from '../backups.service';

describe('Backups Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===========================================
  // ORG BACKUP ENDPOINTS
  // ===========================================

  describe('listOrgBackups', () => {
    it('should GET from correct endpoint', async () => {
      mockApi.get.mockResolvedValue({ backups: [] });

      await backupsService.listOrgBackups('org-1');

      expect(mockApi.get).toHaveBeenCalledWith('/organizations/org-1/backups');
    });
  });

  describe('createOrgBackup', () => {
    it('should POST to correct endpoint', async () => {
      mockApi.post.mockResolvedValue({ backup: { id: 'backup-1' } });

      await backupsService.createOrgBackup('org-1', { encrypt: false });

      expect(mockApi.post).toHaveBeenCalledWith('/organizations/org-1/backups', {
        encrypt: false,
      });
    });

    it('should pass encryption options', async () => {
      mockApi.post.mockResolvedValue({ backup: { id: 'backup-1' } });

      await backupsService.createOrgBackup('org-1', { encrypt: true, password: 'secret' });

      expect(mockApi.post).toHaveBeenCalledWith('/organizations/org-1/backups', {
        encrypt: true,
        password: 'secret',
      });
    });
  });

  describe('getOrgBackup', () => {
    it('should GET from correct endpoint', async () => {
      mockApi.get.mockResolvedValue({ backup: { id: 'backup-1' } });

      await backupsService.getOrgBackup('org-1', 'backup-1');

      expect(mockApi.get).toHaveBeenCalledWith('/organizations/org-1/backups/backup-1');
    });
  });

  describe('deleteOrgBackup', () => {
    it('should DELETE from correct endpoint', async () => {
      mockApi.delete.mockResolvedValue({ message: 'deleted' });

      await backupsService.deleteOrgBackup('org-1', 'backup-1');

      expect(mockApi.delete).toHaveBeenCalledWith('/organizations/org-1/backups/backup-1');
    });
  });

  // ===========================================
  // ADMIN BACKUP ENDPOINTS
  // ===========================================

  describe('listAllBackups', () => {
    it('should GET from admin endpoint', async () => {
      mockApi.get.mockResolvedValue({ backups: [] });

      await backupsService.listAllBackups();

      expect(mockApi.get).toHaveBeenCalledWith('/admin/backups');
    });
  });

  describe('getBackupSettings', () => {
    it('should GET from admin settings endpoint', async () => {
      mockApi.get.mockResolvedValue({
        settings: { enabled: true, storageType: 'LOCAL', schedule: '0 2 * * *' },
      });

      await backupsService.getBackupSettings();

      expect(mockApi.get).toHaveBeenCalledWith('/admin/backups/settings');
    });
  });

  describe('checkPgDump', () => {
    it('should GET from pg-dump-check endpoint', async () => {
      mockApi.get.mockResolvedValue({ available: true });

      await backupsService.checkPgDump();

      expect(mockApi.get).toHaveBeenCalledWith('/admin/backups/pg-dump-check');
    });
  });

  describe('createSystemBackup', () => {
    it('should POST to admin system backup endpoint', async () => {
      mockApi.post.mockResolvedValue({ backup: { id: 'sys-1' } });

      await backupsService.createSystemBackup({ encrypt: false });

      expect(mockApi.post).toHaveBeenCalledWith('/admin/backups/system', { encrypt: false });
    });
  });

  describe('deleteSystemBackup', () => {
    it('should DELETE from admin system backup endpoint', async () => {
      mockApi.delete.mockResolvedValue({ message: 'deleted' });

      await backupsService.deleteSystemBackup('sys-1');

      expect(mockApi.delete).toHaveBeenCalledWith('/admin/backups/system/sys-1');
    });
  });
});
