import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerSearchTools } from '../../tools/search.js';
import { LibreDiaryApiError } from '../../client/api-client.js';
import { createMockServer, createMockClient, findTool } from '../helpers.js';
import type { LibreDiaryClient } from '../../client/api-client.js';

describe('Search tools', () => {
  let server: ReturnType<typeof createMockServer>;
  let client: LibreDiaryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    server = createMockServer();
    client = createMockClient();
    registerSearchTools(server.server as unknown as McpServer, client);
  });

  describe('registration', () => {
    it('should register exactly 1 search tool', () => {
      expect(server.tools).toHaveLength(1);
    });

    it('should register search_pages', () => {
      expect(() => findTool(server.tools, 'search_pages')).not.toThrow();
    });
  });

  describe('search_pages', () => {
    it('should call orgGet with query string', async () => {
      vi.mocked(client.orgGet).mockResolvedValueOnce({ results: [], total: 0 });

      const tool = findTool(server.tools, 'search_pages');
      await tool.handler({ q: 'hello' }, {});

      expect(client.orgGet).toHaveBeenCalledWith('/search?q=hello');
    });

    it('should include limit parameter', async () => {
      vi.mocked(client.orgGet).mockResolvedValueOnce({ results: [], total: 0 });

      const tool = findTool(server.tools, 'search_pages');
      await tool.handler({ q: 'hello', limit: 10 }, {});

      const calledUrl = vi.mocked(client.orgGet).mock.calls[0]![0];
      expect(calledUrl).toContain('limit=10');
    });

    it('should include offset parameter', async () => {
      vi.mocked(client.orgGet).mockResolvedValueOnce({ results: [], total: 0 });

      const tool = findTool(server.tools, 'search_pages');
      await tool.handler({ q: 'hello', offset: 20 }, {});

      const calledUrl = vi.mocked(client.orgGet).mock.calls[0]![0];
      expect(calledUrl).toContain('offset=20');
    });

    it('should include dateFrom filter', async () => {
      vi.mocked(client.orgGet).mockResolvedValueOnce({ results: [], total: 0 });

      const tool = findTool(server.tools, 'search_pages');
      await tool.handler({ q: 'hello', dateFrom: '2024-01-01' }, {});

      const calledUrl = vi.mocked(client.orgGet).mock.calls[0]![0];
      expect(calledUrl).toContain('dateFrom=2024-01-01');
    });

    it('should include dateTo filter', async () => {
      vi.mocked(client.orgGet).mockResolvedValueOnce({ results: [], total: 0 });

      const tool = findTool(server.tools, 'search_pages');
      await tool.handler({ q: 'hello', dateTo: '2024-12-31' }, {});

      const calledUrl = vi.mocked(client.orgGet).mock.calls[0]![0];
      expect(calledUrl).toContain('dateTo=2024-12-31');
    });

    it('should include createdById filter', async () => {
      vi.mocked(client.orgGet).mockResolvedValueOnce({ results: [], total: 0 });

      const tool = findTool(server.tools, 'search_pages');
      await tool.handler({ q: 'hello', createdById: 'user123' }, {});

      const calledUrl = vi.mocked(client.orgGet).mock.calls[0]![0];
      expect(calledUrl).toContain('createdById=user123');
    });

    it('should combine multiple parameters', async () => {
      vi.mocked(client.orgGet).mockResolvedValueOnce({ results: [], total: 0 });

      const tool = findTool(server.tools, 'search_pages');
      await tool.handler({ q: 'hello', limit: 5, offset: 10 }, {});

      const calledUrl = vi.mocked(client.orgGet).mock.calls[0]![0];
      expect(calledUrl).toContain('q=hello');
      expect(calledUrl).toContain('limit=5');
      expect(calledUrl).toContain('offset=10');
    });

    it('should omit undefined optional parameters', async () => {
      vi.mocked(client.orgGet).mockResolvedValueOnce({ results: [], total: 0 });

      const tool = findTool(server.tools, 'search_pages');
      await tool.handler({ q: 'hello' }, {});

      const calledUrl = vi.mocked(client.orgGet).mock.calls[0]![0];
      expect(calledUrl).not.toContain('limit');
      expect(calledUrl).not.toContain('offset');
      expect(calledUrl).not.toContain('dateFrom');
      expect(calledUrl).not.toContain('dateTo');
      expect(calledUrl).not.toContain('createdById');
    });

    it('should URL-encode the query', async () => {
      vi.mocked(client.orgGet).mockResolvedValueOnce({ results: [], total: 0 });

      const tool = findTool(server.tools, 'search_pages');
      await tool.handler({ q: 'hello world' }, {});

      const calledUrl = vi.mocked(client.orgGet).mock.calls[0]![0];
      expect(calledUrl).toContain('q=hello+world');
    });

    it('should handle API errors', async () => {
      vi.mocked(client.orgGet).mockRejectedValueOnce(
        new LibreDiaryApiError(500, 'SERVER_ERROR', 'Search failed')
      );

      const tool = findTool(server.tools, 'search_pages');
      const result = (await tool.handler({ q: 'test' }, {})) as { isError: boolean };

      expect(result.isError).toBe(true);
    });
  });
});
