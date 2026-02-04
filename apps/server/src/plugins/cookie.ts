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
      sameSite: 'strict',
      path: '/',
    },
  });
}

// Wrap with fastify-plugin to make decorators available globally
export const cookiePlugin = fp(cookiePluginImpl, {
  name: 'cookie-plugin',
});
