import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerPageTools } from '../../tools/pages.js';
import { LibreDiaryApiError } from '../../client/api-client.js';
import { createMockServer, createMockClient, findTool } from '../helpers.js';
import type { LibreDiaryClient } from '../../client/api-client.js';

describe('Page tools', () => {
  let server: ReturnType<typeof createMockServer>;
  let client: LibreDiaryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    server = createMockServer();
    client = createMockClient();
    registerPageTools(server.server as unknown as McpServer, client);
  });

  describe('registration', () => {
    it('should register exactly 11 page tools', () => {
      expect(server.tools).toHaveLength(11);
    });

    it.each([
      'pages_list',
      'pages_get',
      'pages_create',
      'pages_update',
      'pages_trash',
      'pages_restore',
      'pages_move',
      'pages_duplicate',
      'pages_get_ancestors',
      'trash_list',
      'trash_delete_permanent',
    ])('should register tool: %s', (name) => {
      expect(() => findTool(server.tools, name)).not.toThrow();
    });

    it('should provide descriptions for all tools', () => {
      for (const tool of server.tools) {
        expect(tool.description).toBeTruthy();
        expect(typeof tool.description).toBe('string');
      }
    });
  });

  describe('pages_list', () => {
    it('should call orgGet with /pages', async () => {
      const mockData = { pages: [{ id: '1', title: 'Test' }] };
      vi.mocked(client.orgGet).mockResolvedValueOnce(mockData);

      const tool = findTool(server.tools, 'pages_list');
      const result = (await tool.handler({}, {})) as { content: Array<{ text: string }> };
      const parsed = JSON.parse(result.content[0]!.text);

      expect(client.orgGet).toHaveBeenCalledWith('/pages');
      expect(parsed.pages).toHaveLength(1);
    });

    it('should handle errors', async () => {
      vi.mocked(client.orgGet).mockRejectedValueOnce(
        new LibreDiaryApiError(500, 'SERVER_ERROR', 'Internal error')
      );

      const tool = findTool(server.tools, 'pages_list');
      const result = (await tool.handler({}, {})) as { isError: boolean };

      expect(result.isError).toBe(true);
    });
  });

  describe('pages_get', () => {
    it('should call orgGet with correct page ID', async () => {
      const mockPage = { page: { id: 'p1', title: 'Test Page' } };
      vi.mocked(client.orgGet).mockResolvedValueOnce(mockPage);

      const tool = findTool(server.tools, 'pages_get');
      await tool.handler({ pageId: 'p1' }, {});

      expect(client.orgGet).toHaveBeenCalledWith('/pages/p1');
    });

    it('should return page data as JSON', async () => {
      const mockPage = { page: { id: 'p1', title: 'Test Page' } };
      vi.mocked(client.orgGet).mockResolvedValueOnce(mockPage);

      const tool = findTool(server.tools, 'pages_get');
      const result = (await tool.handler({ pageId: 'p1' }, {})) as {
        content: Array<{ text: string }>;
      };
      const parsed = JSON.parse(result.content[0]!.text);

      expect(parsed.page.id).toBe('p1');
    });
  });

  describe('pages_create', () => {
    it('should POST to /pages with body', async () => {
      vi.mocked(client.orgPost).mockResolvedValueOnce({ page: { id: 'new' } });

      const tool = findTool(server.tools, 'pages_create');
      await tool.handler({ title: 'New Page', parentId: null, icon: null }, {});

      expect(client.orgPost).toHaveBeenCalledWith('/pages', {
        title: 'New Page',
        parentId: null,
        icon: null,
      });
    });

    it('should default parentId and icon to null', async () => {
      vi.mocked(client.orgPost).mockResolvedValueOnce({ page: { id: 'new' } });

      const tool = findTool(server.tools, 'pages_create');
      await tool.handler({}, {});

      expect(client.orgPost).toHaveBeenCalledWith('/pages', {
        title: undefined,
        parentId: null,
        icon: null,
      });
    });
  });

  describe('pages_update', () => {
    it('should PATCH to /pages/:id with body', async () => {
      vi.mocked(client.orgPatch).mockResolvedValueOnce({ page: { id: 'p1' } });

      const tool = findTool(server.tools, 'pages_update');
      await tool.handler({ pageId: 'p1', title: 'Updated Title' }, {});

      expect(client.orgPatch).toHaveBeenCalledWith('/pages/p1', { title: 'Updated Title' });
    });

    it('should pass all update fields', async () => {
      vi.mocked(client.orgPatch).mockResolvedValueOnce({ page: { id: 'p1' } });

      const tool = findTool(server.tools, 'pages_update');
      await tool.handler(
        {
          pageId: 'p1',
          title: 'New',
          icon: '📝',
          isPublic: true,
          htmlContent: '<p>Hello</p>',
        },
        {}
      );

      expect(client.orgPatch).toHaveBeenCalledWith('/pages/p1', {
        title: 'New',
        icon: '📝',
        isPublic: true,
        htmlContent: '<p>Hello</p>',
      });
    });
  });

  describe('pages_trash', () => {
    it('should DELETE /pages/:id', async () => {
      vi.mocked(client.orgDelete).mockResolvedValueOnce({ message: 'Trashed' });

      const tool = findTool(server.tools, 'pages_trash');
      await tool.handler({ pageId: 'p1' }, {});

      expect(client.orgDelete).toHaveBeenCalledWith('/pages/p1');
    });
  });

  describe('pages_restore', () => {
    it('should POST to /pages/:id/restore', async () => {
      vi.mocked(client.orgPost).mockResolvedValueOnce({ page: { id: 'p1' } });

      const tool = findTool(server.tools, 'pages_restore');
      await tool.handler({ pageId: 'p1' }, {});

      expect(client.orgPost).toHaveBeenCalledWith('/pages/p1/restore');
    });
  });

  describe('pages_move', () => {
    it('should POST to /pages/:id/move with body', async () => {
      vi.mocked(client.orgPost).mockResolvedValueOnce({ page: { id: 'p1' } });

      const tool = findTool(server.tools, 'pages_move');
      await tool.handler({ pageId: 'p1', parentId: 'p2', position: 0 }, {});

      expect(client.orgPost).toHaveBeenCalledWith('/pages/p1/move', {
        parentId: 'p2',
        position: 0,
      });
    });
  });

  describe('pages_duplicate', () => {
    it('should POST to /pages/:id/duplicate', async () => {
      vi.mocked(client.orgPost).mockResolvedValueOnce({ page: { id: 'dup1' } });

      const tool = findTool(server.tools, 'pages_duplicate');
      await tool.handler({ pageId: 'p1' }, {});

      expect(client.orgPost).toHaveBeenCalledWith('/pages/p1/duplicate');
    });
  });

  describe('pages_get_ancestors', () => {
    it('should GET /pages/:id/ancestors', async () => {
      vi.mocked(client.orgGet).mockResolvedValueOnce({ ancestors: [] });

      const tool = findTool(server.tools, 'pages_get_ancestors');
      await tool.handler({ pageId: 'p1' }, {});

      expect(client.orgGet).toHaveBeenCalledWith('/pages/p1/ancestors');
    });
  });

  describe('trash_list', () => {
    it('should GET /trash', async () => {
      vi.mocked(client.orgGet).mockResolvedValueOnce({ pages: [] });

      const tool = findTool(server.tools, 'trash_list');
      await tool.handler({}, {});

      expect(client.orgGet).toHaveBeenCalledWith('/trash');
    });
  });

  describe('trash_delete_permanent', () => {
    it('should DELETE /trash/:id', async () => {
      vi.mocked(client.orgDelete).mockResolvedValueOnce({ message: 'Deleted' });

      const tool = findTool(server.tools, 'trash_delete_permanent');
      await tool.handler({ pageId: 'p1' }, {});

      expect(client.orgDelete).toHaveBeenCalledWith('/trash/p1');
    });
  });

  describe('error handling across all tools', () => {
    it.each([
      ['pages_list', {}],
      ['pages_get', { pageId: 'p1' }],
      ['trash_list', {}],
    ] as const)('%s should return error result on API failure', async (toolName, params) => {
      const error = new LibreDiaryApiError(500, 'SERVER_ERROR', 'Internal error');
      vi.mocked(client.orgGet).mockRejectedValue(error);

      const tool = findTool(server.tools, toolName);
      const result = (await tool.handler(params, {})) as { isError: boolean };

      expect(result.isError).toBe(true);
    });
  });
});
