import type { FastifyRequest, FastifyReply } from 'fastify';
import { getSessionByToken, touchSession } from '../../services/session.service.js';
import { env } from '../../config/index.js';
import { logger } from '../../lib/logger.js';
import type { User } from '../../generated/prisma/client.js';

// Helper to add CORS headers to error responses
function addCorsHeaders(request: FastifyRequest, reply: FastifyReply): void {
  const origin = request.headers.origin;
  // Guard against undefined CORS_ORIGIN (e.g., in test environment)
  if (!env.CORS_ORIGIN || !origin) return;
  const allowedOrigins = env.CORS_ORIGIN.split(',').map((o) => o.trim());
  if (allowedOrigins.includes(origin)) {
    reply.header('access-control-allow-origin', origin);
    reply.header('access-control-allow-credentials', 'true');
    reply.header('vary', 'Origin');
  }
}

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
    addCorsHeaders(request, reply);
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
    addCorsHeaders(request, reply);
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
    addCorsHeaders(request, reply);
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
  touchSession(session.id).catch((err) => logger.error(err, 'session touch failed'));
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
  // Cross-origin deployment (frontend on different subdomain) requires
  // SameSite=none + Secure. In development, use 'lax' for cross-port requests.
  const isProduction = process.env.NODE_ENV === 'production';
  reply.setCookie(SESSION_COOKIE_NAME, token, {
    path: '/',
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'none' : 'lax',
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
 * Get client IP address from request.
 * Relies on Fastify's trustProxy configuration to resolve the correct IP
 * from X-Forwarded-For / X-Real-IP headers. Only trusted proxies' headers
 * are honoured — no manual header parsing needed.
 */
export function getClientIp(request: FastifyRequest): string | undefined {
  return request.ip;
}
