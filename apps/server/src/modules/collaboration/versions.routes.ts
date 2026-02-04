import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import * as versionsService from './versions.service.js';
import { requireAuth } from '../auth/auth.middleware.js';
import { requireOrgAccess } from '../organizations/organizations.middleware.js';

// Request types
interface VersionParams {
  orgId: string;
  pageId: string;
  versionId?: string;
}

// Error code to HTTP status mapping
const errorStatusMap: Record<string, number> = {
  PAGE_NOT_FOUND: 404,
  VERSION_NOT_FOUND: 404,
  PAGE_IN_TRASH: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
};

function getErrorStatus(error: Error): number {
  return errorStatusMap[error.message] || 500;
}

export default async function versionsRoutes(fastify: FastifyInstance) {
  // Add authentication and org access hooks
  fastify.addHook('preHandler', requireAuth);
  fastify.addHook('preHandler', requireOrgAccess);

  /**
   * GET /api/v1/organizations/:orgId/pages/:pageId/versions
   * Get all versions for a page
   */
  fastify.get(
    '/',
    async (request: FastifyRequest<{ Params: VersionParams }>, reply: FastifyReply) => {
      const { orgId, pageId } = request.params;

      try {
        const versions = await versionsService.getVersions(orgId, pageId);
        return reply.send(versions);
      } catch (error) {
        const status = getErrorStatus(error as Error);
        return reply.status(status).send({
          error: (error as Error).message,
        });
      }
    }
  );

  /**
   * GET /api/v1/organizations/:orgId/pages/:pageId/versions/:versionId
   * Get a specific version
   */
  fastify.get(
    '/:versionId',
    async (request: FastifyRequest<{ Params: VersionParams }>, reply: FastifyReply) => {
      const { orgId, pageId, versionId } = request.params;

      try {
        const version = await versionsService.getVersion(orgId, pageId, versionId!);

        if (!version) {
          return reply.status(404).send({
            error: 'VERSION_NOT_FOUND',
          });
        }

        return reply.send(version);
      } catch (error) {
        const status = getErrorStatus(error as Error);
        return reply.status(status).send({
          error: (error as Error).message,
        });
      }
    }
  );

  /**
   * POST /api/v1/organizations/:orgId/pages/:pageId/versions
   * Create a new version snapshot
   */
  fastify.post(
    '/',
    async (request: FastifyRequest<{ Params: VersionParams }>, reply: FastifyReply) => {
      const { orgId, pageId } = request.params;
      const userId = request.user!.id;

      try {
        const version = await versionsService.createVersion(orgId, pageId, userId);
        return reply.status(201).send(version);
      } catch (error) {
        const status = getErrorStatus(error as Error);
        return reply.status(status).send({
          error: (error as Error).message,
        });
      }
    }
  );

  /**
   * POST /api/v1/organizations/:orgId/pages/:pageId/versions/:versionId/restore
   * Restore a page to a specific version
   */
  fastify.post(
    '/:versionId/restore',
    async (request: FastifyRequest<{ Params: VersionParams }>, reply: FastifyReply) => {
      const { orgId, pageId, versionId } = request.params;
      const userId = request.user!.id;

      try {
        const page = await versionsService.restoreVersion(orgId, pageId, versionId!, userId);
        return reply.send(page);
      } catch (error) {
        const status = getErrorStatus(error as Error);
        return reply.status(status).send({
          error: (error as Error).message,
        });
      }
    }
  );
}
