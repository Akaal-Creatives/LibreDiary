import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';

// Use vi.hoisted() to ensure mock variables are available when vi.mock is hoisted
const { mockAuthService, mockUser, mockSession, mockOrganization, mockMembership, resetMocks } =
  vi.hoisted(() => {
    const now = new Date();
    const futureDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      avatarUrl: null,
      emailVerified: true,
      emailVerifiedAt: now,
      locale: 'en',
      isSuperAdmin: false,
      createdAt: now,
      updatedAt: now,
      passwordHash: 'hashed',
      deletedAt: null,
    };

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

    const mockOrganization = {
      id: 'org-123',
      name: 'Test Organization',
      slug: 'test-org',
      logoUrl: null,
    };

    const mockMembership = {
      id: 'member-123',
      organizationId: 'org-123',
      userId: 'user-123',
      role: 'MEMBER',
    };

    const mockAuthService = {
      register: vi.fn(),
      login: vi.fn(),
      logout: vi.fn(),
      getCurrentUser: vi.fn(),
      verifyEmail: vi.fn(),
      resendVerificationEmail: vi.fn(),
      forgotPassword: vi.fn(),
      resetPassword: vi.fn(),
      getSessions: vi.fn(),
      revokeSession: vi.fn(),
      getInviteByToken: vi.fn(),
    };

    function resetMocks() {
      Object.values(mockAuthService).forEach((mock) => mock.mockReset());
    }

    return {
      mockAuthService,
      mockUser,
      mockSession,
      mockOrganization,
      mockMembership,
      resetMocks,
    };
  });

// Mock modules before any imports
vi.mock('../auth.service.js', () => mockAuthService);

vi.mock('../auth.middleware.js', () => ({
  requireAuth: vi.fn(
    async (request: {
      user: { id: string; email: string; name: string };
      sessionToken: string;
      sessionId: string;
    }) => {
      request.user = { id: 'user-123', email: 'test@example.com', name: 'Test User' };
      request.sessionToken = 'valid-token';
      request.sessionId = 'session-123';
    }
  ),
  setSessionCookie: vi.fn(),
  clearSessionCookie: vi.fn(),
  getClientIp: vi.fn(() => '127.0.0.1'),
}));

vi.mock('../../../utils/tokens.js', () => ({
  EXPIRATION: {
    SESSION: 7 * 24 * 60 * 60 * 1000,
  },
}));

// Import Fastify and routes after mocking
import Fastify from 'fastify';
import { authRoutes } from '../auth.routes.js';

describe('Auth Routes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = Fastify({
      logger: false,
    });

    // Mock request decorators
    app.decorateRequest('user', null);
    app.decorateRequest('sessionToken', null);
    app.decorateRequest('sessionId', null);

    await app.register(authRoutes, { prefix: '/auth' });
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
  // REGISTER
  // ===========================================

  describe('POST /auth/register', () => {
    it('should register a new user with invite token', async () => {
      mockAuthService.register.mockResolvedValue({
        user: mockUser,
        session: mockSession,
        organizations: [mockOrganization],
        memberships: [mockMembership],
      });

      const response = await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: {
          email: 'test@example.com',
          password: 'password123',
          name: 'Test User',
          inviteToken: 'valid-invite',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.user.email).toBe('test@example.com');
      expect(body.data.user).not.toHaveProperty('passwordHash');
    });

    it('should return 400 for invalid email', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: {
          email: 'invalid-email',
          password: 'password123',
          inviteToken: 'valid-invite',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for password too short', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: {
          email: 'test@example.com',
          password: 'short',
          inviteToken: 'valid-invite',
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 for missing invite token', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: {
          email: 'test@example.com',
          password: 'password123',
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 for invalid invite', async () => {
      mockAuthService.register.mockRejectedValue(new Error('Invalid or expired invite'));

      const response = await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: {
          email: 'test@example.com',
          password: 'password123',
          inviteToken: 'invalid-invite',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('REGISTRATION_ERROR');
    });

    it('should return 400 for duplicate email', async () => {
      mockAuthService.register.mockRejectedValue(new Error('Email already registered'));

      const response = await app.inject({
        method: 'POST',
        url: '/auth/register',
        payload: {
          email: 'existing@example.com',
          password: 'password123',
          inviteToken: 'valid-invite',
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  // ===========================================
  // LOGIN
  // ===========================================

  describe('POST /auth/login', () => {
    it('should login with valid credentials', async () => {
      mockAuthService.login.mockResolvedValue({
        user: mockUser,
        session: mockSession,
        organizations: [mockOrganization],
        memberships: [mockMembership],
      });

      const response = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: {
          email: 'test@example.com',
          password: 'password123',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.user.email).toBe('test@example.com');
    });

    it('should return 400 for invalid email format', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: {
          email: 'invalid',
          password: 'password123',
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 401 for invalid credentials', async () => {
      mockAuthService.login.mockRejectedValue(new Error('Invalid email or password'));

      const response = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: {
          email: 'test@example.com',
          password: 'wrongpassword',
        },
      });

      expect(response.statusCode).toBe(401);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('LOGIN_ERROR');
    });

    it('should return 401 for non-existent user', async () => {
      mockAuthService.login.mockRejectedValue(new Error('Invalid email or password'));

      const response = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: {
          email: 'nonexistent@example.com',
          password: 'password123',
        },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  // ===========================================
  // LOGOUT
  // ===========================================

  describe('POST /auth/logout', () => {
    it('should logout successfully', async () => {
      mockAuthService.logout.mockResolvedValue(undefined);

      const response = await app.inject({
        method: 'POST',
        url: '/auth/logout',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.message).toContain('Logged out');
    });
  });

  // ===========================================
  // GET CURRENT USER
  // ===========================================

  describe('GET /auth/me', () => {
    it('should return current user data', async () => {
      mockAuthService.getCurrentUser.mockResolvedValue({
        user: mockUser,
        organizations: [mockOrganization],
        memberships: [mockMembership],
      });

      const response = await app.inject({
        method: 'GET',
        url: '/auth/me',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.user.email).toBe('test@example.com');
      expect(body.data.organizations).toHaveLength(1);
    });

    it('should return 404 if user not found', async () => {
      mockAuthService.getCurrentUser.mockRejectedValue(new Error('User not found'));

      const response = await app.inject({
        method: 'GET',
        url: '/auth/me',
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('USER_NOT_FOUND');
    });
  });

  // ===========================================
  // VERIFY EMAIL
  // ===========================================

  describe('POST /auth/verify-email', () => {
    it('should verify email with valid token', async () => {
      mockAuthService.verifyEmail.mockResolvedValue({
        ...mockUser,
        emailVerified: true,
        emailVerifiedAt: new Date(),
      });

      const response = await app.inject({
        method: 'POST',
        url: '/auth/verify-email',
        payload: { token: 'valid-verification-token' },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.message).toContain('verified');
    });

    it('should return 400 for missing token', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/auth/verify-email',
        payload: {},
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 for invalid token', async () => {
      mockAuthService.verifyEmail.mockRejectedValue(new Error('Invalid or expired token'));

      const response = await app.inject({
        method: 'POST',
        url: '/auth/verify-email',
        payload: { token: 'invalid-token' },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('VERIFICATION_ERROR');
    });
  });

  // ===========================================
  // RESEND VERIFICATION
  // ===========================================

  describe('POST /auth/resend-verification', () => {
    it('should resend verification email', async () => {
      mockAuthService.resendVerificationEmail.mockResolvedValue(undefined);

      const response = await app.inject({
        method: 'POST',
        url: '/auth/resend-verification',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
    });

    it('should return 400 if email already verified', async () => {
      mockAuthService.resendVerificationEmail.mockRejectedValue(
        new Error('Email already verified')
      );

      const response = await app.inject({
        method: 'POST',
        url: '/auth/resend-verification',
      });

      expect(response.statusCode).toBe(400);
    });
  });

  // ===========================================
  // FORGOT PASSWORD
  // ===========================================

  describe('POST /auth/forgot-password', () => {
    it('should always return success to prevent email enumeration', async () => {
      mockAuthService.forgotPassword.mockResolvedValue(undefined);

      const response = await app.inject({
        method: 'POST',
        url: '/auth/forgot-password',
        payload: { email: 'test@example.com' },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.message).toContain('If an account exists');
    });

    it('should return success even for non-existent email', async () => {
      mockAuthService.forgotPassword.mockResolvedValue(undefined);

      const response = await app.inject({
        method: 'POST',
        url: '/auth/forgot-password',
        payload: { email: 'nonexistent@example.com' },
      });

      // Should still return success to prevent enumeration
      expect(response.statusCode).toBe(200);
    });

    it('should return 400 for invalid email format', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/auth/forgot-password',
        payload: { email: 'invalid' },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  // ===========================================
  // RESET PASSWORD
  // ===========================================

  describe('POST /auth/reset-password', () => {
    it('should reset password with valid token', async () => {
      mockAuthService.resetPassword.mockResolvedValue(undefined);

      const response = await app.inject({
        method: 'POST',
        url: '/auth/reset-password',
        payload: {
          token: 'valid-reset-token',
          password: 'newpassword123',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
    });

    it('should return 400 for missing token', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/auth/reset-password',
        payload: { password: 'newpassword123' },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 for password too short', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/auth/reset-password',
        payload: {
          token: 'valid-token',
          password: 'short',
        },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 for invalid token', async () => {
      mockAuthService.resetPassword.mockRejectedValue(new Error('Invalid or expired token'));

      const response = await app.inject({
        method: 'POST',
        url: '/auth/reset-password',
        payload: {
          token: 'invalid-token',
          password: 'newpassword123',
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  // ===========================================
  // GET SESSIONS
  // ===========================================

  describe('GET /auth/sessions', () => {
    it('should return user sessions', async () => {
      mockAuthService.getSessions.mockResolvedValue([
        mockSession,
        { ...mockSession, id: 'session-456' },
      ]);

      const response = await app.inject({
        method: 'GET',
        url: '/auth/sessions',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.sessions).toHaveLength(2);
      expect(body.data.sessions[0]).toHaveProperty('isCurrent');
    });

    it('should mark current session', async () => {
      mockAuthService.getSessions.mockResolvedValue([mockSession]);

      const response = await app.inject({
        method: 'GET',
        url: '/auth/sessions',
      });

      const body = JSON.parse(response.body);
      expect(body.data.sessions[0].isCurrent).toBe(true);
    });
  });

  // ===========================================
  // REVOKE SESSION
  // ===========================================

  describe('DELETE /auth/sessions/:id', () => {
    it('should revoke a session', async () => {
      mockAuthService.revokeSession.mockResolvedValue(undefined);

      const response = await app.inject({
        method: 'DELETE',
        url: '/auth/sessions/session-456',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
    });

    it('should return 404 for non-existent session', async () => {
      mockAuthService.revokeSession.mockRejectedValue(new Error('Session not found'));

      const response = await app.inject({
        method: 'DELETE',
        url: '/auth/sessions/nonexistent',
      });

      expect(response.statusCode).toBe(404);
    });
  });

  // ===========================================
  // GET INVITE
  // ===========================================

  describe('GET /auth/invite/:token', () => {
    it('should return invite details', async () => {
      mockAuthService.getInviteByToken.mockResolvedValue({
        email: 'invited@example.com',
        organization: {
          name: 'Test Organization',
          logoUrl: null,
        },
      });

      const response = await app.inject({
        method: 'GET',
        url: '/auth/invite/valid-invite-token',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.email).toBe('invited@example.com');
      expect(body.data.organization.name).toBe('Test Organization');
    });

    it('should return 404 for invalid invite token', async () => {
      mockAuthService.getInviteByToken.mockResolvedValue(null);

      const response = await app.inject({
        method: 'GET',
        url: '/auth/invite/invalid-token',
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('INVITE_NOT_FOUND');
    });

    it('should return 404 for expired invite', async () => {
      mockAuthService.getInviteByToken.mockResolvedValue(null);

      const response = await app.inject({
        method: 'GET',
        url: '/auth/invite/expired-token',
      });

      expect(response.statusCode).toBe(404);
    });
  });
});
