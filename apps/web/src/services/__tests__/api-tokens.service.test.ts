import { describe, it, expect, vi, beforeEach } from 'vitest';

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

import { apiTokensService } from '../api-tokens.service';

describe('API Tokens Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listTokens', () => {
    it('should GET from /api-tokens', async () => {
      mockApi.get.mockResolvedValue({ tokens: [] });

      await apiTokensService.listTokens();

      expect(mockApi.get).toHaveBeenCalledWith('/api-tokens');
    });
  });

  describe('createToken', () => {
    it('should POST to /api-tokens with name', async () => {
      mockApi.post.mockResolvedValue({ token: { id: 'token-1', rawToken: 'ld_abc' } });

      await apiTokensService.createToken({ name: 'CI Key' });

      expect(mockApi.post).toHaveBeenCalledWith('/api-tokens', { name: 'CI Key' });
    });

    it('should pass expiresAt when provided', async () => {
      mockApi.post.mockResolvedValue({ token: { id: 'token-1' } });

      await apiTokensService.createToken({
        name: 'Expiring Key',
        expiresAt: '2026-12-31T23:59:59Z',
      });

      expect(mockApi.post).toHaveBeenCalledWith('/api-tokens', {
        name: 'Expiring Key',
        expiresAt: '2026-12-31T23:59:59Z',
      });
    });
  });

  describe('deleteToken', () => {
    it('should DELETE from /api-tokens/:id', async () => {
      mockApi.delete.mockResolvedValue(undefined);

      await apiTokensService.deleteToken('token-1');

      expect(mockApi.delete).toHaveBeenCalledWith('/api-tokens/token-1');
    });
  });
});
