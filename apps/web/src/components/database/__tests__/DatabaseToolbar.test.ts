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

import DatabaseToolbar from '../DatabaseToolbar.vue';
import { useDatabasesStore } from '@/stores/databases';

describe('DatabaseToolbar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setActivePinia(createPinia());
  });

  function setupStore(viewConfig: Record<string, unknown> | null = null) {
    const store = useDatabasesStore();
    store.currentDatabaseId = 'db-1';
    store.properties = [
      {
        id: 'prop-1',
        databaseId: 'db-1',
        name: 'Title',
        type: 'TEXT',
        position: 0,
        config: null,
      },
      {
        id: 'prop-2',
        databaseId: 'db-1',
        name: 'Status',
        type: 'SELECT',
        position: 1,
        config: { options: [{ label: 'Done' }, { label: 'Todo' }] },
      },
      {
        id: 'prop-3',
        databaseId: 'db-1',
        name: 'Score',
        type: 'NUMBER',
        position: 2,
        config: null,
      },
    ];
    store.views = [
      {
        id: 'view-1',
        databaseId: 'db-1',
        name: 'Table view',
        type: 'TABLE',
        position: 0,
        config: viewConfig,
      },
    ];
    store.activeViewId = 'view-1';
    store.rows = [];
    return store;
  }

  it('renders filter and sort buttons', () => {
    setupStore();
    const wrapper = mount(DatabaseToolbar);
    expect(wrapper.find('.toolbar-btn-filter').exists()).toBe(true);
    expect(wrapper.find('.toolbar-btn-sort').exists()).toBe(true);
  });

  it('shows active filter count badge', () => {
    setupStore({
      filters: [
        { propertyId: 'prop-1', operator: 'contains', value: 'test' },
        { propertyId: 'prop-2', operator: 'equals', value: 'Done' },
      ],
    });
    const wrapper = mount(DatabaseToolbar);
    const badge = wrapper.find('.filter-badge');
    expect(badge.exists()).toBe(true);
    expect(badge.text()).toBe('2');
  });

  it('shows active sort count badge', () => {
    setupStore({
      sorts: [{ propertyId: 'prop-1', direction: 'asc' }],
    });
    const wrapper = mount(DatabaseToolbar);
    const badge = wrapper.find('.sort-badge');
    expect(badge.exists()).toBe(true);
    expect(badge.text()).toBe('1');
  });

  it('does not show badges when no active filters or sorts', () => {
    setupStore();
    const wrapper = mount(DatabaseToolbar);
    expect(wrapper.find('.filter-badge').exists()).toBe(false);
    expect(wrapper.find('.sort-badge').exists()).toBe(false);
  });

  it('opens filter panel when clicking filter button', async () => {
    setupStore();
    const wrapper = mount(DatabaseToolbar);
    await wrapper.find('.toolbar-btn-filter').trigger('click');
    expect(wrapper.find('.filter-panel').exists()).toBe(true);
  });

  it('opens sort panel when clicking sort button', async () => {
    setupStore();
    const wrapper = mount(DatabaseToolbar);
    await wrapper.find('.toolbar-btn-sort').trigger('click');
    expect(wrapper.find('.sort-panel').exists()).toBe(true);
  });

  it('renders existing filters in filter panel', async () => {
    setupStore({
      filters: [{ propertyId: 'prop-1', operator: 'contains', value: 'test' }],
    });
    const wrapper = mount(DatabaseToolbar);
    await wrapper.find('.toolbar-btn-filter').trigger('click');
    expect(wrapper.findAll('.filter-row')).toHaveLength(1);
  });

  it('adds a new filter row when clicking add filter', async () => {
    setupStore();
    const wrapper = mount(DatabaseToolbar);
    await wrapper.find('.toolbar-btn-filter').trigger('click');
    const addBtn = wrapper.find('.add-filter-btn');
    await addBtn.trigger('click');
    expect(wrapper.findAll('.filter-row')).toHaveLength(1);
  });

  it('removes a filter row and saves', async () => {
    setupStore({
      filters: [{ propertyId: 'prop-1', operator: 'contains', value: 'test' }],
    });
    mockDatabasesService.updateView.mockResolvedValue({
      view: {
        id: 'view-1',
        databaseId: 'db-1',
        name: 'Table view',
        type: 'TABLE',
        position: 0,
        config: { filters: [] },
      },
    });

    const wrapper = mount(DatabaseToolbar);
    await wrapper.find('.toolbar-btn-filter').trigger('click');
    const removeBtn = wrapper.find('.remove-filter-btn');
    await removeBtn.trigger('click');
    await flushPromises();

    expect(mockDatabasesService.updateView).toHaveBeenCalled();
  });

  it('renders existing sorts in sort panel', async () => {
    setupStore({
      sorts: [{ propertyId: 'prop-1', direction: 'asc' }],
    });
    const wrapper = mount(DatabaseToolbar);
    await wrapper.find('.toolbar-btn-sort').trigger('click');
    expect(wrapper.findAll('.sort-row')).toHaveLength(1);
  });

  it('adds a new sort row when clicking add sort', async () => {
    setupStore();
    const wrapper = mount(DatabaseToolbar);
    await wrapper.find('.toolbar-btn-sort').trigger('click');
    const addBtn = wrapper.find('.add-sort-btn');
    await addBtn.trigger('click');
    expect(wrapper.findAll('.sort-row')).toHaveLength(1);
  });

  it('clears all filters when clicking clear filters', async () => {
    setupStore({
      filters: [
        { propertyId: 'prop-1', operator: 'contains', value: 'test' },
        { propertyId: 'prop-2', operator: 'equals', value: 'Done' },
      ],
    });
    mockDatabasesService.updateView.mockResolvedValue({
      view: {
        id: 'view-1',
        databaseId: 'db-1',
        name: 'Table view',
        type: 'TABLE',
        position: 0,
        config: { filters: [] },
      },
    });

    const wrapper = mount(DatabaseToolbar);
    await wrapper.find('.toolbar-btn-filter').trigger('click');
    const clearBtn = wrapper.find('.clear-filters-btn');
    await clearBtn.trigger('click');
    await flushPromises();

    expect(mockDatabasesService.updateView).toHaveBeenCalled();
  });
});
