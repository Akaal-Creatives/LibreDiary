import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../auth/auth.middleware.js';
import { requireOrgAccess } from '../organizations/organizations.middleware.js';
import { createWebhookSchema, updateWebhookSchema } from '@librediary/shared';
import * as webhookService from './webhook.service.js';
import * as deliveryService from './webhook-delivery.service.js';
import { getAuthUser } from '../../utils/errors.js';

const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

export async function webhookRoutes(fastify: FastifyInstance) {
  // All routes require auth + org access
  fastify.addHook('preHandler', requireAuth);
  fastify.addHook('preHandler', requireOrgAccess);

  // GET / — List webhooks
  fastify.get('/', async (request) => {
    const webhooks = await webhookService.listWebhooks(
      (request as { organizationId: string }).organizationId
    );
    return { success: true, data: { webhooks } };
  });

  // POST / — Create webhook
  fastify.post('/', async (request, reply) => {
    const parsed = createWebhookSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: parsed.error.errors[0]?.message ?? 'Invalid input',
        },
      });
    }

    const webhook = await webhookService.createWebhook(
      (request as { organizationId: string }).organizationId,
      getAuthUser(request).id,
      parsed.data
    );

    return reply.status(201).send({
      success: true,
      data: { webhook },
    });
  });

  // GET /:webhookId — Get webhook
  fastify.get<{ Params: { webhookId: string } }>('/:webhookId', async (request, reply) => {
    try {
      const webhook = await webhookService.getWebhook(
        request.params.webhookId,
        (request as { organizationId: string }).organizationId
      );
      return { success: true, data: { webhook } };
    } catch (error) {
      if (error instanceof Error && error.message === 'Webhook not found') {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Webhook not found' },
        });
      }
      throw error;
    }
  });

  // PUT /:webhookId — Update webhook
  fastify.put<{ Params: { webhookId: string } }>('/:webhookId', async (request, reply) => {
    const parsed = updateWebhookSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: parsed.error.errors[0]?.message ?? 'Invalid input',
        },
      });
    }

    try {
      const webhook = await webhookService.updateWebhook(
        request.params.webhookId,
        (request as { organizationId: string }).organizationId,
        parsed.data
      );
      return { success: true, data: { webhook } };
    } catch (error) {
      if (error instanceof Error && error.message === 'Webhook not found') {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Webhook not found' },
        });
      }
      throw error;
    }
  });

  // DELETE /:webhookId — Delete webhook
  fastify.delete<{ Params: { webhookId: string } }>('/:webhookId', async (request, reply) => {
    try {
      await webhookService.deleteWebhook(
        request.params.webhookId,
        (request as { organizationId: string }).organizationId
      );
      return { success: true };
    } catch (error) {
      if (error instanceof Error && error.message === 'Webhook not found') {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Webhook not found' },
        });
      }
      throw error;
    }
  });

  // POST /:webhookId/test — Send test event
  fastify.post<{ Params: { webhookId: string } }>('/:webhookId/test', async (request, reply) => {
    try {
      const delivery = await deliveryService.testWebhook(
        request.params.webhookId,
        (request as { organizationId: string }).organizationId
      );
      return { success: true, data: { delivery } };
    } catch (error) {
      if (error instanceof Error && error.message === 'Webhook not found') {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Webhook not found' },
        });
      }
      throw error;
    }
  });

  // GET /:webhookId/deliveries — List delivery log
  fastify.get<{
    Params: { webhookId: string };
    Querystring: { limit?: string; offset?: string };
  }>('/:webhookId/deliveries', async (request, reply) => {
    const parsed = paginationSchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid pagination parameters' },
      });
    }
    const { limit, offset } = parsed.data;

    try {
      const result = await deliveryService.listDeliveries(
        request.params.webhookId,
        (request as { organizationId: string }).organizationId,
        limit,
        offset
      );
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      if (error instanceof Error && error.message === 'Webhook not found') {
        return reply.status(404).send({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Webhook not found' },
        });
      }
      throw error;
    }
  });
}
