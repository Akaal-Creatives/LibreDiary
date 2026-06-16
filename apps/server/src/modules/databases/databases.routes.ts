import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import * as databasesService from './databases.service.js';
import * as recurrenceService from './recurrence.service.js';
import { requireAuth } from '../auth/auth.middleware.js';
import { requireOrgAccess } from '../organizations/organizations.middleware.js';
import { getAuthUser, mapServiceError, type ErrorMap } from '../../utils/errors.js';
import {
  createPropertySchema,
  updatePropertySchema,
  createViewSchema,
  updateViewSchema,
  createRowSchema,
  updateRowSchema,
  reorderSchema,
  validatePropertyConfig,
} from '@librediary/shared/schemas';

// ===========================================
// REQUEST SCHEMAS
// ===========================================

const createDatabaseSchema = z.object({
  name: z.string().min(1).max(200).trim(),
  pageId: z.string().optional(),
});

const updateDatabaseSchema = z.object({
  name: z.string().min(1).max(200).trim().optional(),
  pageId: z.string().nullable().optional(),
});

const bulkDeleteSchema = z.object({
  rowIds: z.array(z.string().min(1)).min(1),
});

const setRecurrenceSchema = z.object({
  recurrenceRule: z.string().min(1).max(500),
});

const setRecurrenceStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'PAUSED', 'CANCELLED']),
});

// ===========================================
// TYPE DEFINITIONS
// ===========================================

interface OrgParams {
  orgId: string;
}

interface DatabaseParams extends OrgParams {
  databaseId: string;
}

interface PropertyParams extends DatabaseParams {
  propertyId: string;
}

interface RowParams extends DatabaseParams {
  rowId: string;
}

interface ViewParams extends DatabaseParams {
  viewId: string;
}

// ===========================================
// ERROR MAP
// ===========================================

const errorMap: ErrorMap = {
  DATABASE_NOT_FOUND: {
    status: 404,
    code: 'DATABASE_NOT_FOUND',
    message: 'Database not found',
  },
  PROPERTY_NOT_FOUND: {
    status: 404,
    code: 'PROPERTY_NOT_FOUND',
    message: 'Property not found',
  },
  ROW_NOT_FOUND: {
    status: 404,
    code: 'ROW_NOT_FOUND',
    message: 'Row not found',
  },
  VIEW_NOT_FOUND: {
    status: 404,
    code: 'VIEW_NOT_FOUND',
    message: 'View not found',
  },
  CANNOT_DELETE_TITLE_PROPERTY: {
    status: 400,
    code: 'CANNOT_DELETE_TITLE_PROPERTY',
    message: 'Cannot delete the Title property',
  },
  CANNOT_DELETE_LAST_VIEW: {
    status: 400,
    code: 'CANNOT_DELETE_LAST_VIEW',
    message: 'Cannot delete the last remaining view',
  },
  INVALID_RECURRENCE_RULE: {
    status: 400,
    code: 'INVALID_RECURRENCE_RULE',
    message: 'Invalid recurrence rule — use FREQ=DAILY|WEEKLY|MONTHLY|YEARLY with optional INTERVAL=n',
  },
  ROW_NOT_RECURRING: {
    status: 400,
    code: 'ROW_NOT_RECURRING',
    message: 'Row does not have an active recurrence rule',
  },
};

// ===========================================
// DATABASE ROUTES
// ===========================================

export async function databasesRoutes(fastify: FastifyInstance): Promise<void> {
  // All routes require authentication and org access
  fastify.addHook('preHandler', requireAuth);
  fastify.addHook('preHandler', requireOrgAccess);

  // --- Database CRUD ---

  fastify.post<{ Params: OrgParams }>(
    '/',
    async (request: FastifyRequest<{ Params: OrgParams }>, reply: FastifyReply) => {
      const body = createDatabaseSchema.safeParse(request.body);
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
        const database = await databasesService.createDatabase(
          request.params.orgId,
          getAuthUser(request).id,
          body.data
        );

        return reply.status(201).send({
          success: true,
          data: { database },
        });
      } catch (error) {
        return mapServiceError(error, reply, errorMap);
      }
    }
  );

  fastify.get<{ Params: OrgParams }>(
    '/',
    async (request: FastifyRequest<{ Params: OrgParams }>) => {
      const databases = await databasesService.listDatabases(request.params.orgId);
      return {
        success: true,
        data: { databases },
      };
    }
  );

  fastify.get<{ Params: DatabaseParams }>(
    '/:databaseId',
    async (request: FastifyRequest<{ Params: DatabaseParams }>, reply: FastifyReply) => {
      try {
        const database = await databasesService.getDatabase(
          request.params.orgId,
          request.params.databaseId
        );
        return {
          success: true,
          data: { database },
        };
      } catch (error) {
        return mapServiceError(error, reply, errorMap);
      }
    }
  );

  fastify.patch<{ Params: DatabaseParams }>(
    '/:databaseId',
    async (request: FastifyRequest<{ Params: DatabaseParams }>, reply: FastifyReply) => {
      const body = updateDatabaseSchema.safeParse(request.body);
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
        const database = await databasesService.updateDatabase(
          request.params.orgId,
          request.params.databaseId,
          body.data
        );
        return {
          success: true,
          data: { database },
        };
      } catch (error) {
        return mapServiceError(error, reply, errorMap);
      }
    }
  );

  fastify.delete<{ Params: DatabaseParams }>(
    '/:databaseId',
    async (request: FastifyRequest<{ Params: DatabaseParams }>, reply: FastifyReply) => {
      try {
        await databasesService.deleteDatabase(request.params.orgId, request.params.databaseId);
        return {
          success: true,
          data: { message: 'Database deleted' },
        };
      } catch (error) {
        return mapServiceError(error, reply, errorMap);
      }
    }
  );

  // --- Property Management ---

  fastify.post<{ Params: DatabaseParams }>(
    '/:databaseId/properties',
    async (request: FastifyRequest<{ Params: DatabaseParams }>, reply: FastifyReply) => {
      const body = createPropertySchema.safeParse(request.body);
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

      // Validate config against the property type schema
      if (body.data.config != null) {
        try {
          body.data.config =
            validatePropertyConfig(body.data.type, body.data.config) ?? body.data.config;
        } catch (configError) {
          return reply.status(400).send({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid property config',
              details: configError instanceof z.ZodError ? configError.flatten().fieldErrors : {},
            },
          });
        }
      }

      try {
        const property = await databasesService.createProperty(
          request.params.orgId,
          request.params.databaseId,
          body.data
        );
        return reply.status(201).send({
          success: true,
          data: { property },
        });
      } catch (error) {
        return mapServiceError(error, reply, errorMap);
      }
    }
  );

  fastify.patch<{ Params: PropertyParams }>(
    '/:databaseId/properties/:propertyId',
    async (request: FastifyRequest<{ Params: PropertyParams }>, reply: FastifyReply) => {
      const body = updatePropertySchema.safeParse(request.body);
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

      // Validate config against the property type when both are provided
      if (body.data.config != null && body.data.type) {
        try {
          body.data.config =
            validatePropertyConfig(body.data.type, body.data.config) ?? body.data.config;
        } catch (configError) {
          return reply.status(400).send({
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid property config',
              details: configError instanceof z.ZodError ? configError.flatten().fieldErrors : {},
            },
          });
        }
      }

      try {
        const property = await databasesService.updateProperty(
          request.params.orgId,
          request.params.databaseId,
          request.params.propertyId,
          body.data
        );
        return {
          success: true,
          data: { property },
        };
      } catch (error) {
        return mapServiceError(error, reply, errorMap);
      }
    }
  );

  fastify.delete<{ Params: PropertyParams }>(
    '/:databaseId/properties/:propertyId',
    async (request: FastifyRequest<{ Params: PropertyParams }>, reply: FastifyReply) => {
      try {
        await databasesService.deleteProperty(
          request.params.orgId,
          request.params.databaseId,
          request.params.propertyId
        );
        return {
          success: true,
          data: { message: 'Property deleted' },
        };
      } catch (error) {
        return mapServiceError(error, reply, errorMap);
      }
    }
  );

  fastify.post<{ Params: DatabaseParams }>(
    '/:databaseId/properties/reorder',
    async (request: FastifyRequest<{ Params: DatabaseParams }>, reply: FastifyReply) => {
      const body = reorderSchema.safeParse(request.body);
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
        await databasesService.reorderProperties(
          request.params.orgId,
          request.params.databaseId,
          body.data.orderedIds
        );
        return {
          success: true,
          data: { message: 'Properties reordered' },
        };
      } catch (error) {
        return mapServiceError(error, reply, errorMap);
      }
    }
  );

  // --- Row CRUD ---

  fastify.post<{ Params: DatabaseParams }>(
    '/:databaseId/rows',
    async (request: FastifyRequest<{ Params: DatabaseParams }>, reply: FastifyReply) => {
      const body = createRowSchema.safeParse(request.body);
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
        const row = await databasesService.createRow(
          request.params.orgId,
          request.params.databaseId,
          getAuthUser(request).id,
          body.data
        );
        return reply.status(201).send({
          success: true,
          data: { row },
        });
      } catch (error) {
        return mapServiceError(error, reply, errorMap);
      }
    }
  );

  fastify.patch<{ Params: RowParams }>(
    '/:databaseId/rows/:rowId',
    async (request: FastifyRequest<{ Params: RowParams }>, reply: FastifyReply) => {
      const body = updateRowSchema.safeParse(request.body);
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
        const row = await databasesService.updateRow(
          request.params.orgId,
          request.params.databaseId,
          request.params.rowId,
          body.data
        );
        return {
          success: true,
          data: { row },
        };
      } catch (error) {
        return mapServiceError(error, reply, errorMap);
      }
    }
  );

  fastify.delete<{ Params: RowParams }>(
    '/:databaseId/rows/:rowId',
    async (request: FastifyRequest<{ Params: RowParams }>, reply: FastifyReply) => {
      try {
        await databasesService.deleteRow(
          request.params.orgId,
          request.params.databaseId,
          request.params.rowId
        );
        return {
          success: true,
          data: { message: 'Row deleted' },
        };
      } catch (error) {
        return mapServiceError(error, reply, errorMap);
      }
    }
  );

  fastify.post<{ Params: DatabaseParams }>(
    '/:databaseId/rows/reorder',
    async (request: FastifyRequest<{ Params: DatabaseParams }>, reply: FastifyReply) => {
      const body = reorderSchema.safeParse(request.body);
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
        await databasesService.reorderRows(
          request.params.orgId,
          request.params.databaseId,
          body.data.orderedIds
        );
        return {
          success: true,
          data: { message: 'Rows reordered' },
        };
      } catch (error) {
        return mapServiceError(error, reply, errorMap);
      }
    }
  );

  fastify.post<{ Params: DatabaseParams }>(
    '/:databaseId/rows/bulk-delete',
    async (request: FastifyRequest<{ Params: DatabaseParams }>, reply: FastifyReply) => {
      const body = bulkDeleteSchema.safeParse(request.body);
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
        const count = await databasesService.bulkDeleteRows(
          request.params.orgId,
          request.params.databaseId,
          body.data.rowIds
        );
        return {
          success: true,
          data: { count, message: `${count} rows deleted` },
        };
      } catch (error) {
        return mapServiceError(error, reply, errorMap);
      }
    }
  );

  // --- Recurrence ---

  fastify.patch<{ Params: RowParams }>(
    '/:databaseId/rows/:rowId/recurrence',
    async (request: FastifyRequest<{ Params: RowParams }>, reply: FastifyReply) => {
      const body = setRecurrenceSchema.safeParse(request.body);
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
        const row = await recurrenceService.setRecurrenceRule(
          request.params.orgId,
          request.params.databaseId,
          request.params.rowId,
          body.data,
          getAuthUser(request).id
        );
        return { success: true, data: { row } };
      } catch (error) {
        return mapServiceError(error, reply, errorMap);
      }
    }
  );

  fastify.post<{ Params: RowParams }>(
    '/:databaseId/rows/:rowId/recurrence/skip',
    async (request: FastifyRequest<{ Params: RowParams }>, reply: FastifyReply) => {
      try {
        const row = await recurrenceService.skipOccurrence(
          request.params.orgId,
          request.params.databaseId,
          request.params.rowId,
          getAuthUser(request).id
        );
        return { success: true, data: { row } };
      } catch (error) {
        return mapServiceError(error, reply, errorMap);
      }
    }
  );

  fastify.patch<{ Params: RowParams }>(
    '/:databaseId/rows/:rowId/recurrence/status',
    async (request: FastifyRequest<{ Params: RowParams }>, reply: FastifyReply) => {
      const body = setRecurrenceStatusSchema.safeParse(request.body);
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
        const row = await recurrenceService.setRecurrenceStatus(
          request.params.orgId,
          request.params.databaseId,
          request.params.rowId,
          body.data.status,
          getAuthUser(request).id
        );
        return { success: true, data: { row } };
      } catch (error) {
        return mapServiceError(error, reply, errorMap);
      }
    }
  );

  // --- View Management ---

  fastify.post<{ Params: DatabaseParams }>(
    '/:databaseId/views',
    async (request: FastifyRequest<{ Params: DatabaseParams }>, reply: FastifyReply) => {
      const body = createViewSchema.safeParse(request.body);
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
        const view = await databasesService.createView(
          request.params.orgId,
          request.params.databaseId,
          body.data
        );
        return reply.status(201).send({
          success: true,
          data: { view },
        });
      } catch (error) {
        return mapServiceError(error, reply, errorMap);
      }
    }
  );

  fastify.patch<{ Params: ViewParams }>(
    '/:databaseId/views/:viewId',
    async (request: FastifyRequest<{ Params: ViewParams }>, reply: FastifyReply) => {
      const body = updateViewSchema.safeParse(request.body);
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
        const view = await databasesService.updateView(
          request.params.orgId,
          request.params.databaseId,
          request.params.viewId,
          body.data
        );
        return {
          success: true,
          data: { view },
        };
      } catch (error) {
        return mapServiceError(error, reply, errorMap);
      }
    }
  );

  fastify.delete<{ Params: ViewParams }>(
    '/:databaseId/views/:viewId',
    async (request: FastifyRequest<{ Params: ViewParams }>, reply: FastifyReply) => {
      try {
        await databasesService.deleteView(
          request.params.orgId,
          request.params.databaseId,
          request.params.viewId
        );
        return {
          success: true,
          data: { message: 'View deleted' },
        };
      } catch (error) {
        return mapServiceError(error, reply, errorMap);
      }
    }
  );

  fastify.post<{ Params: DatabaseParams }>(
    '/:databaseId/views/reorder',
    async (request: FastifyRequest<{ Params: DatabaseParams }>, reply: FastifyReply) => {
      const body = reorderSchema.safeParse(request.body);
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
        await databasesService.reorderViews(
          request.params.orgId,
          request.params.databaseId,
          body.data.orderedIds
        );
        return {
          success: true,
          data: { message: 'Views reordered' },
        };
      } catch (error) {
        return mapServiceError(error, reply, errorMap);
      }
    }
  );
}
