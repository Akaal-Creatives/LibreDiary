/**
 * MCP tools for LibreDiary file management (3 tools).
 * Note: File upload is excluded from v1 — binary over stdio is problematic.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { LibreDiaryClient } from '../client/api-client.js';
import { handleToolError } from './index.js';

export function registerFileTools(server: McpServer, client: LibreDiaryClient): void {
  // -----------------------------------------------
  // files_list — List uploaded files
  // -----------------------------------------------
  server.tool('files_list', 'List all uploaded files in the workspace', {}, async () => {
    try {
      const data = await client.orgGet('/files');
      return {
        content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      };
    } catch (error) {
      return handleToolError(error);
    }
  });

  // -----------------------------------------------
  // files_get — Get file metadata
  // -----------------------------------------------
  server.tool(
    'files_get',
    'Get metadata for a specific file',
    { fileId: z.string().describe('The file ID') },
    async ({ fileId }) => {
      try {
        const data = await client.orgGet(`/files/${fileId}`);
        return {
          content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
        };
      } catch (error) {
        return handleToolError(error);
      }
    }
  );

  // -----------------------------------------------
  // files_delete — Delete a file
  // -----------------------------------------------
  server.tool(
    'files_delete',
    'Delete an uploaded file',
    { fileId: z.string().describe('The file ID to delete') },
    async ({ fileId }) => {
      try {
        const data = await client.orgDelete(`/files/${fileId}`);
        return {
          content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
        };
      } catch (error) {
        return handleToolError(error);
      }
    }
  );
}
