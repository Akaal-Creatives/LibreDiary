import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { translateText } from './translation.service.js';
import { requireAuth } from '../auth/auth.middleware.js';
import { requireOrgAccess } from '../organizations/organizations.middleware.js';
import { getAuthUser, mapServiceError, type ErrorMap } from '../../utils/errors.js';
import { logAudit } from '../audit/audit.service.js';

// ===========================================
// SUPPORTED LANGUAGES
// ===========================================

export const SUPPORTED_LANGUAGES = [
  'English',
  'Spanish',
  'French',
  'German',
  'Italian',
  'Portuguese',
  'Dutch',
  'Russian',
  'Chinese (Simplified)',
  'Chinese (Traditional)',
  'Japanese',
  'Korean',
  'Arabic',
  'Hindi',
  'Turkish',
  'Polish',
  'Swedish',
  'Danish',
  'Norwegian',
  'Finnish',
  'Czech',
  'Greek',
  'Romanian',
  'Hungarian',
  'Thai',
  'Vietnamese',
  'Indonesian',
  'Malay',
  'Filipino',
  'Ukrainian',
  'Punjabi',
] as const;

// ===========================================
// REQUEST SCHEMAS
// ===========================================

const translateBodySchema = z.object({
  text: z.string().min(1).max(10000),
  targetLanguage: z.enum(SUPPORTED_LANGUAGES),
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
  TRANSLATION_FAILED: {
    status: 503,
    code: 'TRANSLATION_FAILED',
    message: 'Translation failed. Please try again later.',
  },
};

// ===========================================
// TRANSLATION ROUTES
// ===========================================

export default async function translationRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.addHook('preHandler', requireAuth);
  fastify.addHook('preHandler', requireOrgAccess);

  /**
   * POST /organizations/:orgId/ai/translate
   * Translate selected text to a target language
   */
  fastify.post('/', async (request: FastifyRequest<{ Params: OrgParams }>, reply: FastifyReply) => {
    const bodyResult = translateBodySchema.safeParse(request.body);
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

    const { text, targetLanguage } = bodyResult.data;
    const user = getAuthUser(request);

    try {
      const result = await translateText({
        text,
        targetLanguage,
        organizationId: request.params.orgId,
      });

      logAudit({
        action: 'AI_TRANSLATION',
        userId: user.id,
        organizationId: request.params.orgId,
        metadata: { targetLanguage, textLength: text.length },
      });

      return {
        success: true,
        data: { translatedText: result.translatedText },
      };
    } catch (error) {
      return mapServiceError(error, reply, errorMap);
    }
  });
}
