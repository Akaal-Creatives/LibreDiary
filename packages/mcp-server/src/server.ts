/**
 * MCP server factory — creates and configures the LibreDiary MCP server
 * with all tools and resources registered.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { McpConfig } from './config.js';
import { LibreDiaryClient } from './client/api-client.js';
import { registerPageTools } from './tools/pages.js';
import { registerDatabaseTools } from './tools/databases.js';
import { registerOrganisationTools } from './tools/organisations.js';
import { registerSearchTools } from './tools/search.js';
import { registerFileTools } from './tools/files.js';
import { registerPageTreeResource } from './resources/page-tree.js';
import { registerDatabasesListResource } from './resources/databases-list.js';

export function createServer(config: McpConfig): McpServer {
  const server = new McpServer({
    name: 'librediary',
    version: '0.1.0',
  });

  const client = new LibreDiaryClient(config);

  // Register tools
  registerPageTools(server, client);
  registerDatabaseTools(server, client);
  registerOrganisationTools(server, client);
  registerSearchTools(server, client);
  registerFileTools(server, client);

  // Register resources
  registerPageTreeResource(server, client);
  registerDatabasesListResource(server, client);

  return server;
}
