/**
 * Integration tests for the full application bootstrap
 *
 * These tests use the actual buildApp() function to ensure all plugins
 * and routes are properly configured with correct encapsulation.
 *
 * This test file specifically addresses the issue where unit tests
 * register plugins directly instead of using the actual app configuration,
 * which can miss encapsulation bugs like cookie decorators not being
 * available in child routes.
 */

import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import type { FastifyInstance } from 'fastify';

// Use vi.hoisted() to ensure mock variables are available when vi.mock is hoisted
const {
  mockPrismaSession,
  mockPrismaUser,
  mockPrismaVerificationToken,
  mockPrismaInvite,
  mockPrismaOrganization,
  mockPrismaOrganizationMember,
  mockPrismaPage,
  mockPrisma,
  mockArgonHash,
  mockArgonVerify,
} = vi.hoisted(() => {
  const mockPrismaSession = {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
  };

  const mockPrismaUser = {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };

  const mockPrismaVerificationToken = {
    create: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
  };

  const mockPrismaInvite = {
    create: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };

  const mockPrismaOrganization = {
    create: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  };

  const mockPrismaOrganizationMember = {
    create: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  };

  const mockPrismaPage = {
    create: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  };

  const mockPrisma = {
    session: mockPrismaSession,
    user: mockPrismaUser,
    verificationToken: mockPrismaVerificationToken,
    invite: mockPrismaInvite,
    organization: mockPrismaOrganization,
    organizationMember: mockPrismaOrganizationMember,
    page: mockPrismaPage,
    $transaction: vi.fn(),
  };

  const mockArgonHash = vi.fn();
  const mockArgonVerify = vi.fn();

  return {
    mockPrismaSession,
    mockPrismaUser,
    mockPrismaVerificationToken,
    mockPrismaInvite,
    mockPrismaOrganization,
    mockPrismaOrganizationMember,
    mockPrismaPage,
    mockPrisma,
    mockArgonHash,
    mockArgonVerify,
  };
});

// Mock modules before any imports
vi.mock('../../src/lib/prisma.js', () => ({
  prisma: mockPrisma,
}));

vi.mock('../../src/services/email.service.js', () => ({
  sendVerificationEmail: vi.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
  sendInviteEmail: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@node-rs/argon2', () => ({
  hash: mockArgonHash,
  verify: mockArgonVerify,
}));

// Mock session service to avoid actual prisma calls
vi.mock('../../src/services/session.service.js', async (importOriginal) => {
  const original = (await importOriginal()) as Record<string, unknown>;
  return {
    ...original,
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
    deleteSession: vi.fn().mockResolvedValue(undefined),
    deleteSessionByToken: vi.fn().mockResolvedValue(undefined),
    getUserSessions: vi.fn().mockResolvedValue([]),
  };
});

// Import buildApp AFTER mocks are set up
import { buildApp } from '../../src/app.js';
import * as sessionService from '../../src/services/session.service.js';

function resetAllMocks() {
  Object.values(mockPrismaSession).forEach((mock) => mock.mockReset());
  Object.values(mockPrismaUser).forEach((mock) => mock.mockReset());
  Object.values(mockPrismaVerificationToken).forEach((mock) => mock.mockReset());
  Object.values(mockPrismaInvite).forEach((mock) => mock.mockReset());
  Object.values(mockPrismaOrganization).forEach((mock) => mock.mockReset());
  Object.values(mockPrismaOrganizationMember).forEach((mock) => mock.mockReset());
  Object.values(mockPrismaPage).forEach((mock) => mock.mockReset());
  mockPrisma.$transaction.mockReset();
  mockArgonVerify.mockReset();
  mockArgonHash.mockReset();
}

describe('App Integration Tests', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    // Use the actual buildApp function - this is the critical difference
    // from unit tests that register plugins directly
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    resetAllMocks();
  });

  describe('Health and Dev Routes', () => {
    it('GET /health should return healthy status', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.status).toBe('healthy');
    });

    it('GET /dev should return developer info', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/dev',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.developer.name).toBe('Akaal Creatives');
      expect(body.data.developer.website).toBe('https://www.akaalcreatives.com');
    });
  });

  describe('Cookie Plugin Integration', () => {
    /**
     * This test verifies that the cookie plugin is properly wrapped with
     * fastify-plugin and its decorators (setCookie, clearCookie) are
     * available in child route contexts.
     *
     * This would have caught the "reply.setCookie is not a function" bug
     * that occurred when the cookie plugin was not properly wrapped.
     */

    const now = new Date();
    const futureDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      passwordHash: 'hashed-password',
      name: 'Test User',
      emailVerified: true,
      emailVerifiedAt: now,
      avatarUrl: null,
      locale: 'en',
      isSuperAdmin: false,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };

    const mockSession = {
      id: 'session-123',
      userId: 'user-123',
      token: 'session-token-abc',
      userAgent: null,
      ipAddress: null,
      lastActiveAt: now,
      expiresAt: futureDate,
      createdAt: now,
    };

    it('POST /api/v1/auth/login should set session cookie (tests setCookie in child route)', async () => {
      mockPrismaUser.findUnique.mockResolvedValue(mockUser);
      mockArgonVerify.mockResolvedValue(true);
      mockPrismaSession.create.mockResolvedValue(mockSession);
      mockPrismaOrganizationMember.findMany.mockResolvedValue([]);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: 'test@example.com',
          password: 'password123',
        },
      });

      // This assertion would fail if cookie plugin decorators weren't available
      // in the /api/v1/auth child context
      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);

      // Verify cookie is set - this is the critical assertion
      const sessionCookie = response.cookies.find((c) => c.name === 'session_token');
      expect(sessionCookie).toBeDefined();
      expect(sessionCookie?.httpOnly).toBe(true);
      expect(sessionCookie?.path).toBe('/');
    });

    it('POST /api/v1/auth/logout should clear session cookie (tests clearCookie in child route)', async () => {
      const mockSessionWithUser = {
        ...mockSession,
        user: {
          id: 'user-123',
          email: 'test@example.com',
          deletedAt: null,
        },
      };

      vi.mocked(sessionService.getSessionByToken).mockResolvedValue(mockSessionWithUser as never);
      vi.mocked(sessionService.deleteSessionByToken).mockResolvedValue(undefined);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/logout',
        headers: {
          cookie: 'session_token=valid-session-token',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);

      // Verify cookie is cleared
      const sessionCookie = response.cookies.find((c) => c.name === 'session_token');
      expect(sessionCookie).toBeDefined();
      // When clearing a cookie, maxAge is typically set to 0 or expires is set to past
      expect(sessionCookie?.maxAge === 0 || sessionCookie?.value === '').toBe(true);
    });

    it('requireAuth middleware should read cookies from request (tests cookie parsing in child route)', async () => {
      const mockSessionWithUser = {
        id: 'session-123',
        userId: 'user-123',
        token: 'valid-token',
        expiresAt: futureDate,
        user: {
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          emailVerified: true,
          emailVerifiedAt: now,
          avatarUrl: null,
          locale: 'en',
          isSuperAdmin: false,
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
        },
      };

      vi.mocked(sessionService.getSessionByToken).mockResolvedValue(mockSessionWithUser as never);
      mockPrismaUser.findUnique.mockResolvedValue(mockSessionWithUser.user);
      mockPrismaOrganizationMember.findMany.mockResolvedValue([]);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
        headers: {
          cookie: 'session_token=valid-token',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.user.email).toBe('test@example.com');

      // Verify the session service was called with the token from the cookie
      expect(sessionService.getSessionByToken).toHaveBeenCalledWith('valid-token');
    });
  });

  describe('API Route Structure', () => {
    it('GET /api/v1 should return API info', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.message).toBe('LibreDiary API v1');
    });

    it('should return 404 for non-existent routes', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/nonexistent',
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('Auth Routes via buildApp', () => {
    const now = new Date();

    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      passwordHash: 'hashed-password',
      name: 'Test User',
      emailVerified: true,
      emailVerifiedAt: now,
      avatarUrl: null,
      locale: 'en',
      isSuperAdmin: false,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };

    it('should handle login with invalid credentials', async () => {
      mockPrismaUser.findUnique.mockResolvedValue(mockUser);
      mockArgonVerify.mockResolvedValue(false);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: 'test@example.com',
          password: 'wrong-password',
        },
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('LOGIN_ERROR');
    });

    it('should handle login validation errors', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: 'not-an-email',
          password: 'password123',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject unauthenticated access to protected routes', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('UNAUTHORIZED');
    });

    it('should reject expired sessions', async () => {
      vi.mocked(sessionService.getSessionByToken).mockResolvedValue(null);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
        headers: {
          cookie: 'session_token=expired-token',
        },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('Organization Routes via buildApp', () => {
    const now = new Date();
    const futureDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      avatarUrl: null,
      deletedAt: null,
    };

    const mockSessionWithUser = {
      id: 'session-123',
      userId: 'user-123',
      token: 'valid-token',
      expiresAt: futureDate,
      lastActiveAt: now,
      user: mockUser,
    };

    const mockOrganization = {
      id: 'org-123',
      name: 'Test Organization',
      slug: 'test-org',
      logoUrl: null,
      accentColor: '#6366f1',
      allowedDomain: null,
      aiEnabled: true,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
    };

    const mockMembership = {
      id: 'member-123',
      organizationId: 'org-123',
      userId: 'user-123',
      role: 'OWNER',
      createdAt: now,
      updatedAt: now,
    };

    beforeEach(() => {
      vi.mocked(sessionService.getSessionByToken).mockResolvedValue(mockSessionWithUser as never);
    });

    it('should create organization with proper authentication', async () => {
      mockPrismaOrganization.findFirst.mockResolvedValue(null);
      mockPrisma.$transaction.mockResolvedValue({
        organization: mockOrganization,
        membership: mockMembership,
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/organizations',
        headers: { cookie: 'session_token=valid-token' },
        payload: { name: 'Test Organization' },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.organization.name).toBe('Test Organization');
    });

    it('should reject unauthenticated organization creation', async () => {
      vi.mocked(sessionService.getSessionByToken).mockResolvedValue(null);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/organizations',
        payload: { name: 'Test Organization' },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed JSON body', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        headers: {
          'content-type': 'application/json',
        },
        payload: 'not valid json',
      });

      expect(response.statusCode).toBe(400);
    });

    it('should include proper error structure in responses', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {},
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('success', false);
      expect(body).toHaveProperty('error');
      expect(body.error).toHaveProperty('code');
      expect(body.error).toHaveProperty('message');
    });
  });
});

describe('Plugin Encapsulation Tests', () => {
  /**
   * These tests specifically verify that plugin decorators are properly
   * exposed across the application due to correct use of fastify-plugin.
   */

  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    resetAllMocks();
  });

  it('should have cookie methods available on reply object', async () => {
    // This test verifies the fix for the encapsulation bug
    // by checking that cookie methods are available at the app level

    // Access the decorator directly to verify it exists
    expect(app.hasReplyDecorator('setCookie')).toBe(true);
    expect(app.hasReplyDecorator('clearCookie')).toBe(true);
  });

  it('should have cookie parsing available on request object', async () => {
    expect(app.hasRequestDecorator('cookies')).toBe(true);
  });
});
