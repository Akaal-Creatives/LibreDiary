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

import { setupService } from '../setup.service';

describe('Setup Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===========================================
  // getStatus
  // ===========================================

  describe('getStatus', () => {
    it('should call GET /setup/status', async () => {
      const mockStatus = { setupRequired: true, reason: 'NO_SETTINGS' };
      mockApi.get.mockResolvedValue(mockStatus);

      const result = await setupService.getStatus();

      expect(mockApi.get).toHaveBeenCalledWith('/setup/status');
      expect(result).toEqual(mockStatus);
    });

    it('should return response directly (not wrapped)', async () => {
      const mockStatus = { setupRequired: false, siteName: 'LibreDiary' };
      mockApi.get.mockResolvedValue(mockStatus);

      const result = await setupService.getStatus();

      expect(result).toBe(mockStatus);
    });

    it('should return status with SETUP_INCOMPLETE reason', async () => {
      const mockStatus = { setupRequired: true, reason: 'SETUP_INCOMPLETE' };
      mockApi.get.mockResolvedValue(mockStatus);

      const result = await setupService.getStatus();

      expect(result).toEqual(mockStatus);
    });

    it('should return status when setup is not required', async () => {
      const mockStatus = { setupRequired: false, siteName: 'My Diary' };
      mockApi.get.mockResolvedValue(mockStatus);

      const result = await setupService.getStatus();

      expect(result.setupRequired).toBe(false);
      expect(result.siteName).toBe('My Diary');
    });

    it('should propagate API errors', async () => {
      mockApi.get.mockRejectedValue(new Error('Server error'));

      await expect(setupService.getStatus()).rejects.toThrow('Server error');
    });
  });

  // ===========================================
  // complete
  // ===========================================

  describe('complete', () => {
    const mockInput = {
      admin: {
        email: 'admin@example.com',
        password: 'securePass123',
        name: 'Admin User',
      },
      organization: {
        name: 'My Organisation',
        slug: 'my-org',
      },
      siteName: 'LibreDiary',
    };

    const mockResult = {
      user: {
        id: 'user-1',
        email: 'admin@example.com',
        name: 'Admin User',
        isSuperAdmin: true,
      },
      organization: {
        id: 'org-1',
        name: 'My Organisation',
        slug: 'my-org',
      },
    };

    it('should call POST /setup/complete with input body', async () => {
      mockApi.post.mockResolvedValue(mockResult);

      const result = await setupService.complete(mockInput);

      expect(mockApi.post).toHaveBeenCalledWith('/setup/complete', mockInput);
      expect(result).toEqual(mockResult);
    });

    it('should return response directly (not wrapped)', async () => {
      mockApi.post.mockResolvedValue(mockResult);

      const result = await setupService.complete(mockInput);

      expect(result).toBe(mockResult);
    });

    it('should work without optional name and siteName', async () => {
      const minimalInput = {
        admin: {
          email: 'admin@example.com',
          password: 'pass123',
        },
        organization: {
          name: 'Org',
          slug: 'org',
        },
      };
      mockApi.post.mockResolvedValue(mockResult);

      await setupService.complete(minimalInput as any);

      expect(mockApi.post).toHaveBeenCalledWith('/setup/complete', minimalInput);
    });

    it('should propagate API errors', async () => {
      mockApi.post.mockRejectedValue(new Error('Setup already completed'));

      await expect(setupService.complete(mockInput)).rejects.toThrow('Setup already completed');
    });
  });
});
