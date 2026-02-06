/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';

// Use vi.hoisted() to ensure mock variables are available when vi.mock is hoisted
const { mockPrismaUser, mockPrismaAccount, mockPrismaSession, mockPrisma, mockFetch } = vi.hoisted(
  () => {
    const mockPrismaUser = {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };

    const mockPrismaAccount = {
      create: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    };

    const mockPrismaSession = {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    };

    const mockPrisma = {
      user: mockPrismaUser,
      account: mockPrismaAccount,
      session: mockPrismaSession,
      $transaction: vi.fn(),
    };

    const mockFetch = vi.fn();

    return {
      mockPrismaUser,
      mockPrismaAccount,
      mockPrismaSession,
      mockPrisma,
      mockFetch,
    };
  }
);

// Mock prisma
vi.mock('../../lib/prisma.js', () => ({
  prisma: mockPrisma,
}));

// Mock env with OAuth credentials configured
vi.mock('../../config/env.js', () => ({
  env: {
    GITHUB_CLIENT_ID: 'test-github-client-id',
    GITHUB_CLIENT_SECRET: 'test-github-client-secret',
    GOOGLE_CLIENT_ID: 'test-google-client-id',
    GOOGLE_CLIENT_SECRET: 'test-google-client-secret',
    APP_URL: 'http://localhost:3000',
  },
}));

// Mock Arctic providers
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

// Mock session service
vi.mock('../../services/session.service.js', () => ({
  createSession: vi.fn().mockImplementation(async (opts) => ({
    id: 'mock-session-id',
    userId: opts.userId,
    token: 'mock-session-token',
    userAgent: opts.userAgent ?? null,
    ipAddress: opts.ipAddress ?? null,
    lastActiveAt: new Date(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    createdAt: new Date(),
  })),
  getSessionByToken: vi.fn(),
  touchSession: vi.fn().mockResolvedValue(undefined),
}));

// Mock global fetch
global.fetch = mockFetch;

// Import Fastify and plugins
import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import { oauthRoutes } from './oauth.routes.js';
import * as sessionService from '../../services/session.service.js';

function resetMocks() {
  Object.values(mockPrismaUser).forEach((mock) => mock.mockReset());
  Object.values(mockPrismaAccount).forEach((mock) => mock.mockReset());
  Object.values(mockPrismaSession).forEach((mock) => mock.mockReset());
  mockPrisma.$transaction.mockReset();
  mockFetch.mockReset();
}

describe('OAuth Routes', () => {
  let app: FastifyInstance;

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

  beforeAll(async () => {
    app = Fastify({ logger: false });

    await app.register(cookie, {
      secret: 'test-secret-key-must-be-at-least-32-characters',
    });

    // Register OAuth routes
    await app.register(oauthRoutes, { prefix: '/api/v1/oauth' });

    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    resetMocks();

    // Setup default fetch mock
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

  describe('GET /api/v1/oauth/providers', () => {
    it('should return list of configured providers', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/oauth/providers',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.providers).toContain('github');
      expect(body.providers).toContain('google');
    });
  });

  describe('GET /api/v1/oauth/:provider', () => {
    it('should return GitHub authorization URL', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/oauth/github',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.url).toContain('github.com');
      expect(body.url).toContain('state=');
    });

    it('should return Google authorization URL', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/oauth/google',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.url).toContain('accounts.google.com');
      expect(body.url).toContain('state=');
    });

    it('should return 400 for unsupported provider', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/oauth/facebook',
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('GET /api/v1/oauth/:provider/callback', () => {
    const mockUser = {
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
      providerAccountId: '12345',
    };

    it('should login existing user with linked account', async () => {
      // First, initiate OAuth to store state
      const initResponse = await app.inject({
        method: 'GET',
        url: '/api/v1/oauth/github',
      });
      expect(initResponse.statusCode).toBe(200);
      const { state } = JSON.parse(initResponse.body);

      mockPrismaAccount.findUnique.mockResolvedValue({
        ...mockAccount,
        user: mockUser,
      });
      mockPrismaAccount.update.mockResolvedValue(mockAccount);

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/oauth/github/callback?code=test-code&state=${state}`,
      });

      // Should redirect to app after successful login
      expect(response.statusCode).toBe(302);
      expect(response.headers.location).toContain('/');
    });

    it('should create new user if no existing account', async () => {
      // First, initiate OAuth to store state
      const initResponse = await app.inject({
        method: 'GET',
        url: '/api/v1/oauth/github',
      });
      expect(initResponse.statusCode).toBe(200);
      const { state } = JSON.parse(initResponse.body);

      mockPrismaAccount.findUnique.mockResolvedValue(null);
      mockPrismaUser.findUnique.mockResolvedValue(null);
      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        return callback({
          user: {
            create: vi.fn().mockResolvedValue(mockUser),
          },
          account: {
            create: vi.fn().mockResolvedValue(mockAccount),
          },
        });
      });

      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/oauth/github/callback?code=test-code&state=${state}`,
      });

      expect(response.statusCode).toBe(302);
    });

    it('should return error if code is missing', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/oauth/github/callback?state=test-state',
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return error if state is missing', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/oauth/github/callback?code=test-code',
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return error for invalid state', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/oauth/github/callback?code=test-code&state=invalid-state',
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('INVALID_STATE');
    });
  });

  describe('GET /api/v1/oauth/accounts (authenticated)', () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      emailVerified: true,
      deletedAt: null,
    };

    const mockSession = {
      id: 'session-123',
      userId: 'user-123',
      token: 'valid-session-token',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      user: mockUser,
    };

    it('should return linked accounts for authenticated user', async () => {
      vi.mocked(sessionService.getSessionByToken).mockResolvedValue(mockSession as any);
      mockPrismaAccount.findMany.mockResolvedValue([
        { id: 'acc-1', provider: 'github', providerAccountId: '12345', createdAt: new Date() },
        { id: 'acc-2', provider: 'google', providerAccountId: 'google-123', createdAt: new Date() },
      ]);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/oauth/accounts',
        cookies: { session_token: 'valid-session-token' },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.accounts).toHaveLength(2);
    });

    it('should return 401 if not authenticated', async () => {
      vi.mocked(sessionService.getSessionByToken).mockResolvedValue(null);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/oauth/accounts',
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('DELETE /api/v1/oauth/:provider/unlink (authenticated)', () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      emailVerified: true,
      deletedAt: null,
      passwordHash: 'hashed-password',
    };

    const mockSession = {
      id: 'session-123',
      userId: 'user-123',
      token: 'valid-session-token',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      user: mockUser,
    };

    it('should unlink OAuth account', async () => {
      vi.mocked(sessionService.getSessionByToken).mockResolvedValue(mockSession as any);
      mockPrismaAccount.findFirst.mockResolvedValue({
        id: 'acc-1',
        provider: 'github',
        userId: 'user-123',
      });
      mockPrismaUser.findUnique.mockResolvedValue({
        ...mockUser,
        _count: { accounts: 2 },
      });
      mockPrismaAccount.delete.mockResolvedValue({});

      const response = await app.inject({
        method: 'DELETE',
        url: '/api/v1/oauth/github/unlink',
        cookies: { session_token: 'valid-session-token' },
      });

      expect(response.statusCode).toBe(200);
    });

    it('should return 400 if trying to unlink only login method', async () => {
      vi.mocked(sessionService.getSessionByToken).mockResolvedValue(mockSession as any);
      mockPrismaAccount.findFirst.mockResolvedValue({
        id: 'acc-1',
        provider: 'github',
        userId: 'user-123',
      });
      mockPrismaUser.findUnique.mockResolvedValue({
        id: 'user-123',
        passwordHash: null,
        _count: { accounts: 1 },
      });

      const response = await app.inject({
        method: 'DELETE',
        url: '/api/v1/oauth/github/unlink',
        cookies: { session_token: 'valid-session-token' },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 401 if not authenticated', async () => {
      vi.mocked(sessionService.getSessionByToken).mockResolvedValue(null);

      const response = await app.inject({
        method: 'DELETE',
        url: '/api/v1/oauth/github/unlink',
      });

      expect(response.statusCode).toBe(401);
    });
  });
});
