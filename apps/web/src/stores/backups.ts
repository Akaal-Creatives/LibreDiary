import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { Backup, BackupSettings } from '@librediary/shared';
import { backupsService } from '@/services/backups.service';
import { useAuthStore } from './auth';

export const useBackupsStore = defineStore('backups', () => {
  // ===========================================
  // STATE
  // ===========================================

  const orgBackups = ref<Backup[]>([]);
  const allBackups = ref<Backup[]>([]);
  const settings = ref<BackupSettings | null>(null);
  const loading = ref(false);
  const creating = ref(false);
  const error = ref<string | null>(null);
  const pgDumpAvailable = ref<boolean | null>(null);

  // ===========================================
  // HELPERS
  // ===========================================

  function getOrgId(): string {
    const authStore = useAuthStore();
    if (!authStore.currentOrganizationId) {
      throw new Error('No organisation selected');
    }
    return authStore.currentOrganizationId;
  }

  // ===========================================
  // ORG BACKUP ACTIONS
  // ===========================================

  async function fetchOrgBackups(): Promise<void> {
    const orgId = getOrgId();
    loading.value = true;
    error.value = null;

    try {
      const data = await backupsService.listOrgBackups(orgId);
      orgBackups.value = data.backups;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load backups';
    } finally {
      loading.value = false;
    }
  }

  async function createOrgBackup(options?: {
    encrypt?: boolean;
    password?: string;
  }): Promise<Backup> {
    const orgId = getOrgId();
    creating.value = true;
    error.value = null;

    try {
      const data = await backupsService.createOrgBackup(orgId, {
        encrypt: options?.encrypt ?? false,
        password: options?.password,
      });
      orgBackups.value.unshift(data.backup);
      return data.backup;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to create backup';
      throw err;
    } finally {
      creating.value = false;
    }
  }

  async function downloadOrgBackup(backupId: string): Promise<Blob> {
    const orgId = getOrgId();
    return backupsService.downloadOrgBackup(orgId, backupId);
  }

  async function deleteOrgBackup(backupId: string): Promise<void> {
    const orgId = getOrgId();
    await backupsService.deleteOrgBackup(orgId, backupId);
    orgBackups.value = orgBackups.value.filter((b) => b.id !== backupId);
  }

  // ===========================================
  // ADMIN BACKUP ACTIONS
  // ===========================================

  async function fetchAllBackups(): Promise<void> {
    loading.value = true;
    error.value = null;

    try {
      const data = await backupsService.listAllBackups();
      allBackups.value = data.backups;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load backups';
    } finally {
      loading.value = false;
    }
  }

  async function createSystemBackup(options?: {
    encrypt?: boolean;
    password?: string;
  }): Promise<Backup> {
    creating.value = true;
    error.value = null;

    try {
      const data = await backupsService.createSystemBackup({
        encrypt: options?.encrypt ?? false,
        password: options?.password,
      });
      allBackups.value.unshift(data.backup);
      return data.backup;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to create system backup';
      throw err;
    } finally {
      creating.value = false;
    }
  }

  async function fetchSettings(): Promise<void> {
    try {
      const data = await backupsService.getBackupSettings();
      settings.value = data.settings;
      pgDumpAvailable.value = data.settings.pgDumpAvailable;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load backup settings';
    }
  }

  async function checkPgDump(): Promise<void> {
    try {
      const data = await backupsService.checkPgDump();
      pgDumpAvailable.value = data.available;
    } catch {
      pgDumpAvailable.value = false;
    }
  }

  function reset() {
    orgBackups.value = [];
    allBackups.value = [];
    settings.value = null;
    loading.value = false;
    creating.value = false;
    error.value = null;
    pgDumpAvailable.value = null;
  }

  return {
    // State
    orgBackups,
    allBackups,
    settings,
    loading,
    creating,
    error,
    pgDumpAvailable,
    // Actions
    fetchOrgBackups,
    createOrgBackup,
    downloadOrgBackup,
    deleteOrgBackup,
    fetchAllBackups,
    createSystemBackup,
    fetchSettings,
    checkPgDump,
    reset,
  };
});
