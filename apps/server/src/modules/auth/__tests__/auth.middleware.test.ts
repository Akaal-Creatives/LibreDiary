import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockGetSessionByToken, mockTouchSession } = vi.hoisted(() => ({
  mockGetSessionByToken: vi.fn(),
  mockTouchSession: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../../services/session.service.js', () => ({
  getSessionByToken: mockGetSessionByToken,
  touchSession: mockTouchSession,
}));

vi.mock('../../../config/index.js', () => ({
  env: {
    CORS_ORIGIN: 'http://localhost:5173',
  },
}));

import {
  requireAuth,
  optionalAuth,
  requireVerifiedEmail,
  setSessionCookie,
  clearSessionCookie,
  getClientIp,
} from '../auth.middleware.js';

// Helper to create mock Fastify request/reply
function createMockRequest(overrides: Record<string, unknown> = {}) {
  return {
    cookies: {},
    headers: {},
    ip: '127.0.0.1',
    user: undefined,
    sessionId: undefined,
    sessionToken: undefined,
    ...overrides,
  } as any;
}

function createMockReply() {
  const reply: any = {
    statusCode: 200,
    status: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
    clearCookie: vi.fn().mockReturnThis(),
    setCookie: vi.fn().mockReturnThis(),
    header: vi.fn().mockReturnThis(),
  };
  return reply;
}

describe('Auth Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('requireAuth', () => {
    it('should return 401 when no session cookie is present', async () => {
      const request = createMockRequest();
      const reply = createMockReply();

      await requireAuth(request, reply);

      expect(reply.status).toHaveBeenCalledWith(401);
      expect(reply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: expect.objectContaining({ code: 'UNAUTHORIZED' }),
        })
      );
    });

    it('should return 401 and clear cookie when session is invalid', async () => {
      const request = createMockRequest({
        cookies: { session_token: 'invalid-token' },
      });
      const reply = createMockReply();
      mockGetSessionByToken.mockResolvedValue(null);

      await requireAuth(request, reply);

      expect(reply.clearCookie).toHaveBeenCalledWith('session_token', { path: '/' });
      expect(reply.status).toHaveBeenCalledWith(401);
      expect(reply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({ code: 'UNAUTHORIZED' }),
        })
      );
    });

    it('should return 401 when user is soft-deleted', async () => {
      const request = createMockRequest({
        cookies: { session_token: 'valid-token' },
      });
      const reply = createMockReply();
      mockGetSessionByToken.mockResolvedValue({
        id: 'session-1',
        user: { id: 'u1', deletedAt: new Date() },
      });

      await requireAuth(request, reply);

      expect(reply.clearCookie).toHaveBeenCalled();
      expect(reply.status).toHaveBeenCalledWith(401);
      expect(reply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({ code: 'ACCOUNT_DELETED' }),
        })
      );
    });

    it('should attach user and session to request on valid session', async () => {
      const mockUser = { id: 'u1', deletedAt: null, email: 'a@test.com' };
      const request = createMockRequest({
        cookies: { session_token: 'valid-token' },
      });
      const reply = createMockReply();
      mockGetSessionByToken.mockResolvedValue({
        id: 'session-1',
        user: mockUser,
      });

      await requireAuth(request, reply);

      expect(request.user).toEqual(mockUser);
      expect(request.sessionId).toBe('session-1');
      expect(request.sessionToken).toBe('valid-token');
      expect(reply.status).not.toHaveBeenCalled();
    });

    it('should call touchSession to update last active time', async () => {
      const request = createMockRequest({
        cookies: { session_token: 'valid-token' },
      });
      const reply = createMockReply();
      mockGetSessionByToken.mockResolvedValue({
        id: 'session-1',
        user: { id: 'u1', deletedAt: null },
      });

      await requireAuth(request, reply);

      expect(mockTouchSession).toHaveBeenCalledWith('session-1');
    });

    it('should add CORS headers on 401 when origin matches', async () => {
      const request = createMockRequest({
        headers: { origin: 'http://localhost:5173' },
      });
      const reply = createMockReply();

      await requireAuth(request, reply);

      expect(reply.header).toHaveBeenCalledWith(
        'access-control-allow-origin',
        'http://localhost:5173'
      );
      expect(reply.header).toHaveBeenCalledWith('access-control-allow-credentials', 'true');
    });
  });

  describe('optionalAuth', () => {
    it('should do nothing when no cookie is present', async () => {
      const request = createMockRequest();
      const reply = createMockReply();

      await optionalAuth(request, reply);

      expect(request.user).toBeUndefined();
      expect(mockGetSessionByToken).not.toHaveBeenCalled();
    });

    it('should attach user when valid session exists', async () => {
      const mockUser = { id: 'u1', deletedAt: null };
      const request = createMockRequest({
        cookies: { session_token: 'valid-token' },
      });
      const reply = createMockReply();
      mockGetSessionByToken.mockResolvedValue({
        id: 'session-1',
        user: mockUser,
      });

      await optionalAuth(request, reply);

      expect(request.user).toEqual(mockUser);
      expect(request.sessionId).toBe('session-1');
    });

    it('should not attach user when session is invalid', async () => {
      const request = createMockRequest({
        cookies: { session_token: 'bad-token' },
      });
      const reply = createMockReply();
      mockGetSessionByToken.mockResolvedValue(null);

      await optionalAuth(request, reply);

      expect(request.user).toBeUndefined();
    });

    it('should not attach user when user is deleted', async () => {
      const request = createMockRequest({
        cookies: { session_token: 'valid-token' },
      });
      const reply = createMockReply();
      mockGetSessionByToken.mockResolvedValue({
        id: 'session-1',
        user: { id: 'u1', deletedAt: new Date() },
      });

      await optionalAuth(request, reply);

      expect(request.user).toBeUndefined();
    });
  });

  describe('requireVerifiedEmail', () => {
    it('should return 401 when no user on request', async () => {
      const request = createMockRequest();
      const reply = createMockReply();

      await requireVerifiedEmail(request, reply);

      expect(reply.status).toHaveBeenCalledWith(401);
    });

    it('should return 403 when email is not verified', async () => {
      const request = createMockRequest({
        user: { id: 'u1', emailVerified: false },
      });
      const reply = createMockReply();

      await requireVerifiedEmail(request, reply);

      expect(reply.status).toHaveBeenCalledWith(403);
      expect(reply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({ code: 'EMAIL_NOT_VERIFIED' }),
        })
      );
    });

    it('should pass through when email is verified', async () => {
      const request = createMockRequest({
        user: { id: 'u1', emailVerified: true },
      });
      const reply = createMockReply();

      await requireVerifiedEmail(request, reply);

      expect(reply.status).not.toHaveBeenCalled();
    });
  });

  describe('setSessionCookie', () => {
    it('should set cookie with correct defaults', () => {
      const reply = createMockReply();

      setSessionCookie(reply, 'my-token');

      expect(reply.setCookie).toHaveBeenCalledWith(
        'session_token',
        'my-token',
        expect.objectContaining({
          path: '/',
          httpOnly: true,
        })
      );
    });

    it('should accept custom maxAge', () => {
      const reply = createMockReply();

      setSessionCookie(reply, 'token', 3600000); // 1 hour in ms

      expect(reply.setCookie).toHaveBeenCalledWith(
        'session_token',
        'token',
        expect.objectContaining({
          maxAge: 3600, // converted to seconds
        })
      );
    });
  });

  describe('clearSessionCookie', () => {
    it('should clear session cookie', () => {
      const reply = createMockReply();

      clearSessionCookie(reply);

      expect(reply.clearCookie).toHaveBeenCalledWith('session_token', { path: '/' });
    });
  });

  describe('getClientIp', () => {
    it('should return X-Forwarded-For IP when present', () => {
      const request = createMockRequest({
        headers: { 'x-forwarded-for': '203.0.113.50, 70.41.3.18' },
      });

      expect(getClientIp(request)).toBe('203.0.113.50');
    });

    it('should return X-Real-IP when X-Forwarded-For is absent', () => {
      const request = createMockRequest({
        headers: { 'x-real-ip': '203.0.113.50' },
      });

      expect(getClientIp(request)).toBe('203.0.113.50');
    });

    it('should fall back to request.ip', () => {
      const request = createMockRequest({ ip: '192.168.1.1' });

      expect(getClientIp(request)).toBe('192.168.1.1');
    });

    it('should handle array X-Forwarded-For header', () => {
      const request = createMockRequest({
        headers: { 'x-forwarded-for': ['10.0.0.1', '10.0.0.2'] },
      });

      expect(getClientIp(request)).toBe('10.0.0.1');
    });
  });
});
