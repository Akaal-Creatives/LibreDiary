import * as path from 'node:path';
import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import multipart from '@fastify/multipart';
import { env } from './config/index.js';
import { logger } from './lib/logger.js';
import {
  corsPlugin,
  helmetPlugin,
  cookiePlugin,
  csrfPlugin,
  sensiblePlugin,
  errorHandlerPlugin,
  rateLimitPlugin,
  websocketPlugin,
} from './plugins/index.js';
import { healthRoutes, devRoutes, versionRoutes } from './routes/index.js';
import { authRoutes, oauthRoutes } from './modules/auth/index.js';
import { organizationRoutes } from './modules/organizations/index.js';
import { pagesRoutes, trashRoutes, favoritesRoutes } from './modules/pages/index.js';
import { versionsRoutes, collaborationRoutes } from './modules/collaboration/index.js';
import { permissionsRoutes } from './modules/permissions/index.js';
import { commentsRoutes } from './modules/comments/index.js';
import { mentionsRoutes } from './modules/mentions/index.js';
import { notificationsRoutes } from './modules/notifications/index.js';
import { publicRoutes } from './modules/public/index.js';
import { setupRoutes } from './modules/setup/index.js';
import { adminRoutes } from './modules/admin/index.js';
import { searchRoutes, searchAdminRoutes } from './modules/search/index.js';
import { databasesRoutes, automationsRoutes } from './modules/databases/index.js';
import { templatesRoutes } from './modules/templates/index.js';
import { filesRoutes } from './modules/files/index.js';
import { adminBackupRoutes, orgBackupRoutes } from './modules/backups/index.js';
import { apiTokenRoutes } from './modules/api-tokens/index.js';
import { webhookRoutes } from './modules/webhooks/index.js';
import { auditRoutes } from './modules/audit/index.js';
import { translationRoutes, writingRoutes, databaseCreationRoutes } from './modules/ai/index.js';
import { gdprRoutes } from './modules/gdpr/index.js';
import { markdownRoutes } from './modules/markdown/index.js';
import { encryptionRoutes } from './modules/encryption/index.js';
import { initMeilisearch } from './modules/search/meilisearch.init.js';

/**
 * Parse TRUSTED_PROXY_IPS into Fastify's trustProxy option.
 * Accepts 'true' (trust all), 'false', or a comma-separated list of IPs/CIDRs.
 */
function parseTrustProxy(value: string): boolean | string | string[] {
  const trimmed = value.trim();
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  const proxies = trimmed
    .split(',')
    .map((ip) => ip.trim())
    .filter(Boolean);
  return proxies.length === 1 ? proxies[0]! : proxies;
}

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
    trustProxy: parseTrustProxy(env.TRUSTED_PROXY_IPS),
  });

  // Register plugins
  await fastify.register(corsPlugin);
  await fastify.register(helmetPlugin);
  await fastify.register(cookiePlugin);
  await fastify.register(csrfPlugin);
  await fastify.register(sensiblePlugin);
  await fastify.register(errorHandlerPlugin);
  await fastify.register(rateLimitPlugin);
  await fastify.register(websocketPlugin);
  await fastify.register(multipart, {
    limits: {
      fileSize: env.STORAGE_MAX_FILE_SIZE,
    },
  });

  // Serve uploaded files when using local storage
  if (env.STORAGE_TYPE === 'LOCAL') {
    await fastify.register(fastifyStatic, {
      root: path.resolve(env.STORAGE_LOCAL_PATH),
      prefix: '/uploads/',
      decorateReply: false,
    });
  }

  // Register routes
  await fastify.register(healthRoutes);
  await fastify.register(devRoutes);
  await fastify.register(versionRoutes);

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

      // Comment routes
      await api.register(commentsRoutes, {
        prefix: '/organizations/:orgId/pages/:pageId/comments',
      });

      // Mentions routes
      await api.register(mentionsRoutes, {
        prefix: '/organizations/:orgId/mentions',
      });

      // Search routes
      await api.register(searchRoutes, {
        prefix: '/organizations/:orgId/search',
      });

      // Database routes
      await api.register(databasesRoutes, {
        prefix: '/organizations/:orgId/databases',
      });

      // Automation routes (nested under databases prefix)
      await api.register(automationsRoutes, {
        prefix: '/organizations/:orgId/databases',
      });

      // Template routes
      await api.register(templatesRoutes, {
        prefix: '/organizations/:orgId/templates',
      });

      // File routes
      await api.register(filesRoutes, {
        prefix: '/organizations/:orgId/files',
      });

      // Notifications routes (user-specific, no org context needed)
      await api.register(notificationsRoutes, { prefix: '/notifications' });

      // API Token routes (user-specific)
      await api.register(apiTokenRoutes, { prefix: '/api-tokens' });

      // Webhook routes (org-scoped)
      await api.register(webhookRoutes, {
        prefix: '/organizations/:orgId/webhooks',
      });

      // Backup routes (org-scoped)
      await api.register(orgBackupRoutes, {
        prefix: '/organizations/:orgId/backups',
      });

      // Markdown routes (org-scoped, page-scoped)
      await api.register(markdownRoutes, {
        prefix: '/organizations/:orgId/pages/:pageId/markdown',
      });

      // AI translation routes (org-scoped)
      await api.register(translationRoutes, {
        prefix: '/organizations/:orgId/ai/translate',
      });

      // AI writing routes (org-scoped)
      await api.register(writingRoutes, {
        prefix: '/organizations/:orgId/ai/write',
      });

      // AI database creation routes (org-scoped)
      await api.register(databaseCreationRoutes, {
        prefix: '/organizations/:orgId/ai/database',
      });

      // E2EE encryption routes
      await api.register(encryptionRoutes, { prefix: '/encryption' });

      // GDPR routes (user-specific)
      await api.register(gdprRoutes, { prefix: '/gdpr' });

      // Admin routes (super admin only)
      await api.register(adminRoutes, { prefix: '/admin' });
      await api.register(adminBackupRoutes, { prefix: '/admin/backups' });
      await api.register(auditRoutes, { prefix: '/admin/audit-logs' });
      await api.register(searchAdminRoutes, { prefix: '/admin/search' });
    },
    { prefix: '/api/v1' }
  );

  // Initialise Meilisearch (non-blocking; PG FTS fallback if unavailable)
  initMeilisearch().catch((err) => {
    logger.warn(err, '[meilisearch] startup init error');
  });

  return fastify;
}
