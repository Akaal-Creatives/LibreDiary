/**
 * MCP resource: librediary://databases/list
 * Provides all databases with their property schemas as JSON.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { LibreDiaryClient } from '../client/api-client.js';

export function registerDatabasesListResource(server: McpServer, client: LibreDiaryClient): void {
  server.resource(
    'databases-list',
    'librediary://databases/list',
    {
      description: 'All databases in the workspace with their property schemas',
      mimeType: 'application/json',
    },
    async () => {
      const data = await client.orgGet<{ databases: unknown[] }>('/databases');
      return {
        contents: [
          {
            uri: 'librediary://databases/list',
            mimeType: 'application/json',
            text: JSON.stringify(data, null, 2),
          },
        ],
      };
    }
  );
}
