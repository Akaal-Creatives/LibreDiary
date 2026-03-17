import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { mockApi } = vi.hoisted(() => ({
  mockApi: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('../api', () => ({
  api: mockApi,
}));

import { gdprService } from '../gdpr.service';
import type { DataExport, DeletionStatus } from '../gdpr.service';

describe('GDPR Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // --- Data Export ---

  describe('requestExport', () => {
    it('should POST to /gdpr/exports', async () => {
      const mockExport: DataExport = {
        id: 'export-1',
        status: 'PENDING',
        fileName: null,
        fileSize: null,
        requestedAt: '2026-03-17T00:00:00Z',
        completedAt: null,
        expiresAt: null,
        downloadedAt: null,
        errorMessage: null,
      };
      mockApi.post.mockResolvedValue({ export: mockExport });

      const result = await gdprService.requestExport();

      expect(mockApi.post).toHaveBeenCalledWith('/gdpr/exports');
      expect(result.export).toEqual(mockExport);
    });

    it('should propagate API errors', async () => {
      mockApi.post.mockRejectedValue(new Error('Rate limited'));

      await expect(gdprService.requestExport()).rejects.toThrow('Rate limited');
    });
  });

  describe('listExports', () => {
    it('should GET from /gdpr/exports', async () => {
      mockApi.get.mockResolvedValue({ exports: [] });

      const result = await gdprService.listExports();

      expect(mockApi.get).toHaveBeenCalledWith('/gdpr/exports');
      expect(result.exports).toEqual([]);
    });

    it('should return multiple exports', async () => {
      const exports: DataExport[] = [
        {
          id: 'export-1',
          status: 'COMPLETED',
          fileName: 'export-1.zip',
          fileSize: 1024,
          requestedAt: '2026-03-16T00:00:00Z',
          completedAt: '2026-03-16T00:05:00Z',
          expiresAt: '2026-03-23T00:05:00Z',
          downloadedAt: null,
          errorMessage: null,
        },
        {
          id: 'export-2',
          status: 'PENDING',
          fileName: null,
          fileSize: null,
          requestedAt: '2026-03-17T00:00:00Z',
          completedAt: null,
          expiresAt: null,
          downloadedAt: null,
          errorMessage: null,
        },
      ];
      mockApi.get.mockResolvedValue({ exports });

      const result = await gdprService.listExports();

      expect(result.exports).toHaveLength(2);
      expect(result.exports[0].status).toBe('COMPLETED');
      expect(result.exports[1].status).toBe('PENDING');
    });
  });

  describe('getExport', () => {
    it('should GET from /gdpr/exports/:id', async () => {
      const mockExport: DataExport = {
        id: 'export-42',
        status: 'PROCESSING',
        fileName: null,
        fileSize: null,
        requestedAt: '2026-03-17T00:00:00Z',
        completedAt: null,
        expiresAt: null,
        downloadedAt: null,
        errorMessage: null,
      };
      mockApi.get.mockResolvedValue({ export: mockExport });

      const result = await gdprService.getExport('export-42');

      expect(mockApi.get).toHaveBeenCalledWith('/gdpr/exports/export-42');
      expect(result.export.id).toBe('export-42');
    });

    it('should propagate API errors for missing export', async () => {
      mockApi.get.mockRejectedValue(new Error('Not found'));

      await expect(gdprService.getExport('non-existent')).rejects.toThrow('Not found');
    });
  });

  describe('downloadExport', () => {
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should fetch from /api/v1/gdpr/exports/:id/download with credentials', async () => {
      const mockBlob = new Blob(['export data']);
      const fetchSpy = vi
        .spyOn(globalThis, 'fetch')
        .mockResolvedValue(new Response(mockBlob, { status: 200 }));

      await gdprService.downloadExport('export-1');

      expect(fetchSpy).toHaveBeenCalledWith('/api/v1/gdpr/exports/export-1/download', {
        credentials: 'include',
      });
    });

    it('should return a Blob on success', async () => {
      const mockBlob = new Blob(['export data']);
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(mockBlob, { status: 200 }));

      const result = await gdprService.downloadExport('export-1');

      expect(result).toBeInstanceOf(Blob);
    });

    it('should throw when response is not ok', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 404 }));

      await expect(gdprService.downloadExport('export-1')).rejects.toThrow(
        'Failed to download export'
      );
    });

    it('should throw on server error', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 500 }));

      await expect(gdprService.downloadExport('export-1')).rejects.toThrow(
        'Failed to download export'
      );
    });

    it('should throw on network failure', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Network error'));

      await expect(gdprService.downloadExport('export-1')).rejects.toThrow('Network error');
    });

    it('should interpolate the export ID into the URL', async () => {
      const mockBlob = new Blob(['data']);
      const fetchSpy = vi
        .spyOn(globalThis, 'fetch')
        .mockResolvedValue(new Response(mockBlob, { status: 200 }));

      await gdprService.downloadExport('abc-123-def');

      const calledUrl = fetchSpy.mock.calls[0][0] as string;
      expect(calledUrl).toContain('abc-123-def');
    });
  });

  // --- Account Deletion ---

  describe('getDeletionStatus', () => {
    it('should GET from /gdpr/deletion', async () => {
      const status: DeletionStatus = { pending: false };
      mockApi.get.mockResolvedValue(status);

      const result = await gdprService.getDeletionStatus();

      expect(mockApi.get).toHaveBeenCalledWith('/gdpr/deletion');
      expect(result.pending).toBe(false);
    });

    it('should return full deletion status when pending', async () => {
      const status: DeletionStatus = {
        pending: true,
        requestedAt: '2026-03-17T00:00:00Z',
        scheduledDeletionDate: '2026-04-16T00:00:00Z',
        daysRemaining: 30,
      };
      mockApi.get.mockResolvedValue(status);

      const result = await gdprService.getDeletionStatus();

      expect(result.pending).toBe(true);
      expect(result.daysRemaining).toBe(30);
      expect(result.scheduledDeletionDate).toBe('2026-04-16T00:00:00Z');
    });
  });

  describe('requestDeletion', () => {
    it('should POST to /gdpr/deletion with confirmation text', async () => {
      const response = {
        message: 'Deletion scheduled',
        scheduledDeletionDate: '2026-04-16T00:00:00Z',
      };
      mockApi.post.mockResolvedValue(response);

      const result = await gdprService.requestDeletion('DELETE MY ACCOUNT');

      expect(mockApi.post).toHaveBeenCalledWith('/gdpr/deletion', {
        confirmation: 'DELETE MY ACCOUNT',
      });
      expect(result.message).toBe('Deletion scheduled');
      expect(result.scheduledDeletionDate).toBe('2026-04-16T00:00:00Z');
    });

    it('should propagate errors for invalid confirmation', async () => {
      mockApi.post.mockRejectedValue(new Error('Invalid confirmation text'));

      await expect(gdprService.requestDeletion('wrong text')).rejects.toThrow(
        'Invalid confirmation text'
      );
    });
  });

  describe('cancelDeletion', () => {
    it('should DELETE from /gdpr/deletion', async () => {
      mockApi.delete.mockResolvedValue({ message: 'Deletion cancelled' });

      const result = await gdprService.cancelDeletion();

      expect(mockApi.delete).toHaveBeenCalledWith('/gdpr/deletion');
      expect(result.message).toBe('Deletion cancelled');
    });

    it('should propagate errors when no pending deletion exists', async () => {
      mockApi.delete.mockRejectedValue(new Error('No pending deletion'));

      await expect(gdprService.cancelDeletion()).rejects.toThrow('No pending deletion');
    });
  });
});
