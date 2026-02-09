import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';

const { mockService } = vi.hoisted(() => ({
  mockService: {
    listTokens: vi.fn(),
    createToken: vi.fn(),
    deleteToken: vi.fn(),
  },
}));

vi.mock('@/services/api-tokens.service', () => ({
  apiTokensService: mockService,
}));

import { useApiTokensStore } from '../api-tokens';

describe('API Tokens Store', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setActivePinia(createPinia());
  });

  describe('fetchTokens', () => {
    it('should load tokens and set loading state', async () => {
      const tokens = [
        { id: 'token-1', name: 'Key 1', tokenPrefix: 'ld_abc12' },
        { id: 'token-2', name: 'Key 2', tokenPrefix: 'ld_def34' },
      ];
      mockService.listTokens.mockResolvedValue({ tokens });

      const store = useApiTokensStore();
      await store.fetchTokens();

      expect(store.tokens).toEqual(tokens);
      expect(store.loading).toBe(false);
      expect(store.error).toBeNull();
    });

    it('should set error on failure', async () => {
      mockService.listTokens.mockRejectedValue(new Error('Network error'));

      const store = useApiTokensStore();
      await store.fetchTokens();

      expect(store.tokens).toEqual([]);
      expect(store.error).toBe('Network error');
      expect(store.loading).toBe(false);
    });
  });

  describe('createToken', () => {
    it('should create token and prepend to list', async () => {
      const newToken = {
        id: 'token-1',
        name: 'CI Key',
        tokenPrefix: 'ld_new12',
        rawToken: 'ld_new1234567890abcdef',
      };
      mockService.createToken.mockResolvedValue({ token: newToken });

      const store = useApiTokensStore();
      const result = await store.createToken('CI Key');

      expect(result).toEqual(newToken);
      expect(store.tokens[0]).toEqual(newToken);
      expect(store.creating).toBe(false);
      expect(mockService.createToken).toHaveBeenCalledWith({
        name: 'CI Key',
        expiresAt: undefined,
      });
    });

    it('should pass expiresAt', async () => {
      mockService.createToken.mockResolvedValue({
        token: { id: 'token-1', rawToken: 'ld_abc' },
      });

      const store = useApiTokensStore();
      await store.createToken('Key', '2026-12-31T00:00:00Z');

      expect(mockService.createToken).toHaveBeenCalledWith({
        name: 'Key',
        expiresAt: '2026-12-31T00:00:00Z',
      });
    });

    it('should set error on failure', async () => {
      mockService.createToken.mockRejectedValue(new Error('Failed'));

      const store = useApiTokensStore();

      await expect(store.createToken('Key')).rejects.toThrow('Failed');
      expect(store.error).toBe('Failed');
      expect(store.creating).toBe(false);
    });
  });

  describe('deleteToken', () => {
    it('should remove token from list', async () => {
      mockService.listTokens.mockResolvedValue({
        tokens: [
          { id: 'token-1', name: 'Key 1' },
          { id: 'token-2', name: 'Key 2' },
        ],
      });
      mockService.deleteToken.mockResolvedValue(undefined);

      const store = useApiTokensStore();
      await store.fetchTokens();
      await store.deleteToken('token-1');

      expect(store.tokens).toHaveLength(1);
      expect(store.tokens[0].id).toBe('token-2');
    });

    it('should set error on failure', async () => {
      mockService.deleteToken.mockRejectedValue(new Error('Not found'));

      const store = useApiTokensStore();

      await expect(store.deleteToken('token-1')).rejects.toThrow('Not found');
      expect(store.error).toBe('Not found');
    });
  });

  describe('reset', () => {
    it('should reset all state', async () => {
      mockService.listTokens.mockResolvedValue({
        tokens: [{ id: 'token-1' }],
      });

      const store = useApiTokensStore();
      await store.fetchTokens();
      store.reset();

      expect(store.tokens).toEqual([]);
      expect(store.loading).toBe(false);
      expect(store.creating).toBe(false);
      expect(store.error).toBeNull();
    });
  });
});
