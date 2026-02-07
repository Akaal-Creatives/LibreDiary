import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock prisma
const { mockPrisma, resetMocks } = vi.hoisted(() => {
  const mockPrisma = {
    database: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    databaseProperty: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      aggregate: vi.fn(),
      count: vi.fn(),
    },
    databaseRow: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
      aggregate: vi.fn(),
    },
    databaseView: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      aggregate: vi.fn(),
      count: vi.fn(),
    },
    $transaction: vi.fn(),
  };

  function resetMocks() {
    for (const model of Object.values(mockPrisma)) {
      if (typeof model === 'function') {
        (model as ReturnType<typeof vi.fn>).mockReset();
      } else {
        for (const method of Object.values(model)) {
          (method as ReturnType<typeof vi.fn>).mockReset();
        }
      }
    }
  }

  return { mockPrisma, resetMocks };
});

vi.mock('../../../lib/prisma.js', () => ({
  prisma: mockPrisma,
}));

import {
  createDatabase,
  getDatabase,
  listDatabases,
  updateDatabase,
  deleteDatabase,
  createProperty,
  updateProperty,
  deleteProperty,
  reorderProperties,
  createRow,
  getRow,
  updateRow,
  deleteRow,
  reorderRows,
  bulkDeleteRows,
  createView,
  updateView,
  deleteView,
  reorderViews,
} from '../databases.service.js';

describe('Databases Service', () => {
  beforeEach(() => {
    resetMocks();
  });

  // ===========================================
  // DATABASE CRUD
  // ===========================================

  describe('createDatabase', () => {
    it('should create a database with default Title property and Table view', async () => {
      const mockDb = { id: 'db-1', organizationId: 'org-1', name: 'My DB' };
      const mockResult = {
        ...mockDb,
        properties: [{ id: 'prop-1', name: 'Title', type: 'TEXT', position: 0 }],
        views: [{ id: 'view-1', name: 'Table view', type: 'TABLE', position: 0 }],
        rows: [],
      };

      mockPrisma.$transaction.mockImplementation(
        async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => {
          return fn(mockPrisma as unknown as typeof mockPrisma);
        }
      );
      mockPrisma.database.create.mockResolvedValue(mockDb);
      mockPrisma.databaseProperty.create.mockResolvedValue({});
      mockPrisma.databaseView.create.mockResolvedValue({});
      mockPrisma.database.findUniqueOrThrow.mockResolvedValue(mockResult);

      const result = await createDatabase('org-1', 'user-1', { name: 'My DB' });

      expect(result.properties).toHaveLength(1);
      expect(result.properties[0].name).toBe('Title');
      expect(result.properties[0].type).toBe('TEXT');
      expect(result.views).toHaveLength(1);
      expect(result.views[0].name).toBe('Table view');
      expect(result.views[0].type).toBe('TABLE');
    });

    it('should associate with a page if pageId is provided', async () => {
      mockPrisma.$transaction.mockImplementation(
        async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => {
          return fn(mockPrisma as unknown as typeof mockPrisma);
        }
      );
      mockPrisma.database.create.mockResolvedValue({ id: 'db-1' });
      mockPrisma.databaseProperty.create.mockResolvedValue({});
      mockPrisma.databaseView.create.mockResolvedValue({});
      mockPrisma.database.findUniqueOrThrow.mockResolvedValue({ id: 'db-1', pageId: 'page-1' });

      await createDatabase('org-1', 'user-1', { name: 'DB', pageId: 'page-1' });

      expect(mockPrisma.database.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ pageId: 'page-1' }),
        })
      );
    });
  });

  describe('getDatabase', () => {
    it('should return database with relations', async () => {
      const mockResult = {
        id: 'db-1',
        organizationId: 'org-1',
        properties: [],
        views: [],
        rows: [],
      };
      mockPrisma.database.findFirst.mockResolvedValue(mockResult);

      const result = await getDatabase('org-1', 'db-1');
      expect(result.id).toBe('db-1');
    });

    it('should throw DATABASE_NOT_FOUND when database does not exist', async () => {
      mockPrisma.database.findFirst.mockResolvedValue(null);
      await expect(getDatabase('org-1', 'db-999')).rejects.toThrow('DATABASE_NOT_FOUND');
    });
  });

  describe('listDatabases', () => {
    it('should return all databases for an organisation', async () => {
      const mockDbs = [{ id: 'db-1' }, { id: 'db-2' }];
      mockPrisma.database.findMany.mockResolvedValue(mockDbs);

      const result = await listDatabases('org-1');
      expect(result).toHaveLength(2);
    });
  });

  describe('updateDatabase', () => {
    it('should update database name', async () => {
      mockPrisma.database.findFirst.mockResolvedValue({ id: 'db-1' });
      mockPrisma.database.update.mockResolvedValue({ id: 'db-1', name: 'Updated' });

      const result = await updateDatabase('org-1', 'db-1', { name: 'Updated' });
      expect(result.name).toBe('Updated');
    });

    it('should throw DATABASE_NOT_FOUND when database does not exist', async () => {
      mockPrisma.database.findFirst.mockResolvedValue(null);
      await expect(updateDatabase('org-1', 'db-999', { name: 'x' })).rejects.toThrow(
        'DATABASE_NOT_FOUND'
      );
    });
  });

  describe('deleteDatabase', () => {
    it('should delete an existing database', async () => {
      mockPrisma.database.findFirst.mockResolvedValue({ id: 'db-1' });
      mockPrisma.database.delete.mockResolvedValue({});

      await deleteDatabase('org-1', 'db-1');
      expect(mockPrisma.database.delete).toHaveBeenCalledWith({ where: { id: 'db-1' } });
    });

    it('should throw DATABASE_NOT_FOUND when database does not exist', async () => {
      mockPrisma.database.findFirst.mockResolvedValue(null);
      await expect(deleteDatabase('org-1', 'db-999')).rejects.toThrow('DATABASE_NOT_FOUND');
    });
  });

  // ===========================================
  // PROPERTY MANAGEMENT
  // ===========================================

  describe('createProperty', () => {
    it('should create a new property at the next position', async () => {
      mockPrisma.database.findFirst.mockResolvedValue({ id: 'db-1' });
      mockPrisma.databaseProperty.aggregate.mockResolvedValue({ _max: { position: 1 } });
      mockPrisma.databaseProperty.create.mockResolvedValue({
        id: 'prop-2',
        name: 'Status',
        type: 'SELECT',
        position: 2,
      });

      const result = await createProperty('org-1', 'db-1', {
        name: 'Status',
        type: 'SELECT' as const,
      });
      expect(result.position).toBe(2);
      expect(result.type).toBe('SELECT');
    });

    it('should throw DATABASE_NOT_FOUND when database does not exist', async () => {
      mockPrisma.database.findFirst.mockResolvedValue(null);
      await expect(
        createProperty('org-1', 'db-999', { name: 'X', type: 'TEXT' as const })
      ).rejects.toThrow('DATABASE_NOT_FOUND');
    });
  });

  describe('updateProperty', () => {
    it('should update property name and type', async () => {
      mockPrisma.database.findFirst.mockResolvedValue({ id: 'db-1' });
      mockPrisma.databaseProperty.findFirst.mockResolvedValue({ id: 'prop-1' });
      mockPrisma.databaseProperty.update.mockResolvedValue({
        id: 'prop-1',
        name: 'Renamed',
        type: 'NUMBER',
      });

      const result = await updateProperty('org-1', 'db-1', 'prop-1', {
        name: 'Renamed',
        type: 'NUMBER' as const,
      });
      expect(result.name).toBe('Renamed');
    });

    it('should throw PROPERTY_NOT_FOUND when property does not exist', async () => {
      mockPrisma.database.findFirst.mockResolvedValue({ id: 'db-1' });
      mockPrisma.databaseProperty.findFirst.mockResolvedValue(null);

      await expect(updateProperty('org-1', 'db-1', 'prop-999', { name: 'X' })).rejects.toThrow(
        'PROPERTY_NOT_FOUND'
      );
    });
  });

  describe('deleteProperty', () => {
    it('should delete a property and strip its key from row cells', async () => {
      mockPrisma.database.findFirst.mockResolvedValue({ id: 'db-1' });
      mockPrisma.databaseProperty.findFirst.mockResolvedValue({ id: 'prop-2', position: 1 });

      const mockRows = [
        { id: 'row-1', cells: { 'prop-1': 'Title', 'prop-2': 'remove me' } },
        { id: 'row-2', cells: { 'prop-1': 'Title2' } },
      ];

      mockPrisma.$transaction.mockImplementation(
        async (fn: (tx: typeof mockPrisma) => Promise<unknown>) => {
          return fn(mockPrisma as unknown as typeof mockPrisma);
        }
      );
      mockPrisma.databaseRow.findMany.mockResolvedValue(mockRows);
      mockPrisma.databaseRow.update.mockResolvedValue({});
      mockPrisma.databaseProperty.delete.mockResolvedValue({});

      await deleteProperty('org-1', 'db-1', 'prop-2');

      // Should update row-1 (has the key) but not row-2 (doesn't have the key)
      expect(mockPrisma.databaseRow.update).toHaveBeenCalledTimes(1);
      expect(mockPrisma.databaseRow.update).toHaveBeenCalledWith({
        where: { id: 'row-1' },
        data: { cells: { 'prop-1': 'Title' } },
      });
    });

    it('should throw CANNOT_DELETE_TITLE_PROPERTY when deleting position 0', async () => {
      mockPrisma.database.findFirst.mockResolvedValue({ id: 'db-1' });
      mockPrisma.databaseProperty.findFirst.mockResolvedValue({ id: 'prop-1', position: 0 });

      await expect(deleteProperty('org-1', 'db-1', 'prop-1')).rejects.toThrow(
        'CANNOT_DELETE_TITLE_PROPERTY'
      );
    });

    it('should throw PROPERTY_NOT_FOUND when property does not exist', async () => {
      mockPrisma.database.findFirst.mockResolvedValue({ id: 'db-1' });
      mockPrisma.databaseProperty.findFirst.mockResolvedValue(null);

      await expect(deleteProperty('org-1', 'db-1', 'prop-999')).rejects.toThrow(
        'PROPERTY_NOT_FOUND'
      );
    });
  });

  describe('reorderProperties', () => {
    it('should update positions based on ordered IDs', async () => {
      mockPrisma.database.findFirst.mockResolvedValue({ id: 'db-1' });
      mockPrisma.databaseProperty.findMany.mockResolvedValue([{ id: 'prop-a' }, { id: 'prop-b' }]);
      mockPrisma.$transaction.mockResolvedValue([]);

      await reorderProperties('org-1', 'db-1', ['prop-b', 'prop-a']);

      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('should throw PROPERTY_NOT_FOUND for unknown property ID', async () => {
      mockPrisma.database.findFirst.mockResolvedValue({ id: 'db-1' });
      mockPrisma.databaseProperty.findMany.mockResolvedValue([{ id: 'prop-a' }]);

      await expect(reorderProperties('org-1', 'db-1', ['prop-a', 'prop-unknown'])).rejects.toThrow(
        'PROPERTY_NOT_FOUND'
      );
    });
  });

  // ===========================================
  // ROW CRUD
  // ===========================================

  describe('createRow', () => {
    it('should create a row at the next position', async () => {
      mockPrisma.database.findFirst.mockResolvedValue({ id: 'db-1' });
      mockPrisma.databaseRow.aggregate.mockResolvedValue({ _max: { position: 2 } });
      mockPrisma.databaseRow.create.mockResolvedValue({
        id: 'row-1',
        position: 3,
        cells: { 'prop-1': 'Hello' },
      });

      const result = await createRow('org-1', 'db-1', 'user-1', {
        cells: { 'prop-1': 'Hello' },
      });
      expect(result.position).toBe(3);
    });

    it('should create a row with empty cells if none provided', async () => {
      mockPrisma.database.findFirst.mockResolvedValue({ id: 'db-1' });
      mockPrisma.databaseRow.aggregate.mockResolvedValue({ _max: { position: null } });
      mockPrisma.databaseRow.create.mockResolvedValue({
        id: 'row-1',
        position: 0,
        cells: {},
      });

      const result = await createRow('org-1', 'db-1', 'user-1', {});
      expect(result.cells).toEqual({});
    });

    it('should throw DATABASE_NOT_FOUND when database does not exist', async () => {
      mockPrisma.database.findFirst.mockResolvedValue(null);
      await expect(createRow('org-1', 'db-999', 'user-1', {})).rejects.toThrow(
        'DATABASE_NOT_FOUND'
      );
    });
  });

  describe('getRow', () => {
    it('should return an existing row', async () => {
      mockPrisma.database.findFirst.mockResolvedValue({ id: 'db-1' });
      mockPrisma.databaseRow.findFirst.mockResolvedValue({ id: 'row-1', cells: {} });

      const result = await getRow('org-1', 'db-1', 'row-1');
      expect(result.id).toBe('row-1');
    });

    it('should throw ROW_NOT_FOUND when row does not exist', async () => {
      mockPrisma.database.findFirst.mockResolvedValue({ id: 'db-1' });
      mockPrisma.databaseRow.findFirst.mockResolvedValue(null);

      await expect(getRow('org-1', 'db-1', 'row-999')).rejects.toThrow('ROW_NOT_FOUND');
    });
  });

  describe('updateRow', () => {
    it('should merge new cells over existing cells', async () => {
      mockPrisma.database.findFirst.mockResolvedValue({ id: 'db-1' });
      mockPrisma.databaseRow.findFirst.mockResolvedValue({
        id: 'row-1',
        cells: { 'prop-1': 'Old Title', 'prop-2': 'Keep' },
      });
      mockPrisma.databaseRow.update.mockResolvedValue({
        id: 'row-1',
        cells: { 'prop-1': 'New Title', 'prop-2': 'Keep' },
      });

      const result = await updateRow('org-1', 'db-1', 'row-1', {
        cells: { 'prop-1': 'New Title' },
      });

      expect(mockPrisma.databaseRow.update).toHaveBeenCalledWith({
        where: { id: 'row-1' },
        data: { cells: { 'prop-1': 'New Title', 'prop-2': 'Keep' } },
      });
      expect(result.cells).toEqual({ 'prop-1': 'New Title', 'prop-2': 'Keep' });
    });

    it('should throw ROW_NOT_FOUND when row does not exist', async () => {
      mockPrisma.database.findFirst.mockResolvedValue({ id: 'db-1' });
      mockPrisma.databaseRow.findFirst.mockResolvedValue(null);

      await expect(updateRow('org-1', 'db-1', 'row-999', { cells: {} })).rejects.toThrow(
        'ROW_NOT_FOUND'
      );
    });
  });

  describe('deleteRow', () => {
    it('should delete an existing row', async () => {
      mockPrisma.database.findFirst.mockResolvedValue({ id: 'db-1' });
      mockPrisma.databaseRow.findFirst.mockResolvedValue({ id: 'row-1' });
      mockPrisma.databaseRow.delete.mockResolvedValue({});

      await deleteRow('org-1', 'db-1', 'row-1');
      expect(mockPrisma.databaseRow.delete).toHaveBeenCalledWith({ where: { id: 'row-1' } });
    });

    it('should throw ROW_NOT_FOUND when row does not exist', async () => {
      mockPrisma.database.findFirst.mockResolvedValue({ id: 'db-1' });
      mockPrisma.databaseRow.findFirst.mockResolvedValue(null);

      await expect(deleteRow('org-1', 'db-1', 'row-999')).rejects.toThrow('ROW_NOT_FOUND');
    });
  });

  describe('reorderRows', () => {
    it('should update row positions', async () => {
      mockPrisma.database.findFirst.mockResolvedValue({ id: 'db-1' });
      mockPrisma.databaseRow.findMany.mockResolvedValue([{ id: 'row-a' }, { id: 'row-b' }]);
      mockPrisma.$transaction.mockResolvedValue([]);

      await reorderRows('org-1', 'db-1', ['row-b', 'row-a']);
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('should throw ROW_NOT_FOUND for unknown row ID', async () => {
      mockPrisma.database.findFirst.mockResolvedValue({ id: 'db-1' });
      mockPrisma.databaseRow.findMany.mockResolvedValue([{ id: 'row-a' }]);

      await expect(reorderRows('org-1', 'db-1', ['row-a', 'row-unknown'])).rejects.toThrow(
        'ROW_NOT_FOUND'
      );
    });
  });

  describe('bulkDeleteRows', () => {
    it('should delete multiple rows and return count', async () => {
      mockPrisma.database.findFirst.mockResolvedValue({ id: 'db-1' });
      mockPrisma.databaseRow.deleteMany.mockResolvedValue({ count: 3 });

      const count = await bulkDeleteRows('org-1', 'db-1', ['row-1', 'row-2', 'row-3']);
      expect(count).toBe(3);
    });

    it('should throw DATABASE_NOT_FOUND when database does not exist', async () => {
      mockPrisma.database.findFirst.mockResolvedValue(null);
      await expect(bulkDeleteRows('org-1', 'db-999', ['row-1'])).rejects.toThrow(
        'DATABASE_NOT_FOUND'
      );
    });
  });

  // ===========================================
  // VIEW MANAGEMENT
  // ===========================================

  describe('createView', () => {
    it('should create a view at the next position', async () => {
      mockPrisma.database.findFirst.mockResolvedValue({ id: 'db-1' });
      mockPrisma.databaseView.aggregate.mockResolvedValue({ _max: { position: 0 } });
      mockPrisma.databaseView.create.mockResolvedValue({
        id: 'view-2',
        name: 'Kanban',
        type: 'KANBAN',
        position: 1,
      });

      const result = await createView('org-1', 'db-1', {
        name: 'Kanban',
        type: 'KANBAN' as const,
      });
      expect(result.position).toBe(1);
      expect(result.type).toBe('KANBAN');
    });

    it('should throw DATABASE_NOT_FOUND when database does not exist', async () => {
      mockPrisma.database.findFirst.mockResolvedValue(null);
      await expect(
        createView('org-1', 'db-999', { name: 'X', type: 'TABLE' as const })
      ).rejects.toThrow('DATABASE_NOT_FOUND');
    });
  });

  describe('updateView', () => {
    it('should update view name and config', async () => {
      mockPrisma.database.findFirst.mockResolvedValue({ id: 'db-1' });
      mockPrisma.databaseView.findFirst.mockResolvedValue({ id: 'view-1' });
      mockPrisma.databaseView.update.mockResolvedValue({
        id: 'view-1',
        name: 'Renamed',
        config: { sorts: [] },
      });

      const result = await updateView('org-1', 'db-1', 'view-1', {
        name: 'Renamed',
        config: { sorts: [] },
      });
      expect(result.name).toBe('Renamed');
    });

    it('should throw VIEW_NOT_FOUND when view does not exist', async () => {
      mockPrisma.database.findFirst.mockResolvedValue({ id: 'db-1' });
      mockPrisma.databaseView.findFirst.mockResolvedValue(null);

      await expect(updateView('org-1', 'db-1', 'view-999', { name: 'X' })).rejects.toThrow(
        'VIEW_NOT_FOUND'
      );
    });
  });

  describe('deleteView', () => {
    it('should delete a view when more than one exists', async () => {
      mockPrisma.database.findFirst.mockResolvedValue({ id: 'db-1' });
      mockPrisma.databaseView.findFirst.mockResolvedValue({ id: 'view-2' });
      mockPrisma.databaseView.count.mockResolvedValue(2);
      mockPrisma.databaseView.delete.mockResolvedValue({});

      await deleteView('org-1', 'db-1', 'view-2');
      expect(mockPrisma.databaseView.delete).toHaveBeenCalledWith({ where: { id: 'view-2' } });
    });

    it('should throw CANNOT_DELETE_LAST_VIEW when only one view exists', async () => {
      mockPrisma.database.findFirst.mockResolvedValue({ id: 'db-1' });
      mockPrisma.databaseView.findFirst.mockResolvedValue({ id: 'view-1' });
      mockPrisma.databaseView.count.mockResolvedValue(1);

      await expect(deleteView('org-1', 'db-1', 'view-1')).rejects.toThrow(
        'CANNOT_DELETE_LAST_VIEW'
      );
    });

    it('should throw VIEW_NOT_FOUND when view does not exist', async () => {
      mockPrisma.database.findFirst.mockResolvedValue({ id: 'db-1' });
      mockPrisma.databaseView.findFirst.mockResolvedValue(null);

      await expect(deleteView('org-1', 'db-1', 'view-999')).rejects.toThrow('VIEW_NOT_FOUND');
    });
  });

  describe('reorderViews', () => {
    it('should update view positions', async () => {
      mockPrisma.database.findFirst.mockResolvedValue({ id: 'db-1' });
      mockPrisma.databaseView.findMany.mockResolvedValue([{ id: 'view-a' }, { id: 'view-b' }]);
      mockPrisma.$transaction.mockResolvedValue([]);

      await reorderViews('org-1', 'db-1', ['view-b', 'view-a']);
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('should throw VIEW_NOT_FOUND for unknown view ID', async () => {
      mockPrisma.database.findFirst.mockResolvedValue({ id: 'db-1' });
      mockPrisma.databaseView.findMany.mockResolvedValue([{ id: 'view-a' }]);

      await expect(reorderViews('org-1', 'db-1', ['view-a', 'view-unknown'])).rejects.toThrow(
        'VIEW_NOT_FOUND'
      );
    });
  });
});
