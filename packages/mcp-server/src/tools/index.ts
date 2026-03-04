/**
 * Shared utilities for MCP tools.
 */

import { LibreDiaryApiError } from '../client/api-client.js';

export interface ToolResult {
  [x: string]: unknown;
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
}

/**
 * Standard error handler for tool callbacks.
 * Converts API errors to user-friendly MCP tool error responses.
 */
export function handleToolError(error: unknown): ToolResult {
  if (error instanceof LibreDiaryApiError) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              error: error.code,
              message: error.message,
              status: error.status,
              ...(error.details ? { details: error.details } : {}),
            },
            null,
            2
          ),
        },
      ],
      isError: true,
    };
  }

  const message = error instanceof Error ? error.message : 'An unexpected error occurred';

  return {
    content: [{ type: 'text', text: JSON.stringify({ error: message }, null, 2) }],
    isError: true,
  };
}

export { registerPageTools } from './pages.js';
export { registerDatabaseTools } from './databases.js';
export { registerOrganisationTools } from './organisations.js';
export { registerSearchTools } from './search.js';
export { registerFileTools } from './files.js';
