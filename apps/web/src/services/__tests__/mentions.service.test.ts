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

import { mentionsService } from '../mentions.service';

describe('Mentions Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const orgId = 'org-123';

  // ===========================================
  // searchUsers
  // ===========================================

  describe('searchUsers', () => {
    const mockUsers = [
      { id: 'user-1', name: 'Alice Smith', email: 'alice@example.com', avatarUrl: null },
      {
        id: 'user-2',
        name: 'Bob Jones',
        email: 'bob@example.com',
        avatarUrl: 'https://example.com/avatar.png',
      },
    ];

    it('should call GET /organizations/{orgId}/mentions/users/search with encoded query', async () => {
      mockApi.get.mockResolvedValue({ users: mockUsers });

      const result = await mentionsService.searchUsers(orgId, 'alice');

      expect(mockApi.get).toHaveBeenCalledWith(
        `/organizations/${orgId}/mentions/users/search?q=alice`
      );
      expect(result).toEqual(mockUsers);
    });

    it('should encode special characters in query', async () => {
      mockApi.get.mockResolvedValue({ users: [] });

      await mentionsService.searchUsers(orgId, 'john doe & co');

      expect(mockApi.get).toHaveBeenCalledWith(
        `/organizations/${orgId}/mentions/users/search?q=${encodeURIComponent('john doe & co')}`
      );
    });

    it('should encode unicode characters in query', async () => {
      mockApi.get.mockResolvedValue({ users: [] });

      await mentionsService.searchUsers(orgId, 'test user');

      expect(mockApi.get).toHaveBeenCalledWith(
        `/organizations/${orgId}/mentions/users/search?q=test%20user`
      );
    });

    it('should return response.users', async () => {
      mockApi.get.mockResolvedValue({ users: mockUsers });

      const result = await mentionsService.searchUsers(orgId, 'a');

      expect(result).toEqual(mockUsers);
    });

    it('should return empty array when no users match', async () => {
      mockApi.get.mockResolvedValue({ users: [] });

      const result = await mentionsService.searchUsers(orgId, 'zzz');

      expect(result).toEqual([]);
    });

    it('should propagate API errors', async () => {
      mockApi.get.mockRejectedValue(new Error('Server error'));

      await expect(mentionsService.searchUsers(orgId, 'test')).rejects.toThrow('Server error');
    });
  });

  // ===========================================
  // getMentions
  // ===========================================

  describe('getMentions', () => {
    const mockMentions = [
      {
        id: 'mention-1',
        commentId: 'comment-1',
        userId: 'user-1',
        createdAt: '2024-01-01T00:00:00Z',
        user: { id: 'user-1', name: 'Alice', email: 'alice@example.com', avatarUrl: null },
      },
      {
        id: 'mention-2',
        commentId: 'comment-2',
        userId: 'user-1',
        createdAt: '2024-01-02T00:00:00Z',
        user: { id: 'user-1', name: 'Alice', email: 'alice@example.com', avatarUrl: null },
      },
    ];

    it('should call GET /organizations/{orgId}/mentions', async () => {
      mockApi.get.mockResolvedValue({ mentions: mockMentions });

      const result = await mentionsService.getMentions(orgId);

      expect(mockApi.get).toHaveBeenCalledWith(`/organizations/${orgId}/mentions`);
      expect(result).toEqual(mockMentions);
    });

    it('should return response.mentions', async () => {
      mockApi.get.mockResolvedValue({ mentions: mockMentions });

      const result = await mentionsService.getMentions(orgId);

      expect(result).toEqual(mockMentions);
    });

    it('should return empty array when no mentions exist', async () => {
      mockApi.get.mockResolvedValue({ mentions: [] });

      const result = await mentionsService.getMentions(orgId);

      expect(result).toEqual([]);
    });

    it('should propagate API errors', async () => {
      mockApi.get.mockRejectedValue(new Error('Unauthorised'));

      await expect(mentionsService.getMentions(orgId)).rejects.toThrow('Unauthorised');
    });
  });
});
