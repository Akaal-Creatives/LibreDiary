import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import * as automationService from './automation.service.js';
import { requireAuth } from '../auth/auth.middleware.js';
import { requireOrgAccess } from '../organizations/organizations.middleware.js';
import { getAuthUser, mapServiceError, type ErrorMap } from '../../utils/errors.js';
import {
  createAutomationSchema,
  updateAutomationSchema,
} from '@librediary/shared/schemas';

// ===========================================
// PARAM TYPES
// ===========================================

interface OrgParams {
  orgId: string;
}

interface DatabaseParams extends OrgParams {
  databaseId: string;
}

interface AutomationParams extends DatabaseParams {
  automationId: string;
}

// ===========================================
// QUERY SCHEMAS
// ===========================================

const logsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

// ===========================================
// ERROR MAP
// ===========================================

const errorMap: ErrorMap = {
  DATABASE_NOT_FOUND: { status: 404, code: 'DATABASE_NOT_FOUND', message: 'Database not found' },
  AUTOMATION_NOT_FOUND: {
    status: 404,
    code: 'AUTOMATION_NOT_FOUND',
    message: 'Automation not found',
  },
  AUTOMATION_LIMIT_REACHED: {
    status: 422,
    code: 'AUTOMATION_LIMIT_REACHED',
    message: 'Database has reached the maximum number of automations (50)',
  },
};

// ===========================================
// ROUTES
// ===========================================

export async function automationsRoutes(fastify: FastifyInstance) {
  // List automations
  fastify.get(
    '/:databaseId/automations',
    { preHandler: [requireAuth, requireOrgAccess] },
    async (
      req: FastifyRequest<{ Params: DatabaseParams }>,
      reply: FastifyReply
    ) => {
      try {
        const { orgId, databaseId } = req.params;
        const automations = await automationService.listAutomations(orgId, databaseId);
        return reply.send({ success: true, data: automations });
      } catch (err) {
        return mapServiceError(reply, err, errorMap);
      }
    }
  );

  // Create automation
  fastify.post(
    '/:databaseId/automations',
    { preHandler: [requireAuth, requireOrgAccess] },
    async (
      req: FastifyRequest<{ Params: DatabaseParams; Body: unknown }>,
      reply: FastifyReply
    ) => {
      try {
        const { orgId, databaseId } = req.params;
        const user = getAuthUser(req);
        const body = createAutomationSchema.parse(req.body);
        const automation = await automationService.createAutomation(
          orgId,
          databaseId,
          body,
          user.id
        );
        return reply.status(201).send({ success: true, data: automation });
      } catch (err) {
        return mapServiceError(reply, err, errorMap);
      }
    }
  );

  // Update automation
  fastify.patch(
    '/:databaseId/automations/:automationId',
    { preHandler: [requireAuth, requireOrgAccess] },
    async (
      req: FastifyRequest<{ Params: AutomationParams; Body: unknown }>,
      reply: FastifyReply
    ) => {
      try {
        const { orgId, automationId } = req.params;
        const user = getAuthUser(req);
        const body = updateAutomationSchema.parse(req.body);
        const automation = await automationService.updateAutomation(
          orgId,
          automationId,
          body,
          user.id
        );
        return reply.send({ success: true, data: automation });
      } catch (err) {
        return mapServiceError(reply, err, errorMap);
      }
    }
  );

  // Delete automation
  fastify.delete(
    '/:databaseId/automations/:automationId',
    { preHandler: [requireAuth, requireOrgAccess] },
    async (
      req: FastifyRequest<{ Params: AutomationParams }>,
      reply: FastifyReply
    ) => {
      try {
        const { orgId, automationId } = req.params;
        const user = getAuthUser(req);
        await automationService.deleteAutomation(orgId, automationId, user.id);
        return reply.status(204).send();
      } catch (err) {
        return mapServiceError(reply, err, errorMap);
      }
    }
  );

  // Get automation logs
  fastify.get(
    '/:databaseId/automations/:automationId/logs',
    { preHandler: [requireAuth, requireOrgAccess] },
    async (
      req: FastifyRequest<{ Params: AutomationParams; Querystring: unknown }>,
      reply: FastifyReply
    ) => {
      try {
        const { orgId, automationId } = req.params;
        const { limit } = logsQuerySchema.parse(req.query);
        const logs = await automationService.getAutomationLogs(orgId, automationId, limit);
        return reply.send({ success: true, data: logs });
      } catch (err) {
        return mapServiceError(reply, err, errorMap);
      }
    }
  );
}
