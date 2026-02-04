import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import * as pagesService from './pages.service.js';
import { requireOrgAccess } from '../organizations/organizations.middleware.js';
import { requireAuth } from '../auth/auth.middleware.js';

// ===========================================
// REQUEST SCHEMAS
// ===========================================

const createPageSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  parentId: z.string().nullish(),
  icon: z.string().max(50).nullish(),
});

const updatePageSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  icon: z.string().max(50).nullish(),
  coverUrl: z.string().url().nullish(),
  isPublic: z.boolean().optional(),
  publicSlug: z
    .string()
    .min(3)
    .max(100)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens')
    .nullish(),
});

const movePageSchema = z.object({
  parentId: z.string().nullish(),
  position: z.number().int().min(0).optional(),
});

const reorderFavoritesSchema = z.object({
  orderedIds: z.array(z.string()).min(1),
});

// ===========================================
// TYPE DEFINITIONS
// ===========================================

interface OrgParams {
  orgId: string;
}

interface PageParams extends OrgParams {
  pageId: string;
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
    PAGE_IN_TRASH: {
      status: 400,
      code: 'PAGE_IN_TRASH',
      message: 'Cannot perform this operation on a trashed page',
    },
    PAGE_NOT_IN_TRASH: {
      status: 400,
      code: 'PAGE_NOT_IN_TRASH',
      message: 'Page is not in trash',
    },
    PAGE_ALREADY_IN_TRASH: {
      status: 400,
      code: 'PAGE_ALREADY_IN_TRASH',
      message: 'Page is already in trash',
    },
    INVALID_PARENT: {
      status: 400,
      code: 'INVALID_PARENT',
      message: 'Invalid parent page (cannot set page as its own parent or descendant)',
    },
    SLUG_ALREADY_EXISTS: {
      status: 400,
      code: 'SLUG_ALREADY_EXISTS',
      message: 'This public slug is already in use',
    },
    FAVORITE_EXISTS: {
      status: 400,
      code: 'FAVORITE_EXISTS',
      message: 'Page is already in favorites',
    },
    FAVORITE_NOT_FOUND: {
      status: 404,
      code: 'FAVORITE_NOT_FOUND',
      message: 'Favorite not found',
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
// PAGE ROUTES (registered under /organizations/:orgId/pages)
// ===========================================

export async function pagesRoutes(fastify: FastifyInstance): Promise<void> {
  // All routes require authentication and org access
  fastify.addHook('preHandler', requireAuth);
  fastify.addHook('preHandler', requireOrgAccess);

  // ===========================================
  // PAGE CRUD
  // ===========================================

  /**
   * POST /organizations/:orgId/pages
   * Create a new page
   */
  fastify.post<{ Params: OrgParams }>(
    '/',
    async (request: FastifyRequest<{ Params: OrgParams }>, reply: FastifyReply) => {
      const body = createPageSchema.safeParse(request.body);
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
        const page = await pagesService.createPage(request.params.orgId, request.user!.id, {
          title: body.data.title,
          parentId: body.data.parentId ?? null,
          icon: body.data.icon ?? null,
        });

        return reply.status(201).send({
          success: true,
          data: { page },
        });
      } catch (error) {
        return mapServiceError(error, reply);
      }
    }
  );

  /**
   * GET /organizations/:orgId/pages
   * Get page tree
   */
  fastify.get<{ Params: OrgParams }>(
    '/',
    async (request: FastifyRequest<{ Params: OrgParams }>, _reply: FastifyReply) => {
      const pageTree = await pagesService.getPageTree(request.params.orgId);

      return {
        success: true,
        data: { pages: pageTree },
      };
    }
  );

  /**
   * GET /organizations/:orgId/pages/:pageId
   * Get a single page
   */
  fastify.get<{ Params: PageParams }>(
    '/:pageId',
    async (request: FastifyRequest<{ Params: PageParams }>, reply: FastifyReply) => {
      const page = await pagesService.getPage(request.params.orgId, request.params.pageId);

      if (!page) {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'PAGE_NOT_FOUND',
            message: 'Page not found',
          },
        });
      }

      return {
        success: true,
        data: { page },
      };
    }
  );

  /**
   * PATCH /organizations/:orgId/pages/:pageId
   * Update a page
   */
  fastify.patch<{ Params: PageParams }>(
    '/:pageId',
    async (request: FastifyRequest<{ Params: PageParams }>, reply: FastifyReply) => {
      const body = updatePageSchema.safeParse(request.body);
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
        const page = await pagesService.updatePage(
          request.params.orgId,
          request.params.pageId,
          request.user!.id,
          {
            title: body.data.title,
            icon: body.data.icon,
            coverUrl: body.data.coverUrl,
            isPublic: body.data.isPublic,
            publicSlug: body.data.publicSlug,
          }
        );

        return {
          success: true,
          data: { page },
        };
      } catch (error) {
        return mapServiceError(error, reply);
      }
    }
  );

  /**
   * DELETE /organizations/:orgId/pages/:pageId
   * Soft delete (trash) a page
   */
  fastify.delete<{ Params: PageParams }>(
    '/:pageId',
    async (request: FastifyRequest<{ Params: PageParams }>, reply: FastifyReply) => {
      try {
        await pagesService.trashPage(request.params.orgId, request.params.pageId);

        return {
          success: true,
          data: { message: 'Page moved to trash' },
        };
      } catch (error) {
        return mapServiceError(error, reply);
      }
    }
  );

  // ===========================================
  // HIERARCHY
  // ===========================================

  /**
   * POST /organizations/:orgId/pages/:pageId/move
   * Move a page to a new parent and/or position
   */
  fastify.post<{ Params: PageParams }>(
    '/:pageId/move',
    async (request: FastifyRequest<{ Params: PageParams }>, reply: FastifyReply) => {
      const body = movePageSchema.safeParse(request.body);
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
        const page = await pagesService.movePage(request.params.orgId, request.params.pageId, {
          parentId: body.data.parentId,
          position: body.data.position,
        });

        return {
          success: true,
          data: { page },
        };
      } catch (error) {
        return mapServiceError(error, reply);
      }
    }
  );

  /**
   * GET /organizations/:orgId/pages/:pageId/ancestors
   * Get page ancestors (for breadcrumbs)
   */
  fastify.get<{ Params: PageParams }>(
    '/:pageId/ancestors',
    async (request: FastifyRequest<{ Params: PageParams }>, reply: FastifyReply) => {
      try {
        const ancestors = await pagesService.getPageAncestors(
          request.params.orgId,
          request.params.pageId
        );

        return {
          success: true,
          data: { ancestors },
        };
      } catch (error) {
        return mapServiceError(error, reply);
      }
    }
  );

  /**
   * POST /organizations/:orgId/pages/:pageId/duplicate
   * Duplicate a page
   */
  fastify.post<{ Params: PageParams }>(
    '/:pageId/duplicate',
    async (request: FastifyRequest<{ Params: PageParams }>, reply: FastifyReply) => {
      try {
        const page = await pagesService.duplicatePage(
          request.params.orgId,
          request.params.pageId,
          request.user!.id
        );

        return reply.status(201).send({
          success: true,
          data: { page },
        });
      } catch (error) {
        return mapServiceError(error, reply);
      }
    }
  );

  // ===========================================
  // FAVORITES (on page resource)
  // ===========================================

  /**
   * POST /organizations/:orgId/pages/:pageId/favorite
   * Add page to favorites
   */
  fastify.post<{ Params: PageParams }>(
    '/:pageId/favorite',
    async (request: FastifyRequest<{ Params: PageParams }>, reply: FastifyReply) => {
      try {
        const favorite = await pagesService.addFavorite(
          request.user!.id,
          request.params.pageId,
          request.params.orgId
        );

        return reply.status(201).send({
          success: true,
          data: { favorite },
        });
      } catch (error) {
        return mapServiceError(error, reply);
      }
    }
  );

  /**
   * DELETE /organizations/:orgId/pages/:pageId/favorite
   * Remove page from favorites
   */
  fastify.delete<{ Params: PageParams }>(
    '/:pageId/favorite',
    async (request: FastifyRequest<{ Params: PageParams }>, reply: FastifyReply) => {
      try {
        await pagesService.removeFavorite(request.user!.id, request.params.pageId);

        return {
          success: true,
          data: { message: 'Removed from favorites' },
        };
      } catch (error) {
        return mapServiceError(error, reply);
      }
    }
  );

  // ===========================================
  // RESTORE (page in trash)
  // ===========================================

  /**
   * POST /organizations/:orgId/pages/:pageId/restore
   * Restore a page from trash
   */
  fastify.post<{ Params: PageParams }>(
    '/:pageId/restore',
    async (request: FastifyRequest<{ Params: PageParams }>, reply: FastifyReply) => {
      try {
        const page = await pagesService.restorePage(request.params.orgId, request.params.pageId);

        return {
          success: true,
          data: { page },
        };
      } catch (error) {
        return mapServiceError(error, reply);
      }
    }
  );
}

// ===========================================
// TRASH ROUTES (registered under /organizations/:orgId/trash)
// ===========================================

export async function trashRoutes(fastify: FastifyInstance): Promise<void> {
  // All routes require authentication and org access
  fastify.addHook('preHandler', requireAuth);
  fastify.addHook('preHandler', requireOrgAccess);

  /**
   * GET /organizations/:orgId/trash
   * List trashed pages
   */
  fastify.get<{ Params: OrgParams }>(
    '/',
    async (request: FastifyRequest<{ Params: OrgParams }>, _reply: FastifyReply) => {
      const pages = await pagesService.getTrashedPages(request.params.orgId);

      return {
        success: true,
        data: { pages },
      };
    }
  );

  /**
   * DELETE /organizations/:orgId/trash/:pageId
   * Permanently delete a page
   */
  fastify.delete<{ Params: PageParams }>(
    '/:pageId',
    async (request: FastifyRequest<{ Params: PageParams }>, reply: FastifyReply) => {
      try {
        await pagesService.permanentlyDeletePage(request.params.orgId, request.params.pageId);

        return {
          success: true,
          data: { message: 'Page permanently deleted' },
        };
      } catch (error) {
        return mapServiceError(error, reply);
      }
    }
  );
}

// ===========================================
// FAVORITES ROUTES (registered under /organizations/:orgId/favorites)
// ===========================================

export async function favoritesRoutes(fastify: FastifyInstance): Promise<void> {
  // All routes require authentication and org access
  fastify.addHook('preHandler', requireAuth);
  fastify.addHook('preHandler', requireOrgAccess);

  /**
   * GET /organizations/:orgId/favorites
   * Get user's favorites
   */
  fastify.get<{ Params: OrgParams }>(
    '/',
    async (request: FastifyRequest<{ Params: OrgParams }>, _reply: FastifyReply) => {
      const favorites = await pagesService.getUserFavorites(request.params.orgId, request.user!.id);

      return {
        success: true,
        data: { favorites },
      };
    }
  );

  /**
   * PATCH /organizations/:orgId/favorites/reorder
   * Reorder favorites
   */
  fastify.patch<{ Params: OrgParams }>(
    '/reorder',
    async (request: FastifyRequest<{ Params: OrgParams }>, reply: FastifyReply) => {
      const body = reorderFavoritesSchema.safeParse(request.body);
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
        await pagesService.reorderFavorites(request.user!.id, body.data.orderedIds);

        return {
          success: true,
          data: { message: 'Favorites reordered' },
        };
      } catch (error) {
        return mapServiceError(error, reply);
      }
    }
  );
}
