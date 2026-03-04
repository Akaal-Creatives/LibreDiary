/**
 * MCP tools for LibreDiary page management (11 tools).
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { LibreDiaryClient } from '../client/api-client.js';
import { handleToolError } from './index.js';

export function registerPageTools(server: McpServer, client: LibreDiaryClient): void {
  // -----------------------------------------------
  // pages_list — Get the page tree
  // -----------------------------------------------
  server.tool('pages_list', 'List all pages as a hierarchical tree', {}, async () => {
    try {
      const data = await client.orgGet<{ pages: unknown[] }>('/pages');
      return {
        content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      };
    } catch (error) {
      return handleToolError(error);
    }
  });

  // -----------------------------------------------
  // pages_get — Get a single page
  // -----------------------------------------------
  server.tool(
    'pages_get',
    'Get a single page by ID, including its content',
    { pageId: z.string().describe('The page ID') },
    async ({ pageId }) => {
      try {
        const data = await client.orgGet(`/pages/${pageId}`);
        return {
          content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
        };
      } catch (error) {
        return handleToolError(error);
      }
    }
  );

  // -----------------------------------------------
  // pages_create — Create a new page
  // -----------------------------------------------
  server.tool(
    'pages_create',
    'Create a new page in the workspace',
    {
      title: z.string().min(1).max(255).optional().describe('Page title'),
      parentId: z.string().nullish().describe('Parent page ID (null for root)'),
      icon: z.string().max(50).nullish().describe('Emoji icon for the page'),
    },
    async (params) => {
      try {
        const data = await client.orgPost('/pages', {
          title: params.title,
          parentId: params.parentId ?? null,
          icon: params.icon ?? null,
        });
        return {
          content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
        };
      } catch (error) {
        return handleToolError(error);
      }
    }
  );

  // -----------------------------------------------
  // pages_update — Update a page
  // -----------------------------------------------
  server.tool(
    'pages_update',
    'Update an existing page (title, content, icon, visibility, etc.)',
    {
      pageId: z.string().describe('The page ID to update'),
      title: z.string().min(1).max(255).optional().describe('New title'),
      icon: z.string().max(50).nullish().describe('New emoji icon'),
      coverUrl: z.string().nullish().describe('Cover image URL'),
      isPublic: z.boolean().optional().describe('Whether the page is publicly accessible'),
      publicSlug: z.string().min(3).max(100).nullish().describe('URL slug for public access'),
      htmlContent: z.string().nullish().describe('HTML content of the page'),
    },
    async ({ pageId, ...body }) => {
      try {
        const data = await client.orgPatch(`/pages/${pageId}`, body);
        return {
          content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
        };
      } catch (error) {
        return handleToolError(error);
      }
    }
  );

  // -----------------------------------------------
  // pages_trash — Soft-delete (trash) a page
  // -----------------------------------------------
  server.tool(
    'pages_trash',
    'Move a page to the trash (soft delete)',
    { pageId: z.string().describe('The page ID to trash') },
    async ({ pageId }) => {
      try {
        const data = await client.orgDelete(`/pages/${pageId}`);
        return {
          content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
        };
      } catch (error) {
        return handleToolError(error);
      }
    }
  );

  // -----------------------------------------------
  // pages_restore — Restore a page from trash
  // -----------------------------------------------
  server.tool(
    'pages_restore',
    'Restore a trashed page back to the workspace',
    { pageId: z.string().describe('The trashed page ID to restore') },
    async ({ pageId }) => {
      try {
        const data = await client.orgPost(`/pages/${pageId}/restore`);
        return {
          content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
        };
      } catch (error) {
        return handleToolError(error);
      }
    }
  );

  // -----------------------------------------------
  // pages_move — Move a page to a new parent/position
  // -----------------------------------------------
  server.tool(
    'pages_move',
    'Move a page to a different parent and/or position in the tree',
    {
      pageId: z.string().describe('The page ID to move'),
      parentId: z.string().nullish().describe('New parent page ID (null for root)'),
      position: z.number().int().min(0).optional().describe('Position among siblings'),
    },
    async ({ pageId, ...body }) => {
      try {
        const data = await client.orgPost(`/pages/${pageId}/move`, body);
        return {
          content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
        };
      } catch (error) {
        return handleToolError(error);
      }
    }
  );

  // -----------------------------------------------
  // pages_duplicate — Duplicate a page
  // -----------------------------------------------
  server.tool(
    'pages_duplicate',
    'Create a copy of an existing page',
    { pageId: z.string().describe('The page ID to duplicate') },
    async ({ pageId }) => {
      try {
        const data = await client.orgPost(`/pages/${pageId}/duplicate`);
        return {
          content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
        };
      } catch (error) {
        return handleToolError(error);
      }
    }
  );

  // -----------------------------------------------
  // pages_get_ancestors — Get page breadcrumbs
  // -----------------------------------------------
  server.tool(
    'pages_get_ancestors',
    'Get the ancestor chain of a page (for breadcrumb navigation)',
    { pageId: z.string().describe('The page ID') },
    async ({ pageId }) => {
      try {
        const data = await client.orgGet(`/pages/${pageId}/ancestors`);
        return {
          content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
        };
      } catch (error) {
        return handleToolError(error);
      }
    }
  );

  // -----------------------------------------------
  // trash_list — List trashed pages
  // -----------------------------------------------
  server.tool('trash_list', 'List all pages currently in the trash', {}, async () => {
    try {
      const data = await client.orgGet('/trash');
      return {
        content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      };
    } catch (error) {
      return handleToolError(error);
    }
  });

  // -----------------------------------------------
  // trash_delete_permanent — Permanently delete a trashed page
  // -----------------------------------------------
  server.tool(
    'trash_delete_permanent',
    'Permanently delete a page from the trash (irreversible)',
    { pageId: z.string().describe('The trashed page ID to permanently delete') },
    async ({ pageId }) => {
      try {
        const data = await client.orgDelete(`/trash/${pageId}`);
        return {
          content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
        };
      } catch (error) {
        return handleToolError(error);
      }
    }
  );
}
