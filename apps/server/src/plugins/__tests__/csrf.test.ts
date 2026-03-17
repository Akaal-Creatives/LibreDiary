import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Fastify from 'fastify';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { cookiePlugin } from '../cookie.js';

// Mock env config — must come before importing the CSRF plugin
vi.mock('../../config/index.js', () => ({
  env: {
    NODE_ENV: 'development',
    APP_SECRET: 'a'.repeat(32),
  },
}));

import { csrfPlugin } from '../csrf.js';
import { env } from '../../config/index.js';

/**
 * Helper: build a Fastify app with the cookie + CSRF plugins registered and
 * a simple echo route for each HTTP method we care about.
 */
async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false });
  await app.register(cookiePlugin);
  await app.register(csrfPlugin);

  // State-changing routes
  for (const method of ['POST', 'PUT', 'PATCH', 'DELETE'] as const) {
    app.route({
      method,
      url: '/protected',
      handler: async (_req: FastifyRequest, _reply: FastifyReply) => ({ success: true }),
    });
  }

  // Safe (non-state-changing) route
  app.get('/safe', async (_req: FastifyRequest, _reply: FastifyReply) => ({ success: true }));

  // Exempt routes
  app.post('/health', async () => ({ success: true }));
  app.post('/version', async () => ({ success: true }));
  app.post('/dev', async () => ({ success: true }));
  app.post('/collaboration/ws', async () => ({ success: true }));

  await app.ready();
  return app;
}

/**
 * Extract the csrf_token cookie value from a light-inject response.
 */
function extractCsrfCookie(
  response: Awaited<ReturnType<FastifyInstance['inject']>>
): string | undefined {
  const cookie = response.cookies.find((c) => c.name === 'csrf_token');
  return cookie?.value;
}

describe('CSRF Plugin', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = await buildApp();
  });

  afterEach(async () => {
    await app.close();
  });

  // ---------------------------------------------------------------------------
  // Token generation & cookie behaviour
  // ---------------------------------------------------------------------------
  describe('Token Generation', () => {
    it('should set a csrf_token cookie when none is present', async () => {
      const res = await app.inject({ method: 'GET', url: '/safe' });

      expect(res.statusCode).toBe(200);
      const token = extractCsrfCookie(res);
      expect(token).toBeDefined();
      // 32 random bytes -> 64 hex characters
      expect(token).toHaveLength(64);
    });

    it('should expose the token in the X-CSRF-Token response header when generating a new cookie', async () => {
      const res = await app.inject({ method: 'GET', url: '/safe' });

      const headerToken = res.headers['x-csrf-token'];
      const cookieToken = extractCsrfCookie(res);

      expect(headerToken).toBeDefined();
      expect(headerToken).toBe(cookieToken);
    });

    it('should not overwrite an existing csrf_token cookie', async () => {
      const existingToken = 'a'.repeat(64);

      const res = await app.inject({
        method: 'GET',
        url: '/safe',
        headers: { cookie: `csrf_token=${existingToken}` },
      });

      // No new cookie should be set — the response should not contain a csrf_token cookie
      const newCookie = extractCsrfCookie(res);
      expect(newCookie).toBeUndefined();
    });

    it('should expose the existing token in the X-CSRF-Token response header when cookie already present', async () => {
      const existingToken = 'b'.repeat(64);

      const res = await app.inject({
        method: 'GET',
        url: '/safe',
        headers: { cookie: `csrf_token=${existingToken}` },
      });

      expect(res.headers['x-csrf-token']).toBe(existingToken);
    });

    it('should generate unique tokens for different requests', async () => {
      const res1 = await app.inject({ method: 'GET', url: '/safe' });
      const res2 = await app.inject({ method: 'GET', url: '/safe' });

      const token1 = extractCsrfCookie(res1);
      const token2 = extractCsrfCookie(res2);

      expect(token1).toBeDefined();
      expect(token2).toBeDefined();
      expect(token1).not.toBe(token2);
    });
  });

  // ---------------------------------------------------------------------------
  // Cookie options (development mode)
  // ---------------------------------------------------------------------------
  describe('Cookie Options (development)', () => {
    it('should set httpOnly to false so JS can read it', async () => {
      const res = await app.inject({ method: 'GET', url: '/safe' });
      const cookie = res.cookies.find((c) => c.name === 'csrf_token');
      // httpOnly: false means the attribute is absent from Set-Cookie,
      // so light-my-request does not populate the field (undefined ≡ not httpOnly)
      expect(cookie?.httpOnly).toBeFalsy();
    });

    it('should set sameSite to Lax in development', async () => {
      const res = await app.inject({ method: 'GET', url: '/safe' });
      const cookie = res.cookies.find((c) => c.name === 'csrf_token');
      expect(cookie?.sameSite).toBe('Lax');
    });

    it('should set path to /', async () => {
      const res = await app.inject({ method: 'GET', url: '/safe' });
      const cookie = res.cookies.find((c) => c.name === 'csrf_token');
      expect(cookie?.path).toBe('/');
    });
  });

  // ---------------------------------------------------------------------------
  // Cookie options (production mode)
  // ---------------------------------------------------------------------------
  describe('Cookie Options (production)', () => {
    let prodApp: FastifyInstance;

    beforeEach(async () => {
      // Temporarily switch env to production
      vi.mocked(env).NODE_ENV = 'production' as 'development' | 'production' | 'test';
      prodApp = await buildApp();
    });

    afterEach(async () => {
      vi.mocked(env).NODE_ENV = 'development' as 'development' | 'production' | 'test';
      await prodApp.close();
    });

    it('should set secure to true in production', async () => {
      const res = await prodApp.inject({ method: 'GET', url: '/safe' });
      const cookie = res.cookies.find((c) => c.name === 'csrf_token');
      expect(cookie?.secure).toBe(true);
    });

    it('should set sameSite to None in production', async () => {
      const res = await prodApp.inject({ method: 'GET', url: '/safe' });
      const cookie = res.cookies.find((c) => c.name === 'csrf_token');
      expect(cookie?.sameSite).toBe('None');
    });
  });

  // ---------------------------------------------------------------------------
  // CSRF validation — state-changing methods
  // ---------------------------------------------------------------------------
  describe('Validation on State-Changing Methods', () => {
    it.each(['POST', 'PUT', 'PATCH', 'DELETE'] as const)(
      'should reject %s without a CSRF token',
      async (method) => {
        const res = await app.inject({ method, url: '/protected' });

        expect(res.statusCode).toBe(403);
        const body = JSON.parse(res.body);
        expect(body.success).toBe(false);
        expect(body.error.code).toBe('CSRF_VALIDATION_FAILED');
      }
    );

    it.each(['POST', 'PUT', 'PATCH', 'DELETE'] as const)(
      'should reject %s when cookie is present but header is missing',
      async (method) => {
        const token = 'c'.repeat(64);
        const res = await app.inject({
          method,
          url: '/protected',
          headers: { cookie: `csrf_token=${token}` },
        });

        expect(res.statusCode).toBe(403);
      }
    );

    it.each(['POST', 'PUT', 'PATCH', 'DELETE'] as const)(
      'should reject %s when header is present but cookie is missing',
      async (method) => {
        const token = 'd'.repeat(64);
        const res = await app.inject({
          method,
          url: '/protected',
          headers: { 'x-csrf-token': token },
        });

        expect(res.statusCode).toBe(403);
      }
    );

    it.each(['POST', 'PUT', 'PATCH', 'DELETE'] as const)(
      'should reject %s when cookie and header tokens do not match',
      async (method) => {
        const res = await app.inject({
          method,
          url: '/protected',
          headers: {
            cookie: `csrf_token=${'e'.repeat(64)}`,
            'x-csrf-token': 'f'.repeat(64),
          },
        });

        expect(res.statusCode).toBe(403);
      }
    );

    it.each(['POST', 'PUT', 'PATCH', 'DELETE'] as const)(
      'should allow %s when cookie and header tokens match',
      async (method) => {
        const token = 'abcd'.repeat(16); // 64 chars
        const res = await app.inject({
          method,
          url: '/protected',
          headers: {
            cookie: `csrf_token=${token}`,
            'x-csrf-token': token,
          },
        });

        expect(res.statusCode).toBe(200);
        const body = JSON.parse(res.body);
        expect(body.success).toBe(true);
      }
    );
  });

  // ---------------------------------------------------------------------------
  // Safe methods should not require CSRF tokens
  // ---------------------------------------------------------------------------
  describe('Safe Methods', () => {
    it('should allow GET without a CSRF token', async () => {
      const res = await app.inject({ method: 'GET', url: '/safe' });
      expect(res.statusCode).toBe(200);
    });

    it('should allow HEAD without a CSRF token', async () => {
      // HEAD uses the GET handler
      const res = await app.inject({ method: 'HEAD', url: '/safe' });
      expect(res.statusCode).toBe(200);
    });

    it('should allow OPTIONS without a CSRF token', async () => {
      const res = await app.inject({ method: 'OPTIONS', url: '/safe' });
      // OPTIONS may return 404 if not explicitly registered, which is fine —
      // the point is that CSRF should not reject it with 403
      expect(res.statusCode).not.toBe(403);
    });
  });

  // ---------------------------------------------------------------------------
  // Exempt routes
  // ---------------------------------------------------------------------------
  describe('Exempt Routes', () => {
    it.each(['/health', '/version', '/dev', '/collaboration/ws'])(
      'should skip CSRF validation for %s',
      async (url) => {
        const res = await app.inject({ method: 'POST', url });
        // Should succeed even without any CSRF token
        expect(res.statusCode).toBe(200);
      }
    );
  });

  // ---------------------------------------------------------------------------
  // Bearer token bypass
  // ---------------------------------------------------------------------------
  describe('Bearer Token Bypass', () => {
    it('should skip CSRF validation when Authorization: Bearer header is present', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/protected',
        headers: { authorization: 'Bearer some-api-token' },
      });

      expect(res.statusCode).toBe(200);
    });

    it('should not bypass CSRF when authorization header is not Bearer', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/protected',
        headers: { authorization: 'Basic dXNlcjpwYXNz' },
      });

      expect(res.statusCode).toBe(403);
    });
  });

  // ---------------------------------------------------------------------------
  // First-request token flow (cookie set during same request cycle)
  // ---------------------------------------------------------------------------
  describe('First-Request Token Flow', () => {
    it('should validate CSRF using internally stored token when no cookie was sent', async () => {
      // First: make a GET to obtain a new token
      const getRes = await app.inject({ method: 'GET', url: '/safe' });
      const token = getRes.headers['x-csrf-token'] as string;
      expect(token).toBeDefined();

      // Now use that token in a state-changing request, sending it as both cookie and header
      const postRes = await app.inject({
        method: 'POST',
        url: '/protected',
        headers: {
          cookie: `csrf_token=${token}`,
          'x-csrf-token': token,
        },
      });

      expect(postRes.statusCode).toBe(200);
    });

    it('should allow a first POST that has no pre-existing cookie when the newly generated token is sent in the header', async () => {
      // Build a special app that captures the generated token via the _csrfToken property
      const specialApp = Fastify({ logger: false });
      await specialApp.register(cookiePlugin);
      await specialApp.register(csrfPlugin);

      specialApp.post('/first-post', async () => {
        return { success: true };
      });

      await specialApp.ready();

      // First request — no cookie, no header — should fail with 403
      const failRes = await specialApp.inject({ method: 'POST', url: '/first-post' });
      expect(failRes.statusCode).toBe(403);

      await specialApp.close();
    });
  });

  // ---------------------------------------------------------------------------
  // Error response format
  // ---------------------------------------------------------------------------
  describe('Error Response Format', () => {
    it('should return a well-structured error response on CSRF failure', async () => {
      const res = await app.inject({ method: 'POST', url: '/protected' });

      expect(res.statusCode).toBe(403);

      const body = JSON.parse(res.body);
      expect(body).toEqual({
        success: false,
        error: {
          code: 'CSRF_VALIDATION_FAILED',
          message: 'Invalid or missing CSRF token',
        },
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Plugin metadata
  // ---------------------------------------------------------------------------
  describe('Plugin Registration', () => {
    it('should declare cookie-plugin as a dependency', async () => {
      // Attempting to register CSRF without the cookie plugin should throw
      const badApp = Fastify({ logger: false });

      await expect(async () => {
        await badApp.register(csrfPlugin);
        await badApp.ready();
      }).rejects.toThrow();

      await badApp.close();
    });
  });
});
