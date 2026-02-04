import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';

// Use vi.hoisted() to ensure mock variables are available when vi.mock is hoisted
const {
  mockPrismaSession,
  mockPrismaUser,
  mockPrismaVerificationToken,
  mockPrismaInvite,
  mockPrismaOrganizationMember,
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
    update: vi.fn(),
    delete: vi.fn(),
  };

  const mockPrismaOrganizationMember = {
    create: vi.fn(),
    findMany: vi.fn(),
  };

  const mockPrisma = {
    session: mockPrismaSession,
    user: mockPrismaUser,
    verificationToken: mockPrismaVerificationToken,
    invite: mockPrismaInvite,
    organizationMember: mockPrismaOrganizationMember,
    $transaction: vi.fn(),
  };

  const mockArgonHash = vi.fn();
  const mockArgonVerify = vi.fn();

  return {
    mockPrismaSession,
    mockPrismaUser,
    mockPrismaVerificationToken,
    mockPrismaInvite,
    mockPrismaOrganizationMember,
    mockPrisma,
    mockArgonHash,
    mockArgonVerify,
  };
});

// Mock modules before any imports
// Use async factory to ensure proper module isolation
vi.mock('../../lib/prisma.js', () => ({
  prisma: mockPrisma,
}));

vi.mock('../../services/email.service.js', () => ({
  sendVerificationEmail: vi.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
  sendInviteEmail: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@node-rs/argon2', () => ({
  hash: mockArgonHash,
  verify: mockArgonVerify,
}));

// Mock the session service to avoid prisma calls in it
vi.mock('../../services/session.service.js', async (importOriginal) => {
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

// Import Fastify and plugins directly for test app
import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import { authRoutes } from './auth.routes.js';
// Import the mocked session service to set up return values in tests
import * as sessionService from '../../services/session.service.js';

function resetMocks() {
  Object.values(mockPrismaSession).forEach((mock) => mock.mockReset());
  Object.values(mockPrismaUser).forEach((mock) => mock.mockReset());
  Object.values(mockPrismaVerificationToken).forEach((mock) => mock.mockReset());
  Object.values(mockPrismaInvite).forEach((mock) => mock.mockReset());
  Object.values(mockPrismaOrganizationMember).forEach((mock) => mock.mockReset());
  mockPrisma.$transaction.mockReset();
  mockArgonVerify.mockReset();
  mockArgonHash.mockReset();
}

describe('Auth Routes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    // Create a test-specific Fastify instance with minimal plugins
    app = Fastify({
      logger: false,
    });

    // Register cookie plugin directly (not through our plugin wrapper)
    await app.register(cookie, {
      secret: 'test-secret-key-must-be-at-least-32-characters',
    });

    // Register auth routes under /api/v1/auth
    await app.register(authRoutes, { prefix: '/api/v1/auth' });

    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    resetMocks();
    // Note: Don't use fake timers in integration tests as they interfere with Fastify's async operations
  });

  describe('POST /api/v1/auth/login', () => {
    // Use dynamic dates to avoid time-related test failures
    const now = new Date();
    const futureDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

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

    it('should login successfully with valid credentials', async () => {
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

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.user.email).toBe('test@example.com');
      expect(body.data.user.passwordHash).toBeUndefined();
      expect(response.cookies).toContainEqual(expect.objectContaining({ name: 'session_token' }));
    });

    it('should return 401 for invalid credentials', async () => {
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

    it('should return 400 for invalid email format', async () => {
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

    it('should return 400 for missing password', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: {
          email: 'test@example.com',
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    const now = new Date();
    const futureDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const mockSession = {
      id: 'session-123',
      userId: 'user-123',
      token: 'valid-session-token',
      userAgent: null,
      ipAddress: null,
      lastActiveAt: now,
      expiresAt: futureDate,
      createdAt: now,
      user: {
        id: 'user-123',
        email: 'test@example.com',
        deletedAt: null,
      },
    };

    it('should logout successfully with valid session', async () => {
      // Mock session service for authentication
      vi.mocked(sessionService.getSessionByToken).mockResolvedValue(mockSession as never);
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
    });

    it('should return 401 without session cookie', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/logout',
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('UNAUTHORIZED');
    });
  });

  describe('GET /api/v1/auth/me', () => {
    const now = new Date();
    const futureDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

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

    it('should return current user data', async () => {
      // Mock session service for authentication
      vi.mocked(sessionService.getSessionByToken).mockResolvedValue(mockSessionWithUser as never);
      // Mock prisma for fetching user details and organizations
      mockPrismaUser.findUnique.mockResolvedValue(mockSessionWithUser.user);
      mockPrismaOrganizationMember.findMany.mockResolvedValue([
        {
          organization: { id: 'org-123', name: 'Test Org' },
        },
      ]);

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
      expect(body.data.organizations).toHaveLength(1);
    });

    it('should return 401 without session', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/me',
      });

      expect(response.statusCode).toBe(401);
    });

    it('should return 401 for expired session', async () => {
      // Session service returns null for expired sessions
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

  describe('POST /api/v1/auth/verify-email', () => {
    const now = new Date();
    const futureDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 1 day from now

    it('should verify email with valid token', async () => {
      const mockToken = {
        id: 'token-123',
        identifier: 'test@example.com',
        token: 'verify-token',
        type: 'EMAIL_VERIFICATION',
        expiresAt: futureDate,
        usedAt: null,
      };
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        emailVerified: true,
        emailVerifiedAt: now,
        name: 'Test',
        avatarUrl: null,
        locale: 'en',
        isSuperAdmin: false,
        createdAt: now,
        updatedAt: now,
      };

      mockPrismaVerificationToken.findUnique.mockResolvedValue(mockToken);
      mockPrisma.$transaction.mockResolvedValue([mockUser, {}]);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/verify-email',
        payload: {
          token: 'verify-token',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.user.emailVerified).toBe(true);
    });

    it('should return 400 for invalid token', async () => {
      mockPrismaVerificationToken.findUnique.mockResolvedValue(null);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/verify-email',
        payload: {
          token: 'invalid-token',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('VERIFICATION_ERROR');
    });
  });

  describe('POST /api/v1/auth/forgot-password', () => {
    it('should always return success (prevent enumeration)', async () => {
      mockPrismaUser.findUnique.mockResolvedValue(null);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/forgot-password',
        payload: {
          email: 'nonexistent@example.com',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
    });

    it('should return 400 for invalid email format', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/forgot-password',
        payload: {
          email: 'not-an-email',
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('POST /api/v1/auth/reset-password', () => {
    const futureDate = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

    it('should reset password with valid token', async () => {
      mockPrismaVerificationToken.findUnique.mockResolvedValue({
        id: 'token-123',
        identifier: 'test@example.com',
        token: 'reset-token',
        type: 'PASSWORD_RESET',
        expiresAt: futureDate,
        usedAt: null,
      });
      mockArgonHash.mockResolvedValue('new-hashed-password');
      mockPrisma.$transaction.mockResolvedValue([{}, {}]);

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/reset-password',
        payload: {
          token: 'reset-token',
          password: 'newPassword123',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
    });

    it('should return 400 for password too short', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/reset-password',
        payload: {
          token: 'reset-token',
          password: 'short',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/v1/auth/sessions', () => {
    const now = new Date();
    const futureDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const mockSessionWithUser = {
      id: 'session-123',
      userId: 'user-123',
      token: 'valid-token',
      expiresAt: futureDate,
      lastActiveAt: now,
      user: {
        id: 'user-123',
        deletedAt: null,
      },
    };

    it('should list user sessions', async () => {
      // Mock session service for authentication
      vi.mocked(sessionService.getSessionByToken).mockResolvedValue(mockSessionWithUser as never);
      vi.mocked(sessionService.getUserSessions).mockResolvedValue([
        {
          id: 'session-123',
          userId: 'user-123',
          token: 'valid-token',
          userAgent: 'Chrome',
          ipAddress: '127.0.0.1',
          lastActiveAt: new Date(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          createdAt: new Date(),
        },
        {
          id: 'session-456',
          userId: 'user-123',
          token: 'other-token',
          userAgent: 'Firefox',
          ipAddress: '192.168.1.1',
          lastActiveAt: new Date(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          createdAt: new Date(),
        },
      ]);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/sessions',
        headers: {
          cookie: 'session_token=valid-token',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.sessions).toHaveLength(2);
      expect(body.data.sessions[0].isCurrent).toBe(true);
    });
  });

  describe('DELETE /api/v1/auth/sessions/:id', () => {
    const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const mockSessionWithUser = {
      id: 'session-123',
      userId: 'user-123',
      token: 'valid-token',
      expiresAt: futureDate,
      user: {
        id: 'user-123',
        deletedAt: null,
      },
    };

    it('should revoke session', async () => {
      // Mock session service for authentication
      vi.mocked(sessionService.getSessionByToken).mockResolvedValue(mockSessionWithUser as never);
      // Mock prisma for finding the session to revoke
      mockPrismaSession.findUnique.mockResolvedValue({
        id: 'session-to-delete',
        userId: 'user-123',
      });
      vi.mocked(sessionService.deleteSession).mockResolvedValue(undefined);

      const response = await app.inject({
        method: 'DELETE',
        url: '/api/v1/auth/sessions/session-to-delete',
        headers: {
          cookie: 'session_token=valid-token',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
    });

    it('should return 404 for non-existent session', async () => {
      // Mock session service for authentication
      vi.mocked(sessionService.getSessionByToken).mockResolvedValue(mockSessionWithUser as never);
      // Mock prisma - session not found
      mockPrismaSession.findUnique.mockResolvedValue(null);

      const response = await app.inject({
        method: 'DELETE',
        url: '/api/v1/auth/sessions/nonexistent',
        headers: {
          cookie: 'session_token=valid-token',
        },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('GET /api/v1/auth/invite/:token', () => {
    const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    it('should return invite details', async () => {
      mockPrismaInvite.findUnique.mockResolvedValue({
        id: 'invite-123',
        email: 'new@example.com',
        token: 'invite-token',
        expiresAt: futureDate,
        acceptedAt: null,
        organization: {
          name: 'Test Org',
          logoUrl: null,
        },
      });

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/invite/invite-token',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.email).toBe('new@example.com');
      expect(body.data.organization.name).toBe('Test Org');
    });

    it('should return 404 for invalid invite', async () => {
      mockPrismaInvite.findUnique.mockResolvedValue(null);

      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/invite/invalid-token',
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('INVITE_NOT_FOUND');
    });
  });
});
