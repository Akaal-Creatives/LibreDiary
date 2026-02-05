import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import * as permissionsService from './permissions.service.js';
import { requireOrgAccess } from '../organizations/organizations.middleware.js';
import { requireAuth } from '../auth/auth.middleware.js';

// ===========================================
// REQUEST SCHEMAS
// ===========================================

const grantPermissionSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  level: z.enum(['VIEW', 'EDIT', 'FULL_ACCESS']),
});

const updatePermissionSchema = z.object({
  level: z.enum(['VIEW', 'EDIT', 'FULL_ACCESS']),
});

const createShareLinkSchema = z.object({
  level: z.enum(['VIEW', 'EDIT', 'FULL_ACCESS']).default('VIEW'),
  expiresAt: z.string().datetime().optional(),
});

// ===========================================
// TYPE DEFINITIONS
// ===========================================

interface OrgPageParams {
  orgId: string;
  pageId: string;
}

interface PermissionParams extends OrgPageParams {
  permissionId: string;
}

// ===========================================
// ERROR RESPONSE HELPER
// ===========================================

function mapServiceError(error: unknown, reply: FastifyReply): FastifyReply {
  const message = error instanceof Error ? error.message : 'Unknown error';

  const errorMap: Record<string, { status: number; code: string; message: string }> = {
    PAGE_NOT_FOUND: {
      status: 404,
      code: 'PAGE_NOT_FOUND',
      message: 'Page not found',
    },
    PERMISSION_NOT_FOUND: {
      status: 404,
      code: 'PERMISSION_NOT_FOUND',
      message: 'Permission not found',
    },
    PERMISSION_EXISTS: {
      status: 400,
      code: 'PERMISSION_EXISTS',
      message: 'User already has permission for this page',
    },
    SHARE_LINK_NOT_FOUND: {
      status: 404,
      code: 'SHARE_LINK_NOT_FOUND',
      message: 'Share link not found',
    },
    ACCESS_DENIED: {
      status: 403,
      code: 'ACCESS_DENIED',
      message: 'You do not have permission to perform this action',
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
// PERMISSION ROUTES
// ===========================================

export default async function permissionsRoutes(fastify: FastifyInstance): Promise<void> {
  // All routes require authentication and org access
  fastify.addHook('preHandler', requireAuth);
  fastify.addHook('preHandler', requireOrgAccess);

  /**
   * GET /organizations/:orgId/pages/:pageId/permissions
   * List all permissions for a page
   */
  fastify.get<{ Params: OrgPageParams }>(
    '/',
    async (request: FastifyRequest<{ Params: OrgPageParams }>, reply: FastifyReply) => {
      try {
        const permissions = await permissionsService.listPagePermissions(request.params.pageId);

        return {
          success: true,
          data: { permissions },
        };
      } catch (error) {
        return mapServiceError(error, reply);
      }
    }
  );

  /**
   * POST /organizations/:orgId/pages/:pageId/permissions
   * Grant permission to a user
   */
  fastify.post<{ Params: OrgPageParams }>(
    '/',
    async (request: FastifyRequest<{ Params: OrgPageParams }>, reply: FastifyReply) => {
      const body = grantPermissionSchema.safeParse(request.body);
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
        const permission = await permissionsService.grantPermission(
          request.params.pageId,
          body.data.userId,
          body.data.level,
          request.user!.id
        );

        return reply.status(201).send({
          success: true,
          data: { permission },
        });
      } catch (error) {
        return mapServiceError(error, reply);
      }
    }
  );

  /**
   * PATCH /organizations/:orgId/pages/:pageId/permissions/:permissionId
   * Update permission level
   */
  fastify.patch<{ Params: PermissionParams }>(
    '/:permissionId',
    async (request: FastifyRequest<{ Params: PermissionParams }>, reply: FastifyReply) => {
      const body = updatePermissionSchema.safeParse(request.body);
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
        const permission = await permissionsService.updatePermissionLevel(
          request.params.permissionId,
          body.data.level
        );

        return {
          success: true,
          data: { permission },
        };
      } catch (error) {
        return mapServiceError(error, reply);
      }
    }
  );

  /**
   * DELETE /organizations/:orgId/pages/:pageId/permissions/:permissionId
   * Revoke a permission
   */
  fastify.delete<{ Params: PermissionParams }>(
    '/:permissionId',
    async (request: FastifyRequest<{ Params: PermissionParams }>, reply: FastifyReply) => {
      try {
        await permissionsService.revokePermission(request.params.permissionId);

        return {
          success: true,
          data: { message: 'Permission revoked' },
        };
      } catch (error) {
        return mapServiceError(error, reply);
      }
    }
  );

  // ===========================================
  // SHARE LINK ROUTES
  // ===========================================

  /**
   * POST /organizations/:orgId/pages/:pageId/permissions/share-link
   * Create a share link
   */
  fastify.post<{ Params: OrgPageParams }>(
    '/share-link',
    async (request: FastifyRequest<{ Params: OrgPageParams }>, reply: FastifyReply) => {
      const body = createShareLinkSchema.safeParse(request.body);
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
        const expiresAt = body.data.expiresAt ? new Date(body.data.expiresAt) : undefined;

        const shareLink = await permissionsService.createShareLink(
          request.params.pageId,
          body.data.level,
          request.user!.id,
          expiresAt
        );

        return reply.status(201).send({
          success: true,
          data: { shareLink },
        });
      } catch (error) {
        return mapServiceError(error, reply);
      }
    }
  );

  /**
   * GET /organizations/:orgId/pages/:pageId/permissions/share-links
   * List all share links for a page
   */
  fastify.get<{ Params: OrgPageParams }>(
    '/share-links',
    async (request: FastifyRequest<{ Params: OrgPageParams }>, _reply: FastifyReply) => {
      const shareLinks = await permissionsService.listShareLinks(request.params.pageId);

      return {
        success: true,
        data: { shareLinks },
      };
    }
  );

  /**
   * DELETE /organizations/:orgId/pages/:pageId/permissions/share-link/:permissionId
   * Delete a share link
   */
  fastify.delete<{ Params: PermissionParams }>(
    '/share-link/:permissionId',
    async (request: FastifyRequest<{ Params: PermissionParams }>, reply: FastifyReply) => {
      try {
        await permissionsService.deleteShareLink(request.params.permissionId);

        return {
          success: true,
          data: { message: 'Share link deleted' },
        };
      } catch (error) {
        return mapServiceError(error, reply);
      }
    }
  );
}
