import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerDatabasesListResource } from '../../resources/databases-list.js';
import { createMockServer, createMockClient, findResource } from '../helpers.js';
import type { LibreDiaryClient } from '../../client/api-client.js';

describe('Databases list resource', () => {
  let server: ReturnType<typeof createMockServer>;
  let client: LibreDiaryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    server = createMockServer();
    client = createMockClient();
    registerDatabasesListResource(server.server as unknown as McpServer, client);
  });

  describe('registration', () => {
    it('should register one resource', () => {
      expect(server.resources).toHaveLength(1);
    });

    it('should register with name "databases-list"', () => {
      expect(() => findResource(server.resources, 'databases-list')).not.toThrow();
    });

    it('should register with URI "librediary://databases/list"', () => {
      const resource = findResource(server.resources, 'databases-list');
      expect(resource.uri).toBe('librediary://databases/list');
    });

    it('should have application/json MIME type', () => {
      const resource = findResource(server.resources, 'databases-list');
      expect(resource.options).toMatchObject({ mimeType: 'application/json' });
    });

    it('should have a description', () => {
      const resource = findResource(server.resources, 'databases-list');
      expect(resource.options).toHaveProperty('description');
    });
  });

  describe('handler', () => {
    it('should fetch databases from API', async () => {
      const mockDatabases = [
        { id: 'db1', name: 'Tasks', properties: [{ id: 'p1', name: 'Status', type: 'SELECT' }] },
      ];
      vi.mocked(client.orgGet).mockResolvedValueOnce({ databases: mockDatabases });

      const resource = findResource(server.resources, 'databases-list');
      const result = (await resource.handler()) as {
        contents: Array<{ uri: string; mimeType: string; text: string }>;
      };

      expect(client.orgGet).toHaveBeenCalledWith('/databases');
      expect(result.contents).toHaveLength(1);
      expect(result.contents[0]!.uri).toBe('librediary://databases/list');
      expect(result.contents[0]!.mimeType).toBe('application/json');
    });

    it('should return database data as formatted JSON', async () => {
      const mockDatabases = [{ id: 'db1', name: 'Tasks' }];
      vi.mocked(client.orgGet).mockResolvedValueOnce({ databases: mockDatabases });

      const resource = findResource(server.resources, 'databases-list');
      const result = (await resource.handler()) as {
        contents: Array<{ text: string }>;
      };

      const parsed = JSON.parse(result.contents[0]!.text);
      expect(parsed.databases).toEqual(mockDatabases);
    });

    it('should handle empty database list', async () => {
      vi.mocked(client.orgGet).mockResolvedValueOnce({ databases: [] });

      const resource = findResource(server.resources, 'databases-list');
      const result = (await resource.handler()) as {
        contents: Array<{ text: string }>;
      };

      const parsed = JSON.parse(result.contents[0]!.text);
      expect(parsed.databases).toEqual([]);
    });
  });
});
