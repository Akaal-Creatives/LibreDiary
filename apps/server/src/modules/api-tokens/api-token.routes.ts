import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../auth/auth.middleware.js';
import { createApiTokenSchema } from '@librediary/shared';
import * as apiTokenService from './api-token.service.js';

export async function apiTokenRoutes(fastify: FastifyInstance) {
  // All routes require auth
  fastify.addHook('preHandler', requireAuth);

  // POST / — Create API token
  fastify.post('/', async (request, reply) => {
    const parsed = createApiTokenSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: parsed.error.errors[0]?.message ?? 'Invalid input',
        },
      });
    }

    const { name, expiresAt } = parsed.data;
    const { rawToken, apiToken } = await apiTokenService.createToken(
      request.user!.id,
      name,
      expiresAt
    );

    return reply.status(201).send({
      success: true,
      data: {
        token: {
          id: apiToken.id,
          userId: apiToken.userId,
          name: apiToken.name,
          tokenPrefix: apiToken.tokenPrefix,
          lastUsedAt: apiToken.lastUsedAt,
          expiresAt: apiToken.expiresAt,
          createdAt: apiToken.createdAt,
          rawToken,
        },
      },
    });
  });

  // GET / — List user's tokens
  fastify.get('/', async (request) => {
    const tokens = await apiTokenService.listTokens(request.user!.id);

    return {
      success: true,
      data: { tokens },
    };
  });

  // DELETE /:tokenId — Revoke token
  fastify.delete<{ Params: { tokenId: string } }>('/:tokenId', async (request, reply) => {
    try {
      await apiTokenService.deleteToken(request.params.tokenId, request.user!.id);
      return { success: true };
    } catch (error) {
      if (error instanceof Error && error.message === 'Token not found') {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Token not found' },
        });
      }
      throw error;
    }
  });
}
