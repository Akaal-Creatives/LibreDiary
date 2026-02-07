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
  ApiError: class ApiError extends Error {
    constructor(
      public code: string,
      message: string,
      public details?: Record<string, unknown>
    ) {
      super(message);
      this.name = 'ApiError';
    }
  },
}));

import { authService } from '../auth.service';

describe('Auth Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===========================================
  // AUTHENTICATION
  // ===========================================

  describe('login', () => {
    it('should POST to correct endpoint with input', async () => {
      const input = { email: 'user@example.com', password: 'secret123' };
      mockApi.post.mockResolvedValue({ user: { id: 'u-1' } });

      await authService.login(input);

      expect(mockApi.post).toHaveBeenCalledWith('/auth/login', input);
    });
  });

  describe('register', () => {
    it('should POST to correct endpoint with input', async () => {
      const input = {
        email: 'user@example.com',
        password: 'secret123',
        name: 'Test User',
        inviteToken: 'tok-123',
      };
      mockApi.post.mockResolvedValue({ user: { id: 'u-1' } });

      await authService.register(input);

      expect(mockApi.post).toHaveBeenCalledWith('/auth/register', input);
    });
  });

  describe('logout', () => {
    it('should POST to correct endpoint', async () => {
      mockApi.post.mockResolvedValue({ message: 'logged out' });

      await authService.logout();

      expect(mockApi.post).toHaveBeenCalledWith('/auth/logout');
    });
  });

  describe('getCurrentUser', () => {
    it('should GET from correct endpoint', async () => {
      mockApi.get.mockResolvedValue({ user: { id: 'u-1' } });

      await authService.getCurrentUser();

      expect(mockApi.get).toHaveBeenCalledWith('/auth/me');
    });
  });

  // ===========================================
  // EMAIL VERIFICATION
  // ===========================================

  describe('verifyEmail', () => {
    it('should POST to correct endpoint with token', async () => {
      mockApi.post.mockResolvedValue({ user: { id: 'u-1' }, message: 'verified' });

      await authService.verifyEmail('verify-tok-123');

      expect(mockApi.post).toHaveBeenCalledWith('/auth/verify-email', {
        token: 'verify-tok-123',
      });
    });
  });

  describe('resendVerificationEmail', () => {
    it('should POST to correct endpoint', async () => {
      mockApi.post.mockResolvedValue({ message: 'sent' });

      await authService.resendVerificationEmail();

      expect(mockApi.post).toHaveBeenCalledWith('/auth/resend-verification');
    });
  });

  // ===========================================
  // PASSWORD RESET
  // ===========================================

  describe('forgotPassword', () => {
    it('should POST to correct endpoint with email', async () => {
      mockApi.post.mockResolvedValue({ message: 'email sent' });

      await authService.forgotPassword('user@example.com');

      expect(mockApi.post).toHaveBeenCalledWith('/auth/forgot-password', {
        email: 'user@example.com',
      });
    });
  });

  describe('resetPassword', () => {
    it('should POST to correct endpoint with token and password', async () => {
      mockApi.post.mockResolvedValue({ message: 'password reset' });

      await authService.resetPassword('reset-tok-123', 'newPassword456');

      expect(mockApi.post).toHaveBeenCalledWith('/auth/reset-password', {
        token: 'reset-tok-123',
        password: 'newPassword456',
      });
    });
  });

  // ===========================================
  // SESSION MANAGEMENT
  // ===========================================

  describe('getSessions', () => {
    it('should GET from correct endpoint', async () => {
      mockApi.get.mockResolvedValue({ sessions: [] });

      await authService.getSessions();

      expect(mockApi.get).toHaveBeenCalledWith('/auth/sessions');
    });
  });

  describe('revokeSession', () => {
    it('should DELETE to correct endpoint', async () => {
      mockApi.delete.mockResolvedValue({ message: 'revoked' });

      await authService.revokeSession('sess-123');

      expect(mockApi.delete).toHaveBeenCalledWith('/auth/sessions/sess-123');
    });
  });

  // ===========================================
  // INVITES
  // ===========================================

  describe('getInvite', () => {
    it('should GET from correct endpoint', async () => {
      mockApi.get.mockResolvedValue({
        email: 'user@example.com',
        organization: { name: 'Org', logoUrl: null },
      });

      await authService.getInvite('invite-tok-456');

      expect(mockApi.get).toHaveBeenCalledWith('/auth/invite/invite-tok-456');
    });
  });
});
