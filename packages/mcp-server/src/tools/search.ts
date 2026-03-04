/**
 * MCP tools for LibreDiary search (1 tool).
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { LibreDiaryClient } from '../client/api-client.js';
import { handleToolError } from './index.js';

export function registerSearchTools(server: McpServer, client: LibreDiaryClient): void {
  // -----------------------------------------------
  // search_pages — Full-text search across pages
  // -----------------------------------------------
  server.tool(
    'search_pages',
    'Search pages by title and content with full-text search',
    {
      q: z.string().min(1).describe('Search query'),
      limit: z.number().int().min(1).max(100).optional().describe('Maximum results (default 20)'),
      offset: z.number().int().min(0).optional().describe('Pagination offset'),
      dateFrom: z.string().optional().describe('Filter: created after this date (ISO 8601)'),
      dateTo: z.string().optional().describe('Filter: created before this date (ISO 8601)'),
      createdById: z.string().optional().describe('Filter: created by this user ID'),
    },
    async (params) => {
      try {
        const searchParams = new URLSearchParams();
        searchParams.set('q', params.q);
        if (params.limit !== undefined) searchParams.set('limit', String(params.limit));
        if (params.offset !== undefined) searchParams.set('offset', String(params.offset));
        if (params.dateFrom) searchParams.set('dateFrom', params.dateFrom);
        if (params.dateTo) searchParams.set('dateTo', params.dateTo);
        if (params.createdById) searchParams.set('createdById', params.createdById);

        const data = await client.orgGet(`/search?${searchParams.toString()}`);
        return {
          content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
        };
      } catch (error) {
        return handleToolError(error);
      }
    }
  );
}
