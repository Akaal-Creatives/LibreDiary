import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { createAiDatabase } from './database-creation.service.js';
import { requireAuth } from '../auth/auth.middleware.js';
import { requireOrgAccess } from '../organizations/organizations.middleware.js';
import { getAuthUser, mapServiceError, type ErrorMap } from '../../utils/errors.js';
import { logAudit } from '../audit/audit.service.js';

interface OrgParams {
  orgId: string;
}

const errorMap: ErrorMap = {
  AI_DISABLED: {
    status: 403,
    code: 'AI_DISABLED',
    message: 'AI features are disabled for this organisation',
  },
  'AI is disabled': {
    status: 403,
    code: 'AI_DISABLED',
    message: 'AI features are disabled',
  },
  'No API key configured': {
    status: 503,
    code: 'AI_NOT_CONFIGURED',
    message: 'AI service is not configured',
  },
  DATABASE_CREATION_FAILED: {
    status: 503,
    code: 'DATABASE_CREATION_FAILED',
    message: 'Failed to create database. Please try again.',
  },
};

const bodySchema = z.object({
  description: z.string().min(1).max(500).trim(),
});

export default async function databaseCreationRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.addHook('preHandler', requireAuth);
  fastify.addHook('preHandler', requireOrgAccess);

  /**
   * POST /organizations/:orgId/ai/database
   * Generate a database schema from a natural language description and create it
   */
  fastify.post('/', async (request: FastifyRequest<{ Params: OrgParams }>, reply: FastifyReply) => {
    const bodyResult = bodySchema.safeParse(request.body);
    if (!bodyResult.success) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request body',
          details: bodyResult.error.flatten().fieldErrors,
        },
      });
    }

    const { description } = bodyResult.data;
    const user = getAuthUser(request);

    try {
      const result = await createAiDatabase(request.params.orgId, user.id, description);

      logAudit({
        action: 'DATABASE_CREATED',
        userId: user.id,
        organizationId: request.params.orgId,
        metadata: { description, databaseId: result.databaseId },
      });

      return reply.status(201).send({ success: true, data: result });
    } catch (error) {
      return mapServiceError(error, reply, errorMap);
    }
  });
}
