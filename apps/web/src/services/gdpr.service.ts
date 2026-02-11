import { api } from './api';

export interface DataExport {
  id: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'EXPIRED';
  fileName: string | null;
  fileSize: number | null;
  requestedAt: string;
  completedAt: string | null;
  expiresAt: string | null;
  downloadedAt: string | null;
  errorMessage: string | null;
}

export interface DeletionStatus {
  pending: boolean;
  requestedAt?: string;
  scheduledDeletionDate?: string;
  daysRemaining?: number;
}

export const gdprService = {
  // Data Export

  /**
   * Request a new data export
   */
  async requestExport(): Promise<{ export: DataExport }> {
    return api.post<{ export: DataExport }>('/gdpr/exports');
  },

  /**
   * List all data exports for the current user
   */
  async listExports(): Promise<{ exports: DataExport[] }> {
    return api.get<{ exports: DataExport[] }>('/gdpr/exports');
  },

  /**
   * Get a specific data export by ID
   */
  async getExport(id: string): Promise<{ export: DataExport }> {
    return api.get<{ export: DataExport }>(`/gdpr/exports/${id}`);
  },

  /**
   * Download a completed data export as a Blob
   */
  async downloadExport(id: string): Promise<Blob> {
    const response = await fetch(`/api/v1/gdpr/exports/${id}/download`, {
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error('Failed to download export');
    }
    return response.blob();
  },

  // Account Deletion

  /**
   * Get current account deletion status
   */
  async getDeletionStatus(): Promise<DeletionStatus> {
    return api.get<DeletionStatus>('/gdpr/deletion');
  },

  /**
   * Request account deletion with confirmation text
   */
  async requestDeletion(
    confirmation: string
  ): Promise<{ message: string; scheduledDeletionDate: string }> {
    return api.post<{ message: string; scheduledDeletionDate: string }>('/gdpr/deletion', {
      confirmation,
    });
  },

  /**
   * Cancel a pending account deletion request
   */
  async cancelDeletion(): Promise<{ message: string }> {
    return api.delete<{ message: string }>('/gdpr/deletion');
  },
};
