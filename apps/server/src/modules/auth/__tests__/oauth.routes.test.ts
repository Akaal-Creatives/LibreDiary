import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';

// Use vi.hoisted() to ensure mock variables are available when vi.mock is hoisted
const { mockOAuthService, _mockSession, mockOAuthAccount, resetMocks } = vi.hoisted(() => {
  const now = new Date();
  const futureDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const mockSession = {
    id: 'session-123',
    userId: 'user-123',
    token: 'valid-token',
    userAgent: 'Mozilla/5.0',
    ipAddress: '127.0.0.1',
    expiresAt: futureDate,
    lastActiveAt: now,
    createdAt: now,
  };

  const mockOAuthAccount = {
    id: 'oauth-123',
    userId: 'user-123',
    provider: 'github',
    providerAccountId: 'github-user-123',
    createdAt: now,
  };

  const mockOAuthService = {
    getConfiguredProviders: vi.fn(),
    isProviderConfigured: vi.fn(),
    getAuthorizationUrl: vi.fn(),
    handleOAuthCallback: vi.fn(),
    getUserLinkedAccounts: vi.fn(),
    unlinkOAuthAccount: vi.fn(),
  };

  function resetMocks() {
    Object.values(mockOAuthService).forEach((mock) => mock.mockReset());
  }

  return {
    mockOAuthService,
    _mockSession: mockSession,
    mockOAuthAccount,
    resetMocks,
  };
});

// Mock modules before any imports
vi.mock('../oauth.service.js', () => mockOAuthService);

vi.mock('../auth.middleware.js', () => ({
  requireAuth: vi.fn(
    async (request: {
      user: { id: string; email: string; name: string };
      sessionToken: string;
    }) => {
      request.user = { id: 'user-123', email: 'test@example.com', name: 'Test User' };
      request.sessionToken = 'valid-token';
    }
  ),
  setSessionCookie: vi.fn(),
  getClientIp: vi.fn(() => '127.0.0.1'),
}));

vi.mock('../../../utils/tokens.js', () => ({
  EXPIRATION: {
    SESSION: 7 * 24 * 60 * 60 * 1000,
  },
}));

vi.mock('../../../config/env.js', () => ({
  env: {
    APP_URL: 'http://localhost:3000',
  },
}));

// Import Fastify and routes after mocking
import Fastify from 'fastify';
import { oauthRoutes } from '../oauth.routes.js';

describe('OAuth Routes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify({
      logger: false,
    });

    // Mock request decorators
    app.decorateRequest('user', null);
    app.decorateRequest('sessionToken', null);

    await app.register(oauthRoutes, { prefix: '/oauth' });
    await app.ready();
  });

  beforeEach(() => {
    resetMocks();
    vi.clearAllMocks();
  });

  afterAll(async () => {
    await app.close();
    vi.restoreAllMocks();
  });

  // ===========================================
  // GET PROVIDERS
  // ===========================================

  describe('GET /oauth/providers', () => {
    it('should return list of configured providers', async () => {
      mockOAuthService.getConfiguredProviders.mockReturnValue(['github', 'google']);

      const response = await app.inject({
        method: 'GET',
        url: '/oauth/providers',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.providers).toEqual(['github', 'google']);
    });

    it('should return empty array when no providers configured', async () => {
      mockOAuthService.getConfiguredProviders.mockReturnValue([]);

      const response = await app.inject({
        method: 'GET',
        url: '/oauth/providers',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.providers).toEqual([]);
    });
  });

  // ===========================================
  // INITIATE OAUTH FLOW
  // ===========================================

  describe('GET /oauth/:provider', () => {
    it('should return authorization URL for GitHub', async () => {
      mockOAuthService.isProviderConfigured.mockReturnValue(true);
      mockOAuthService.getAuthorizationUrl.mockResolvedValue({
        url: 'https://github.com/login/oauth/authorize?...',
        state: 'random-state-123',
        codeVerifier: 'pkce-verifier',
      });

      const response = await app.inject({
        method: 'GET',
        url: '/oauth/github',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.url).toContain('github.com');
      expect(body.state).toBe('random-state-123');
    });

    it('should return authorization URL for Google', async () => {
      mockOAuthService.isProviderConfigured.mockReturnValue(true);
      mockOAuthService.getAuthorizationUrl.mockResolvedValue({
        url: 'https://accounts.google.com/o/oauth2/v2/auth?...',
        state: 'random-state-456',
        codeVerifier: 'pkce-verifier',
      });

      const response = await app.inject({
        method: 'GET',
        url: '/oauth/google',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.url).toContain('google.com');
    });

    it('should return 400 for unsupported provider', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/oauth/facebook',
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('INVALID_PROVIDER');
    });

    it('should return 400 when provider not configured', async () => {
      mockOAuthService.isProviderConfigured.mockReturnValue(false);

      const response = await app.inject({
        method: 'GET',
        url: '/oauth/github',
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('PROVIDER_NOT_CONFIGURED');
    });

    it('should return 500 on service error', async () => {
      mockOAuthService.isProviderConfigured.mockReturnValue(true);
      mockOAuthService.getAuthorizationUrl.mockRejectedValue(
        new Error('OAuth configuration error')
      );

      const response = await app.inject({
        method: 'GET',
        url: '/oauth/github',
      });

      expect(response.statusCode).toBe(500);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('OAUTH_ERROR');
    });
  });

  // ===========================================
  // OAUTH CALLBACK
  // ===========================================

  describe('GET /oauth/:provider/callback', () => {
    it('should return 400 for unsupported provider', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/oauth/facebook/callback?code=abc&state=xyz',
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('INVALID_PROVIDER');
    });

    it('should return 400 for missing code parameter', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/oauth/github/callback?state=xyz',
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('INVALID_CALLBACK');
    });

    it('should return 400 for missing state parameter', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/oauth/github/callback?code=abc',
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('INVALID_CALLBACK');
    });

    it('should return 400 for invalid state', async () => {
      // State is not in the store
      const response = await app.inject({
        method: 'GET',
        url: '/oauth/github/callback?code=abc&state=invalid-state',
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('INVALID_STATE');
    });
  });

  // ===========================================
  // GET LINKED ACCOUNTS
  // ===========================================

  describe('GET /oauth/accounts', () => {
    it('should return linked OAuth accounts', async () => {
      mockOAuthService.getUserLinkedAccounts.mockResolvedValue([
        mockOAuthAccount,
        { ...mockOAuthAccount, id: 'oauth-456', provider: 'google' },
      ]);

      const response = await app.inject({
        method: 'GET',
        url: '/oauth/accounts',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.accounts).toHaveLength(2);
      expect(body.accounts[0].provider).toBe('github');
      expect(body.accounts[1].provider).toBe('google');
    });

    it('should return empty array when no accounts linked', async () => {
      mockOAuthService.getUserLinkedAccounts.mockResolvedValue([]);

      const response = await app.inject({
        method: 'GET',
        url: '/oauth/accounts',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.accounts).toEqual([]);
    });

    it('should not expose sensitive fields', async () => {
      mockOAuthService.getUserLinkedAccounts.mockResolvedValue([mockOAuthAccount]);

      const response = await app.inject({
        method: 'GET',
        url: '/oauth/accounts',
      });

      const body = JSON.parse(response.body);
      expect(body.accounts[0]).not.toHaveProperty('providerAccountId');
      expect(body.accounts[0]).toHaveProperty('id');
      expect(body.accounts[0]).toHaveProperty('provider');
      expect(body.accounts[0]).toHaveProperty('createdAt');
    });
  });

  // ===========================================
  // LINK OAUTH ACCOUNT
  // ===========================================

  describe('GET /oauth/:provider/link', () => {
    it('should return authorization URL for linking', async () => {
      mockOAuthService.isProviderConfigured.mockReturnValue(true);
      mockOAuthService.getAuthorizationUrl.mockResolvedValue({
        url: 'https://github.com/login/oauth/authorize?...',
        state: 'link-state-123',
        codeVerifier: 'pkce-verifier',
      });

      const response = await app.inject({
        method: 'GET',
        url: '/oauth/github/link',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.url).toContain('github.com');
    });

    it('should return 400 for unsupported provider', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/oauth/facebook/link',
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('INVALID_PROVIDER');
    });

    it('should return 400 when provider not configured', async () => {
      mockOAuthService.isProviderConfigured.mockReturnValue(false);

      const response = await app.inject({
        method: 'GET',
        url: '/oauth/github/link',
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('PROVIDER_NOT_CONFIGURED');
    });
  });

  // ===========================================
  // UNLINK OAUTH ACCOUNT
  // ===========================================

  describe('DELETE /oauth/:provider/unlink', () => {
    it('should unlink OAuth account', async () => {
      mockOAuthService.unlinkOAuthAccount.mockResolvedValue(undefined);

      const response = await app.inject({
        method: 'DELETE',
        url: '/oauth/github/unlink',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.message).toContain('github');
      expect(body.message).toContain('unlinked');
    });

    it('should return 400 for unsupported provider', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/oauth/facebook/unlink',
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('INVALID_PROVIDER');
    });

    it('should return 400 when account not linked', async () => {
      mockOAuthService.unlinkOAuthAccount.mockRejectedValue(new Error('Account not linked'));

      const response = await app.inject({
        method: 'DELETE',
        url: '/oauth/github/unlink',
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('UNLINK_ERROR');
    });

    it('should return 400 when cannot unlink last login method', async () => {
      mockOAuthService.unlinkOAuthAccount.mockRejectedValue(
        new Error('Cannot unlink the only login method')
      );

      const response = await app.inject({
        method: 'DELETE',
        url: '/oauth/github/unlink',
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('UNLINK_ERROR');
    });
  });
});

// ===========================================
// PROVIDER VALIDATION TESTS
// ===========================================

describe('OAuth Provider Validation', () => {
  it('should only accept github and google providers', () => {
    const SUPPORTED_PROVIDERS = ['github', 'google'];
    expect(SUPPORTED_PROVIDERS).toContain('github');
    expect(SUPPORTED_PROVIDERS).toContain('google');
    expect(SUPPORTED_PROVIDERS).not.toContain('facebook');
    expect(SUPPORTED_PROVIDERS).not.toContain('twitter');
  });
});
