/**
 * Tests for the cookie plugin wrapper
 *
 * These tests verify that the cookie plugin is properly wrapped with
 * fastify-plugin to ensure decorators are available in child contexts.
 *
 * This test file would have caught the "reply.setCookie is not a function"
 * bug that occurred when the cookie plugin was not properly exposing
 * decorators to child routes.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify from 'fastify';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { cookiePlugin } from '../cookie.js';

describe('Cookie Plugin', () => {
  describe('Plugin Encapsulation', () => {
    let app: FastifyInstance;

    beforeAll(async () => {
      app = Fastify({ logger: false });
      await app.register(cookiePlugin);
      await app.ready();
    });

    afterAll(async () => {
      await app.close();
    });

    it('should expose setCookie decorator on reply', () => {
      expect(app.hasReplyDecorator('setCookie')).toBe(true);
    });

    it('should expose clearCookie decorator on reply', () => {
      expect(app.hasReplyDecorator('clearCookie')).toBe(true);
    });

    it('should expose cookies decorator on request', () => {
      expect(app.hasRequestDecorator('cookies')).toBe(true);
    });

    it('should expose unsignCookie decorator on reply', () => {
      expect(app.hasReplyDecorator('unsignCookie')).toBe(true);
    });
  });

  describe('Child Route Encapsulation', () => {
    /**
     * This is the critical test that verifies the plugin is wrapped
     * with fastify-plugin. Without it, decorators would not be available
     * in child route contexts.
     */

    let app: FastifyInstance;

    beforeAll(async () => {
      app = Fastify({ logger: false });

      // Register cookie plugin at root level
      await app.register(cookiePlugin);

      // Register child routes under a prefix (simulating /api/v1/auth)
      await app.register(
        async (child) => {
          // This route should have access to setCookie
          child.post('/set-cookie', async (_request: FastifyRequest, reply: FastifyReply) => {
            reply.setCookie('test_cookie', 'test_value', {
              path: '/',
              httpOnly: true,
            });
            return { success: true };
          });

          // This route should have access to clearCookie
          child.post('/clear-cookie', async (_request: FastifyRequest, reply: FastifyReply) => {
            reply.clearCookie('test_cookie', { path: '/' });
            return { success: true };
          });

          // This route should have access to request.cookies
          child.get('/read-cookie', async (request: FastifyRequest, _reply: FastifyReply) => {
            return {
              success: true,
              cookie: request.cookies?.['test_cookie'],
            };
          });

          // Nested child route to test deeper nesting
          await child.register(
            async (nested) => {
              nested.post('/nested-set', async (_request: FastifyRequest, reply: FastifyReply) => {
                reply.setCookie('nested_cookie', 'nested_value', {
                  path: '/',
                });
                return { success: true };
              });
            },
            { prefix: '/nested' }
          );
        },
        { prefix: '/api/v1/auth' }
      );

      await app.ready();
    });

    afterAll(async () => {
      await app.close();
    });

    it('should allow setting cookies in child routes', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/set-cookie',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);

      // Verify cookie was set
      const cookie = response.cookies.find((c) => c.name === 'test_cookie');
      expect(cookie).toBeDefined();
      expect(cookie?.value).toBe('test_value');
      expect(cookie?.httpOnly).toBe(true);
    });

    it('should allow clearing cookies in child routes', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/clear-cookie',
      });

      expect(response.statusCode).toBe(200);

      // When clearing a cookie, it should be set with empty value or expired
      const cookie = response.cookies.find((c) => c.name === 'test_cookie');
      expect(cookie).toBeDefined();
    });

    it('should allow reading cookies in child routes', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/read-cookie',
        headers: {
          cookie: 'test_cookie=hello_world',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.cookie).toBe('hello_world');
    });

    it('should allow setting cookies in deeply nested routes', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/nested/nested-set',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);

      const cookie = response.cookies.find((c) => c.name === 'nested_cookie');
      expect(cookie).toBeDefined();
      expect(cookie?.value).toBe('nested_value');
    });
  });

  describe('Cookie Options', () => {
    let app: FastifyInstance;

    beforeAll(async () => {
      // Set NODE_ENV to test different configurations
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      app = Fastify({ logger: false });
      await app.register(cookiePlugin);

      app.post('/test-cookie', async (_request: FastifyRequest, reply: FastifyReply) => {
        reply.setCookie('session', 'abc123', {
          path: '/',
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 3600,
        });
        return { success: true };
      });

      await app.ready();

      // Restore original NODE_ENV
      process.env.NODE_ENV = originalEnv;
    });

    afterAll(async () => {
      await app.close();
    });

    it('should set cookie with correct options', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/test-cookie',
      });

      expect(response.statusCode).toBe(200);

      const cookie = response.cookies.find((c) => c.name === 'session');
      expect(cookie).toBeDefined();
      expect(cookie?.value).toBe('abc123');
      expect(cookie?.httpOnly).toBe(true);
      expect(cookie?.path).toBe('/');
      expect(cookie?.sameSite).toBe('Strict');
    });
  });

  describe('Without fastify-plugin Wrapper (Negative Test)', () => {
    /**
     * This test demonstrates what would happen if the cookie plugin
     * was NOT wrapped with fastify-plugin. The decorators would not
     * be available in child contexts.
     *
     * Note: This is a demonstration test - we're testing that our
     * actual implementation DOES work, which implies proper wrapping.
     */

    it('should verify our plugin IS properly wrapped by checking decorator availability', async () => {
      const app = Fastify({ logger: false });

      // Register our cookie plugin
      await app.register(cookiePlugin);

      // Track if setCookie was callable
      let setCookieCalled = false;

      // Register a deeply nested route
      await app.register(
        async (level1) => {
          await level1.register(
            async (level2) => {
              await level2.register(
                async (level3) => {
                  level3.post('/deep', async (_req: FastifyRequest, reply: FastifyReply) => {
                    // This would throw "reply.setCookie is not a function"
                    // if the plugin wasn't properly wrapped with fastify-plugin
                    reply.setCookie('deep_cookie', 'deep_value', { path: '/' });
                    setCookieCalled = true;
                    return { success: true };
                  });
                },
                { prefix: '/level3' }
              );
            },
            { prefix: '/level2' }
          );
        },
        { prefix: '/level1' }
      );

      await app.ready();

      const response = await app.inject({
        method: 'POST',
        url: '/level1/level2/level3/deep',
      });

      expect(response.statusCode).toBe(200);
      expect(setCookieCalled).toBe(true);

      const cookie = response.cookies.find((c) => c.name === 'deep_cookie');
      expect(cookie).toBeDefined();

      await app.close();
    });
  });

  describe('Signed Cookies', () => {
    let app: FastifyInstance;

    beforeAll(async () => {
      app = Fastify({ logger: false });
      await app.register(cookiePlugin);

      app.post('/sign', async (_request: FastifyRequest, reply: FastifyReply) => {
        reply.setCookie('signed_cookie', 'secret_value', {
          path: '/',
          signed: true,
        });
        return { success: true };
      });

      app.get('/verify', async (request: FastifyRequest, reply: FastifyReply) => {
        const signedCookie = request.cookies?.['signed_cookie'];
        if (signedCookie) {
          const result = reply.unsignCookie(signedCookie);
          return { success: true, value: result.value, valid: result.valid };
        }
        return { success: false, message: 'No cookie found' };
      });

      await app.ready();
    });

    afterAll(async () => {
      await app.close();
    });

    it('should set a signed cookie', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/sign',
      });

      expect(response.statusCode).toBe(200);

      const cookie = response.cookies.find((c) => c.name === 'signed_cookie');
      expect(cookie).toBeDefined();
      // Signed cookies have the signature appended
      expect(cookie?.value).toContain('.');
    });

    it('should verify a valid signed cookie', async () => {
      // First, get a signed cookie
      const setResponse = await app.inject({
        method: 'POST',
        url: '/sign',
      });

      const signedCookie = setResponse.cookies.find((c) => c.name === 'signed_cookie');
      expect(signedCookie).toBeDefined();

      // Now verify it
      const verifyResponse = await app.inject({
        method: 'GET',
        url: '/verify',
        headers: {
          cookie: `signed_cookie=${signedCookie!.value}`,
        },
      });

      expect(verifyResponse.statusCode).toBe(200);
      const body = JSON.parse(verifyResponse.body);
      expect(body.success).toBe(true);
      expect(body.valid).toBe(true);
      expect(body.value).toBe('secret_value');
    });

    it('should reject a tampered signed cookie', async () => {
      const verifyResponse = await app.inject({
        method: 'GET',
        url: '/verify',
        headers: {
          cookie: 'signed_cookie=tampered_value.fake_signature',
        },
      });

      expect(verifyResponse.statusCode).toBe(200);
      const body = JSON.parse(verifyResponse.body);
      expect(body.success).toBe(true);
      expect(body.valid).toBe(false);
    });
  });
});
