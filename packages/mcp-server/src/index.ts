/**
 * @librediary/mcp-server
 *
 * MCP (Model Context Protocol) server for LibreDiary.
 * Enables AI assistants to manage workspaces programmatically.
 */

export { createServer } from './server.js';
export { loadConfig, type McpConfig } from './config.js';
export { LibreDiaryClient, LibreDiaryApiError } from './client/api-client.js';
