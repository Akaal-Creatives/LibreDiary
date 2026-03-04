/**
 * Test helpers for MCP server tests.
 * Provides a mock McpServer that captures tool and resource registrations.
 */

import { vi } from 'vitest';
import type { LibreDiaryClient } from '../client/api-client.js';
import type { McpConfig } from '../config.js';

export interface CapturedTool {
  name: string;
  description: string;
  schema: Record<string, unknown>;
  handler: (...args: unknown[]) => unknown;
}

export interface CapturedResource {
  name: string;
  uri: string;
  options: Record<string, unknown>;
  handler: (...args: unknown[]) => unknown;
}

/**
 * Creates a mock McpServer that captures tool() and resource() calls.
 */
export function createMockServer() {
  const tools: CapturedTool[] = [];
  const resources: CapturedResource[] = [];

  const server = {
    tool: vi.fn((...args: unknown[]) => {
      const name = args[0] as string;
      const description = args[1] as string;
      const schema = args[2] as Record<string, unknown>;
      const handler = args[3] as (...args: unknown[]) => unknown;
      tools.push({ name, description, schema, handler });
    }),
    resource: vi.fn((...args: unknown[]) => {
      const name = args[0] as string;
      const uri = args[1] as string;
      const options = args[2] as Record<string, unknown>;
      const handler = args[3] as (...args: unknown[]) => unknown;
      resources.push({ name, uri, options, handler });
    }),
  };

  return { server, tools, resources };
}

/**
 * Find a captured tool by name.
 */
export function findTool(tools: CapturedTool[], name: string): CapturedTool {
  const tool = tools.find((t) => t.name === name);
  if (!tool) {
    throw new Error(`Tool "${name}" not found. Available: ${tools.map((t) => t.name).join(', ')}`);
  }
  return tool;
}

/**
 * Find a captured resource by name.
 */
export function findResource(resources: CapturedResource[], name: string): CapturedResource {
  const resource = resources.find((r) => r.name === name);
  if (!resource) {
    throw new Error(
      `Resource "${name}" not found. Available: ${resources.map((r) => r.name).join(', ')}`
    );
  }
  return resource;
}

/**
 * Creates a mock LibreDiaryClient with all methods mocked.
 */
export function createMockClient(): LibreDiaryClient {
  return {
    orgGet: vi.fn(),
    orgPost: vi.fn(),
    orgPatch: vi.fn(),
    orgDelete: vi.fn(),
    get: vi.fn(),
    post: vi.fn(),
  } as unknown as LibreDiaryClient;
}

/**
 * Default test config.
 */
export const TEST_CONFIG: McpConfig = {
  apiUrl: 'http://localhost:3000/api',
  apiToken: 'ld_test_token',
  orgId: 'org_test',
};
