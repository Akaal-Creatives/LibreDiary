/**
 * MCP tools for LibreDiary database management (11 tools).
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { LibreDiaryClient } from '../client/api-client.js';
import { handleToolError } from './index.js';

const propertyTypeEnum = z.enum([
  'TEXT',
  'NUMBER',
  'SELECT',
  'MULTI_SELECT',
  'DATE',
  'CHECKBOX',
  'URL',
  'EMAIL',
  'PHONE',
  'PERSON',
  'FILES',
  'RELATION',
  'ROLLUP',
  'FORMULA',
  'CREATED_TIME',
  'CREATED_BY',
  'UPDATED_TIME',
  'UPDATED_BY',
]);

export function registerDatabaseTools(server: McpServer, client: LibreDiaryClient): void {
  // -----------------------------------------------
  // databases_list
  // -----------------------------------------------
  server.tool('databases_list', 'List all databases in the workspace', {}, async () => {
    try {
      const data = await client.orgGet('/databases');
      return {
        content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
      };
    } catch (error) {
      return handleToolError(error);
    }
  });

  // -----------------------------------------------
  // databases_get
  // -----------------------------------------------
  server.tool(
    'databases_get',
    'Get a database with its properties, views, and rows',
    { databaseId: z.string().describe('The database ID') },
    async ({ databaseId }) => {
      try {
        const data = await client.orgGet(`/databases/${databaseId}`);
        return {
          content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
        };
      } catch (error) {
        return handleToolError(error);
      }
    }
  );

  // -----------------------------------------------
  // databases_create
  // -----------------------------------------------
  server.tool(
    'databases_create',
    'Create a new database',
    {
      name: z.string().min(1).max(200).describe('Database name'),
      pageId: z.string().optional().describe('Page ID to attach the database to'),
    },
    async (params) => {
      try {
        const data = await client.orgPost('/databases', params);
        return {
          content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
        };
      } catch (error) {
        return handleToolError(error);
      }
    }
  );

  // -----------------------------------------------
  // databases_update
  // -----------------------------------------------
  server.tool(
    'databases_update',
    'Update a database name or linked page',
    {
      databaseId: z.string().describe('The database ID to update'),
      name: z.string().min(1).max(200).optional().describe('New database name'),
      pageId: z.string().nullable().optional().describe('New linked page ID'),
    },
    async ({ databaseId, ...body }) => {
      try {
        const data = await client.orgPatch(`/databases/${databaseId}`, body);
        return {
          content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
        };
      } catch (error) {
        return handleToolError(error);
      }
    }
  );

  // -----------------------------------------------
  // databases_delete
  // -----------------------------------------------
  server.tool(
    'databases_delete',
    'Delete a database and all its data',
    { databaseId: z.string().describe('The database ID to delete') },
    async ({ databaseId }) => {
      try {
        const data = await client.orgDelete(`/databases/${databaseId}`);
        return {
          content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
        };
      } catch (error) {
        return handleToolError(error);
      }
    }
  );

  // -----------------------------------------------
  // databases_add_property
  // -----------------------------------------------
  server.tool(
    'databases_add_property',
    'Add a new property (column) to a database',
    {
      databaseId: z.string().describe('The database ID'),
      name: z.string().min(1).max(100).describe('Property name'),
      type: propertyTypeEnum.describe('Property type'),
      config: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Property-specific configuration (e.g. select options)'),
    },
    async ({ databaseId, ...body }) => {
      try {
        const data = await client.orgPost(`/databases/${databaseId}/properties`, body);
        return {
          content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
        };
      } catch (error) {
        return handleToolError(error);
      }
    }
  );

  // -----------------------------------------------
  // databases_update_property
  // -----------------------------------------------
  server.tool(
    'databases_update_property',
    'Update a database property (column) name, type, or config',
    {
      databaseId: z.string().describe('The database ID'),
      propertyId: z.string().describe('The property ID to update'),
      name: z.string().min(1).max(100).optional().describe('New property name'),
      type: propertyTypeEnum.optional().describe('New property type'),
      config: z
        .record(z.string(), z.unknown())
        .nullable()
        .optional()
        .describe('New property configuration'),
    },
    async ({ databaseId, propertyId, ...body }) => {
      try {
        const data = await client.orgPatch(
          `/databases/${databaseId}/properties/${propertyId}`,
          body
        );
        return {
          content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
        };
      } catch (error) {
        return handleToolError(error);
      }
    }
  );

  // -----------------------------------------------
  // databases_delete_property
  // -----------------------------------------------
  server.tool(
    'databases_delete_property',
    'Delete a property (column) from a database',
    {
      databaseId: z.string().describe('The database ID'),
      propertyId: z.string().describe('The property ID to delete'),
    },
    async ({ databaseId, propertyId }) => {
      try {
        const data = await client.orgDelete(`/databases/${databaseId}/properties/${propertyId}`);
        return {
          content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
        };
      } catch (error) {
        return handleToolError(error);
      }
    }
  );

  // -----------------------------------------------
  // databases_create_row
  // -----------------------------------------------
  server.tool(
    'databases_create_row',
    'Add a new row to a database',
    {
      databaseId: z.string().describe('The database ID'),
      cells: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Cell values keyed by property ID'),
    },
    async ({ databaseId, ...body }) => {
      try {
        const data = await client.orgPost(`/databases/${databaseId}/rows`, body);
        return {
          content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
        };
      } catch (error) {
        return handleToolError(error);
      }
    }
  );

  // -----------------------------------------------
  // databases_update_row
  // -----------------------------------------------
  server.tool(
    'databases_update_row',
    'Update cell values in a database row',
    {
      databaseId: z.string().describe('The database ID'),
      rowId: z.string().describe('The row ID to update'),
      cells: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Updated cell values keyed by property ID'),
    },
    async ({ databaseId, rowId, ...body }) => {
      try {
        const data = await client.orgPatch(`/databases/${databaseId}/rows/${rowId}`, body);
        return {
          content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
        };
      } catch (error) {
        return handleToolError(error);
      }
    }
  );

  // -----------------------------------------------
  // databases_delete_row
  // -----------------------------------------------
  server.tool(
    'databases_delete_row',
    'Delete a row from a database',
    {
      databaseId: z.string().describe('The database ID'),
      rowId: z.string().describe('The row ID to delete'),
    },
    async ({ databaseId, rowId }) => {
      try {
        const data = await client.orgDelete(`/databases/${databaseId}/rows/${rowId}`);
        return {
          content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
        };
      } catch (error) {
        return handleToolError(error);
      }
    }
  );
}
