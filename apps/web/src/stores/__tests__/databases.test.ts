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

  describe('updateDatabase', () => {
    it('should update database in map', async () => {
      const updatedDb = {
        id: 'db-1',
        name: 'Renamed',
        organizationId: 'org-1',
        pageId: null,
        createdAt: '',
        updatedAt: '',
      };
      mockedService.updateDatabase.mockResolvedValue({ database: updatedDb });
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
      const result = await store.updateDatabase('db-1', { name: 'Renamed' });

      expect(result.name).toBe('Renamed');
      expect(store.databases.get('db-1')?.name).toBe('Renamed');
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

  describe('updateProperty', () => {
    it('should update property in local state', async () => {
      const updatedProp = {
        id: 'prop-1',
        databaseId: 'db-1',
        name: 'Name',
        type: 'TEXT' as const,
        position: 0,
        config: null,
      };
      mockedService.updateProperty.mockResolvedValue({ property: updatedProp });
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
      const result = await store.updateProperty('prop-1', { name: 'Name' });

      expect(result.name).toBe('Name');
      expect(store.properties[0].name).toBe('Name');
    });
  });

  describe('reorderProperties', () => {
    it('should update positions of properties', async () => {
      mockedService.reorderProperties.mockResolvedValue({ message: 'ok' });
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
          rows: [],
        },
      });

      const store = useDatabasesStore();
      await store.fetchDatabase('db-1');
      await store.reorderProperties(['prop-2', 'prop-1']);

      expect(store.properties[0].id).toBe('prop-2');
      expect(store.properties[0].position).toBe(0);
      expect(store.properties[1].id).toBe('prop-1');
      expect(store.properties[1].position).toBe(1);
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

  describe('updateRow', () => {
    it('should update row in local state', async () => {
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
      const result = await store.updateRow('row-1', { cells: { 'prop-1': 'Updated' } });

      expect(result.id).toBe('row-1');
      expect((store.rows[0].cells as Record<string, unknown>)['prop-1']).toBe('Updated');
    });
  });

  describe('deleteRow', () => {
    it('should remove row from local state', async () => {
      mockedService.deleteRow.mockResolvedValue({ message: 'deleted' });
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
          ],
        },
      });

      const store = useDatabasesStore();
      await store.fetchDatabase('db-1');
      await store.deleteRow('row-1');

      expect(store.rows).toHaveLength(1);
      expect(store.rows[0].id).toBe('row-2');
    });
  });

  describe('reorderRows', () => {
    it('should update positions of rows', async () => {
      mockedService.reorderRows.mockResolvedValue({ message: 'ok' });
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
          ],
        },
      });

      const store = useDatabasesStore();
      await store.fetchDatabase('db-1');
      await store.reorderRows(['row-2', 'row-1']);

      expect(store.rows[0].id).toBe('row-2');
      expect(store.rows[0].position).toBe(0);
      expect(store.rows[1].id).toBe('row-1');
      expect(store.rows[1].position).toBe(1);
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

  describe('updateView', () => {
    it('should update view in local state', async () => {
      const updatedView = {
        id: 'view-1',
        databaseId: 'db-1',
        name: 'Renamed',
        type: 'TABLE' as const,
        position: 0,
        config: null,
      };
      mockedService.updateView.mockResolvedValue({ view: updatedView });
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
      const result = await store.updateView('view-1', { name: 'Renamed' });

      expect(result.name).toBe('Renamed');
      expect(store.views[0].name).toBe('Renamed');
    });
  });

  describe('reorderViews', () => {
    it('should update positions of views', async () => {
      mockedService.reorderViews.mockResolvedValue({ message: 'ok' });
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
      await store.reorderViews(['view-2', 'view-1']);

      expect(store.views[0].id).toBe('view-2');
      expect(store.views[0].position).toBe(0);
      expect(store.views[1].id).toBe('view-1');
      expect(store.views[1].position).toBe(1);
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

  describe('sortedProperties', () => {
    it('should return properties sorted by position', async () => {
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
              id: 'prop-2',
              databaseId: 'db-1',
              name: 'Status',
              type: 'SELECT' as const,
              position: 2,
              config: null,
            },
            {
              id: 'prop-1',
              databaseId: 'db-1',
              name: 'Title',
              type: 'TEXT' as const,
              position: 0,
              config: null,
            },
            {
              id: 'prop-3',
              databaseId: 'db-1',
              name: 'Priority',
              type: 'NUMBER' as const,
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
          rows: [],
        },
      });

      const store = useDatabasesStore();
      await store.fetchDatabase('db-1');

      expect(store.sortedProperties[0].id).toBe('prop-1');
      expect(store.sortedProperties[1].id).toBe('prop-3');
      expect(store.sortedProperties[2].id).toBe('prop-2');
    });
  });

  describe('sortedRows', () => {
    it('should return rows sorted by position', async () => {
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
              id: 'row-2',
              databaseId: 'db-1',
              position: 1,
              cells: {},
              createdById: 'u-1',
              createdAt: '',
              updatedAt: '',
            },
            {
              id: 'row-1',
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

      expect(store.sortedRows[0].id).toBe('row-1');
      expect(store.sortedRows[1].id).toBe('row-2');
    });
  });

  describe('loading state', () => {
    it('should set loading true during fetchDatabases', async () => {
      let resolvePromise: (value: unknown) => void;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      mockedService.listDatabases.mockReturnValue(
        promise as ReturnType<typeof mockedService.listDatabases>
      );

      const store = useDatabasesStore();
      const fetchPromise = store.fetchDatabases();

      expect(store.loading).toBe(true);

      resolvePromise!({ databases: [] });
      await fetchPromise;

      expect(store.loading).toBe(false);
    });

    it('should set loading false even on error', async () => {
      mockedService.listDatabases.mockRejectedValue(new Error('fail'));

      const store = useDatabasesStore();
      await expect(store.fetchDatabases()).rejects.toThrow('fail');

      expect(store.loading).toBe(false);
    });
  });

  describe('activeView', () => {
    it('should return first view when no activeViewId is set', async () => {
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
      store.activeViewId = null;

      expect(store.activeView?.id).toBe('view-1');
    });

    it('should return null when no views exist', () => {
      const store = useDatabasesStore();
      store.views = [];
      store.activeViewId = null;

      expect(store.activeView).toBeNull();
    });
  });

  describe('setActiveView', () => {
    it('should update activeViewId', async () => {
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

      expect(store.activeViewId).toBe('view-2');
      expect(store.activeView?.id).toBe('view-2');
    });
  });

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

    it('should filter rows by equals operator', async () => {
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
              name: 'Name',
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
              config: { filters: [{ propertyId: 'p1', operator: 'equals', value: 'alice' }] },
            },
          ],
          rows: [
            {
              id: 'r1',
              databaseId: 'db-1',
              position: 0,
              cells: { p1: 'Alice' },
              createdById: 'u-1',
              createdAt: '',
              updatedAt: '',
            },
            {
              id: 'r2',
              databaseId: 'db-1',
              position: 1,
              cells: { p1: 'Bob' },
              createdById: 'u-1',
              createdAt: '',
              updatedAt: '',
            },
          ],
        },
      });

      const store = useDatabasesStore();
      await store.fetchDatabase('db-1');
      expect(store.filteredAndSortedRows).toHaveLength(1);
      expect(store.filteredAndSortedRows[0].id).toBe('r1');
    });

    it('should filter rows by not_equals operator', async () => {
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
              name: 'Name',
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
              config: { filters: [{ propertyId: 'p1', operator: 'not_equals', value: 'alice' }] },
            },
          ],
          rows: [
            {
              id: 'r1',
              databaseId: 'db-1',
              position: 0,
              cells: { p1: 'Alice' },
              createdById: 'u-1',
              createdAt: '',
              updatedAt: '',
            },
            {
              id: 'r2',
              databaseId: 'db-1',
              position: 1,
              cells: { p1: 'Bob' },
              createdById: 'u-1',
              createdAt: '',
              updatedAt: '',
            },
          ],
        },
      });

      const store = useDatabasesStore();
      await store.fetchDatabase('db-1');
      expect(store.filteredAndSortedRows).toHaveLength(1);
      expect(store.filteredAndSortedRows[0].id).toBe('r2');
    });

    it('should filter rows by is_empty operator', async () => {
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
              name: 'Name',
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
              config: { filters: [{ propertyId: 'p1', operator: 'is_empty', value: '' }] },
            },
          ],
          rows: [
            {
              id: 'r1',
              databaseId: 'db-1',
              position: 0,
              cells: { p1: 'Alice' },
              createdById: 'u-1',
              createdAt: '',
              updatedAt: '',
            },
            {
              id: 'r2',
              databaseId: 'db-1',
              position: 1,
              cells: { p1: null },
              createdById: 'u-1',
              createdAt: '',
              updatedAt: '',
            },
            {
              id: 'r3',
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
      // null and undefined are empty
      expect(store.filteredAndSortedRows).toHaveLength(2);
    });

    it('should filter rows by is_not_empty operator', async () => {
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
              name: 'Name',
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
              config: { filters: [{ propertyId: 'p1', operator: 'is_not_empty', value: '' }] },
            },
          ],
          rows: [
            {
              id: 'r1',
              databaseId: 'db-1',
              position: 0,
              cells: { p1: 'Alice' },
              createdById: 'u-1',
              createdAt: '',
              updatedAt: '',
            },
            {
              id: 'r2',
              databaseId: 'db-1',
              position: 1,
              cells: { p1: null },
              createdById: 'u-1',
              createdAt: '',
              updatedAt: '',
            },
          ],
        },
      });

      const store = useDatabasesStore();
      await store.fetchDatabase('db-1');
      expect(store.filteredAndSortedRows).toHaveLength(1);
      expect(store.filteredAndSortedRows[0].id).toBe('r1');
    });

    it('should filter rows by gt operator', async () => {
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
              name: 'Score',
              type: 'NUMBER' as const,
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
              config: { filters: [{ propertyId: 'p1', operator: 'gt', value: 50 }] },
            },
          ],
          rows: [
            {
              id: 'r1',
              databaseId: 'db-1',
              position: 0,
              cells: { p1: 80 },
              createdById: 'u-1',
              createdAt: '',
              updatedAt: '',
            },
            {
              id: 'r2',
              databaseId: 'db-1',
              position: 1,
              cells: { p1: 30 },
              createdById: 'u-1',
              createdAt: '',
              updatedAt: '',
            },
            {
              id: 'r3',
              databaseId: 'db-1',
              position: 2,
              cells: { p1: 50 },
              createdById: 'u-1',
              createdAt: '',
              updatedAt: '',
            },
          ],
        },
      });

      const store = useDatabasesStore();
      await store.fetchDatabase('db-1');
      expect(store.filteredAndSortedRows).toHaveLength(1);
      expect(store.filteredAndSortedRows[0].id).toBe('r1');
    });

    it('should filter rows by lt operator', async () => {
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
              name: 'Score',
              type: 'NUMBER' as const,
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
              config: { filters: [{ propertyId: 'p1', operator: 'lt', value: 50 }] },
            },
          ],
          rows: [
            {
              id: 'r1',
              databaseId: 'db-1',
              position: 0,
              cells: { p1: 80 },
              createdById: 'u-1',
              createdAt: '',
              updatedAt: '',
            },
            {
              id: 'r2',
              databaseId: 'db-1',
              position: 1,
              cells: { p1: 30 },
              createdById: 'u-1',
              createdAt: '',
              updatedAt: '',
            },
          ],
        },
      });

      const store = useDatabasesStore();
      await store.fetchDatabase('db-1');
      expect(store.filteredAndSortedRows).toHaveLength(1);
      expect(store.filteredAndSortedRows[0].id).toBe('r2');
    });

    it('should filter rows by gte operator', async () => {
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
              name: 'Score',
              type: 'NUMBER' as const,
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
              config: { filters: [{ propertyId: 'p1', operator: 'gte', value: 50 }] },
            },
          ],
          rows: [
            {
              id: 'r1',
              databaseId: 'db-1',
              position: 0,
              cells: { p1: 80 },
              createdById: 'u-1',
              createdAt: '',
              updatedAt: '',
            },
            {
              id: 'r2',
              databaseId: 'db-1',
              position: 1,
              cells: { p1: 30 },
              createdById: 'u-1',
              createdAt: '',
              updatedAt: '',
            },
            {
              id: 'r3',
              databaseId: 'db-1',
              position: 2,
              cells: { p1: 50 },
              createdById: 'u-1',
              createdAt: '',
              updatedAt: '',
            },
          ],
        },
      });

      const store = useDatabasesStore();
      await store.fetchDatabase('db-1');
      expect(store.filteredAndSortedRows).toHaveLength(2);
    });

    it('should filter rows by lte operator', async () => {
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
              name: 'Score',
              type: 'NUMBER' as const,
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
              config: { filters: [{ propertyId: 'p1', operator: 'lte', value: 50 }] },
            },
          ],
          rows: [
            {
              id: 'r1',
              databaseId: 'db-1',
              position: 0,
              cells: { p1: 80 },
              createdById: 'u-1',
              createdAt: '',
              updatedAt: '',
            },
            {
              id: 'r2',
              databaseId: 'db-1',
              position: 1,
              cells: { p1: 30 },
              createdById: 'u-1',
              createdAt: '',
              updatedAt: '',
            },
            {
              id: 'r3',
              databaseId: 'db-1',
              position: 2,
              cells: { p1: 50 },
              createdById: 'u-1',
              createdAt: '',
              updatedAt: '',
            },
          ],
        },
      });

      const store = useDatabasesStore();
      await store.fetchDatabase('db-1');
      expect(store.filteredAndSortedRows).toHaveLength(2);
    });

    it('should filter rows by is_checked operator', async () => {
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
              name: 'Done',
              type: 'CHECKBOX' as const,
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
              config: { filters: [{ propertyId: 'p1', operator: 'is_checked', value: '' }] },
            },
          ],
          rows: [
            {
              id: 'r1',
              databaseId: 'db-1',
              position: 0,
              cells: { p1: true },
              createdById: 'u-1',
              createdAt: '',
              updatedAt: '',
            },
            {
              id: 'r2',
              databaseId: 'db-1',
              position: 1,
              cells: { p1: false },
              createdById: 'u-1',
              createdAt: '',
              updatedAt: '',
            },
          ],
        },
      });

      const store = useDatabasesStore();
      await store.fetchDatabase('db-1');
      expect(store.filteredAndSortedRows).toHaveLength(1);
      expect(store.filteredAndSortedRows[0].id).toBe('r1');
    });

    it('should filter rows by is_unchecked operator', async () => {
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
              name: 'Done',
              type: 'CHECKBOX' as const,
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
              config: { filters: [{ propertyId: 'p1', operator: 'is_unchecked', value: '' }] },
            },
          ],
          rows: [
            {
              id: 'r1',
              databaseId: 'db-1',
              position: 0,
              cells: { p1: true },
              createdById: 'u-1',
              createdAt: '',
              updatedAt: '',
            },
            {
              id: 'r2',
              databaseId: 'db-1',
              position: 1,
              cells: { p1: false },
              createdById: 'u-1',
              createdAt: '',
              updatedAt: '',
            },
          ],
        },
      });

      const store = useDatabasesStore();
      await store.fetchDatabase('db-1');
      expect(store.filteredAndSortedRows).toHaveLength(1);
      expect(store.filteredAndSortedRows[0].id).toBe('r2');
    });

    it('should sort rows descending', async () => {
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
              name: 'Name',
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
              config: { sorts: [{ propertyId: 'p1', direction: 'desc' }] },
            },
          ],
          rows: [
            {
              id: 'r1',
              databaseId: 'db-1',
              position: 0,
              cells: { p1: 'Alice' },
              createdById: 'u-1',
              createdAt: '',
              updatedAt: '',
            },
            {
              id: 'r2',
              databaseId: 'db-1',
              position: 1,
              cells: { p1: 'Charlie' },
              createdById: 'u-1',
              createdAt: '',
              updatedAt: '',
            },
            {
              id: 'r3',
              databaseId: 'db-1',
              position: 2,
              cells: { p1: 'Bob' },
              createdById: 'u-1',
              createdAt: '',
              updatedAt: '',
            },
          ],
        },
      });

      const store = useDatabasesStore();
      await store.fetchDatabase('db-1');
      expect(store.filteredAndSortedRows[0].id).toBe('r2'); // Charlie
      expect(store.filteredAndSortedRows[1].id).toBe('r3'); // Bob
      expect(store.filteredAndSortedRows[2].id).toBe('r1'); // Alice
    });

    it('should return all rows when no view config exists', async () => {
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
              id: 'r1',
              databaseId: 'db-1',
              position: 0,
              cells: {},
              createdById: 'u-1',
              createdAt: '',
              updatedAt: '',
            },
            {
              id: 'r2',
              databaseId: 'db-1',
              position: 1,
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
      expect(store.filteredAndSortedRows).toHaveLength(2);
    });

    it('should sort numbers correctly', async () => {
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
              name: 'Score',
              type: 'NUMBER' as const,
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
              config: { sorts: [{ propertyId: 'p1', direction: 'asc' }] },
            },
          ],
          rows: [
            {
              id: 'r1',
              databaseId: 'db-1',
              position: 0,
              cells: { p1: 100 },
              createdById: 'u-1',
              createdAt: '',
              updatedAt: '',
            },
            {
              id: 'r2',
              databaseId: 'db-1',
              position: 1,
              cells: { p1: 5 },
              createdById: 'u-1',
              createdAt: '',
              updatedAt: '',
            },
            {
              id: 'r3',
              databaseId: 'db-1',
              position: 2,
              cells: { p1: 20 },
              createdById: 'u-1',
              createdAt: '',
              updatedAt: '',
            },
          ],
        },
      });

      const store = useDatabasesStore();
      await store.fetchDatabase('db-1');
      expect(store.filteredAndSortedRows[0].id).toBe('r2'); // 5
      expect(store.filteredAndSortedRows[1].id).toBe('r3'); // 20
      expect(store.filteredAndSortedRows[2].id).toBe('r1'); // 100
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
