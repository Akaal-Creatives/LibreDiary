import type { FastifyInstance } from 'fastify';
import * as mentionsService from './mentions.service.js';
import { requireAuth } from '../auth/auth.middleware.js';
import { requireOrgAccess } from '../organizations/organizations.middleware.js';
import { getAuthUser, mapServiceError, type ErrorMap } from '../../utils/errors.js';

// ===========================================
// TYPE DEFINITIONS
// ===========================================

interface SearchUsersQuery {
  q: string;
}

// ===========================================
// ERROR MAP
// ===========================================

const errorMap: ErrorMap = {
  COMMENT_NOT_FOUND: {
    status: 404,
    code: 'COMMENT_NOT_FOUND',
    message: 'Comment not found',
  },
};

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
      const userId = getAuthUser(request).id;
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
        return mapServiceError(error, reply, errorMap);
      }
    }
  );

  /**
   * GET /mentions
   * Get all mentions for the current user in the organization
   */
  fastify.get('/', async (request, reply) => {
    const userId = getAuthUser(request).id;
    const organizationId = request.organizationId;

    try {
      const mentions = await mentionsService.getMentionsForUser(userId, organizationId!);

      return {
        success: true,
        data: { mentions },
      };
    } catch (error) {
      return mapServiceError(error, reply, errorMap);
    }
  });
}
