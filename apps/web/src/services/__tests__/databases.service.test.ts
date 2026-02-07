import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockApi } = vi.hoisted(() => ({
  mockApi: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('../api', () => ({
  api: mockApi,
}));

import { databasesService } from '../databases.service';

describe('Databases Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===========================================
  // DATABASE CRUD
  // ===========================================

  describe('createDatabase', () => {
    it('should POST to correct endpoint', async () => {
      mockApi.post.mockResolvedValue({ database: { id: 'db-1' } });

      await databasesService.createDatabase('org-1', { name: 'Tasks' });

      expect(mockApi.post).toHaveBeenCalledWith('/organizations/org-1/databases', {
        name: 'Tasks',
      });
    });
  });

  describe('listDatabases', () => {
    it('should GET from correct endpoint', async () => {
      mockApi.get.mockResolvedValue({ databases: [] });

      await databasesService.listDatabases('org-1');

      expect(mockApi.get).toHaveBeenCalledWith('/organizations/org-1/databases');
    });
  });

  describe('getDatabase', () => {
    it('should GET from correct endpoint', async () => {
      mockApi.get.mockResolvedValue({ database: { id: 'db-1' } });

      await databasesService.getDatabase('org-1', 'db-1');

      expect(mockApi.get).toHaveBeenCalledWith('/organizations/org-1/databases/db-1');
    });
  });

  describe('updateDatabase', () => {
    it('should PATCH to correct endpoint', async () => {
      mockApi.patch.mockResolvedValue({ database: { id: 'db-1', name: 'Updated' } });

      await databasesService.updateDatabase('org-1', 'db-1', { name: 'Updated' });

      expect(mockApi.patch).toHaveBeenCalledWith('/organizations/org-1/databases/db-1', {
        name: 'Updated',
      });
    });
  });

  describe('deleteDatabase', () => {
    it('should DELETE to correct endpoint', async () => {
      mockApi.delete.mockResolvedValue({ message: 'deleted' });

      await databasesService.deleteDatabase('org-1', 'db-1');

      expect(mockApi.delete).toHaveBeenCalledWith('/organizations/org-1/databases/db-1');
    });
  });

  // ===========================================
  // PROPERTY MANAGEMENT
  // ===========================================

  describe('createProperty', () => {
    it('should POST to correct endpoint', async () => {
      mockApi.post.mockResolvedValue({ property: { id: 'prop-1' } });

      await databasesService.createProperty('org-1', 'db-1', { name: 'Status', type: 'SELECT' });

      expect(mockApi.post).toHaveBeenCalledWith('/organizations/org-1/databases/db-1/properties', {
        name: 'Status',
        type: 'SELECT',
      });
    });
  });

  describe('updateProperty', () => {
    it('should PATCH to correct endpoint', async () => {
      mockApi.patch.mockResolvedValue({ property: { id: 'prop-1' } });

      await databasesService.updateProperty('org-1', 'db-1', 'prop-1', { name: 'Renamed' });

      expect(mockApi.patch).toHaveBeenCalledWith(
        '/organizations/org-1/databases/db-1/properties/prop-1',
        { name: 'Renamed' }
      );
    });
  });

  describe('deleteProperty', () => {
    it('should DELETE to correct endpoint', async () => {
      mockApi.delete.mockResolvedValue({ message: 'deleted' });

      await databasesService.deleteProperty('org-1', 'db-1', 'prop-1');

      expect(mockApi.delete).toHaveBeenCalledWith(
        '/organizations/org-1/databases/db-1/properties/prop-1'
      );
    });
  });

  describe('reorderProperties', () => {
    it('should POST orderedIds to correct endpoint', async () => {
      mockApi.post.mockResolvedValue({ message: 'reordered' });

      await databasesService.reorderProperties('org-1', 'db-1', ['prop-b', 'prop-a']);

      expect(mockApi.post).toHaveBeenCalledWith(
        '/organizations/org-1/databases/db-1/properties/reorder',
        { orderedIds: ['prop-b', 'prop-a'] }
      );
    });
  });

  // ===========================================
  // ROW CRUD
  // ===========================================

  describe('createRow', () => {
    it('should POST to correct endpoint', async () => {
      mockApi.post.mockResolvedValue({ row: { id: 'row-1' } });

      await databasesService.createRow('org-1', 'db-1', { cells: { 'prop-1': 'Hello' } });

      expect(mockApi.post).toHaveBeenCalledWith('/organizations/org-1/databases/db-1/rows', {
        cells: { 'prop-1': 'Hello' },
      });
    });
  });

  describe('updateRow', () => {
    it('should PATCH to correct endpoint', async () => {
      mockApi.patch.mockResolvedValue({ row: { id: 'row-1' } });

      await databasesService.updateRow('org-1', 'db-1', 'row-1', {
        cells: { 'prop-1': 'Updated' },
      });

      expect(mockApi.patch).toHaveBeenCalledWith('/organizations/org-1/databases/db-1/rows/row-1', {
        cells: { 'prop-1': 'Updated' },
      });
    });
  });

  describe('deleteRow', () => {
    it('should DELETE to correct endpoint', async () => {
      mockApi.delete.mockResolvedValue({ message: 'deleted' });

      await databasesService.deleteRow('org-1', 'db-1', 'row-1');

      expect(mockApi.delete).toHaveBeenCalledWith('/organizations/org-1/databases/db-1/rows/row-1');
    });
  });

  describe('reorderRows', () => {
    it('should POST orderedIds to correct endpoint', async () => {
      mockApi.post.mockResolvedValue({ message: 'reordered' });

      await databasesService.reorderRows('org-1', 'db-1', ['row-b', 'row-a']);

      expect(mockApi.post).toHaveBeenCalledWith(
        '/organizations/org-1/databases/db-1/rows/reorder',
        { orderedIds: ['row-b', 'row-a'] }
      );
    });
  });

  describe('bulkDeleteRows', () => {
    it('should POST rowIds to correct endpoint', async () => {
      mockApi.post.mockResolvedValue({ count: 2, message: '2 rows deleted' });

      await databasesService.bulkDeleteRows('org-1', 'db-1', ['row-1', 'row-2']);

      expect(mockApi.post).toHaveBeenCalledWith(
        '/organizations/org-1/databases/db-1/rows/bulk-delete',
        { rowIds: ['row-1', 'row-2'] }
      );
    });
  });

  // ===========================================
  // VIEW MANAGEMENT
  // ===========================================

  describe('createView', () => {
    it('should POST to correct endpoint', async () => {
      mockApi.post.mockResolvedValue({ view: { id: 'view-1' } });

      await databasesService.createView('org-1', 'db-1', { name: 'Kanban', type: 'KANBAN' });

      expect(mockApi.post).toHaveBeenCalledWith('/organizations/org-1/databases/db-1/views', {
        name: 'Kanban',
        type: 'KANBAN',
      });
    });
  });

  describe('updateView', () => {
    it('should PATCH to correct endpoint', async () => {
      mockApi.patch.mockResolvedValue({ view: { id: 'view-1' } });

      await databasesService.updateView('org-1', 'db-1', 'view-1', { name: 'Renamed' });

      expect(mockApi.patch).toHaveBeenCalledWith(
        '/organizations/org-1/databases/db-1/views/view-1',
        { name: 'Renamed' }
      );
    });
  });

  describe('deleteView', () => {
    it('should DELETE to correct endpoint', async () => {
      mockApi.delete.mockResolvedValue({ message: 'deleted' });

      await databasesService.deleteView('org-1', 'db-1', 'view-1');

      expect(mockApi.delete).toHaveBeenCalledWith(
        '/organizations/org-1/databases/db-1/views/view-1'
      );
    });
  });

  describe('reorderViews', () => {
    it('should POST orderedIds to correct endpoint', async () => {
      mockApi.post.mockResolvedValue({ message: 'reordered' });

      await databasesService.reorderViews('org-1', 'db-1', ['view-b', 'view-a']);

      expect(mockApi.post).toHaveBeenCalledWith(
        '/organizations/org-1/databases/db-1/views/reorder',
        { orderedIds: ['view-b', 'view-a'] }
      );
    });
  });
});
