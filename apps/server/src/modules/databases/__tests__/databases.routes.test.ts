import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock auth middleware
vi.mock('../../auth/auth.middleware.js', () => ({
  requireAuth: vi.fn(async (request: { user: { id: string; email: string; name: string } }) => {
    request.user = { id: 'user-123', email: 'test@example.com', name: 'Test User' };
  }),
}));

vi.mock('../../organizations/organizations.middleware.js', () => ({
  requireOrgAccess: vi.fn(async (request: { organizationId: string }) => {
    request.organizationId = 'org-123';
  }),
}));

// Mock service
const { mockService, resetMocks } = vi.hoisted(() => {
  const mockService = {
    createDatabase: vi.fn(),
    getDatabase: vi.fn(),
    listDatabases: vi.fn(),
    updateDatabase: vi.fn(),
    deleteDatabase: vi.fn(),
    createProperty: vi.fn(),
    updateProperty: vi.fn(),
    deleteProperty: vi.fn(),
    reorderProperties: vi.fn(),
    createRow: vi.fn(),
    getRow: vi.fn(),
    updateRow: vi.fn(),
    deleteRow: vi.fn(),
    reorderRows: vi.fn(),
    bulkDeleteRows: vi.fn(),
    createView: vi.fn(),
    updateView: vi.fn(),
    deleteView: vi.fn(),
    reorderViews: vi.fn(),
  };

  function resetMocks() {
    Object.values(mockService).forEach((mock) => mock.mockReset());
  }

  return { mockService, resetMocks };
});

vi.mock('../databases.service.js', () => mockService);

import Fastify from 'fastify';
import { databasesRoutes } from '../databases.routes.js';

describe('Databases Routes', () => {
  let app: ReturnType<typeof Fastify>;

  beforeEach(async () => {
    resetMocks();
    app = Fastify();
    app.decorateRequest('user', null);
    app.decorateRequest('organizationId', null);
    await app.register(databasesRoutes, { prefix: '/organizations/:orgId/databases' });
    await app.ready();
  });

  afterEach(async () => {
    vi.clearAllMocks();
    await app.close();
  });

  // ===========================================
  // DATABASE CRUD
  // ===========================================

  describe('POST /organizations/:orgId/databases', () => {
    it('should create a database and return 201', async () => {
      const mockDb = { id: 'db-1', name: 'Tasks', properties: [], views: [], rows: [] };
      mockService.createDatabase.mockResolvedValue(mockDb);

      const response = await app.inject({
        method: 'POST',
        url: '/organizations/org-123/databases',
        payload: { name: 'Tasks' },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.database.name).toBe('Tasks');
    });

    it('should return 400 for missing name', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/organizations/org-123/databases',
        payload: {},
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /organizations/:orgId/databases', () => {
    it('should list databases', async () => {
      mockService.listDatabases.mockResolvedValue([{ id: 'db-1' }, { id: 'db-2' }]);

      const response = await app.inject({
        method: 'GET',
        url: '/organizations/org-123/databases',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.databases).toHaveLength(2);
    });
  });

  describe('GET /organizations/:orgId/databases/:databaseId', () => {
    it('should return a database with relations', async () => {
      mockService.getDatabase.mockResolvedValue({
        id: 'db-1',
        name: 'Tasks',
        properties: [],
        views: [],
        rows: [],
      });

      const response = await app.inject({
        method: 'GET',
        url: '/organizations/org-123/databases/db-1',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.database.id).toBe('db-1');
    });

    it('should return 404 when database not found', async () => {
      mockService.getDatabase.mockRejectedValue(new Error('DATABASE_NOT_FOUND'));

      const response = await app.inject({
        method: 'GET',
        url: '/organizations/org-123/databases/db-999',
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('PATCH /organizations/:orgId/databases/:databaseId', () => {
    it('should update database name', async () => {
      mockService.updateDatabase.mockResolvedValue({ id: 'db-1', name: 'Updated' });

      const response = await app.inject({
        method: 'PATCH',
        url: '/organizations/org-123/databases/db-1',
        payload: { name: 'Updated' },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.database.name).toBe('Updated');
    });
  });

  describe('DELETE /organizations/:orgId/databases/:databaseId', () => {
    it('should delete a database', async () => {
      mockService.deleteDatabase.mockResolvedValue(undefined);

      const response = await app.inject({
        method: 'DELETE',
        url: '/organizations/org-123/databases/db-1',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
    });

    it('should return 404 when database not found', async () => {
      mockService.deleteDatabase.mockRejectedValue(new Error('DATABASE_NOT_FOUND'));

      const response = await app.inject({
        method: 'DELETE',
        url: '/organizations/org-123/databases/db-999',
      });

      expect(response.statusCode).toBe(404);
    });
  });

  // ===========================================
  // PROPERTY MANAGEMENT
  // ===========================================

  describe('POST /organizations/:orgId/databases/:databaseId/properties', () => {
    it('should create a property and return 201', async () => {
      mockService.createProperty.mockResolvedValue({
        id: 'prop-1',
        name: 'Status',
        type: 'SELECT',
      });

      const response = await app.inject({
        method: 'POST',
        url: '/organizations/org-123/databases/db-1/properties',
        payload: { name: 'Status', type: 'SELECT' },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.data.property.name).toBe('Status');
    });

    it('should return 400 for invalid property type', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/organizations/org-123/databases/db-1/properties',
        payload: { name: 'Bad', type: 'INVALID' },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('PATCH /organizations/:orgId/databases/:databaseId/properties/:propertyId', () => {
    it('should update a property', async () => {
      mockService.updateProperty.mockResolvedValue({ id: 'prop-1', name: 'Renamed' });

      const response = await app.inject({
        method: 'PATCH',
        url: '/organizations/org-123/databases/db-1/properties/prop-1',
        payload: { name: 'Renamed' },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.property.name).toBe('Renamed');
    });
  });

  describe('DELETE /organizations/:orgId/databases/:databaseId/properties/:propertyId', () => {
    it('should delete a property', async () => {
      mockService.deleteProperty.mockResolvedValue(undefined);

      const response = await app.inject({
        method: 'DELETE',
        url: '/organizations/org-123/databases/db-1/properties/prop-1',
      });

      expect(response.statusCode).toBe(200);
    });

    it('should return 400 when trying to delete title property', async () => {
      mockService.deleteProperty.mockRejectedValue(new Error('CANNOT_DELETE_TITLE_PROPERTY'));

      const response = await app.inject({
        method: 'DELETE',
        url: '/organizations/org-123/databases/db-1/properties/prop-1',
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('CANNOT_DELETE_TITLE_PROPERTY');
    });
  });

  describe('POST /organizations/:orgId/databases/:databaseId/properties/reorder', () => {
    it('should reorder properties', async () => {
      mockService.reorderProperties.mockResolvedValue(undefined);

      const response = await app.inject({
        method: 'POST',
        url: '/organizations/org-123/databases/db-1/properties/reorder',
        payload: { orderedIds: ['prop-b', 'prop-a'] },
      });

      expect(response.statusCode).toBe(200);
    });

    it('should return 400 for empty orderedIds', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/organizations/org-123/databases/db-1/properties/reorder',
        payload: { orderedIds: [] },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  // ===========================================
  // ROW CRUD
  // ===========================================

  describe('POST /organizations/:orgId/databases/:databaseId/rows', () => {
    it('should create a row and return 201', async () => {
      mockService.createRow.mockResolvedValue({ id: 'row-1', cells: { 'prop-1': 'Hello' } });

      const response = await app.inject({
        method: 'POST',
        url: '/organizations/org-123/databases/db-1/rows',
        payload: { cells: { 'prop-1': 'Hello' } },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.data.row.id).toBe('row-1');
    });

    it('should create a row with empty body', async () => {
      mockService.createRow.mockResolvedValue({ id: 'row-1', cells: {} });

      const response = await app.inject({
        method: 'POST',
        url: '/organizations/org-123/databases/db-1/rows',
        payload: {},
      });

      expect(response.statusCode).toBe(201);
    });
  });

  describe('PATCH /organizations/:orgId/databases/:databaseId/rows/:rowId', () => {
    it('should update a row', async () => {
      mockService.updateRow.mockResolvedValue({
        id: 'row-1',
        cells: { 'prop-1': 'Updated' },
      });

      const response = await app.inject({
        method: 'PATCH',
        url: '/organizations/org-123/databases/db-1/rows/row-1',
        payload: { cells: { 'prop-1': 'Updated' } },
      });

      expect(response.statusCode).toBe(200);
    });

    it('should return 404 when row not found', async () => {
      mockService.updateRow.mockRejectedValue(new Error('ROW_NOT_FOUND'));

      const response = await app.inject({
        method: 'PATCH',
        url: '/organizations/org-123/databases/db-1/rows/row-999',
        payload: { cells: {} },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('DELETE /organizations/:orgId/databases/:databaseId/rows/:rowId', () => {
    it('should delete a row', async () => {
      mockService.deleteRow.mockResolvedValue(undefined);

      const response = await app.inject({
        method: 'DELETE',
        url: '/organizations/org-123/databases/db-1/rows/row-1',
      });

      expect(response.statusCode).toBe(200);
    });
  });

  describe('POST /organizations/:orgId/databases/:databaseId/rows/reorder', () => {
    it('should reorder rows', async () => {
      mockService.reorderRows.mockResolvedValue(undefined);

      const response = await app.inject({
        method: 'POST',
        url: '/organizations/org-123/databases/db-1/rows/reorder',
        payload: { orderedIds: ['row-b', 'row-a'] },
      });

      expect(response.statusCode).toBe(200);
    });
  });

  describe('POST /organizations/:orgId/databases/:databaseId/rows/bulk-delete', () => {
    it('should bulk delete rows', async () => {
      mockService.bulkDeleteRows.mockResolvedValue(3);

      const response = await app.inject({
        method: 'POST',
        url: '/organizations/org-123/databases/db-1/rows/bulk-delete',
        payload: { rowIds: ['row-1', 'row-2', 'row-3'] },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.count).toBe(3);
    });

    it('should return 400 for empty rowIds', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/organizations/org-123/databases/db-1/rows/bulk-delete',
        payload: { rowIds: [] },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  // ===========================================
  // VIEW MANAGEMENT
  // ===========================================

  describe('POST /organizations/:orgId/databases/:databaseId/views', () => {
    it('should create a view and return 201', async () => {
      mockService.createView.mockResolvedValue({ id: 'view-1', name: 'Kanban', type: 'KANBAN' });

      const response = await app.inject({
        method: 'POST',
        url: '/organizations/org-123/databases/db-1/views',
        payload: { name: 'Kanban', type: 'KANBAN' },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.data.view.name).toBe('Kanban');
    });

    it('should return 400 for invalid view type', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/organizations/org-123/databases/db-1/views',
        payload: { name: 'Bad', type: 'INVALID' },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('PATCH /organizations/:orgId/databases/:databaseId/views/:viewId', () => {
    it('should update a view', async () => {
      mockService.updateView.mockResolvedValue({ id: 'view-1', name: 'Renamed' });

      const response = await app.inject({
        method: 'PATCH',
        url: '/organizations/org-123/databases/db-1/views/view-1',
        payload: { name: 'Renamed' },
      });

      expect(response.statusCode).toBe(200);
    });
  });

  describe('DELETE /organizations/:orgId/databases/:databaseId/views/:viewId', () => {
    it('should delete a view', async () => {
      mockService.deleteView.mockResolvedValue(undefined);

      const response = await app.inject({
        method: 'DELETE',
        url: '/organizations/org-123/databases/db-1/views/view-1',
      });

      expect(response.statusCode).toBe(200);
    });

    it('should return 400 when deleting last view', async () => {
      mockService.deleteView.mockRejectedValue(new Error('CANNOT_DELETE_LAST_VIEW'));

      const response = await app.inject({
        method: 'DELETE',
        url: '/organizations/org-123/databases/db-1/views/view-1',
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('CANNOT_DELETE_LAST_VIEW');
    });
  });

  describe('POST /organizations/:orgId/databases/:databaseId/views/reorder', () => {
    it('should reorder views', async () => {
      mockService.reorderViews.mockResolvedValue(undefined);

      const response = await app.inject({
        method: 'POST',
        url: '/organizations/org-123/databases/db-1/views/reorder',
        payload: { orderedIds: ['view-b', 'view-a'] },
      });

      expect(response.statusCode).toBe(200);
    });
  });

  // ===========================================
  // ERROR HANDLING
  // ===========================================

  describe('Error handling', () => {
    it('should return 500 for unexpected errors', async () => {
      mockService.listDatabases.mockRejectedValue(new Error('DB_CONNECTION_FAILED'));

      const response = await app.inject({
        method: 'GET',
        url: '/organizations/org-123/databases',
      });

      // listDatabases is not wrapped in try/catch at route level (called directly)
      // so Fastify handles it as a 500
      expect(response.statusCode).toBe(500);
    });
  });
});
