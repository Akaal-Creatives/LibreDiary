import { api, API_BASE } from './api';
import type { UploadProgressCallback } from './api';
import type { FileInfo, StorageInfo, StorageConnectionResult } from '@librediary/shared';

// ===========================================
// SERVICE
// ===========================================

export const filesService = {
  async uploadFile(
    orgId: string,
    file: File,
    options?: { pageId?: string },
    onProgress?: UploadProgressCallback
  ): Promise<{ file: FileInfo }> {
    const formData = new FormData();
    formData.append('file', file);
    if (options?.pageId) {
      formData.append('pageId', options.pageId);
    }
    return api.upload<{ file: FileInfo }>(`/organizations/${orgId}/files`, formData, onProgress);
  },

  async getFile(orgId: string, fileId: string): Promise<{ file: FileInfo }> {
    return api.get<{ file: FileInfo }>(`/organizations/${orgId}/files/${fileId}`);
  },

  async listFiles(orgId: string, options?: { pageId?: string }): Promise<{ files: FileInfo[] }> {
    const params = new URLSearchParams();
    if (options?.pageId) params.set('pageId', options.pageId);
    const query = params.toString();
    const url = `/organizations/${orgId}/files${query ? `?${query}` : ''}`;
    return api.get<{ files: FileInfo[] }>(url);
  },

  async downloadFile(orgId: string, fileId: string): Promise<Blob> {
    const response = await fetch(`${API_BASE}/organizations/${orgId}/files/${fileId}/download`, {
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error('Failed to download file');
    }
    return response.blob();
  },

  async deleteFile(orgId: string, fileId: string): Promise<{ message: string }> {
    return api.delete<{ message: string }>(`/organizations/${orgId}/files/${fileId}`);
  },

  async getStorageInfo(): Promise<{ storage: StorageInfo }> {
    return api.get<{ storage: StorageInfo }>('/admin/storage/info');
  },

  async testStorageConnection(): Promise<{ result: StorageConnectionResult }> {
    return api.post<{ result: StorageConnectionResult }>('/admin/storage/test');
  },
};
