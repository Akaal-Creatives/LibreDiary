import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import * as authService from './auth.service.js';
import {
  requireAuth,
  setSessionCookie,
  clearSessionCookie,
  getClientIp,
} from './auth.middleware.js';
import { EXPIRATION } from '../../utils/tokens.js';

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

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8).max(128),
});

export async function authRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * POST /auth/register
   * Register a new user with invite token
   */
  fastify.post('/register', async (request: FastifyRequest, reply: FastifyReply) => {
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

      return {
        success: true,
        data: {
          user: sanitizeUser(result.user),
          organizations: result.organizations,
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
  fastify.post('/login', async (request: FastifyRequest, reply: FastifyReply) => {
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

      return {
        success: true,
        data: {
          user: sanitizeUser(result.user),
          organizations: result.organizations,
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
        const result = await authService.getCurrentUser(request.user!.id);

        return {
          success: true,
          data: {
            user: sanitizeUser(result.user),
            organizations: result.organizations,
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
   * POST /auth/verify-email
   * Verify email with token
   */
  fastify.post('/verify-email', async (request: FastifyRequest, reply: FastifyReply) => {
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
  });

  /**
   * POST /auth/resend-verification
   * Resend verification email
   */
  fastify.post(
    '/resend-verification',
    { preHandler: [requireAuth] },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        await authService.resendVerificationEmail(request.user!.id);

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
  fastify.post('/forgot-password', async (request: FastifyRequest, reply: FastifyReply) => {
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
  });

  /**
   * POST /auth/reset-password
   * Reset password with token
   */
  fastify.post('/reset-password', async (request: FastifyRequest, reply: FastifyReply) => {
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
  });

  /**
   * GET /auth/sessions
   * List active sessions
   */
  fastify.get(
    '/sessions',
    { preHandler: [requireAuth] },
    async (request: FastifyRequest, _reply: FastifyReply) => {
      const sessions = await authService.getSessions(request.user!.id);

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
  fastify.delete(
    '/sessions/:id',
    { preHandler: [requireAuth] },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        await authService.revokeSession(request.params.id, request.user!.id);

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
   * GET /auth/invite/:token
   * Get invite details
   */
  fastify.get(
    '/invite/:token',
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
  createdAt: Date;
  updatedAt: Date;
  passwordHash?: string | null;
  deletedAt?: Date | null;
}) {
  const { passwordHash: _passwordHash, deletedAt: _deletedAt, ...sanitized } = user;
  return sanitized;
}
