import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useDatabasesStore } from '../databases';
import { databasesService } from '@/services/databases.service';

vi.mock('@/services/databases.service', () => ({
  databasesService: {
    createDatabase: vi.fn(),
    listDatabases: vi.fn(),
    getDatabase: vi.fn(),
    updateDatabase: vi.fn(),
    deleteDatabase: vi.fn(),
    createProperty: vi.fn(),
    updateProperty: vi.fn(),
    deleteProperty: vi.fn(),
    reorderProperties: vi.fn(),
    createRow: vi.fn(),
    updateRow: vi.fn(),
    deleteRow: vi.fn(),
    reorderRows: vi.fn(),
    bulkDeleteRows: vi.fn(),
    createView: vi.fn(),
    updateView: vi.fn(),
    deleteView: vi.fn(),
    reorderViews: vi.fn(),
  },
}));

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock auth store
vi.mock('../auth', () => ({
  useAuthStore: () => ({
    currentOrganizationId: 'org-1',
  }),
}));

const mockedService = vi.mocked(databasesService);

describe('useDatabasesStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  // ===========================================
  // DATABASE CRUD
  // ===========================================

  describe('fetchDatabases', () => {
    it('should populate databases map', async () => {
      mockedService.listDatabases.mockResolvedValue({
        databases: [
          {
            id: 'db-1',
            name: 'Tasks',
            organizationId: 'org-1',
            pageId: null,
            createdAt: '',
            updatedAt: '',
          },
          {
            id: 'db-2',
            name: 'Projects',
            organizationId: 'org-1',
            pageId: null,
            createdAt: '',
            updatedAt: '',
          },
        ],
      });

      const store = useDatabasesStore();
      await store.fetchDatabases();

      expect(store.databaseList).toHaveLength(2);
      expect(store.databases.get('db-1')?.name).toBe('Tasks');
    });
  });

  describe('fetchDatabase', () => {
    it('should set current database with relations', async () => {
      const mockDb = {
        id: 'db-1',
        name: 'Tasks',
        organizationId: 'org-1',
        pageId: null,
        createdAt: '',
        updatedAt: '',
        properties: [
          {
            id: 'prop-1',
            databaseId: 'db-1',
            name: 'Title',
            type: 'TEXT' as const,
            position: 0,
            config: null,
          },
        ],
        views: [
          {
            id: 'view-1',
            databaseId: 'db-1',
            name: 'Table view',
            type: 'TABLE' as const,
            position: 0,
            config: null,
          },
        ],
        rows: [],
      };
      mockedService.getDatabase.mockResolvedValue({ database: mockDb });

      const store = useDatabasesStore();
      await store.fetchDatabase('db-1');

      expect(store.currentDatabaseId).toBe('db-1');
      expect(store.properties).toHaveLength(1);
      expect(store.views).toHaveLength(1);
      expect(store.activeViewId).toBe('view-1');
    });
  });

  describe('createDatabase', () => {
    it('should create and set current database', async () => {
      const mockDb = {
        id: 'db-new',
        name: 'New DB',
        organizationId: 'org-1',
        pageId: null,
        createdAt: '',
        updatedAt: '',
        properties: [
          {
            id: 'prop-1',
            databaseId: 'db-new',
            name: 'Title',
            type: 'TEXT' as const,
            position: 0,
            config: null,
          },
        ],
        views: [
          {
            id: 'view-1',
            databaseId: 'db-new',
            name: 'Table view',
            type: 'TABLE' as const,
            position: 0,
            config: null,
          },
        ],
        rows: [],
      };
      mockedService.createDatabase.mockResolvedValue({ database: mockDb });

      const store = useDatabasesStore();
      const result = await store.createDatabase({ name: 'New DB' });

      expect(result.id).toBe('db-new');
      expect(store.currentDatabaseId).toBe('db-new');
    });
  });

  describe('deleteDatabase', () => {
    it('should remove from map and clear current if active', async () => {
      mockedService.deleteDatabase.mockResolvedValue({ message: 'deleted' });
      mockedService.getDatabase.mockResolvedValue({
        database: {
          id: 'db-1',
          name: 'Tasks',
          organizationId: 'org-1',
          pageId: null,
          createdAt: '',
          updatedAt: '',
          properties: [],
          views: [
            {
              id: 'v-1',
              databaseId: 'db-1',
              name: 'T',
              type: 'TABLE' as const,
              position: 0,
              config: null,
            },
          ],
          rows: [],
        },
      });

      const store = useDatabasesStore();
      await store.fetchDatabase('db-1');

      await store.deleteDatabase('db-1');

      expect(store.databases.has('db-1')).toBe(false);
      expect(store.currentDatabaseId).toBeNull();
      expect(store.properties).toEqual([]);
    });
  });

  // ===========================================
  // PROPERTY MANAGEMENT
  // ===========================================

  describe('createProperty', () => {
    it('should add property to local state', async () => {
      const mockProp = {
        id: 'prop-2',
        databaseId: 'db-1',
        name: 'Status',
        type: 'SELECT' as const,
        position: 1,
        config: null,
      };
      mockedService.createProperty.mockResolvedValue({ property: mockProp });
      mockedService.getDatabase.mockResolvedValue({
        database: {
          id: 'db-1',
          name: 'T',
          organizationId: 'org-1',
          pageId: null,
          createdAt: '',
          updatedAt: '',
          properties: [
            {
              id: 'prop-1',
              databaseId: 'db-1',
              name: 'Title',
              type: 'TEXT' as const,
              position: 0,
              config: null,
            },
          ],
          views: [
            {
              id: 'v-1',
              databaseId: 'db-1',
              name: 'T',
              type: 'TABLE' as const,
              position: 0,
              config: null,
            },
          ],
          rows: [],
        },
      });

      const store = useDatabasesStore();
      await store.fetchDatabase('db-1');
      await store.createProperty({ name: 'Status', type: 'SELECT' });

      expect(store.properties).toHaveLength(2);
    });
  });

  describe('deleteProperty', () => {
    it('should remove property and strip from row cells', async () => {
      mockedService.deleteProperty.mockResolvedValue({ message: 'deleted' });
      mockedService.getDatabase.mockResolvedValue({
        database: {
          id: 'db-1',
          name: 'T',
          organizationId: 'org-1',
          pageId: null,
          createdAt: '',
          updatedAt: '',
          properties: [
            {
              id: 'prop-1',
              databaseId: 'db-1',
              name: 'Title',
              type: 'TEXT' as const,
              position: 0,
              config: null,
            },
            {
              id: 'prop-2',
              databaseId: 'db-1',
              name: 'Status',
              type: 'SELECT' as const,
              position: 1,
              config: null,
            },
          ],
          views: [
            {
              id: 'v-1',
              databaseId: 'db-1',
              name: 'T',
              type: 'TABLE' as const,
              position: 0,
              config: null,
            },
          ],
          rows: [
            {
              id: 'row-1',
              databaseId: 'db-1',
              position: 0,
              cells: { 'prop-1': 'Hello', 'prop-2': 'Active' },
              createdById: 'u-1',
              createdAt: '',
              updatedAt: '',
            },
          ],
        },
      });

      const store = useDatabasesStore();
      await store.fetchDatabase('db-1');
      await store.deleteProperty('prop-2');

      expect(store.properties).toHaveLength(1);
      expect((store.rows[0].cells as Record<string, unknown>)['prop-2']).toBeUndefined();
    });
  });

  // ===========================================
  // ROW CRUD
  // ===========================================

  describe('createRow', () => {
    it('should add row to local state', async () => {
      const mockRow = {
        id: 'row-1',
        databaseId: 'db-1',
        position: 0,
        cells: {},
        createdById: 'u-1',
        createdAt: '',
        updatedAt: '',
      };
      mockedService.createRow.mockResolvedValue({ row: mockRow });
      mockedService.getDatabase.mockResolvedValue({
        database: {
          id: 'db-1',
          name: 'T',
          organizationId: 'org-1',
          pageId: null,
          createdAt: '',
          updatedAt: '',
          properties: [],
          views: [
            {
              id: 'v-1',
              databaseId: 'db-1',
              name: 'T',
              type: 'TABLE' as const,
              position: 0,
              config: null,
            },
          ],
          rows: [],
        },
      });

      const store = useDatabasesStore();
      await store.fetchDatabase('db-1');
      await store.createRow();

      expect(store.rows).toHaveLength(1);
    });
  });

  describe('updateRowCell', () => {
    it('should update a single cell value', async () => {
      const updatedRow = {
        id: 'row-1',
        databaseId: 'db-1',
        position: 0,
        cells: { 'prop-1': 'Updated' },
        createdById: 'u-1',
        createdAt: '',
        updatedAt: '',
      };
      mockedService.updateRow.mockResolvedValue({ row: updatedRow });
      mockedService.getDatabase.mockResolvedValue({
        database: {
          id: 'db-1',
          name: 'T',
          organizationId: 'org-1',
          pageId: null,
          createdAt: '',
          updatedAt: '',
          properties: [],
          views: [
            {
              id: 'v-1',
              databaseId: 'db-1',
              name: 'T',
              type: 'TABLE' as const,
              position: 0,
              config: null,
            },
          ],
          rows: [
            {
              id: 'row-1',
              databaseId: 'db-1',
              position: 0,
              cells: { 'prop-1': 'Old' },
              createdById: 'u-1',
              createdAt: '',
              updatedAt: '',
            },
          ],
        },
      });

      const store = useDatabasesStore();
      await store.fetchDatabase('db-1');
      await store.updateRowCell('row-1', 'prop-1', 'Updated');

      expect(mockedService.updateRow).toHaveBeenCalledWith('org-1', 'db-1', 'row-1', {
        cells: { 'prop-1': 'Updated' },
      });
      expect((store.rows[0].cells as Record<string, unknown>)['prop-1']).toBe('Updated');
    });
  });

  describe('bulkDeleteRows', () => {
    it('should remove multiple rows from local state', async () => {
      mockedService.bulkDeleteRows.mockResolvedValue({ count: 2, message: '2 deleted' });
      mockedService.getDatabase.mockResolvedValue({
        database: {
          id: 'db-1',
          name: 'T',
          organizationId: 'org-1',
          pageId: null,
          createdAt: '',
          updatedAt: '',
          properties: [],
          views: [
            {
              id: 'v-1',
              databaseId: 'db-1',
              name: 'T',
              type: 'TABLE' as const,
              position: 0,
              config: null,
            },
          ],
          rows: [
            {
              id: 'row-1',
              databaseId: 'db-1',
              position: 0,
              cells: {},
              createdById: 'u-1',
              createdAt: '',
              updatedAt: '',
            },
            {
              id: 'row-2',
              databaseId: 'db-1',
              position: 1,
              cells: {},
              createdById: 'u-1',
              createdAt: '',
              updatedAt: '',
            },
            {
              id: 'row-3',
              databaseId: 'db-1',
              position: 2,
              cells: {},
              createdById: 'u-1',
              createdAt: '',
              updatedAt: '',
            },
          ],
        },
      });

      const store = useDatabasesStore();
      await store.fetchDatabase('db-1');
      const count = await store.bulkDeleteRows(['row-1', 'row-2']);

      expect(count).toBe(2);
      expect(store.rows).toHaveLength(1);
      expect(store.rows[0].id).toBe('row-3');
    });
  });

  // ===========================================
  // VIEW MANAGEMENT
  // ===========================================

  describe('createView', () => {
    it('should add view to local state', async () => {
      const mockView = {
        id: 'view-2',
        databaseId: 'db-1',
        name: 'Kanban',
        type: 'KANBAN' as const,
        position: 1,
        config: null,
      };
      mockedService.createView.mockResolvedValue({ view: mockView });
      mockedService.getDatabase.mockResolvedValue({
        database: {
          id: 'db-1',
          name: 'T',
          organizationId: 'org-1',
          pageId: null,
          createdAt: '',
          updatedAt: '',
          properties: [],
          views: [
            {
              id: 'view-1',
              databaseId: 'db-1',
              name: 'Table',
              type: 'TABLE' as const,
              position: 0,
              config: null,
            },
          ],
          rows: [],
        },
      });

      const store = useDatabasesStore();
      await store.fetchDatabase('db-1');
      await store.createView({ name: 'Kanban', type: 'KANBAN' });

      expect(store.views).toHaveLength(2);
    });
  });

  describe('deleteView', () => {
    it('should switch active view when deleting active view', async () => {
      mockedService.deleteView.mockResolvedValue({ message: 'deleted' });
      mockedService.getDatabase.mockResolvedValue({
        database: {
          id: 'db-1',
          name: 'T',
          organizationId: 'org-1',
          pageId: null,
          createdAt: '',
          updatedAt: '',
          properties: [],
          views: [
            {
              id: 'view-1',
              databaseId: 'db-1',
              name: 'Table',
              type: 'TABLE' as const,
              position: 0,
              config: null,
            },
            {
              id: 'view-2',
              databaseId: 'db-1',
              name: 'Kanban',
              type: 'KANBAN' as const,
              position: 1,
              config: null,
            },
          ],
          rows: [],
        },
      });

      const store = useDatabasesStore();
      await store.fetchDatabase('db-1');
      store.setActiveView('view-2');

      await store.deleteView('view-2');

      expect(store.views).toHaveLength(1);
      expect(store.activeViewId).toBe('view-1');
    });
  });

  // ===========================================
  // COMPUTED - FILTERING & SORTING
  // ===========================================

  describe('filteredAndSortedRows', () => {
    it('should sort rows by property value ascending', async () => {
      mockedService.getDatabase.mockResolvedValue({
        database: {
          id: 'db-1',
          name: 'T',
          organizationId: 'org-1',
          pageId: null,
          createdAt: '',
          updatedAt: '',
          properties: [
            {
              id: 'prop-1',
              databaseId: 'db-1',
              name: 'Name',
              type: 'TEXT' as const,
              position: 0,
              config: null,
            },
          ],
          views: [
            {
              id: 'view-1',
              databaseId: 'db-1',
              name: 'Table',
              type: 'TABLE' as const,
              position: 0,
              config: { sorts: [{ propertyId: 'prop-1', direction: 'asc' }] },
            },
          ],
          rows: [
            {
              id: 'row-1',
              databaseId: 'db-1',
              position: 0,
              cells: { 'prop-1': 'Charlie' },
              createdById: 'u-1',
              createdAt: '',
              updatedAt: '',
            },
            {
              id: 'row-2',
              databaseId: 'db-1',
              position: 1,
              cells: { 'prop-1': 'Alice' },
              createdById: 'u-1',
              createdAt: '',
              updatedAt: '',
            },
            {
              id: 'row-3',
              databaseId: 'db-1',
              position: 2,
              cells: { 'prop-1': 'Bob' },
              createdById: 'u-1',
              createdAt: '',
              updatedAt: '',
            },
          ],
        },
      });

      const store = useDatabasesStore();
      await store.fetchDatabase('db-1');

      expect(store.filteredAndSortedRows[0].id).toBe('row-2'); // Alice
      expect(store.filteredAndSortedRows[1].id).toBe('row-3'); // Bob
      expect(store.filteredAndSortedRows[2].id).toBe('row-1'); // Charlie
    });

    it('should filter rows by contains operator', async () => {
      mockedService.getDatabase.mockResolvedValue({
        database: {
          id: 'db-1',
          name: 'T',
          organizationId: 'org-1',
          pageId: null,
          createdAt: '',
          updatedAt: '',
          properties: [
            {
              id: 'prop-1',
              databaseId: 'db-1',
              name: 'Name',
              type: 'TEXT' as const,
              position: 0,
              config: null,
            },
          ],
          views: [
            {
              id: 'view-1',
              databaseId: 'db-1',
              name: 'Table',
              type: 'TABLE' as const,
              position: 0,
              config: { filters: [{ propertyId: 'prop-1', operator: 'contains', value: 'li' }] },
            },
          ],
          rows: [
            {
              id: 'row-1',
              databaseId: 'db-1',
              position: 0,
              cells: { 'prop-1': 'Charlie' },
              createdById: 'u-1',
              createdAt: '',
              updatedAt: '',
            },
            {
              id: 'row-2',
              databaseId: 'db-1',
              position: 1,
              cells: { 'prop-1': 'Alice' },
              createdById: 'u-1',
              createdAt: '',
              updatedAt: '',
            },
            {
              id: 'row-3',
              databaseId: 'db-1',
              position: 2,
              cells: { 'prop-1': 'Bob' },
              createdById: 'u-1',
              createdAt: '',
              updatedAt: '',
            },
          ],
        },
      });

      const store = useDatabasesStore();
      await store.fetchDatabase('db-1');

      // 'li' matches 'Charlie' and 'Alice'
      expect(store.filteredAndSortedRows).toHaveLength(2);
    });
  });

  // ===========================================
  // RESET
  // ===========================================

  describe('reset', () => {
    it('should clear all state', async () => {
      mockedService.getDatabase.mockResolvedValue({
        database: {
          id: 'db-1',
          name: 'T',
          organizationId: 'org-1',
          pageId: null,
          createdAt: '',
          updatedAt: '',
          properties: [
            {
              id: 'p1',
              databaseId: 'db-1',
              name: 'T',
              type: 'TEXT' as const,
              position: 0,
              config: null,
            },
          ],
          views: [
            {
              id: 'v1',
              databaseId: 'db-1',
              name: 'T',
              type: 'TABLE' as const,
              position: 0,
              config: null,
            },
          ],
          rows: [
            {
              id: 'r1',
              databaseId: 'db-1',
              position: 0,
              cells: {},
              createdById: 'u-1',
              createdAt: '',
              updatedAt: '',
            },
          ],
        },
      });

      const store = useDatabasesStore();
      await store.fetchDatabase('db-1');

      store.reset();

      expect(store.databases.size).toBe(0);
      expect(store.currentDatabaseId).toBeNull();
      expect(store.properties).toEqual([]);
      expect(store.views).toEqual([]);
      expect(store.rows).toEqual([]);
      expect(store.activeViewId).toBeNull();
    });
  });
});
