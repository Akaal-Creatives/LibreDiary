import cookie from '@fastify/cookie';
import type { FastifyInstance } from 'fastify';
import { env } from '../config/index.js';

export async function cookiePlugin(fastify: FastifyInstance) {
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
