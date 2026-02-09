import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../auth/auth.middleware.js';
import { requireSuperAdmin } from '../admin/admin.middleware.js';
import * as auditService from './audit.service.js';

const auditLogQuerySchema = z.object({
  action: z.string().optional(),
  userId: z.string().optional(),
  organizationId: z.string().optional(),
  resourceType: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(50),
});

export async function auditRoutes(app: FastifyInstance): Promise<void> {
  app.addHook('preHandler', requireAuth);
  app.addHook('preHandler', requireSuperAdmin);

  // List audit logs with optional filters
  app.get('/', async (request, reply) => {
    const query = auditLogQuerySchema.parse(request.query);

    const result = await auditService.listAuditLogs({
      action: query.action as auditService.AuditLogFilters['action'],
      userId: query.userId,
      organizationId: query.organizationId,
      resourceType: query.resourceType,
      startDate: query.startDate,
      endDate: query.endDate,
      page: query.page,
      limit: query.limit,
    });

    return reply.send({
      success: true,
      data: {
        logs: result.items,
        pagination: result.pagination,
      },
    });
  });

  // Get distinct action types that have been logged
  app.get('/actions', async (_request, reply) => {
    const actions = await auditService.getDistinctActions();

    return reply.send({
      success: true,
      data: { actions },
    });
  });
}
