import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import * as templatesService from './templates.service.js';
import { requireAuth } from '../auth/auth.middleware.js';
import { requireOrgAccess } from '../organizations/organizations.middleware.js';
import { mapServiceError, type ErrorMap } from '../../utils/errors.js';

// ===========================================
// REQUEST SCHEMAS
// ===========================================

const createTemplateSchema = z.object({
  name: z.string().min(1).max(200).trim(),
  description: z.string().max(1000).optional(),
  icon: z.string().max(50).optional(),
  category: z.string().max(50).optional(),
});

const createFromPageSchema = z.object({
  pageId: z.string().min(1),
  name: z.string().min(1).max(200).trim().optional(),
  description: z.string().max(1000).optional(),
  icon: z.string().max(50).optional(),
  category: z.string().max(50).optional(),
});

const updateTemplateSchema = z.object({
  name: z.string().min(1).max(200).trim().optional(),
  description: z.string().max(1000).nullable().optional(),
  icon: z.string().max(50).nullable().optional(),
  category: z.string().max(50).nullable().optional(),
});

const useTemplateSchema = z.object({
  title: z.string().max(500).optional(),
  parentId: z.string().nullable().optional(),
});

// ===========================================
// TYPE DEFINITIONS
// ===========================================

interface OrgParams {
  orgId: string;
}

interface TemplateParams extends OrgParams {
  templateId: string;
}

interface ListQuery {
  category?: string;
  search?: string;
}

// ===========================================
// ERROR MAP
// ===========================================

const errorMap: ErrorMap = {
  TEMPLATE_NOT_FOUND: {
    status: 404,
    code: 'TEMPLATE_NOT_FOUND',
    message: 'Template not found',
  },
  PAGE_NOT_FOUND: {
    status: 404,
    code: 'PAGE_NOT_FOUND',
    message: 'Page not found',
  },
  CANNOT_DELETE_BUILTIN: {
    status: 400,
    code: 'CANNOT_DELETE_BUILTIN',
    message: 'Cannot delete a built-in template',
  },
};

// ===========================================
// TEMPLATE ROUTES
// ===========================================

export async function templatesRoutes(fastify: FastifyInstance): Promise<void> {
  // All routes require authentication and org access
  fastify.addHook('preHandler', requireAuth);
  fastify.addHook('preHandler', requireOrgAccess);

  // --- Create template ---

  fastify.post<{ Params: OrgParams }>(
    '/',
    async (request: FastifyRequest<{ Params: OrgParams }>, reply: FastifyReply) => {
      const body = createTemplateSchema.safeParse(request.body);
      if (!body.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request body',
            details: body.error.flatten().fieldErrors,
          },
        });
      }

      try {
        const template = await templatesService.createTemplate(
          request.params.orgId,
          request.user!.id,
          body.data
        );

        return reply.status(201).send({
          success: true,
          data: { template },
        });
      } catch (error) {
        return mapServiceError(error, reply, errorMap);
      }
    }
  );

  // --- Create template from page ---

  fastify.post<{ Params: OrgParams }>(
    '/from-page',
    async (request: FastifyRequest<{ Params: OrgParams }>, reply: FastifyReply) => {
      const body = createFromPageSchema.safeParse(request.body);
      if (!body.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request body',
            details: body.error.flatten().fieldErrors,
          },
        });
      }

      try {
        const { pageId, ...input } = body.data;
        const template = await templatesService.createTemplateFromPage(
          request.params.orgId,
          request.user!.id,
          pageId,
          Object.keys(input).length > 0 ? input : undefined
        );

        return reply.status(201).send({
          success: true,
          data: { template },
        });
      } catch (error) {
        return mapServiceError(error, reply, errorMap);
      }
    }
  );

  // --- List templates ---

  fastify.get<{ Params: OrgParams; Querystring: ListQuery }>(
    '/',
    async (request: FastifyRequest<{ Params: OrgParams; Querystring: ListQuery }>) => {
      const { category, search } = request.query;
      const templates = await templatesService.getTemplates(request.params.orgId, {
        category,
        search,
      });

      return {
        success: true,
        data: { templates },
      };
    }
  );

  // --- Get single template ---

  fastify.get<{ Params: TemplateParams }>(
    '/:templateId',
    async (request: FastifyRequest<{ Params: TemplateParams }>, reply: FastifyReply) => {
      try {
        const template = await templatesService.getTemplate(
          request.params.orgId,
          request.params.templateId
        );

        return {
          success: true,
          data: { template },
        };
      } catch (error) {
        return mapServiceError(error, reply, errorMap);
      }
    }
  );

  // --- Update template ---

  fastify.patch<{ Params: TemplateParams }>(
    '/:templateId',
    async (request: FastifyRequest<{ Params: TemplateParams }>, reply: FastifyReply) => {
      const body = updateTemplateSchema.safeParse(request.body);
      if (!body.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request body',
            details: body.error.flatten().fieldErrors,
          },
        });
      }

      try {
        const template = await templatesService.updateTemplate(
          request.params.orgId,
          request.params.templateId,
          body.data
        );

        return {
          success: true,
          data: { template },
        };
      } catch (error) {
        return mapServiceError(error, reply, errorMap);
      }
    }
  );

  // --- Delete template ---

  fastify.delete<{ Params: TemplateParams }>(
    '/:templateId',
    async (request: FastifyRequest<{ Params: TemplateParams }>, reply: FastifyReply) => {
      try {
        await templatesService.deleteTemplate(request.params.orgId, request.params.templateId);

        return {
          success: true,
          data: { message: 'Template deleted' },
        };
      } catch (error) {
        return mapServiceError(error, reply, errorMap);
      }
    }
  );

  // --- Create page from template ---

  fastify.post<{ Params: TemplateParams }>(
    '/:templateId/use',
    async (request: FastifyRequest<{ Params: TemplateParams }>, reply: FastifyReply) => {
      const body = useTemplateSchema.safeParse(request.body);
      if (!body.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request body',
            details: body.error.flatten().fieldErrors,
          },
        });
      }

      try {
        const page = await templatesService.createPageFromTemplate(
          request.params.orgId,
          request.user!.id,
          request.params.templateId,
          body.data
        );

        return reply.status(201).send({
          success: true,
          data: { page },
        });
      } catch (error) {
        return mapServiceError(error, reply, errorMap);
      }
    }
  );
}
