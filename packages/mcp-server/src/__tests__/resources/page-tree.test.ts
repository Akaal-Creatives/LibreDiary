import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerPageTreeResource } from '../../resources/page-tree.js';
import { createMockServer, createMockClient, findResource } from '../helpers.js';
import type { LibreDiaryClient } from '../../client/api-client.js';

describe('Page tree resource', () => {
  let server: ReturnType<typeof createMockServer>;
  let client: LibreDiaryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    server = createMockServer();
    client = createMockClient();
    registerPageTreeResource(server.server as unknown as McpServer, client);
  });

  describe('registration', () => {
    it('should register one resource', () => {
      expect(server.resources).toHaveLength(1);
    });

    it('should register with name "page-tree"', () => {
      expect(() => findResource(server.resources, 'page-tree')).not.toThrow();
    });

    it('should register with URI "librediary://pages/tree"', () => {
      const resource = findResource(server.resources, 'page-tree');
      expect(resource.uri).toBe('librediary://pages/tree');
    });

    it('should have application/json MIME type', () => {
      const resource = findResource(server.resources, 'page-tree');
      expect(resource.options).toMatchObject({ mimeType: 'application/json' });
    });

    it('should have a description', () => {
      const resource = findResource(server.resources, 'page-tree');
      expect(resource.options).toHaveProperty('description');
      expect(typeof resource.options['description']).toBe('string');
    });
  });

  describe('handler', () => {
    it('should fetch page tree from API', async () => {
      const mockPages = [
        { id: 'p1', title: 'Root', children: [{ id: 'p2', title: 'Child', children: [] }] },
      ];
      vi.mocked(client.orgGet).mockResolvedValueOnce({ pages: mockPages });

      const resource = findResource(server.resources, 'page-tree');
      const result = (await resource.handler()) as {
        contents: Array<{ uri: string; mimeType: string; text: string }>;
      };

      expect(client.orgGet).toHaveBeenCalledWith('/pages');
      expect(result.contents).toHaveLength(1);
      expect(result.contents[0]!.uri).toBe('librediary://pages/tree');
      expect(result.contents[0]!.mimeType).toBe('application/json');
    });

    it('should return page data as formatted JSON', async () => {
      const mockPages = [{ id: 'p1', title: 'Test' }];
      vi.mocked(client.orgGet).mockResolvedValueOnce({ pages: mockPages });

      const resource = findResource(server.resources, 'page-tree');
      const result = (await resource.handler()) as {
        contents: Array<{ text: string }>;
      };

      const parsed = JSON.parse(result.contents[0]!.text);
      expect(parsed.pages).toEqual(mockPages);
    });

    it('should return pretty-printed JSON', async () => {
      vi.mocked(client.orgGet).mockResolvedValueOnce({ pages: [] });

      const resource = findResource(server.resources, 'page-tree');
      const result = (await resource.handler()) as {
        contents: Array<{ text: string }>;
      };

      expect(result.contents[0]!.text).toContain('\n');
    });
  });
});
