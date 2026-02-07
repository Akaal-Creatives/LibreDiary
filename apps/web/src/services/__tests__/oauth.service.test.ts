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
  getConfiguredProviders,
  initiateOAuth,
  initiateOAuthLink,
  getLinkedAccounts,
  unlinkAccount,
} from '../oauth.service';

describe('OAuth Service', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock window.location.href as a writable property
    Object.defineProperty(window, 'location', {
      value: { ...originalLocation, href: '' },
      writable: true,
      configurable: true,
    });
  });

  afterAll(() => {
    Object.defineProperty(window, 'location', {
      value: originalLocation,
      writable: true,
      configurable: true,
    });
  });

  // ===========================================
  // getConfiguredProviders
  // ===========================================

  describe('getConfiguredProviders', () => {
    const mockProviders = ['google', 'github'];

    it('should call GET /oauth/providers', async () => {
      mockApi.get.mockResolvedValue({ providers: mockProviders });

      const result = await getConfiguredProviders();

      expect(mockApi.get).toHaveBeenCalledWith('/oauth/providers');
      expect(result).toEqual(mockProviders);
    });

    it('should return response.providers', async () => {
      mockApi.get.mockResolvedValue({ providers: mockProviders });

      const result = await getConfiguredProviders();

      expect(result).toEqual(mockProviders);
    });

    it('should return empty array when no providers configured', async () => {
      mockApi.get.mockResolvedValue({ providers: [] });

      const result = await getConfiguredProviders();

      expect(result).toEqual([]);
    });

    it('should propagate API errors', async () => {
      mockApi.get.mockRejectedValue(new Error('Server error'));

      await expect(getConfiguredProviders()).rejects.toThrow('Server error');
    });
  });

  // ===========================================
  // initiateOAuth
  // ===========================================

  describe('initiateOAuth', () => {
    it('should call GET /oauth/{provider} and redirect to the returned URL', async () => {
      const oauthUrl = 'https://accounts.google.com/o/oauth2/auth?client_id=abc';
      mockApi.get.mockResolvedValue({ url: oauthUrl, state: 'random-state' });

      await initiateOAuth('google' as any);

      expect(mockApi.get).toHaveBeenCalledWith('/oauth/google');
      expect(window.location.href).toBe(oauthUrl);
    });

    it('should redirect to GitHub OAuth URL', async () => {
      const oauthUrl = 'https://github.com/login/oauth/authorize?client_id=xyz';
      mockApi.get.mockResolvedValue({ url: oauthUrl, state: 'state-123' });

      await initiateOAuth('github' as any);

      expect(mockApi.get).toHaveBeenCalledWith('/oauth/github');
      expect(window.location.href).toBe(oauthUrl);
    });

    it('should propagate API errors without redirecting', async () => {
      mockApi.get.mockRejectedValue(new Error('Provider not configured'));

      await expect(initiateOAuth('google' as any)).rejects.toThrow('Provider not configured');
      expect(window.location.href).toBe('');
    });
  });

  // ===========================================
  // initiateOAuthLink
  // ===========================================

  describe('initiateOAuthLink', () => {
    it('should call GET /oauth/{provider}/link and redirect to the returned URL', async () => {
      const oauthUrl = 'https://accounts.google.com/o/oauth2/auth?client_id=abc&mode=link';
      mockApi.get.mockResolvedValue({ url: oauthUrl, state: 'link-state' });

      await initiateOAuthLink('google' as any);

      expect(mockApi.get).toHaveBeenCalledWith('/oauth/google/link');
      expect(window.location.href).toBe(oauthUrl);
    });

    it('should redirect to GitHub link URL', async () => {
      const oauthUrl = 'https://github.com/login/oauth/authorize?client_id=xyz&mode=link';
      mockApi.get.mockResolvedValue({ url: oauthUrl, state: 'state-456' });

      await initiateOAuthLink('github' as any);

      expect(mockApi.get).toHaveBeenCalledWith('/oauth/github/link');
      expect(window.location.href).toBe(oauthUrl);
    });

    it('should propagate API errors without redirecting', async () => {
      mockApi.get.mockRejectedValue(new Error('Unauthorised'));

      await expect(initiateOAuthLink('google' as any)).rejects.toThrow('Unauthorised');
      expect(window.location.href).toBe('');
    });
  });

  // ===========================================
  // getLinkedAccounts
  // ===========================================

  describe('getLinkedAccounts', () => {
    const mockAccounts = [
      { provider: 'google', email: 'user@gmail.com', linkedAt: '2024-01-01T00:00:00Z' },
      { provider: 'github', email: 'user@github.com', linkedAt: '2024-01-02T00:00:00Z' },
    ];

    it('should call GET /oauth/accounts', async () => {
      mockApi.get.mockResolvedValue({ accounts: mockAccounts });

      const result = await getLinkedAccounts();

      expect(mockApi.get).toHaveBeenCalledWith('/oauth/accounts');
      expect(result).toEqual(mockAccounts);
    });

    it('should return response.accounts', async () => {
      mockApi.get.mockResolvedValue({ accounts: mockAccounts });

      const result = await getLinkedAccounts();

      expect(result).toEqual(mockAccounts);
    });

    it('should return empty array when no accounts linked', async () => {
      mockApi.get.mockResolvedValue({ accounts: [] });

      const result = await getLinkedAccounts();

      expect(result).toEqual([]);
    });

    it('should propagate API errors', async () => {
      mockApi.get.mockRejectedValue(new Error('Unauthorised'));

      await expect(getLinkedAccounts()).rejects.toThrow('Unauthorised');
    });
  });

  // ===========================================
  // unlinkAccount
  // ===========================================

  describe('unlinkAccount', () => {
    it('should call DELETE /oauth/{provider}/unlink', async () => {
      mockApi.delete.mockResolvedValue(undefined);

      await unlinkAccount('google' as any);

      expect(mockApi.delete).toHaveBeenCalledWith('/oauth/google/unlink');
    });

    it('should call DELETE for github provider', async () => {
      mockApi.delete.mockResolvedValue(undefined);

      await unlinkAccount('github' as any);

      expect(mockApi.delete).toHaveBeenCalledWith('/oauth/github/unlink');
    });

    it('should not return a value', async () => {
      mockApi.delete.mockResolvedValue(undefined);

      const result = await unlinkAccount('google' as any);

      expect(result).toBeUndefined();
    });

    it('should propagate API errors', async () => {
      mockApi.delete.mockRejectedValue(new Error('Cannot unlink last account'));

      await expect(unlinkAccount('google' as any)).rejects.toThrow('Cannot unlink last account');
    });
  });
});
