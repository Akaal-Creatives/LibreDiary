import type { FastifyInstance, FastifyReply } from 'fastify';
import * as mentionsService from './mentions.service.js';
import { requireAuth } from '../auth/auth.middleware.js';
import { requireOrgAccess } from '../organizations/organizations.middleware.js';

// ===========================================
// TYPE DEFINITIONS
// ===========================================

interface SearchUsersQuery {
  q: string;
}

// ===========================================
// ERROR RESPONSE HELPER
// ===========================================

function mapServiceError(error: unknown, reply: FastifyReply): FastifyReply {
  const message = error instanceof Error ? error.message : 'Unknown error';

  const errorMap: Record<string, { status: number; code: string; message: string }> = {
    COMMENT_NOT_FOUND: {
      status: 404,
      code: 'COMMENT_NOT_FOUND',
      message: 'Comment not found',
    },
  };

  const errorInfo = errorMap[message] || {
    status: 500,
    code: 'INTERNAL_ERROR',
    message: 'An unexpected error occurred',
  };

  return reply.status(errorInfo.status).send({
    success: false,
    error: {
      code: errorInfo.code,
      message: errorInfo.message,
    },
  });
}

// ===========================================
// MENTIONS ROUTES
// ===========================================

export default async function mentionsRoutes(fastify: FastifyInstance): Promise<void> {
  // Add authentication and org access hooks
  fastify.addHook('preHandler', requireAuth);
  fastify.addHook('preHandler', requireOrgAccess);

  /**
   * GET /mentions/users/search
   * Search organization members for @mention autocomplete
   */
  fastify.get<{ Querystring: SearchUsersQuery }>(
    '/users/search',
    {
      schema: {
        querystring: {
          type: 'object',
          required: ['q'],
          properties: {
            q: { type: 'string', minLength: 2 },
          },
        },
      },
    },
    async (request, reply) => {
      const { q } = request.query;
      const userId = request.user!.id;
      const organizationId = request.organizationId;

      try {
        const users = await mentionsService.searchUsersForMention(
          organizationId!,
          q,
          userId // Exclude current user from search results
        );

        return {
          success: true,
          data: { users },
        };
      } catch (error) {
        return mapServiceError(error, reply);
      }
    }
  );

  /**
   * GET /mentions
   * Get all mentions for the current user in the organization
   */
  fastify.get('/', async (request, reply) => {
    const userId = request.user!.id;
    const organizationId = request.organizationId;

    try {
      const mentions = await mentionsService.getMentionsForUser(userId, organizationId!);

      return {
        success: true,
        data: { mentions },
      };
    } catch (error) {
      return mapServiceError(error, reply);
    }
  });
}
