/**
 * Configuration loader for the LibreDiary MCP server.
 * Reads from environment variables or CLI arguments.
 */

export interface McpConfig {
  apiUrl: string;
  apiToken: string;
  orgId: string;
}

export function loadConfig(args: string[] = process.argv.slice(2)): McpConfig {
  // Parse CLI args (--api-url, --api-token, --org-id)
  const cliArgs = parseCliArgs(args);

  const apiUrl = cliArgs['api-url'] ?? process.env['LIBREDIARY_API_URL'] ?? '';
  const apiToken = cliArgs['api-token'] ?? process.env['LIBREDIARY_API_TOKEN'] ?? '';
  const orgId = cliArgs['org-id'] ?? process.env['LIBREDIARY_ORG_ID'] ?? '';

  const missing: string[] = [];
  if (!apiUrl) missing.push('LIBREDIARY_API_URL (or --api-url)');
  if (!apiToken) missing.push('LIBREDIARY_API_TOKEN (or --api-token)');
  if (!orgId) missing.push('LIBREDIARY_ORG_ID (or --org-id)');

  if (missing.length > 0) {
    throw new Error(
      `Missing required configuration:\n  ${missing.join('\n  ')}\n\n` +
        'Set via environment variables or CLI arguments.\n' +
        'Example:\n' +
        '  LIBREDIARY_API_URL=http://localhost:3000/api \\\n' +
        '  LIBREDIARY_API_TOKEN=ld_abc123 \\\n' +
        '  LIBREDIARY_ORG_ID=org_xyz \\\n' +
        '  npx @librediary/mcp-server'
    );
  }

  // Ensure no trailing slash
  let normalised = apiUrl;
  while (normalised.endsWith('/')) {
    normalised = normalised.slice(0, -1);
  }

  return { apiUrl: normalised, apiToken, orgId };
}

function parseCliArgs(args: string[]): Record<string, string> {
  const result: Record<string, string> = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === undefined) continue;
    if (arg.startsWith('--') && arg.includes('=')) {
      const [key, ...rest] = arg.slice(2).split('=');
      if (key) result[key] = rest.join('=');
    } else if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const next = args[i + 1];
      if (key && next && !next.startsWith('--')) {
        result[key] = next;
        i++;
      }
    }
  }
  return result;
}

export function isHelpFlag(args: string[] = process.argv.slice(2)): boolean {
  return args.includes('--help') || args.includes('-h');
}

export const HELP_TEXT = `
LibreDiary MCP Server
=====================

Connects AI assistants to a LibreDiary workspace via the Model Context Protocol.

Usage:
  npx @librediary/mcp-server [options]

Options:
  --api-url <url>      LibreDiary API base URL (or LIBREDIARY_API_URL env var)
  --api-token <token>  API token with ld_ prefix (or LIBREDIARY_API_TOKEN env var)
  --org-id <id>        Organisation ID (or LIBREDIARY_ORG_ID env var)
  -h, --help           Show this help message

Environment variables:
  LIBREDIARY_API_URL    API base URL (e.g. http://localhost:3000/api)
  LIBREDIARY_API_TOKEN  API token (e.g. ld_abc123...)
  LIBREDIARY_ORG_ID     Organisation ID

Example:
  LIBREDIARY_API_URL=http://localhost:3000/api \\
  LIBREDIARY_API_TOKEN=ld_abc123 \\
  LIBREDIARY_ORG_ID=org_xyz \\
  npx @librediary/mcp-server
`.trim();
