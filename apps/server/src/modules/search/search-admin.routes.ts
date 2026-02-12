import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../auth/auth.middleware.js';
import { requireSuperAdmin } from '../admin/admin.middleware.js';
import { logAudit } from '../audit/audit.service.js';
import { triggerReindex, getReindexStatus } from './search-admin.service.js';
import { mapServiceError, type ErrorMap } from '../../utils/errors.js';

const errorMap: ErrorMap = {
  REINDEX_IN_PROGRESS: {
    status: 409,
    code: 'REINDEX_IN_PROGRESS',
    message: 'A reindex operation is already in progress',
  },
};

export async function searchAdminRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', requireAuth);
  app.addHook('preHandler', requireSuperAdmin);

  /**
   * POST /admin/search/reindex
   * Trigger a full reindex of all pages into Meilisearch
   */
  app.post('/reindex', async (request, reply) => {
    try {
      const result = await triggerReindex();

      logAudit({
        action: 'ADMIN_SEARCH_REINDEX',
        userId: request.user?.id,
        resourceType: 'search_index',
        metadata: { totalIndexed: result.totalIndexed, durationMs: result.durationMs },
      });

      return reply.send({
        success: true,
        data: result,
      });
    } catch (error) {
      return mapServiceError(error, reply, errorMap);
    }
  });

  /**
   * GET /admin/search/reindex/status
   * Get the current reindex status
   */
  app.get('/reindex/status', async (_request, reply) => {
    const status = getReindexStatus();
    return reply.send({
      success: true,
      data: status,
    });
  });
}
