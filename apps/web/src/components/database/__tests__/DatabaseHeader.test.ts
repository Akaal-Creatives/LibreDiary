import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
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

import DatabaseHeader from '../DatabaseHeader.vue';
import { useDatabasesStore } from '@/stores/databases';

describe('DatabaseHeader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setActivePinia(createPinia());
  });

  function setupStore() {
    const store = useDatabasesStore();
    store.databases.set('db-1', {
      id: 'db-1',
      name: 'Tasks',
      organizationId: 'org-1',
      pageId: null,
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01',
    });
    store.currentDatabaseId = 'db-1';
    store.views = [
      {
        id: 'view-1',
        databaseId: 'db-1',
        name: 'Table view',
        type: 'TABLE',
        position: 0,
        config: null,
      },
    ];
    store.activeViewId = 'view-1';
    return store;
  }

  it('renders database name', () => {
    setupStore();
    const wrapper = mount(DatabaseHeader);
    expect(wrapper.text()).toContain('Tasks');
  });

  it('renders view tabs', () => {
    setupStore();
    const wrapper = mount(DatabaseHeader);
    expect(wrapper.text()).toContain('Table view');
  });

  it('highlights the active view tab', () => {
    setupStore();
    const wrapper = mount(DatabaseHeader);
    const activeTab = wrapper.find('.view-tab.active');
    expect(activeTab.exists()).toBe(true);
    expect(activeTab.text()).toContain('Table view');
  });

  it('switches view on tab click', async () => {
    const store = setupStore();
    store.views.push({
      id: 'view-2',
      databaseId: 'db-1',
      name: 'Kanban view',
      type: 'KANBAN',
      position: 1,
      config: null,
    });

    const wrapper = mount(DatabaseHeader);
    const tabs = wrapper.findAll('.view-tab');
    expect(tabs.length).toBeGreaterThanOrEqual(2);
    await tabs[1].trigger('click');
    expect(store.activeViewId).toBe('view-2');
  });

  it('shows add view menu on plus button click', async () => {
    setupStore();
    const wrapper = mount(DatabaseHeader);
    const addBtn = wrapper.find('.add-view-btn');
    await addBtn.trigger('click');
    expect(wrapper.find('.new-view-menu').exists()).toBe(true);
  });

  it('enters edit mode when clicking database name', async () => {
    setupStore();
    const wrapper = mount(DatabaseHeader);
    await wrapper.find('.database-name').trigger('click');
    expect(wrapper.find('.database-name-input').exists()).toBe(true);
  });
});
