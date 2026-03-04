/**
 * MCP resource: librediary://pages/tree
 * Provides the full hierarchical page tree as JSON.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { LibreDiaryClient } from '../client/api-client.js';

export function registerPageTreeResource(server: McpServer, client: LibreDiaryClient): void {
  server.resource(
    'page-tree',
    'librediary://pages/tree',
    {
      description: 'Full hierarchical page tree for the workspace',
      mimeType: 'application/json',
    },
    async () => {
      const data = await client.orgGet<{ pages: unknown[] }>('/pages');
      return {
        contents: [
          {
            uri: 'librediary://pages/tree',
            mimeType: 'application/json',
            text: JSON.stringify(data, null, 2),
          },
        ],
      };
    }
  );
}
