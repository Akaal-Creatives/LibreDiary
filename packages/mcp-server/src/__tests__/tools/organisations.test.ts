import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerOrganisationTools } from '../../tools/organisations.js';
import { LibreDiaryApiError } from '../../client/api-client.js';
import { createMockServer, createMockClient, findTool } from '../helpers.js';
import type { LibreDiaryClient } from '../../client/api-client.js';

describe('Organisation tools', () => {
  let server: ReturnType<typeof createMockServer>;
  let client: LibreDiaryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    server = createMockServer();
    client = createMockClient();
    registerOrganisationTools(server.server as unknown as McpServer, client);
  });

  describe('registration', () => {
    it('should register exactly 5 organisation tools', () => {
      expect(server.tools).toHaveLength(5);
    });

    it.each(['org_get', 'org_list_all', 'org_list_members', 'org_invite_member', 'auth_me'])(
      'should register tool: %s',
      (name) => {
        expect(() => findTool(server.tools, name)).not.toThrow();
      }
    );
  });

  describe('org_get', () => {
    it('should call orgGet with empty path', async () => {
      vi.mocked(client.orgGet).mockResolvedValueOnce({ organization: {} });

      const tool = findTool(server.tools, 'org_get');
      await tool.handler({}, {});

      expect(client.orgGet).toHaveBeenCalledWith('');
    });
  });

  describe('org_list_all', () => {
    it('should call non-org get with /organizations', async () => {
      vi.mocked(client.get).mockResolvedValueOnce({ organizations: [] });

      const tool = findTool(server.tools, 'org_list_all');
      await tool.handler({}, {});

      expect(client.get).toHaveBeenCalledWith('/organizations');
    });
  });

  describe('org_list_members', () => {
    it('should call orgGet with /members', async () => {
      vi.mocked(client.orgGet).mockResolvedValueOnce({ members: [] });

      const tool = findTool(server.tools, 'org_list_members');
      await tool.handler({}, {});

      expect(client.orgGet).toHaveBeenCalledWith('/members');
    });
  });

  describe('org_invite_member', () => {
    it('should POST to /invites with email and role', async () => {
      vi.mocked(client.orgPost).mockResolvedValueOnce({ invite: {} });

      const tool = findTool(server.tools, 'org_invite_member');
      await tool.handler({ email: 'new@example.com', role: 'ADMIN' }, {});

      expect(client.orgPost).toHaveBeenCalledWith('/invites', {
        email: 'new@example.com',
        role: 'ADMIN',
      });
    });

    it('should default role to MEMBER when not specified', async () => {
      vi.mocked(client.orgPost).mockResolvedValueOnce({ invite: {} });

      const tool = findTool(server.tools, 'org_invite_member');
      await tool.handler({ email: 'new@example.com' }, {});

      expect(client.orgPost).toHaveBeenCalledWith('/invites', {
        email: 'new@example.com',
        role: 'MEMBER',
      });
    });
  });

  describe('auth_me', () => {
    it('should call non-org get with /auth/me', async () => {
      vi.mocked(client.get).mockResolvedValueOnce({ user: { id: 'u1' } });

      const tool = findTool(server.tools, 'auth_me');
      await tool.handler({}, {});

      expect(client.get).toHaveBeenCalledWith('/auth/me');
    });
  });

  describe('error handling', () => {
    it('should return error result on API failure', async () => {
      vi.mocked(client.orgGet).mockRejectedValueOnce(
        new LibreDiaryApiError(403, 'FORBIDDEN', 'Access denied')
      );

      const tool = findTool(server.tools, 'org_get');
      const result = (await tool.handler({}, {})) as { isError: boolean };

      expect(result.isError).toBe(true);
    });
  });
});
