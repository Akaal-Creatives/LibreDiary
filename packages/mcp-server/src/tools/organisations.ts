/**
 * MCP tools for LibreDiary organisation and user management (6 tools).
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { LibreDiaryClient } from '../client/api-client.js';
import { handleToolError } from './index.js';

export function registerOrganisationTools(server: McpServer, client: LibreDiaryClient): void {
  // -----------------------------------------------
  // org_get — Get current organisation details
  // -----------------------------------------------
  server.tool('org_get', 'Get details of the current organisation', {}, async () => {
    try {
      const data = await client.orgGet('');
      return {
        content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      };
    } catch (error) {
      return handleToolError(error);
    }
  });

  // -----------------------------------------------
  // org_list_all — List all organisations the user belongs to
  // -----------------------------------------------
  server.tool(
    'org_list_all',
    'List all organisations the authenticated user belongs to',
    {},
    async () => {
      try {
        const data = await client.get('/organizations');
        return {
          content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
        };
      } catch (error) {
        return handleToolError(error);
      }
    }
  );

  // -----------------------------------------------
  // org_list_members — List organisation members
  // -----------------------------------------------
  server.tool('org_list_members', 'List all members of the current organisation', {}, async () => {
    try {
      const data = await client.orgGet('/members');
      return {
        content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      };
    } catch (error) {
      return handleToolError(error);
    }
  });

  // -----------------------------------------------
  // org_invite_member — Send an invitation
  // -----------------------------------------------
  server.tool(
    'org_invite_member',
    'Invite a new member to the organisation by email',
    {
      email: z.string().email().describe('Email address to invite'),
      role: z.enum(['ADMIN', 'MEMBER']).optional().describe('Role to assign (defaults to MEMBER)'),
    },
    async (params) => {
      try {
        const data = await client.orgPost('/invites', {
          email: params.email,
          role: params.role ?? 'MEMBER',
        });
        return {
          content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
        };
      } catch (error) {
        return handleToolError(error);
      }
    }
  );

  // -----------------------------------------------
  // auth_me — Get authenticated user info
  // -----------------------------------------------
  server.tool('auth_me', 'Get information about the currently authenticated user', {}, async () => {
    try {
      const data = await client.get('/auth/me');
      return {
        content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      };
    } catch (error) {
      return handleToolError(error);
    }
  });

  // -----------------------------------------------
  // user_update_profile — Update user profile
  // -----------------------------------------------
  server.tool(
    'user_update_profile',
    'Update the authenticated user profile (display name)',
    {
      name: z.string().min(1).max(100).describe('New display name'),
    },
    async (params) => {
      try {
        const data = await client.patch('/auth/profile', { name: params.name });
        return {
          content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
        };
      } catch (error) {
        return handleToolError(error);
      }
    }
  );
}
