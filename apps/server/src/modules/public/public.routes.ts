import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import * as publicService from './public.service.js';

// ===========================================
// TYPE DEFINITIONS
// ===========================================

interface SlugParams {
  slug: string;
}

interface TokenParams {
  token: string;
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
    PAGE_NOT_PUBLIC: {
      status: 403,
      code: 'PAGE_NOT_PUBLIC',
      message: 'This page is not publicly accessible',
    },
    INVALID_SHARE_TOKEN: {
      status: 404,
      code: 'INVALID_SHARE_TOKEN',
      message: 'Share link is invalid or does not exist',
    },
    SHARE_TOKEN_EXPIRED: {
      status: 410,
      code: 'SHARE_TOKEN_EXPIRED',
      message: 'This share link has expired',
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
// PUBLIC ROUTES (No authentication required)
// ===========================================

export default async function publicRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * GET /public/pages/:slug
   * Get a public page by its slug (no auth required)
   */
  fastify.get<{ Params: SlugParams }>(
    '/:slug',
    async (request: FastifyRequest<{ Params: SlugParams }>, reply: FastifyReply) => {
      try {
        const page = await publicService.getPublicPage(request.params.slug);

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
   * GET /public/pages/share/:token
   * Get a page by its share token (no auth required)
   */
  fastify.get<{ Params: TokenParams }>(
    '/share/:token',
    async (request: FastifyRequest<{ Params: TokenParams }>, reply: FastifyReply) => {
      try {
        const page = await publicService.getPageByShareToken(request.params.token);

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
