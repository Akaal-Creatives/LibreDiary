import Fastify from 'fastify';
import { env } from './config/index.js';
import {
  corsPlugin,
  helmetPlugin,
  cookiePlugin,
  sensiblePlugin,
  errorHandlerPlugin,
  websocketPlugin,
} from './plugins/index.js';
import { healthRoutes, devRoutes } from './routes/index.js';
import { authRoutes, oauthRoutes } from './modules/auth/index.js';
import { organizationRoutes } from './modules/organizations/index.js';
import { pagesRoutes, trashRoutes, favoritesRoutes } from './modules/pages/index.js';
import { versionsRoutes, collaborationRoutes } from './modules/collaboration/index.js';
import { permissionsRoutes } from './modules/permissions/index.js';
import { publicRoutes } from './modules/public/index.js';
import { setupRoutes } from './modules/setup/index.js';
import { adminRoutes } from './modules/admin/index.js';

export async function buildApp() {
  const fastify = Fastify({
    logger: {
      level: env.NODE_ENV === 'production' ? 'info' : 'debug',
      transport:
        env.NODE_ENV === 'development'
          ? {
              target: 'pino-pretty',
              options: {
                translateTime: 'HH:MM:ss Z',
                ignore: 'pid,hostname',
                colorize: true,
              },
            }
          : undefined,
    },
    trustProxy: true,
  });

  // Register plugins
  await fastify.register(corsPlugin);
  await fastify.register(helmetPlugin);
  await fastify.register(cookiePlugin);
  await fastify.register(sensiblePlugin);
  await fastify.register(errorHandlerPlugin);
  await fastify.register(websocketPlugin);

  // Register routes
  await fastify.register(healthRoutes);
  await fastify.register(devRoutes);

  // Setup routes (no auth required, used for initial setup)
  await fastify.register(setupRoutes, { prefix: '/api/v1/setup' });

  // Public routes (no auth required, for public page viewing)
  await fastify.register(publicRoutes, { prefix: '/api/v1/public/pages' });

  // WebSocket routes for real-time collaboration
  await fastify.register(collaborationRoutes, { prefix: '/collaboration' });

  // API routes will be registered under /api prefix
  await fastify.register(
    async (api) => {
      // API v1 routes will be added here
      api.get('/', async () => ({
        success: true,
        data: { message: 'LibreDiary API v1' },
      }));

      // Auth routes
      await api.register(authRoutes, { prefix: '/auth' });

      // OAuth routes
      await api.register(oauthRoutes, { prefix: '/oauth' });

      // Organization routes
      await api.register(organizationRoutes, { prefix: '/organizations' });

      // Page routes (nested under organizations)
      await api.register(pagesRoutes, { prefix: '/organizations/:orgId/pages' });
      await api.register(trashRoutes, { prefix: '/organizations/:orgId/trash' });
      await api.register(favoritesRoutes, { prefix: '/organizations/:orgId/favorites' });

      // Collaboration routes (versions)
      await api.register(versionsRoutes, {
        prefix: '/organizations/:orgId/pages/:pageId/versions',
      });

      // Permission routes
      await api.register(permissionsRoutes, {
        prefix: '/organizations/:orgId/pages/:pageId/permissions',
      });

      // Admin routes (super admin only)
      await api.register(adminRoutes, { prefix: '/admin' });
    },
    { prefix: '/api/v1' }
  );

  return fastify;
}
