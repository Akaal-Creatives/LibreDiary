import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { FileInfo, StorageInfo } from '@librediary/shared';
import { filesService } from '@/services/files.service';
import { useAuthStore } from './auth';

export const useFilesStore = defineStore('files', () => {
  // ===========================================
  // STATE
  // ===========================================

  const files = ref<FileInfo[]>([]);
  const uploading = ref(false);
  const uploadProgress = ref(0);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const storageInfo = ref<StorageInfo | null>(null);

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
  // ACTIONS
  // ===========================================

  async function uploadFile(file: File, options?: { pageId?: string }): Promise<FileInfo> {
    const orgId = getOrgId();
    uploading.value = true;
    uploadProgress.value = 0;
    error.value = null;

    try {
      const data = await filesService.uploadFile(orgId, file, options, (loaded, total) => {
        uploadProgress.value = Math.round((loaded / total) * 100);
      });
      files.value.unshift(data.file);
      return data.file;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Upload failed';
      throw err;
    } finally {
      uploading.value = false;
      uploadProgress.value = 0;
    }
  }

  async function fetchFiles(options?: { pageId?: string }): Promise<void> {
    const orgId = getOrgId();
    loading.value = true;
    error.value = null;

    try {
      const data = await filesService.listFiles(orgId, options);
      files.value = data.files;
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to load files';
    } finally {
      loading.value = false;
    }
  }

  async function deleteFile(fileId: string): Promise<void> {
    const orgId = getOrgId();
    await filesService.deleteFile(orgId, fileId);
    files.value = files.value.filter((f) => f.id !== fileId);
  }

  async function fetchStorageInfo(): Promise<void> {
    const data = await filesService.getStorageInfo();
    storageInfo.value = data.storage;
  }

  async function testConnection(): Promise<{ success: boolean; message: string }> {
    const data = await filesService.testStorageConnection();
    return data.result;
  }

  function reset() {
    files.value = [];
    uploading.value = false;
    uploadProgress.value = 0;
    loading.value = false;
    error.value = null;
    storageInfo.value = null;
  }

  return {
    // State
    files,
    uploading,
    uploadProgress,
    loading,
    error,
    storageInfo,
    // Actions
    uploadFile,
    fetchFiles,
    deleteFile,
    fetchStorageInfo,
    testConnection,
    reset,
  };
});
