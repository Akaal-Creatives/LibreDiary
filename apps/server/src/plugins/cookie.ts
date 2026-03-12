import cookie from '@fastify/cookie';
import fp from 'fastify-plugin';
import type { FastifyInstance } from 'fastify';
import { env } from '../config/index.js';

async function cookiePluginImpl(fastify: FastifyInstance) {
  await fastify.register(cookie, {
    secret: env.SESSION_SECRET ?? env.APP_SECRET,
    parseOptions: {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      // Cross-origin deployment (frontend on different subdomain) requires
      // SameSite=none + Secure. In development, use 'lax' for cross-port requests.
      sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax',
      path: '/',
    },
  });
}

// Wrap with fastify-plugin to make decorators available globally
export const cookiePlugin = fp(cookiePluginImpl, {
  name: 'cookie-plugin',
});
