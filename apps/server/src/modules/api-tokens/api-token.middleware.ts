import type { FastifyRequest, FastifyReply } from 'fastify';
import { validateToken } from './api-token.service.js';

// Extend FastifyRequest with apiTokenId
declare module 'fastify' {
  interface FastifyRequest {
    apiTokenId?: string;
  }
}

/**
 * Middleware that checks for Bearer token authentication first,
 * then falls back to session cookie auth.
 * Sets request.user and request.apiTokenId when a valid API token is found.
 */
export async function requireApiAuth(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const authHeader = request.headers.authorization;

  if (authHeader?.startsWith('Bearer ')) {
    const rawToken = authHeader.substring(7);

    const result = await validateToken(rawToken);

    if (!result) {
      return reply.status(401).send({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid or expired API token',
        },
      });
    }

    request.user = result.user;
    request.apiTokenId = result.apiTokenId;
    return;
  }

  // No Bearer token — fall through to session cookie auth
  // Import lazily to avoid circular dependencies
  const { requireAuth } = await import('../auth/auth.middleware.js');
  return requireAuth(request, reply);
}
