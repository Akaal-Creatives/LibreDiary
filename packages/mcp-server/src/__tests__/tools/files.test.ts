import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerFileTools } from '../../tools/files.js';
import { LibreDiaryApiError } from '../../client/api-client.js';
import { createMockServer, createMockClient, findTool } from '../helpers.js';
import type { LibreDiaryClient } from '../../client/api-client.js';

describe('File tools', () => {
  let server: ReturnType<typeof createMockServer>;
  let client: LibreDiaryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    server = createMockServer();
    client = createMockClient();
    registerFileTools(server.server as unknown as McpServer, client);
  });

  describe('registration', () => {
    it('should register exactly 3 file tools', () => {
      expect(server.tools).toHaveLength(3);
    });

    it.each(['files_list', 'files_get', 'files_delete'])('should register tool: %s', (name) => {
      expect(() => findTool(server.tools, name)).not.toThrow();
    });
  });

  describe('files_list', () => {
    it('should call orgGet with /files', async () => {
      vi.mocked(client.orgGet).mockResolvedValueOnce({ files: [] });

      const tool = findTool(server.tools, 'files_list');
      await tool.handler({}, {});

      expect(client.orgGet).toHaveBeenCalledWith('/files');
    });

    it('should return file data as JSON', async () => {
      const files = [{ id: 'f1', name: 'image.png' }];
      vi.mocked(client.orgGet).mockResolvedValueOnce({ files });

      const tool = findTool(server.tools, 'files_list');
      const result = (await tool.handler({}, {})) as { content: Array<{ text: string }> };
      const parsed = JSON.parse(result.content[0]!.text);

      expect(parsed.files).toEqual(files);
    });
  });

  describe('files_get', () => {
    it('should call orgGet with /files/:id', async () => {
      vi.mocked(client.orgGet).mockResolvedValueOnce({ file: { id: 'f1' } });

      const tool = findTool(server.tools, 'files_get');
      await tool.handler({ fileId: 'f1' }, {});

      expect(client.orgGet).toHaveBeenCalledWith('/files/f1');
    });
  });

  describe('files_delete', () => {
    it('should call orgDelete with /files/:id', async () => {
      vi.mocked(client.orgDelete).mockResolvedValueOnce({ message: 'Deleted' });

      const tool = findTool(server.tools, 'files_delete');
      await tool.handler({ fileId: 'f1' }, {});

      expect(client.orgDelete).toHaveBeenCalledWith('/files/f1');
    });
  });

  describe('error handling', () => {
    it('should handle file not found error', async () => {
      vi.mocked(client.orgGet).mockRejectedValueOnce(
        new LibreDiaryApiError(404, 'FILE_NOT_FOUND', 'File not found')
      );

      const tool = findTool(server.tools, 'files_get');
      const result = (await tool.handler({ fileId: 'bad' }, {})) as {
        isError: boolean;
        content: Array<{ text: string }>;
      };

      expect(result.isError).toBe(true);
      const parsed = JSON.parse(result.content[0]!.text);
      expect(parsed.error).toBe('FILE_NOT_FOUND');
    });
  });
});
