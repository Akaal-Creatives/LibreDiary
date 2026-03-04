/**
 * CLI entry point for the LibreDiary MCP server.
 * Connects via stdio transport.
 */

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { loadConfig, isHelpFlag, HELP_TEXT } from './config.js';
import { createServer } from './server.js';

async function main(): Promise<void> {
  if (isHelpFlag()) {
    console.log(HELP_TEXT);
    process.exit(0);
  }

  try {
    const config = loadConfig();
    const server = createServer(config);
    const transport = new StdioServerTransport();

    await server.connect(transport);
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'Failed to start MCP server');
    process.exit(1);
  }
}

main();
