import { randomBytes } from 'node:crypto';
import fp from 'fastify-plugin';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { env } from '../config/index.js';

const CSRF_COOKIE_NAME = 'csrf_token';
const CSRF_HEADER_NAME = 'x-csrf-token';
const CSRF_TOKEN_LENGTH = 32;

const STATE_CHANGING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * Routes that are exempt from CSRF validation.
 * These are either public endpoints, webhook receivers, or API-token-authenticated routes.
 */
const EXEMPT_PREFIXES = [
  '/health',
  '/version',
  '/dev',
  '/collaboration', // WebSocket upgrade — not subject to CSRF
];

function generateCsrfToken(): string {
  return randomBytes(CSRF_TOKEN_LENGTH).toString('hex');
}

async function csrfPluginImpl(fastify: FastifyInstance) {
  // Set CSRF cookie on every response if not already present
  fastify.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    const existing = request.cookies?.[CSRF_COOKIE_NAME];

    if (!existing) {
      const token = generateCsrfToken();
      const isProduction = env.NODE_ENV === 'production';

      reply.setCookie(CSRF_COOKIE_NAME, token, {
        path: '/',
        httpOnly: false, // Must be readable by JS
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'lax',
        maxAge: 7 * 24 * 60 * 60, // 7 days (seconds)
      });

      // Store the token on the request so the validation hook can read it
      // even though the cookie wasn't sent with this request
      (request as FastifyRequest & { _csrfToken?: string })._csrfToken = token;
    }
  });

  // Validate CSRF token on state-changing requests
  fastify.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    if (!STATE_CHANGING_METHODS.has(request.method)) return;

    // Skip CSRF check for exempt routes
    const url = request.url;
    if (EXEMPT_PREFIXES.some((prefix) => url.startsWith(prefix))) return;

    // Skip CSRF check for API-token-authenticated requests (Bearer token)
    const authHeader = request.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) return;

    // Get the token from cookie (existing or just-set)
    const cookieToken =
      request.cookies?.[CSRF_COOKIE_NAME] ??
      (request as FastifyRequest & { _csrfToken?: string })._csrfToken;

    // Get the token from header
    const headerToken = request.headers[CSRF_HEADER_NAME];

    if (!cookieToken || !headerToken || cookieToken !== headerToken) {
      return reply.status(403).send({
        success: false,
        error: {
          code: 'CSRF_VALIDATION_FAILED',
          message: 'Invalid or missing CSRF token',
        },
      });
    }
  });
}

export const csrfPlugin = fp(csrfPluginImpl, {
  name: 'csrf-plugin',
  dependencies: ['cookie-plugin'],
});
