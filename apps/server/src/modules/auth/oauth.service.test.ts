/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  mockPrisma,
  mockPrismaUser,
  mockPrismaAccount,
  resetPrismaMocks,
} from '../../../tests/mocks/prisma.js';

// Mock dependencies
vi.mock('../../lib/prisma.js', () => ({
  prisma: mockPrisma,
}));

vi.mock('../../services/session.service.js', () => ({
  createSession: vi.fn(),
}));

// Mock env configuration
vi.mock('../../config/env.js', () => ({
  env: {
    GITHUB_CLIENT_ID: 'test-github-client-id',
    GITHUB_CLIENT_SECRET: 'test-github-client-secret',
    GOOGLE_CLIENT_ID: 'test-google-client-id',
    GOOGLE_CLIENT_SECRET: 'test-google-client-secret',
    APP_URL: 'http://localhost:3000',
  },
}));

// Mock fetch for profile APIs
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock Arctic providers - classes must be defined inside the factory
vi.mock('arctic', () => {
  class MockGitHub {
    createAuthorizationURL(state: string, _scopes: string[]) {
      return new URL('https://github.com/login/oauth/authorize?client_id=test&state=' + state);
    }
    async validateAuthorizationCode(_code: string) {
      return {
        accessToken: () => 'github-access-token',
      };
    }
  }

  class MockGoogle {
    createAuthorizationURL(state: string, _codeVerifier: string, _scopes: string[]) {
      return new URL('https://accounts.google.com/o/oauth2/v2/auth?client_id=test&state=' + state);
    }
    async validateAuthorizationCode(_code: string, _codeVerifier: string) {
      return {
        accessToken: () => 'google-access-token',
        hasRefreshToken: () => true,
        refreshToken: () => 'google-refresh-token',
        accessTokenExpiresAt: () => new Date('2024-01-22T12:00:00.000Z'),
      };
    }
  }

  return {
    GitHub: MockGitHub,
    Google: MockGoogle,
    generateState: () => 'test-state',
    generateCodeVerifier: () => 'test-code-verifier',
  };
});

// Import mocked modules
import { createSession } from '../../services/session.service.js';

// Import service under test (after mocks)
import {
  getAuthorizationUrl,
  handleOAuthCallback,
  linkOAuthAccount,
  unlinkOAuthAccount,
  getUserLinkedAccounts,
  getOAuthUserProfile,
} from './oauth.service.js';

describe('OAuth Service', () => {
  const mockGitHubUserResponse = {
    id: 12345,
    email: 'test@example.com',
    name: 'Test User',
    avatar_url: 'https://github.com/avatar.jpg',
  };

  const mockGoogleUserResponse = {
    id: 'google-user-123',
    email: 'test@example.com',
    name: 'Test User',
    picture: 'https://google.com/avatar.jpg',
  };

  beforeEach(() => {
    resetPrismaMocks();
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-15T12:00:00.000Z'));

    // Setup default fetch mock for GitHub profile
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('api.github.com/user/emails')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve([{ email: 'test@example.com', primary: true, verified: true }]),
        });
      }
      if (url.includes('api.github.com/user')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockGitHubUserResponse),
        });
      }
      if (url.includes('googleapis.com/oauth2')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockGoogleUserResponse),
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('getAuthorizationUrl', () => {
    it('should generate GitHub authorization URL', async () => {
      const result = await getAuthorizationUrl('github');

      expect(result).toHaveProperty('url');
      expect(result).toHaveProperty('state');
      expect(result.url).toContain('github.com');
    });

    it('should generate Google authorization URL', async () => {
      const result = await getAuthorizationUrl('google');

      expect(result).toHaveProperty('url');
      expect(result).toHaveProperty('state');
      expect(result).toHaveProperty('codeVerifier');
      expect(result.url).toContain('accounts.google.com');
    });

    it('should throw error for unsupported provider', async () => {
      await expect(getAuthorizationUrl('unsupported' as any)).rejects.toThrow(
        'Unsupported OAuth provider'
      );
    });
  });

  describe('handleOAuthCallback', () => {
    const mockExistingUser = {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      emailVerified: true,
      deletedAt: null,
    };

    const mockAccount = {
      id: 'account-123',
      userId: 'user-123',
      provider: 'github',
      providerAccountId: '12345', // matches mockGitHubUserResponse.id
    };

    const mockSession = {
      id: 'session-123',
      userId: 'user-123',
      token: 'session-token',
    };

    const mockMeta = {
      userAgent: 'Mozilla/5.0',
      ipAddress: '127.0.0.1',
    };

    it('should login existing user with linked OAuth account', async () => {
      mockPrismaAccount.findUnique.mockResolvedValue({
        ...mockAccount,
        user: mockExistingUser,
      });
      mockPrismaAccount.update.mockResolvedValue(mockAccount);
      vi.mocked(createSession).mockResolvedValue(mockSession as any);

      const result = await handleOAuthCallback({
        provider: 'github',
        code: 'auth-code',
        state: 'test-state',
        meta: mockMeta,
      });

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('session');
      expect(result.isNewUser).toBe(false);
      expect(createSession).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockExistingUser.id,
        })
      );
    });

    it('should create new user if OAuth account not linked and email not found', async () => {
      mockPrismaAccount.findUnique.mockResolvedValue(null);
      mockPrismaUser.findUnique.mockResolvedValue(null);

      const newUser = { ...mockExistingUser, id: 'new-user-123' };
      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        return callback({
          user: {
            create: vi.fn().mockResolvedValue(newUser),
          },
          account: {
            create: vi.fn().mockResolvedValue(mockAccount),
          },
        });
      });
      vi.mocked(createSession).mockResolvedValue({ ...mockSession, userId: 'new-user-123' } as any);

      const result = await handleOAuthCallback({
        provider: 'github',
        code: 'auth-code',
        state: 'test-state',
        meta: mockMeta,
      });

      expect(result.isNewUser).toBe(true);
    });

    it('should link OAuth to existing user with matching email', async () => {
      mockPrismaAccount.findUnique.mockResolvedValue(null);
      mockPrismaUser.findUnique.mockResolvedValue(mockExistingUser);
      mockPrismaAccount.create.mockResolvedValue(mockAccount);
      vi.mocked(createSession).mockResolvedValue(mockSession as any);

      const result = await handleOAuthCallback({
        provider: 'github',
        code: 'auth-code',
        state: 'test-state',
        meta: mockMeta,
      });

      expect(result.user.id).toBe(mockExistingUser.id);
      expect(result.isNewUser).toBe(false);
      expect(mockPrismaAccount.create).toHaveBeenCalled();
    });

    it('should throw error if user account is deleted', async () => {
      mockPrismaAccount.findUnique.mockResolvedValue({
        ...mockAccount,
        user: { ...mockExistingUser, deletedAt: new Date() },
      });

      await expect(
        handleOAuthCallback({
          provider: 'github',
          code: 'auth-code',
          state: 'test-state',
          meta: mockMeta,
        })
      ).rejects.toThrow('Account has been deleted');
    });
  });

  describe('linkOAuthAccount', () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
    };

    it('should link OAuth account to existing user', async () => {
      mockPrismaAccount.findUnique.mockResolvedValue(null);
      mockPrismaAccount.findFirst.mockResolvedValue(null);
      mockPrismaAccount.create.mockResolvedValue({
        id: 'account-123',
        userId: mockUser.id,
        provider: 'github',
        providerAccountId: '12345',
      });

      const result = await linkOAuthAccount({
        userId: mockUser.id,
        provider: 'github',
        code: 'auth-code',
        state: 'test-state',
      });

      expect(result).toHaveProperty('provider', 'github');
      expect(mockPrismaAccount.create).toHaveBeenCalled();
    });

    it('should throw error if provider already linked to another user', async () => {
      mockPrismaAccount.findUnique.mockResolvedValue({
        id: 'account-123',
        userId: 'another-user-456',
        provider: 'github',
        providerAccountId: '12345',
      });

      await expect(
        linkOAuthAccount({
          userId: 'user-123',
          provider: 'github',
          code: 'auth-code',
          state: 'test-state',
        })
      ).rejects.toThrow('This account is already linked to another user');
    });

    it('should throw error if user already has this provider linked', async () => {
      mockPrismaAccount.findUnique.mockResolvedValue(null);
      mockPrismaAccount.findFirst.mockResolvedValue({
        id: 'account-123',
        userId: 'user-123',
        provider: 'github',
        providerAccountId: '99999',
      });

      await expect(
        linkOAuthAccount({
          userId: 'user-123',
          provider: 'github',
          code: 'auth-code',
          state: 'test-state',
        })
      ).rejects.toThrow('You already have a GitHub account linked');
    });
  });

  describe('unlinkOAuthAccount', () => {
    it('should unlink OAuth account from user', async () => {
      mockPrismaAccount.findFirst.mockResolvedValue({
        id: 'account-123',
        userId: 'user-123',
        provider: 'github',
      });
      mockPrismaUser.findUnique.mockResolvedValue({
        id: 'user-123',
        passwordHash: 'hashed-password',
        _count: { accounts: 2 },
      });
      mockPrismaAccount.delete.mockResolvedValue({});

      await unlinkOAuthAccount({
        userId: 'user-123',
        provider: 'github',
      });

      expect(mockPrismaAccount.delete).toHaveBeenCalledWith({
        where: { id: 'account-123' },
      });
    });

    it('should throw error if account not found', async () => {
      mockPrismaAccount.findFirst.mockResolvedValue(null);

      await expect(
        unlinkOAuthAccount({
          userId: 'user-123',
          provider: 'github',
        })
      ).rejects.toThrow('No GitHub account linked');
    });

    it('should throw error if unlinking would leave user without login method', async () => {
      mockPrismaAccount.findFirst.mockResolvedValueOnce({
        id: 'account-123',
        userId: 'user-123',
        provider: 'github',
      });
      mockPrismaUser.findUnique.mockResolvedValue({
        id: 'user-123',
        passwordHash: null,
        _count: { accounts: 1 },
      });

      await expect(
        unlinkOAuthAccount({
          userId: 'user-123',
          provider: 'github',
        })
      ).rejects.toThrow('Cannot unlink the only login method');
    });
  });

  describe('getUserLinkedAccounts', () => {
    it('should return list of linked accounts', async () => {
      mockPrismaAccount.findMany.mockResolvedValue([
        {
          id: 'account-1',
          provider: 'github',
          providerAccountId: 'github-123',
          createdAt: new Date(),
        },
        {
          id: 'account-2',
          provider: 'google',
          providerAccountId: 'google-456',
          createdAt: new Date(),
        },
      ]);

      const result = await getUserLinkedAccounts('user-123');

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('provider', 'github');
      expect(result[1]).toHaveProperty('provider', 'google');
    });

    it('should return empty array if no accounts linked', async () => {
      mockPrismaAccount.findMany.mockResolvedValue([]);

      const result = await getUserLinkedAccounts('user-123');

      expect(result).toHaveLength(0);
    });
  });

  describe('getOAuthUserProfile', () => {
    it('should fetch GitHub user profile', async () => {
      const profile = await getOAuthUserProfile('github', 'test-access-token');

      expect(profile).toHaveProperty('id', '12345');
      expect(profile).toHaveProperty('email', 'test@example.com');
      expect(profile).toHaveProperty('name', 'Test User');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.github.com/user',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-access-token',
          }),
        })
      );
    });

    it('should fetch Google user profile', async () => {
      const profile = await getOAuthUserProfile('google', 'test-access-token');

      expect(profile).toHaveProperty('id', 'google-user-123');
      expect(profile).toHaveProperty('email', 'test@example.com');
      expect(profile).toHaveProperty('name', 'Test User');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://www.googleapis.com/oauth2/v2/userinfo',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-access-token',
          }),
        })
      );
    });
  });
});
