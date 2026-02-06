import { api, ApiError } from './api';
import type { User, Organization, OrgRole } from '@librediary/shared';

export interface OrgMembership {
  organizationId: string;
  role: OrgRole;
}

export interface AuthResponse {
  user: User;
  organizations: Organization[];
  memberships: OrgMembership[];
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  email: string;
  password: string;
  name?: string;
  inviteToken: string;
}

export interface SessionInfo {
  id: string;
  userAgent: string | null;
  ipAddress: string | null;
  lastActiveAt: string;
  createdAt: string;
  isCurrent: boolean;
}

export interface InviteInfo {
  email: string;
  organization: {
    name: string;
    logoUrl: string | null;
  };
}

export const authService = {
  /**
   * Login with email and password
   */
  async login(input: LoginInput): Promise<AuthResponse> {
    return api.post<AuthResponse>('/auth/login', input);
  },

  /**
   * Register with invite token
   */
  async register(input: RegisterInput): Promise<AuthResponse> {
    return api.post<AuthResponse>('/auth/register', input);
  },

  /**
   * Logout and destroy session
   */
  async logout(): Promise<void> {
    await api.post<{ message: string }>('/auth/logout');
  },

  /**
   * Get current user data
   */
  async getCurrentUser(): Promise<AuthResponse> {
    return api.get<AuthResponse>('/auth/me');
  },

  /**
   * Verify email with token
   */
  async verifyEmail(token: string): Promise<{ user: User; message: string }> {
    return api.post<{ user: User; message: string }>('/auth/verify-email', { token });
  },

  /**
   * Resend verification email
   */
  async resendVerificationEmail(): Promise<{ message: string }> {
    return api.post<{ message: string }>('/auth/resend-verification');
  },

  /**
   * Request password reset
   */
  async forgotPassword(email: string): Promise<{ message: string }> {
    return api.post<{ message: string }>('/auth/forgot-password', { email });
  },

  /**
   * Reset password with token
   */
  async resetPassword(token: string, password: string): Promise<{ message: string }> {
    return api.post<{ message: string }>('/auth/reset-password', { token, password });
  },

  /**
   * Get active sessions
   */
  async getSessions(): Promise<{ sessions: SessionInfo[] }> {
    return api.get<{ sessions: SessionInfo[] }>('/auth/sessions');
  },

  /**
   * Revoke a session
   */
  async revokeSession(sessionId: string): Promise<{ message: string }> {
    return api.delete<{ message: string }>(`/auth/sessions/${sessionId}`);
  },

  /**
   * Get invite info by token
   */
  async getInvite(token: string): Promise<InviteInfo> {
    return api.get<InviteInfo>(`/auth/invite/${token}`);
  },
};

export { ApiError };
