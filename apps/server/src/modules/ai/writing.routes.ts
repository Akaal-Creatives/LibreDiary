import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { writeText } from './writing.service.js';
import { requireAuth } from '../auth/auth.middleware.js';
import { requireOrgAccess } from '../organizations/organizations.middleware.js';
import { getAuthUser, mapServiceError, type ErrorMap } from '../../utils/errors.js';
import { logAudit } from '../audit/audit.service.js';

// ===========================================
// WRITING ACTIONS
// ===========================================

export const WRITING_ACTIONS = [
  'generate',
  'expand',
  'summarise',
  'improve',
  'schedule',
  'todos',
] as const;

// ===========================================
// REQUEST SCHEMAS
// ===========================================

const writeBodySchema = z.object({
  action: z.enum(WRITING_ACTIONS),
  text: z.string().min(1).max(10000),
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
  WRITING_FAILED: {
    status: 503,
    code: 'WRITING_FAILED',
    message: 'Writing failed. Please try again later.',
  },
};

// ===========================================
// WRITING ROUTES
// ===========================================

export default async function writingRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.addHook('preHandler', requireAuth);
  fastify.addHook('preHandler', requireOrgAccess);

  /**
   * POST /organizations/:orgId/ai/write
   * AI-assisted writing (generate, expand, summarise, improve)
   */
  fastify.post('/', async (request: FastifyRequest<{ Params: OrgParams }>, reply: FastifyReply) => {
    const bodyResult = writeBodySchema.safeParse(request.body);
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

    const { action, text } = bodyResult.data;
    const user = getAuthUser(request);

    try {
      const result = await writeText({
        action,
        text,
        organizationId: request.params.orgId,
      });

      logAudit({
        action: 'AI_WRITING',
        userId: user.id,
        organizationId: request.params.orgId,
        metadata: { writingAction: action, textLength: text.length },
      });

      return {
        success: true,
        data: { content: result.content },
      };
    } catch (error) {
      return mapServiceError(error, reply, errorMap);
    }
  });
}
