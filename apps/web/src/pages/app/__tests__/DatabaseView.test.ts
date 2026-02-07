import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';

const { mockDatabasesService } = vi.hoisted(() => ({
  mockDatabasesService: {
    listDatabases: vi.fn(),
    getDatabase: vi.fn(),
    createDatabase: vi.fn(),
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

vi.mock('@/services', () => ({
  databasesService: mockDatabasesService,
}));

vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({
    currentOrganizationId: 'org-1',
  }),
}));

// Stub child components to isolate DatabaseView tests
vi.mock('@/components/database/DatabaseHeader.vue', () => ({
  default: { template: '<div class="stub-database-header" />' },
}));
vi.mock('@/components/database/DatabaseToolbar.vue', () => ({
  default: { template: '<div class="stub-database-toolbar" />' },
}));
vi.mock('@/components/database/TableView.vue', () => ({
  default: { template: '<div class="stub-table-view" />' },
}));
vi.mock('@/components/database/KanbanView.vue', () => ({
  default: { template: '<div class="stub-kanban-view" />' },
}));
vi.mock('@/components/database/CalendarView.vue', () => ({
  default: { template: '<div class="stub-calendar-view" />' },
}));
vi.mock('@/components/database/GalleryView.vue', () => ({
  default: { template: '<div class="stub-gallery-view" />' },
}));

import DatabaseView from '../../app/DatabaseView.vue';
import { useDatabasesStore } from '@/stores/databases';

function makeDatabaseResponse(viewType: 'TABLE' | 'KANBAN' | 'CALENDAR' | 'GALLERY' = 'TABLE') {
  return {
    database: {
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
          name: `${viewType} view`,
          type: viewType,
          position: 0,
          config: null,
        },
      ],
      rows: [],
    },
  };
}

describe('DatabaseView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setActivePinia(createPinia());
  });

  it('shows loading state initially', () => {
    // Don't resolve the promise so it stays loading
    mockDatabasesService.getDatabase.mockReturnValue(new Promise(() => {}));
    const wrapper = mount(DatabaseView, { props: { databaseId: 'db-1' } });
    expect(wrapper.find('.database-loading').exists()).toBe(true);
    expect(wrapper.text()).toContain('Loading');
  });

  it('shows error state when fetch fails', async () => {
    mockDatabasesService.getDatabase.mockRejectedValue(new Error('Network error'));
    const wrapper = mount(DatabaseView, { props: { databaseId: 'db-1' } });
    await flushPromises();

    expect(wrapper.find('.database-error').exists()).toBe(true);
    expect(wrapper.text()).toContain('Failed to load database');
  });

  it('shows retry button that reloads database on click', async () => {
    mockDatabasesService.getDatabase.mockRejectedValueOnce(new Error('fail'));
    const wrapper = mount(DatabaseView, { props: { databaseId: 'db-1' } });
    await flushPromises();

    expect(wrapper.find('.error-retry').exists()).toBe(true);

    // Set up a successful response for retry
    mockDatabasesService.getDatabase.mockResolvedValue(makeDatabaseResponse());
    await wrapper.find('.error-retry').trigger('click');
    await flushPromises();

    expect(wrapper.find('.database-error').exists()).toBe(false);
    expect(wrapper.find('.database-content').exists()).toBe(true);
  });

  it('renders TableView when active view type is TABLE', async () => {
    mockDatabasesService.getDatabase.mockResolvedValue(makeDatabaseResponse('TABLE'));
    const wrapper = mount(DatabaseView, { props: { databaseId: 'db-1' } });
    await flushPromises();

    expect(wrapper.find('.database-content').exists()).toBe(true);
    expect(wrapper.find('.stub-table-view').exists()).toBe(true);
    expect(wrapper.find('.stub-kanban-view').exists()).toBe(false);
  });

  it('renders KanbanView when active view type is KANBAN', async () => {
    mockDatabasesService.getDatabase.mockResolvedValue(makeDatabaseResponse('KANBAN'));
    const wrapper = mount(DatabaseView, { props: { databaseId: 'db-1' } });
    await flushPromises();

    expect(wrapper.find('.stub-kanban-view').exists()).toBe(true);
    expect(wrapper.find('.stub-table-view').exists()).toBe(false);
  });

  it('renders CalendarView when active view type is CALENDAR', async () => {
    mockDatabasesService.getDatabase.mockResolvedValue(makeDatabaseResponse('CALENDAR'));
    const wrapper = mount(DatabaseView, { props: { databaseId: 'db-1' } });
    await flushPromises();

    expect(wrapper.find('.stub-calendar-view').exists()).toBe(true);
    expect(wrapper.find('.stub-table-view').exists()).toBe(false);
    expect(wrapper.find('.stub-kanban-view').exists()).toBe(false);
  });

  it('renders GalleryView when active view type is GALLERY', async () => {
    mockDatabasesService.getDatabase.mockResolvedValue(makeDatabaseResponse('GALLERY'));
    const wrapper = mount(DatabaseView, { props: { databaseId: 'db-1' } });
    await flushPromises();

    expect(wrapper.find('.stub-gallery-view').exists()).toBe(true);
    expect(wrapper.find('.stub-table-view').exists()).toBe(false);
    expect(wrapper.find('.stub-kanban-view').exists()).toBe(false);
    expect(wrapper.find('.stub-calendar-view').exists()).toBe(false);
  });

  it('renders DatabaseHeader and DatabaseToolbar', async () => {
    mockDatabasesService.getDatabase.mockResolvedValue(makeDatabaseResponse());
    const wrapper = mount(DatabaseView, { props: { databaseId: 'db-1' } });
    await flushPromises();

    expect(wrapper.find('.stub-database-header').exists()).toBe(true);
    expect(wrapper.find('.stub-database-toolbar').exists()).toBe(true);
  });

  it('reloads database when databaseId prop changes', async () => {
    mockDatabasesService.getDatabase.mockResolvedValue(makeDatabaseResponse());
    const wrapper = mount(DatabaseView, { props: { databaseId: 'db-1' } });
    await flushPromises();

    expect(mockDatabasesService.getDatabase).toHaveBeenCalledTimes(1);

    // Change databaseId
    mockDatabasesService.getDatabase.mockResolvedValue({
      database: {
        ...makeDatabaseResponse().database,
        id: 'db-2',
        name: 'Projects',
      },
    });
    await wrapper.setProps({ databaseId: 'db-2' });
    await flushPromises();

    expect(mockDatabasesService.getDatabase).toHaveBeenCalledTimes(2);
    expect(mockDatabasesService.getDatabase).toHaveBeenLastCalledWith('org-1', 'db-2');
  });

  it('does not show database content when currentDatabase is null', async () => {
    mockDatabasesService.getDatabase.mockResolvedValue(makeDatabaseResponse());
    const wrapper = mount(DatabaseView, { props: { databaseId: 'db-1' } });
    await flushPromises();

    // Manually clear the store to simulate no database
    const store = useDatabasesStore();
    store.currentDatabaseId = null;
    await wrapper.vm.$nextTick();

    expect(wrapper.find('.database-content').exists()).toBe(false);
  });
});
