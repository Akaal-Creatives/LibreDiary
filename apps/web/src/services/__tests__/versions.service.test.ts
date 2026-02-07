import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockApi } = vi.hoisted(() => ({
  mockApi: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('../api', () => ({
  api: mockApi,
}));

import { versionsService } from '../versions.service';

describe('Versions Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const orgId = 'org-123';
  const pageId = 'page-456';
  const versionId = 'version-789';

  // ===========================================
  // getVersions
  // ===========================================

  describe('getVersions', () => {
    const mockVersions = [
      {
        id: 'v-1',
        pageId,
        version: 1,
        title: 'Initial version',
        createdAt: '2024-01-01T00:00:00Z',
        createdBy: { id: 'user-1', name: 'Alice', email: 'alice@example.com' },
      },
      {
        id: 'v-2',
        pageId,
        version: 2,
        title: 'Updated version',
        createdAt: '2024-01-02T00:00:00Z',
        createdBy: { id: 'user-1', name: 'Alice', email: 'alice@example.com' },
      },
    ];

    it('should call GET /organizations/{orgId}/pages/{pageId}/versions', async () => {
      mockApi.get.mockResolvedValue(mockVersions);

      const result = await versionsService.getVersions(orgId, pageId);

      expect(mockApi.get).toHaveBeenCalledWith(`/organizations/${orgId}/pages/${pageId}/versions`);
      expect(result).toEqual(mockVersions);
    });

    it('should return response directly (not wrapped)', async () => {
      mockApi.get.mockResolvedValue(mockVersions);

      const result = await versionsService.getVersions(orgId, pageId);

      expect(result).toBe(mockVersions);
    });

    it('should return empty array when no versions exist', async () => {
      mockApi.get.mockResolvedValue([]);

      const result = await versionsService.getVersions(orgId, pageId);

      expect(result).toEqual([]);
    });

    it('should propagate API errors', async () => {
      mockApi.get.mockRejectedValue(new Error('Not found'));

      await expect(versionsService.getVersions(orgId, pageId)).rejects.toThrow('Not found');
    });
  });

  // ===========================================
  // getVersion
  // ===========================================

  describe('getVersion', () => {
    const mockVersion = {
      id: versionId,
      pageId,
      version: 1,
      title: 'Test version',
      createdAt: '2024-01-01T00:00:00Z',
      createdBy: { id: 'user-1', name: 'Alice', email: 'alice@example.com' },
    };

    it('should call GET /organizations/{orgId}/pages/{pageId}/versions/{versionId}', async () => {
      mockApi.get.mockResolvedValue(mockVersion);

      const result = await versionsService.getVersion(orgId, pageId, versionId);

      expect(mockApi.get).toHaveBeenCalledWith(
        `/organizations/${orgId}/pages/${pageId}/versions/${versionId}`
      );
      expect(result).toEqual(mockVersion);
    });

    it('should return response directly (not wrapped)', async () => {
      mockApi.get.mockResolvedValue(mockVersion);

      const result = await versionsService.getVersion(orgId, pageId, versionId);

      expect(result).toBe(mockVersion);
    });

    it('should propagate API errors', async () => {
      mockApi.get.mockRejectedValue(new Error('Not found'));

      await expect(versionsService.getVersion(orgId, pageId, 'bad-id')).rejects.toThrow(
        'Not found'
      );
    });
  });

  // ===========================================
  // createVersion
  // ===========================================

  describe('createVersion', () => {
    const mockVersion = {
      id: 'v-new',
      pageId,
      version: 3,
      title: 'Snapshot',
      createdAt: '2024-01-03T00:00:00Z',
      createdBy: { id: 'user-1', name: 'Alice', email: 'alice@example.com' },
    };

    it('should call POST /organizations/{orgId}/pages/{pageId}/versions with empty body', async () => {
      mockApi.post.mockResolvedValue(mockVersion);

      const result = await versionsService.createVersion(orgId, pageId);

      expect(mockApi.post).toHaveBeenCalledWith(
        `/organizations/${orgId}/pages/${pageId}/versions`,
        {}
      );
      expect(result).toEqual(mockVersion);
    });

    it('should return response directly (not wrapped)', async () => {
      mockApi.post.mockResolvedValue(mockVersion);

      const result = await versionsService.createVersion(orgId, pageId);

      expect(result).toBe(mockVersion);
    });

    it('should propagate API errors', async () => {
      mockApi.post.mockRejectedValue(new Error('Conflict'));

      await expect(versionsService.createVersion(orgId, pageId)).rejects.toThrow('Conflict');
    });
  });

  // ===========================================
  // restoreVersion
  // ===========================================

  describe('restoreVersion', () => {
    const mockRestoreResult = { id: pageId, title: 'Restored page' };

    it('should call POST /organizations/{orgId}/pages/{pageId}/versions/{versionId}/restore with empty body', async () => {
      mockApi.post.mockResolvedValue(mockRestoreResult);

      const result = await versionsService.restoreVersion(orgId, pageId, versionId);

      expect(mockApi.post).toHaveBeenCalledWith(
        `/organizations/${orgId}/pages/${pageId}/versions/${versionId}/restore`,
        {}
      );
      expect(result).toEqual(mockRestoreResult);
    });

    it('should return response directly (not wrapped)', async () => {
      mockApi.post.mockResolvedValue(mockRestoreResult);

      const result = await versionsService.restoreVersion(orgId, pageId, versionId);

      expect(result).toBe(mockRestoreResult);
    });

    it('should propagate API errors', async () => {
      mockApi.post.mockRejectedValue(new Error('Version not found'));

      await expect(versionsService.restoreVersion(orgId, pageId, 'bad-id')).rejects.toThrow(
        'Version not found'
      );
    });
  });
});
