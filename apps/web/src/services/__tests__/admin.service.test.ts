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

import {
  getStats,
  getUsers,
  getUser,
  updateUser,
  deleteUser,
  restoreUser,
  getOrganizations,
  getOrganization,
  updateOrganization,
  deleteOrganization,
  restoreOrganization,
} from '../admin.service';

describe('Admin Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===========================================
  // getStats
  // ===========================================

  describe('getStats', () => {
    const mockStats = {
      users: { total: 100, verified: 85, superAdmins: 3 },
      organizations: { total: 12, active: 10 },
    };

    it('should call GET /admin/stats', async () => {
      mockApi.get.mockResolvedValue({ stats: mockStats });

      const result = await getStats();

      expect(mockApi.get).toHaveBeenCalledWith('/admin/stats');
      expect(result).toEqual(mockStats);
    });

    it('should return response.stats', async () => {
      mockApi.get.mockResolvedValue({ stats: mockStats });

      const result = await getStats();

      expect(result).toEqual(mockStats);
    });

    it('should propagate API errors', async () => {
      mockApi.get.mockRejectedValue(new Error('Forbidden'));

      await expect(getStats()).rejects.toThrow('Forbidden');
    });
  });

  // ===========================================
  // getUsers
  // ===========================================

  describe('getUsers', () => {
    const mockResponse = {
      users: [{ id: 'user-1', email: 'alice@example.com', name: 'Alice' }],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    };

    it('should call GET /admin/users with no query params when no params provided', async () => {
      mockApi.get.mockResolvedValue(mockResponse);

      const result = await getUsers();

      expect(mockApi.get).toHaveBeenCalledWith('/admin/users');
      expect(result).toEqual(mockResponse);
    });

    it('should call GET /admin/users with no query params when empty params provided', async () => {
      mockApi.get.mockResolvedValue(mockResponse);

      const result = await getUsers({});

      expect(mockApi.get).toHaveBeenCalledWith('/admin/users');
      expect(result).toEqual(mockResponse);
    });

    it('should append page query param', async () => {
      mockApi.get.mockResolvedValue(mockResponse);

      await getUsers({ page: 2 });

      expect(mockApi.get).toHaveBeenCalledWith('/admin/users?page=2');
    });

    it('should append limit query param', async () => {
      mockApi.get.mockResolvedValue(mockResponse);

      await getUsers({ limit: 50 });

      expect(mockApi.get).toHaveBeenCalledWith('/admin/users?limit=50');
    });

    it('should append search query param', async () => {
      mockApi.get.mockResolvedValue(mockResponse);

      await getUsers({ search: 'alice' });

      expect(mockApi.get).toHaveBeenCalledWith('/admin/users?search=alice');
    });

    it('should append all query params when all provided', async () => {
      mockApi.get.mockResolvedValue(mockResponse);

      await getUsers({ page: 3, limit: 10, search: 'bob' });

      const url = mockApi.get.mock.calls[0]![0] as string;
      expect(url).toContain('page=3');
      expect(url).toContain('limit=10');
      expect(url).toContain('search=bob');
    });

    it('should not append falsy params (page=0, limit=0)', async () => {
      mockApi.get.mockResolvedValue(mockResponse);

      await getUsers({ page: 0, limit: 0, search: '' });

      expect(mockApi.get).toHaveBeenCalledWith('/admin/users');
    });

    it('should return response directly (not unwrapped)', async () => {
      mockApi.get.mockResolvedValue(mockResponse);

      const result = await getUsers();

      expect(result).toBe(mockResponse);
    });

    it('should propagate API errors', async () => {
      mockApi.get.mockRejectedValue(new Error('Forbidden'));

      await expect(getUsers()).rejects.toThrow('Forbidden');
    });
  });

  // ===========================================
  // getUser
  // ===========================================

  describe('getUser', () => {
    const mockUser = {
      id: 'user-1',
      email: 'alice@example.com',
      name: 'Alice',
      isSuperAdmin: false,
      emailVerified: true,
      memberships: [],
    };

    it('should call GET /admin/users/{userId}', async () => {
      mockApi.get.mockResolvedValue({ user: mockUser });

      const result = await getUser('user-1');

      expect(mockApi.get).toHaveBeenCalledWith('/admin/users/user-1');
      expect(result).toEqual(mockUser);
    });

    it('should return response.user', async () => {
      mockApi.get.mockResolvedValue({ user: mockUser });

      const result = await getUser('user-abc');

      expect(result).toEqual(mockUser);
    });

    it('should propagate API errors', async () => {
      mockApi.get.mockRejectedValue(new Error('Not found'));

      await expect(getUser('bad-id')).rejects.toThrow('Not found');
    });
  });

  // ===========================================
  // updateUser
  // ===========================================

  describe('updateUser', () => {
    const mockUser = { id: 'user-1', email: 'alice@example.com', name: 'Alice Updated' };

    it('should call PATCH /admin/users/{userId} with data body', async () => {
      const data = { name: 'Alice Updated' };
      mockApi.patch.mockResolvedValue({ user: mockUser });

      const result = await updateUser('user-1', data);

      expect(mockApi.patch).toHaveBeenCalledWith('/admin/users/user-1', data);
      expect(result).toEqual(mockUser);
    });

    it('should pass isSuperAdmin flag', async () => {
      const data = { isSuperAdmin: true };
      mockApi.patch.mockResolvedValue({ user: mockUser });

      await updateUser('user-1', data);

      expect(mockApi.patch).toHaveBeenCalledWith('/admin/users/user-1', { isSuperAdmin: true });
    });

    it('should return response.user', async () => {
      mockApi.patch.mockResolvedValue({ user: mockUser });

      const result = await updateUser('user-1', { name: 'New Name' });

      expect(result).toEqual(mockUser);
    });

    it('should propagate API errors', async () => {
      mockApi.patch.mockRejectedValue(new Error('Bad request'));

      await expect(updateUser('user-1', { name: '' })).rejects.toThrow('Bad request');
    });
  });

  // ===========================================
  // deleteUser
  // ===========================================

  describe('deleteUser', () => {
    it('should call DELETE /admin/users/{userId}', async () => {
      mockApi.delete.mockResolvedValue(undefined);

      await deleteUser('user-1');

      expect(mockApi.delete).toHaveBeenCalledWith('/admin/users/user-1');
    });

    it('should not return a value', async () => {
      mockApi.delete.mockResolvedValue(undefined);

      const result = await deleteUser('user-1');

      expect(result).toBeUndefined();
    });

    it('should propagate API errors', async () => {
      mockApi.delete.mockRejectedValue(new Error('Not found'));

      await expect(deleteUser('bad-id')).rejects.toThrow('Not found');
    });
  });

  // ===========================================
  // restoreUser
  // ===========================================

  describe('restoreUser', () => {
    it('should call POST /admin/users/{userId}/restore', async () => {
      mockApi.post.mockResolvedValue(undefined);

      await restoreUser('user-1');

      expect(mockApi.post).toHaveBeenCalledWith('/admin/users/user-1/restore');
    });

    it('should not return a value', async () => {
      mockApi.post.mockResolvedValue(undefined);

      const result = await restoreUser('user-1');

      expect(result).toBeUndefined();
    });

    it('should propagate API errors', async () => {
      mockApi.post.mockRejectedValue(new Error('Not found'));

      await expect(restoreUser('bad-id')).rejects.toThrow('Not found');
    });
  });

  // ===========================================
  // getOrganizations
  // ===========================================

  describe('getOrganizations', () => {
    const mockResponse = {
      organizations: [{ id: 'org-1', name: 'Test Org', slug: 'test-org' }],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    };

    it('should call GET /admin/organizations with no query params when no params provided', async () => {
      mockApi.get.mockResolvedValue(mockResponse);

      const result = await getOrganizations();

      expect(mockApi.get).toHaveBeenCalledWith('/admin/organizations');
      expect(result).toEqual(mockResponse);
    });

    it('should call GET /admin/organizations with no query params when empty params provided', async () => {
      mockApi.get.mockResolvedValue(mockResponse);

      const result = await getOrganizations({});

      expect(mockApi.get).toHaveBeenCalledWith('/admin/organizations');
      expect(result).toEqual(mockResponse);
    });

    it('should append page query param', async () => {
      mockApi.get.mockResolvedValue(mockResponse);

      await getOrganizations({ page: 2 });

      expect(mockApi.get).toHaveBeenCalledWith('/admin/organizations?page=2');
    });

    it('should append limit query param', async () => {
      mockApi.get.mockResolvedValue(mockResponse);

      await getOrganizations({ limit: 50 });

      expect(mockApi.get).toHaveBeenCalledWith('/admin/organizations?limit=50');
    });

    it('should append search query param', async () => {
      mockApi.get.mockResolvedValue(mockResponse);

      await getOrganizations({ search: 'test' });

      expect(mockApi.get).toHaveBeenCalledWith('/admin/organizations?search=test');
    });

    it('should append all query params when all provided', async () => {
      mockApi.get.mockResolvedValue(mockResponse);

      await getOrganizations({ page: 1, limit: 25, search: 'org' });

      const url = mockApi.get.mock.calls[0]![0] as string;
      expect(url).toContain('page=1');
      expect(url).toContain('limit=25');
      expect(url).toContain('search=org');
    });

    it('should not append falsy params (page=0, limit=0)', async () => {
      mockApi.get.mockResolvedValue(mockResponse);

      await getOrganizations({ page: 0, limit: 0, search: '' });

      expect(mockApi.get).toHaveBeenCalledWith('/admin/organizations');
    });

    it('should return response directly (not unwrapped)', async () => {
      mockApi.get.mockResolvedValue(mockResponse);

      const result = await getOrganizations();

      expect(result).toBe(mockResponse);
    });

    it('should propagate API errors', async () => {
      mockApi.get.mockRejectedValue(new Error('Forbidden'));

      await expect(getOrganizations()).rejects.toThrow('Forbidden');
    });
  });

  // ===========================================
  // getOrganization
  // ===========================================

  describe('getOrganization', () => {
    const mockOrg = {
      id: 'org-1',
      name: 'Test Org',
      slug: 'test-org',
      members: [],
    };

    it('should call GET /admin/organizations/{orgId}', async () => {
      mockApi.get.mockResolvedValue({ organization: mockOrg });

      const result = await getOrganization('org-1');

      expect(mockApi.get).toHaveBeenCalledWith('/admin/organizations/org-1');
      expect(result).toEqual(mockOrg);
    });

    it('should return response.organization', async () => {
      mockApi.get.mockResolvedValue({ organization: mockOrg });

      const result = await getOrganization('org-abc');

      expect(result).toEqual(mockOrg);
    });

    it('should propagate API errors', async () => {
      mockApi.get.mockRejectedValue(new Error('Not found'));

      await expect(getOrganization('bad-id')).rejects.toThrow('Not found');
    });
  });

  // ===========================================
  // updateOrganization
  // ===========================================

  describe('updateOrganization', () => {
    const mockOrg = { id: 'org-1', name: 'Updated Org', slug: 'updated-org' };

    it('should call PATCH /admin/organizations/{orgId} with data body', async () => {
      const data = { name: 'Updated Org' };
      mockApi.patch.mockResolvedValue({ organization: mockOrg });

      const result = await updateOrganization('org-1', data);

      expect(mockApi.patch).toHaveBeenCalledWith('/admin/organizations/org-1', data);
      expect(result).toEqual(mockOrg);
    });

    it('should pass slug and aiEnabled fields', async () => {
      const data = { slug: 'new-slug', aiEnabled: true };
      mockApi.patch.mockResolvedValue({ organization: mockOrg });

      await updateOrganization('org-1', data);

      expect(mockApi.patch).toHaveBeenCalledWith('/admin/organizations/org-1', data);
    });

    it('should return response.organization', async () => {
      mockApi.patch.mockResolvedValue({ organization: mockOrg });

      const result = await updateOrganization('org-1', { name: 'Test' });

      expect(result).toEqual(mockOrg);
    });

    it('should propagate API errors', async () => {
      mockApi.patch.mockRejectedValue(new Error('Bad request'));

      await expect(updateOrganization('org-1', { name: '' })).rejects.toThrow('Bad request');
    });
  });

  // ===========================================
  // deleteOrganization
  // ===========================================

  describe('deleteOrganization', () => {
    it('should call DELETE /admin/organizations/{orgId}', async () => {
      mockApi.delete.mockResolvedValue(undefined);

      await deleteOrganization('org-1');

      expect(mockApi.delete).toHaveBeenCalledWith('/admin/organizations/org-1');
    });

    it('should not return a value', async () => {
      mockApi.delete.mockResolvedValue(undefined);

      const result = await deleteOrganization('org-1');

      expect(result).toBeUndefined();
    });

    it('should propagate API errors', async () => {
      mockApi.delete.mockRejectedValue(new Error('Not found'));

      await expect(deleteOrganization('bad-id')).rejects.toThrow('Not found');
    });
  });

  // ===========================================
  // restoreOrganization
  // ===========================================

  describe('restoreOrganization', () => {
    it('should call POST /admin/organizations/{orgId}/restore', async () => {
      mockApi.post.mockResolvedValue(undefined);

      await restoreOrganization('org-1');

      expect(mockApi.post).toHaveBeenCalledWith('/admin/organizations/org-1/restore');
    });

    it('should not return a value', async () => {
      mockApi.post.mockResolvedValue(undefined);

      const result = await restoreOrganization('org-1');

      expect(result).toBeUndefined();
    });

    it('should propagate API errors', async () => {
      mockApi.post.mockRejectedValue(new Error('Not found'));

      await expect(restoreOrganization('bad-id')).rejects.toThrow('Not found');
    });
  });
});
