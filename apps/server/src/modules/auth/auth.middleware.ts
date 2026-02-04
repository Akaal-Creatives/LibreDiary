import type { FastifyRequest, FastifyReply } from 'fastify';
import { getSessionByToken, touchSession } from '../../services/session.service.js';
import type { User } from '@prisma/client';

// Extend FastifyRequest type
declare module 'fastify' {
  interface FastifyRequest {
    user?: User;
    sessionId?: string;
    sessionToken?: string;
  }
}

const SESSION_COOKIE_NAME = 'session_token';

/**
 * Middleware that requires authentication
 * Validates session and attaches user to request
 */
export async function requireAuth(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const token = request.cookies?.[SESSION_COOKIE_NAME];

  if (!token) {
    return reply.status(401).send({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      },
    });
  }

  const session = await getSessionByToken(token);

  if (!session) {
    // Clear invalid cookie
    reply.clearCookie(SESSION_COOKIE_NAME, { path: '/' });
    return reply.status(401).send({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Invalid or expired session',
      },
    });
  }

  // Check if user is soft-deleted
  if (session.user.deletedAt) {
    reply.clearCookie(SESSION_COOKIE_NAME, { path: '/' });
    return reply.status(401).send({
      success: false,
      error: {
        code: 'ACCOUNT_DELETED',
        message: 'Account has been deleted',
      },
    });
  }

  // Attach user and session info to request
  request.user = session.user;
  request.sessionId = session.id;
  request.sessionToken = token;

  // Update last active time (don't await to avoid blocking)
  touchSession(session.id).catch(() => {
    // Ignore errors
  });
}

/**
 * Middleware that optionally authenticates
 * Attaches user to request if valid session exists, continues if not
 */
export async function optionalAuth(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
  const token = request.cookies?.[SESSION_COOKIE_NAME];

  if (!token) {
    return;
  }

  const session = await getSessionByToken(token);

  if (!session || session.user.deletedAt) {
    return;
  }

  request.user = session.user;
  request.sessionId = session.id;
  request.sessionToken = token;

  // Update last active time
  touchSession(session.id).catch(() => {});
}

/**
 * Middleware that requires email to be verified
 * Must be used after requireAuth
 */
export async function requireVerifiedEmail(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  if (!request.user) {
    return reply.status(401).send({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      },
    });
  }

  if (!request.user.emailVerified) {
    return reply.status(403).send({
      success: false,
      error: {
        code: 'EMAIL_NOT_VERIFIED',
        message: 'Please verify your email address',
      },
    });
  }
}

/**
 * Helper to set session cookie
 */
export function setSessionCookie(
  reply: FastifyReply,
  token: string,
  maxAge: number = 7 * 24 * 60 * 60 * 1000 // 7 days
): void {
  reply.setCookie(SESSION_COOKIE_NAME, token, {
    path: '/',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: maxAge / 1000, // Convert to seconds
  });
}

/**
 * Helper to clear session cookie
 */
export function clearSessionCookie(reply: FastifyReply): void {
  reply.clearCookie(SESSION_COOKIE_NAME, { path: '/' });
}

/**
 * Get client IP address from request
 */
export function getClientIp(request: FastifyRequest): string | undefined {
  // Check X-Forwarded-For header (from proxies/load balancers)
  const forwarded = request.headers['x-forwarded-for'];
  if (forwarded) {
    const ips = Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0];
    return ips?.trim();
  }

  // Check X-Real-IP header
  const realIp = request.headers['x-real-ip'];
  if (realIp) {
    return Array.isArray(realIp) ? realIp[0] : realIp;
  }

  // Fall back to request.ip (set by trustProxy)
  return request.ip;
}
