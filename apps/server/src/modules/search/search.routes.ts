import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import * as searchService from './search.service.js';
import { requireAuth } from '../auth/auth.middleware.js';
import { requireOrgAccess } from '../organizations/organizations.middleware.js';
import { mapServiceError, type ErrorMap } from '../../utils/errors.js';

// ===========================================
// REQUEST SCHEMAS
// ===========================================

const searchQuerySchema = z.object({
  q: z.string().min(1).max(200),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
  dateFrom: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD format')
    .optional(),
  dateTo: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD format')
    .optional(),
  createdById: z.string().optional(),
});

// ===========================================
// TYPE DEFINITIONS
// ===========================================

interface OrgParams {
  orgId: string;
}

// ===========================================
// ERROR MAP
// ===========================================

const errorMap: ErrorMap = {
  INVALID_QUERY: {
    status: 400,
    code: 'INVALID_QUERY',
    message: 'Search query is invalid',
  },
};

// ===========================================
// SEARCH ROUTES
// ===========================================

export default async function searchRoutes(fastify: FastifyInstance): Promise<void> {
  // All routes require authentication and org access
  fastify.addHook('preHandler', requireAuth);
  fastify.addHook('preHandler', requireOrgAccess);

  /**
   * GET /organizations/:orgId/search?q=...
   * Search pages within an organisation
   */
  fastify.get('/', async (request: FastifyRequest<{ Params: OrgParams }>, reply: FastifyReply) => {
    const queryResult = searchQuerySchema.safeParse(request.query);
    if (!queryResult.success) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid query parameters',
          details: queryResult.error.flatten().fieldErrors,
        },
      });
    }

    const { q, limit, offset, dateFrom, dateTo, createdById } = queryResult.data;

    try {
      const { results, total } = await searchService.searchPages({
        query: q,
        organizationId: request.params.orgId,
        limit,
        offset,
        dateFrom,
        dateTo,
        createdById,
      });

      // Map results to camelCase API response
      const mappedResults = results.map((r) => ({
        id: r.id,
        title: r.title,
        titleHighlight: r.titleHighlight,
        contentHighlight: r.contentHighlight,
        icon: r.icon,
        createdById: r.createdById,
        createdByName: r.createdByName,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        rank: r.rank,
      }));

      return {
        success: true,
        data: {
          results: mappedResults,
          total,
          query: q,
        },
      };
    } catch (error) {
      return mapServiceError(error, reply, errorMap);
    }
  });
}
