import { api } from './api';
import type { Backup, BackupSettings } from '@librediary/shared';

// ===========================================
// TYPES
// ===========================================

export interface CreateBackupInput {
  encrypt: boolean;
  password?: string;
}

// ===========================================
// SERVICE
// ===========================================

export const backupsService = {
  // --- Org backup endpoints ---

  async listOrgBackups(orgId: string): Promise<{ backups: Backup[] }> {
    return api.get<{ backups: Backup[] }>(`/organizations/${orgId}/backups`);
  },

  async createOrgBackup(orgId: string, input: CreateBackupInput): Promise<{ backup: Backup }> {
    return api.post<{ backup: Backup }>(`/organizations/${orgId}/backups`, input);
  },

  async getOrgBackup(orgId: string, backupId: string): Promise<{ backup: Backup }> {
    return api.get<{ backup: Backup }>(`/organizations/${orgId}/backups/${backupId}`);
  },

  async downloadOrgBackup(orgId: string, backupId: string): Promise<Blob> {
    const response = await fetch(`/api/v1/organizations/${orgId}/backups/${backupId}/download`, {
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error('Failed to download backup');
    }
    return response.blob();
  },

  async deleteOrgBackup(orgId: string, backupId: string): Promise<{ message: string }> {
    return api.delete<{ message: string }>(`/organizations/${orgId}/backups/${backupId}`);
  },

  // --- Admin backup endpoints ---

  async listAllBackups(): Promise<{ backups: Backup[] }> {
    return api.get<{ backups: Backup[] }>('/admin/backups');
  },

  async getBackupSettings(): Promise<{ settings: BackupSettings }> {
    return api.get<{ settings: BackupSettings }>('/admin/backups/settings');
  },

  async checkPgDump(): Promise<{ available: boolean }> {
    return api.get<{ available: boolean }>('/admin/backups/pg-dump-check');
  },

  async createSystemBackup(input: CreateBackupInput): Promise<{ backup: Backup }> {
    return api.post<{ backup: Backup }>('/admin/backups/system', input);
  },

  async downloadSystemBackup(backupId: string): Promise<Blob> {
    const response = await fetch(`/api/v1/admin/backups/system/${backupId}/download`, {
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error('Failed to download backup');
    }
    return response.blob();
  },

  async deleteSystemBackup(backupId: string): Promise<{ message: string }> {
    return api.delete<{ message: string }>(`/admin/backups/system/${backupId}`);
  },
};
