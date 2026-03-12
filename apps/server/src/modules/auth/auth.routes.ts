import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import * as authService from './auth.service.js';
import {
  requireAuth,
  setSessionCookie,
  clearSessionCookie,
  getClientIp,
} from './auth.middleware.js';
import { EXPIRATION, generateWsToken } from '../../utils/tokens.js';
import { env } from '../../config/index.js';
import { getAuthUser } from '../../utils/errors.js';
import { logAudit } from '../audit/audit.service.js';

// Request schemas
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(255).optional(),
  inviteToken: z.string().min(1),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const verifyEmailSchema = z.object({
  token: z.string().min(1),
});

const updateProfileSchema = z
  .object({
    name: z.string().min(1).max(255).optional(),
    locale: z.string().min(2).max(10).optional(),
  })
  .refine((data) => data.name !== undefined || data.locale !== undefined, {
    message: 'At least one field must be provided',
  });

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8).max(128),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(128),
});

const changeEmailSchema = z.object({
  newEmail: z.string().email(),
  password: z.string().min(1),
});

// Stricter rate limit config for sensitive auth endpoints
const authRateLimit = {
  config: {
    rateLimit: {
      max: 10,
      timeWindow: '5 minutes',
    },
  },
};

export async function authRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * POST /auth/register
   * Register a new user with invite token
   */
  fastify.post('/register', authRateLimit, async (request: FastifyRequest, reply: FastifyReply) => {
    const body = registerSchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request body',
          details: body.error.flatten().fieldErrors,
        },
      });
    }

    try {
      const result = await authService.register(body.data, {
        userAgent: request.headers['user-agent'],
        ipAddress: getClientIp(request),
      });

      setSessionCookie(reply, result.session.token, EXPIRATION.SESSION);

      logAudit({
        action: 'AUTH_REGISTER',
        userId: result.user.id,
        ipAddress: getClientIp(request),
        userAgent: request.headers['user-agent'],
        metadata: { email: result.user.email },
      });

      return {
        success: true,
        data: {
          user: sanitizeUser(result.user),
          organizations: result.organizations,
          memberships: result.memberships,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Registration failed';
      return reply.status(400).send({
        success: false,
        error: {
          code: 'REGISTRATION_ERROR',
          message,
        },
      });
    }
  });

  /**
   * POST /auth/login
   * Login with email and password
   */
  // codeql[js/missing-rate-limiting] Rate limited via @fastify/rate-limit config
  fastify.post('/login', authRateLimit, async (request: FastifyRequest, reply: FastifyReply) => {
    const body = loginSchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request body',
          details: body.error.flatten().fieldErrors,
        },
      });
    }

    try {
      const result = await authService.login(body.data, {
        userAgent: request.headers['user-agent'],
        ipAddress: getClientIp(request),
      });

      setSessionCookie(reply, result.session.token, EXPIRATION.SESSION);

      logAudit({
        action: 'AUTH_LOGIN',
        userId: result.user.id,
        ipAddress: getClientIp(request),
        userAgent: request.headers['user-agent'],
        metadata: { email: result.user.email },
      });

      return {
        success: true,
        data: {
          user: sanitizeUser(result.user),
          organizations: result.organizations,
          memberships: result.memberships,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed';
      return reply.status(401).send({
        success: false,
        error: {
          code: 'LOGIN_ERROR',
          message,
        },
      });
    }
  });

  /**
   * POST /auth/logout
   * Destroy current session
   */
  fastify.post(
    '/logout',
    { preHandler: [requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      if (request.sessionToken) {
        await authService.logout(request.sessionToken);
      }
      clearSessionCookie(reply);

      logAudit({
        action: 'AUTH_LOGOUT',
        userId: request.user?.id,
        ipAddress: getClientIp(request),
        userAgent: request.headers['user-agent'],
      });

      return {
        success: true,
        data: { message: 'Logged out successfully' },
      };
    }
  );

  /**
   * GET /auth/me
   * Get current user data
   */
  fastify.get(
    '/me',
    { preHandler: [requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const result = await authService.getCurrentUser(getAuthUser(request).id);

        return {
          success: true,
          data: {
            user: sanitizeUser(result.user),
            organizations: result.organizations,
            memberships: result.memberships,
          },
        };
      } catch {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found',
          },
        });
      }
    }
  );

  /**
   * PATCH /auth/profile
   * Update current user's profile
   */
  fastify.patch(
    '/profile',
    { preHandler: [requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = updateProfileSchema.safeParse(request.body);
      if (!body.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request body',
            details: body.error.flatten().fieldErrors,
          },
        });
      }

      try {
        const user = getAuthUser(request);
        const updated = await authService.updateUserProfile(user.id, body.data);

        logAudit({
          action: 'USER_PROFILE_UPDATED',
          userId: user.id,
          ipAddress: getClientIp(request),
          userAgent: request.headers['user-agent'],
          metadata: body.data,
        });

        return {
          success: true,
          data: {
            user: sanitizeUser(updated),
          },
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Profile update failed';
        return reply.status(400).send({
          success: false,
          error: {
            code: 'PROFILE_UPDATE_ERROR',
            message,
          },
        });
      }
    }
  );

  /**
   * PATCH /auth/onboarding
   * Mark onboarding as completed for the current user
   */
  fastify.patch(
    '/onboarding',
    { preHandler: [requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const user = getAuthUser(request);
        const updated = await authService.completeOnboarding(user.id);

        logAudit({
          action: 'USER_ONBOARDING_COMPLETED',
          userId: user.id,
          ipAddress: getClientIp(request),
          userAgent: request.headers['user-agent'],
        });

        return {
          success: true,
          data: {
            user: sanitizeUser(updated),
          },
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Onboarding update failed';
        return reply.status(400).send({
          success: false,
          error: {
            code: 'ONBOARDING_ERROR',
            message,
          },
        });
      }
    }
  );

  /**
   * POST /auth/verify-email
   * Verify email with token
   */
  // codeql[js/missing-rate-limiting] Rate limited via @fastify/rate-limit config
  fastify.post(
    '/verify-email',
    authRateLimit,
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = verifyEmailSchema.safeParse(request.body);
      if (!body.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request body',
          },
        });
      }

      try {
        const user = await authService.verifyEmail(body.data.token);

        logAudit({
          action: 'AUTH_EMAIL_VERIFIED',
          userId: user.id,
          ipAddress: getClientIp(request),
          userAgent: request.headers['user-agent'],
        });

        return {
          success: true,
          data: {
            user: sanitizeUser(user),
            message: 'Email verified successfully',
          },
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Verification failed';
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VERIFICATION_ERROR',
            message,
          },
        });
      }
    }
  );

  /**
   * POST /auth/resend-verification
   * Resend verification email
   */
  fastify.post(
    '/resend-verification',
    { preHandler: [requireAuth], ...authRateLimit },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        await authService.resendVerificationEmail(getAuthUser(request).id);

        return {
          success: true,
          data: { message: 'Verification email sent' },
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to send email';
        return reply.status(400).send({
          success: false,
          error: {
            code: 'EMAIL_ERROR',
            message,
          },
        });
      }
    }
  );

  /**
   * POST /auth/forgot-password
   * Request password reset
   */
  fastify.post(
    '/forgot-password',
    authRateLimit,
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = forgotPasswordSchema.safeParse(request.body);
      if (!body.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid email address',
          },
        });
      }

      // Always return success to prevent email enumeration
      await authService.forgotPassword(body.data.email);

      return {
        success: true,
        data: { message: 'If an account exists with this email, a reset link has been sent' },
      };
    }
  );

  /**
   * POST /auth/reset-password
   * Reset password with token
   */
  fastify.post(
    '/reset-password',
    authRateLimit,
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = resetPasswordSchema.safeParse(request.body);
      if (!body.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request body',
            details: body.error.flatten().fieldErrors,
          },
        });
      }

      try {
        await authService.resetPassword(body.data.token, body.data.password);

        logAudit({
          action: 'AUTH_PASSWORD_RESET',
          ipAddress: getClientIp(request),
          userAgent: request.headers['user-agent'],
        });

        return {
          success: true,
          data: { message: 'Password reset successfully' },
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Password reset failed';
        return reply.status(400).send({
          success: false,
          error: {
            code: 'RESET_ERROR',
            message,
          },
        });
      }
    }
  );

  /**
   * GET /auth/sessions
   * List active sessions
   */
  fastify.get(
    '/sessions',
    { preHandler: [requireAuth] },
    async (request: FastifyRequest, _reply: FastifyReply) => {
      const sessions = await authService.getSessions(getAuthUser(request).id);

      return {
        success: true,
        data: {
          sessions: sessions.map((s) => ({
            id: s.id,
            userAgent: s.userAgent,
            ipAddress: s.ipAddress,
            lastActiveAt: s.lastActiveAt,
            createdAt: s.createdAt,
            isCurrent: s.id === request.sessionId,
          })),
        },
      };
    }
  );

  /**
   * DELETE /auth/sessions/:id
   * Revoke a session
   */
  fastify.delete<{ Params: { id: string } }>(
    '/sessions/:id',
    { preHandler: [requireAuth] },
    async (request, reply) => {
      try {
        await authService.revokeSession(request.params.id, getAuthUser(request).id);

        return {
          success: true,
          data: { message: 'Session revoked' },
        };
      } catch {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'SESSION_NOT_FOUND',
            message: 'Session not found',
          },
        });
      }
    }
  );

  /**
   * GET /auth/ws-token
   * Get a short-lived token for WebSocket authentication
   * Used by the collaboration system since httpOnly cookies can't be accessed by JS
   */
  fastify.get(
    '/ws-token',
    { preHandler: [requireAuth] },
    async (request: FastifyRequest, _reply: FastifyReply) => {
      const secret = env.SESSION_SECRET ?? env.APP_SECRET;
      const wsToken = generateWsToken(getAuthUser(request).id, secret);

      return {
        success: true,
        data: {
          token: wsToken,
          expiresIn: EXPIRATION.WS_TOKEN,
        },
      };
    }
  );

  /**
   * POST /auth/change-password
   * Change password for authenticated user
   */
  fastify.post(
    '/change-password',
    { preHandler: [requireAuth], ...authRateLimit },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = changePasswordSchema.safeParse(request.body);
      if (!body.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request body',
            details: body.error.flatten().fieldErrors,
          },
        });
      }

      try {
        const user = getAuthUser(request);
        await authService.changePassword(user.id, body.data.currentPassword, body.data.newPassword);

        logAudit({
          action: 'USER_PROFILE_UPDATED',
          userId: user.id,
          ipAddress: getClientIp(request),
          userAgent: request.headers['user-agent'],
          metadata: { field: 'password' },
        });

        return {
          success: true,
          data: { message: 'Password changed successfully' },
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Password change failed';
        return reply.status(400).send({
          success: false,
          error: {
            code: 'CHANGE_PASSWORD_ERROR',
            message,
          },
        });
      }
    }
  );

  /**
   * PATCH /auth/email
   * Change email for authenticated user (requires password)
   */
  fastify.patch(
    '/email',
    { preHandler: [requireAuth], ...authRateLimit },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = changeEmailSchema.safeParse(request.body);
      if (!body.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request body',
            details: body.error.flatten().fieldErrors,
          },
        });
      }

      try {
        const user = getAuthUser(request);
        const updatedUser = await authService.changeEmail(
          user.id,
          body.data.newEmail,
          body.data.password
        );

        logAudit({
          action: 'USER_PROFILE_UPDATED',
          userId: user.id,
          ipAddress: getClientIp(request),
          userAgent: request.headers['user-agent'],
          metadata: { field: 'email', newEmail: body.data.newEmail },
        });

        return {
          success: true,
          data: { user: sanitizeUser(updatedUser) },
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Email change failed';
        return reply.status(400).send({
          success: false,
          error: {
            code: 'CHANGE_EMAIL_ERROR',
            message,
          },
        });
      }
    }
  );

  /**
   * GET /auth/invite/:token
   * Get invite details
   */
  fastify.get(
    '/invite/:token',
    authRateLimit,
    async (request: FastifyRequest<{ Params: { token: string } }>, reply: FastifyReply) => {
      const invite = await authService.getInviteByToken(request.params.token);

      if (!invite) {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'INVITE_NOT_FOUND',
            message: 'Invalid or expired invite',
          },
        });
      }

      return {
        success: true,
        data: {
          email: invite.email,
          organization: {
            name: invite.organization.name,
            logoUrl: invite.organization.logoUrl,
          },
        },
      };
    }
  );
}

/**
 * Remove sensitive fields from user object
 */
function sanitizeUser(user: {
  id: string;
  email: string;
  emailVerified: boolean;
  emailVerifiedAt: Date | null;
  name: string | null;
  avatarUrl: string | null;
  locale: string;
  isSuperAdmin: boolean;
  onboardingCompletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  passwordHash?: string | null;
  deletedAt?: Date | null;
}) {
  const { passwordHash: _passwordHash, deletedAt: _deletedAt, ...sanitized } = user;
  return sanitized;
}
