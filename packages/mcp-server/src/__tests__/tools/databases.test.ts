import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerDatabaseTools } from '../../tools/databases.js';
import { LibreDiaryApiError } from '../../client/api-client.js';
import { createMockServer, createMockClient, findTool } from '../helpers.js';
import type { LibreDiaryClient } from '../../client/api-client.js';

describe('Database tools', () => {
  let server: ReturnType<typeof createMockServer>;
  let client: LibreDiaryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    server = createMockServer();
    client = createMockClient();
    registerDatabaseTools(server.server as unknown as McpServer, client);
  });

  describe('registration', () => {
    it('should register exactly 11 database tools', () => {
      expect(server.tools).toHaveLength(11);
    });

    it.each([
      'databases_list',
      'databases_get',
      'databases_create',
      'databases_update',
      'databases_delete',
      'databases_add_property',
      'databases_update_property',
      'databases_delete_property',
      'databases_create_row',
      'databases_update_row',
      'databases_delete_row',
    ])('should register tool: %s', (name) => {
      expect(() => findTool(server.tools, name)).not.toThrow();
    });
  });

  describe('databases_list', () => {
    it('should call orgGet with /databases', async () => {
      vi.mocked(client.orgGet).mockResolvedValueOnce({ databases: [] });

      const tool = findTool(server.tools, 'databases_list');
      await tool.handler({}, {});

      expect(client.orgGet).toHaveBeenCalledWith('/databases');
    });
  });

  describe('databases_get', () => {
    it('should call orgGet with correct database ID', async () => {
      vi.mocked(client.orgGet).mockResolvedValueOnce({ database: { id: 'db1' } });

      const tool = findTool(server.tools, 'databases_get');
      await tool.handler({ databaseId: 'db1' }, {});

      expect(client.orgGet).toHaveBeenCalledWith('/databases/db1');
    });
  });

  describe('databases_create', () => {
    it('should POST to /databases with params', async () => {
      vi.mocked(client.orgPost).mockResolvedValueOnce({ database: { id: 'new' } });

      const tool = findTool(server.tools, 'databases_create');
      await tool.handler({ name: 'Tasks', pageId: 'p1' }, {});

      expect(client.orgPost).toHaveBeenCalledWith('/databases', {
        name: 'Tasks',
        pageId: 'p1',
      });
    });
  });

  describe('databases_update', () => {
    it('should PATCH /databases/:id with body', async () => {
      vi.mocked(client.orgPatch).mockResolvedValueOnce({ database: { id: 'db1' } });

      const tool = findTool(server.tools, 'databases_update');
      await tool.handler({ databaseId: 'db1', name: 'Updated DB' }, {});

      expect(client.orgPatch).toHaveBeenCalledWith('/databases/db1', { name: 'Updated DB' });
    });
  });

  describe('databases_delete', () => {
    it('should DELETE /databases/:id', async () => {
      vi.mocked(client.orgDelete).mockResolvedValueOnce({ message: 'Deleted' });

      const tool = findTool(server.tools, 'databases_delete');
      await tool.handler({ databaseId: 'db1' }, {});

      expect(client.orgDelete).toHaveBeenCalledWith('/databases/db1');
    });
  });

  describe('databases_add_property', () => {
    it('should POST to /databases/:id/properties', async () => {
      vi.mocked(client.orgPost).mockResolvedValueOnce({ property: { id: 'prop1' } });

      const tool = findTool(server.tools, 'databases_add_property');
      await tool.handler({ databaseId: 'db1', name: 'Status', type: 'SELECT' }, {});

      expect(client.orgPost).toHaveBeenCalledWith('/databases/db1/properties', {
        name: 'Status',
        type: 'SELECT',
      });
    });

    it('should pass config when provided', async () => {
      vi.mocked(client.orgPost).mockResolvedValueOnce({ property: { id: 'prop1' } });

      const config = { options: ['Todo', 'Done'] };
      const tool = findTool(server.tools, 'databases_add_property');
      await tool.handler({ databaseId: 'db1', name: 'Status', type: 'SELECT', config }, {});

      expect(client.orgPost).toHaveBeenCalledWith('/databases/db1/properties', {
        name: 'Status',
        type: 'SELECT',
        config,
      });
    });
  });

  describe('databases_update_property', () => {
    it('should PATCH /databases/:dbId/properties/:propId', async () => {
      vi.mocked(client.orgPatch).mockResolvedValueOnce({ property: { id: 'prop1' } });

      const tool = findTool(server.tools, 'databases_update_property');
      await tool.handler({ databaseId: 'db1', propertyId: 'prop1', name: 'Updated Name' }, {});

      expect(client.orgPatch).toHaveBeenCalledWith('/databases/db1/properties/prop1', {
        name: 'Updated Name',
      });
    });
  });

  describe('databases_delete_property', () => {
    it('should DELETE /databases/:dbId/properties/:propId', async () => {
      vi.mocked(client.orgDelete).mockResolvedValueOnce({ message: 'Deleted' });

      const tool = findTool(server.tools, 'databases_delete_property');
      await tool.handler({ databaseId: 'db1', propertyId: 'prop1' }, {});

      expect(client.orgDelete).toHaveBeenCalledWith('/databases/db1/properties/prop1');
    });
  });

  describe('databases_create_row', () => {
    it('should POST to /databases/:id/rows', async () => {
      vi.mocked(client.orgPost).mockResolvedValueOnce({ row: { id: 'r1' } });

      const cells = { prop1: 'Hello', prop2: 42 };
      const tool = findTool(server.tools, 'databases_create_row');
      await tool.handler({ databaseId: 'db1', cells }, {});

      expect(client.orgPost).toHaveBeenCalledWith('/databases/db1/rows', { cells });
    });

    it('should handle creation without cells', async () => {
      vi.mocked(client.orgPost).mockResolvedValueOnce({ row: { id: 'r1' } });

      const tool = findTool(server.tools, 'databases_create_row');
      await tool.handler({ databaseId: 'db1' }, {});

      expect(client.orgPost).toHaveBeenCalledWith('/databases/db1/rows', {});
    });
  });

  describe('databases_update_row', () => {
    it('should PATCH /databases/:dbId/rows/:rowId', async () => {
      vi.mocked(client.orgPatch).mockResolvedValueOnce({ row: { id: 'r1' } });

      const cells = { prop1: 'Updated' };
      const tool = findTool(server.tools, 'databases_update_row');
      await tool.handler({ databaseId: 'db1', rowId: 'r1', cells }, {});

      expect(client.orgPatch).toHaveBeenCalledWith('/databases/db1/rows/r1', { cells });
    });
  });

  describe('databases_delete_row', () => {
    it('should DELETE /databases/:dbId/rows/:rowId', async () => {
      vi.mocked(client.orgDelete).mockResolvedValueOnce({ message: 'Deleted' });

      const tool = findTool(server.tools, 'databases_delete_row');
      await tool.handler({ databaseId: 'db1', rowId: 'r1' }, {});

      expect(client.orgDelete).toHaveBeenCalledWith('/databases/db1/rows/r1');
    });
  });

  describe('error handling', () => {
    it('should return error result when API fails', async () => {
      const error = new LibreDiaryApiError(404, 'DATABASE_NOT_FOUND', 'Database not found');
      vi.mocked(client.orgGet).mockRejectedValueOnce(error);

      const tool = findTool(server.tools, 'databases_get');
      const result = (await tool.handler({ databaseId: 'bad' }, {})) as {
        isError: boolean;
        content: Array<{ text: string }>;
      };

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0]!.text);
      expect(parsed.error).toBe('DATABASE_NOT_FOUND');
    });
  });
});
