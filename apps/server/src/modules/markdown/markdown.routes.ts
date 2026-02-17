import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { requireAuth } from '../auth/auth.middleware.js';
import { requireOrgAccess } from '../organizations/organizations.middleware.js';
import { htmlToMarkdown, markdownToHtml } from './markdown.service.js';

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
// ROUTES
// ===========================================

export async function markdownRoutes(fastify: FastifyInstance) {
  // All routes require authentication and org access
  fastify.addHook('onRequest', requireAuth);
  fastify.addHook('onRequest', requireOrgAccess);

  /**
   * GET /organizations/:orgId/pages/:pageId/markdown
   * Export page content as Markdown
   */
  fastify.get(
    '/',
    async (
      request: FastifyRequest<{ Params: PageParams; Querystring: { html?: string } }>,
      reply: FastifyReply
    ) => {
      const { html } = request.query as { html?: string };

      if (!html) {
        return reply.status(400).send({
          success: false,
          error: { code: 'MISSING_HTML', message: 'Query parameter "html" is required' },
        });
      }

      const markdown = htmlToMarkdown(html);

      return reply.send({
        success: true,
        data: { markdown },
      });
    }
  );

  /**
   * POST /organizations/:orgId/pages/:pageId/markdown
   * Convert Markdown to HTML
   */
  fastify.post(
    '/',
    async (
      request: FastifyRequest<{ Params: PageParams; Body: { markdown: string } }>,
      reply: FastifyReply
    ) => {
      const { markdown } = request.body as { markdown?: string };

      if (!markdown) {
        return reply.status(400).send({
          success: false,
          error: { code: 'MISSING_MARKDOWN', message: 'Body field "markdown" is required' },
        });
      }

      const html = await markdownToHtml(markdown);

      return reply.send({
        success: true,
        data: { html },
      });
    }
  );

  /**
   * POST /organizations/:orgId/pages/:pageId/markdown/import
   * Import a Markdown file and return the HTML to be set as page content
   */
  fastify.post(
    '/import',
    async (
      request: FastifyRequest<{ Params: PageParams; Body: { markdown: string } }>,
      reply: FastifyReply
    ) => {
      const { markdown } = request.body as { markdown?: string };

      if (!markdown) {
        return reply.status(400).send({
          success: false,
          error: { code: 'MISSING_MARKDOWN', message: 'Body field "markdown" is required' },
        });
      }

      const html = await markdownToHtml(markdown);

      return reply.send({
        success: true,
        data: { html },
      });
    }
  );
}
