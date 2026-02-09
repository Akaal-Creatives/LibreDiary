import type { FastifyInstance } from 'fastify';
import * as commentsService from './comments.service.js';
import { requireAuth } from '../auth/auth.middleware.js';
import { requireOrgAccess } from '../organizations/organizations.middleware.js';
import { mapServiceError, type ErrorMap } from '../../utils/errors.js';

// ===========================================
// TYPE DEFINITIONS
// ===========================================

interface PageParams {
  pageId: string;
}

interface CommentParams extends PageParams {
  commentId: string;
}

interface GetCommentsQuery {
  blockId?: string;
}

interface GetCountQuery {
  unresolvedOnly?: string;
}

interface CreateCommentBody {
  content: string;
  parentId?: string;
  blockId?: string;
}

interface UpdateCommentBody {
  content: string;
}

interface ResolveCommentBody {
  resolve: boolean;
}

// ===========================================
// ERROR MAP
// ===========================================

const errorMap: ErrorMap = {
  PAGE_NOT_FOUND: {
    status: 404,
    code: 'PAGE_NOT_FOUND',
    message: 'Page not found',
  },
  PAGE_IN_TRASH: {
    status: 400,
    code: 'PAGE_IN_TRASH',
    message: 'Cannot add comments to a trashed page',
  },
  COMMENT_NOT_FOUND: {
    status: 404,
    code: 'COMMENT_NOT_FOUND',
    message: 'Comment not found',
  },
  PARENT_COMMENT_NOT_FOUND: {
    status: 404,
    code: 'PARENT_COMMENT_NOT_FOUND',
    message: 'Parent comment not found',
  },
  NOT_COMMENT_AUTHOR: {
    status: 403,
    code: 'NOT_COMMENT_AUTHOR',
    message: 'You can only modify your own comments',
  },
  CANNOT_RESOLVE_REPLY: {
    status: 400,
    code: 'CANNOT_RESOLVE_REPLY',
    message: 'Only top-level comments can be resolved',
  },
};

// ===========================================
// COMMENTS ROUTES
// ===========================================

export default async function commentsRoutes(fastify: FastifyInstance): Promise<void> {
  // Add authentication and org access hooks
  fastify.addHook('preHandler', requireAuth);
  fastify.addHook('preHandler', requireOrgAccess);
  /**
   * GET /pages/:pageId/comments
   * Get all comments for a page
   */
  fastify.get<{ Params: PageParams; Querystring: GetCommentsQuery }>(
    '/',
    async (request, reply) => {
      const { pageId } = request.params;
      const { blockId } = request.query;
      const organizationId = request.organizationId;

      try {
        const comments = await commentsService.getComments(organizationId!, pageId, blockId);

        return {
          success: true,
          data: { comments },
        };
      } catch (error) {
        return mapServiceError(error, reply, errorMap);
      }
    }
  );

  /**
   * GET /pages/:pageId/comments/count
   * Get comment count for a page
   */
  fastify.get<{ Params: PageParams; Querystring: GetCountQuery }>(
    '/count',
    async (request, reply) => {
      const { pageId } = request.params;
      const unresolvedOnly = request.query.unresolvedOnly === 'true';

      try {
        const count = await commentsService.getCommentCount(pageId, { unresolvedOnly });

        return {
          success: true,
          data: { count },
        };
      } catch (error) {
        return mapServiceError(error, reply, errorMap);
      }
    }
  );

  /**
   * POST /pages/:pageId/comments
   * Create a new comment
   */
  fastify.post<{ Params: PageParams; Body: CreateCommentBody }>(
    '/',
    {
      schema: {
        body: {
          type: 'object',
          required: ['content'],
          properties: {
            content: { type: 'string', minLength: 1 },
            parentId: { type: 'string' },
            blockId: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const { pageId } = request.params;
      const { content, parentId, blockId } = request.body;
      const userId = request.user!.id;
      const organizationId = request.organizationId;

      try {
        const comment = await commentsService.createComment(
          organizationId!,
          pageId,
          userId,
          content,
          { parentId, blockId }
        );

        return reply.status(201).send({
          success: true,
          data: { comment },
        });
      } catch (error) {
        return mapServiceError(error, reply, errorMap);
      }
    }
  );

  /**
   * PATCH /pages/:pageId/comments/:commentId
   * Update a comment
   */
  fastify.patch<{ Params: CommentParams; Body: UpdateCommentBody }>(
    '/:commentId',
    {
      schema: {
        body: {
          type: 'object',
          required: ['content'],
          properties: {
            content: { type: 'string', minLength: 1 },
          },
        },
      },
    },
    async (request, reply) => {
      const { commentId } = request.params;
      const { content } = request.body;
      const userId = request.user!.id;

      try {
        const comment = await commentsService.updateComment(commentId, userId, content);

        return {
          success: true,
          data: { comment },
        };
      } catch (error) {
        return mapServiceError(error, reply, errorMap);
      }
    }
  );

  /**
   * DELETE /pages/:pageId/comments/:commentId
   * Delete a comment
   */
  fastify.delete<{ Params: CommentParams }>('/:commentId', async (request, reply) => {
    const { commentId } = request.params;
    const userId = request.user!.id;

    try {
      await commentsService.deleteComment(commentId, userId);

      return {
        success: true,
        data: { deleted: true },
      };
    } catch (error) {
      return mapServiceError(error, reply, errorMap);
    }
  });

  /**
   * POST /pages/:pageId/comments/:commentId/resolve
   * Resolve or unresolve a comment
   */
  fastify.post<{ Params: CommentParams; Body: ResolveCommentBody }>(
    '/:commentId/resolve',
    {
      schema: {
        body: {
          type: 'object',
          required: ['resolve'],
          properties: {
            resolve: { type: 'boolean' },
          },
        },
      },
    },
    async (request, reply) => {
      const { commentId } = request.params;
      const { resolve } = request.body;
      const userId = request.user!.id;

      try {
        const comment = await commentsService.resolveComment(commentId, userId, resolve);

        return {
          success: true,
          data: { comment },
        };
      } catch (error) {
        return mapServiceError(error, reply, errorMap);
      }
    }
  );
}
