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
    await tabs[1]!.trigger('click');
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

  it('saves name on blur', async () => {
    const store = setupStore();
    mockDatabasesService.updateDatabase.mockResolvedValue({
      database: { ...store.databases.get('db-1')!, name: 'New Name' },
    });

    const wrapper = mount(DatabaseHeader);
    await wrapper.find('.database-name').trigger('click');

    const input = wrapper.find('.database-name-input');
    await input.setValue('New Name');
    await input.trigger('blur');

    expect(mockDatabasesService.updateDatabase).toHaveBeenCalledWith('org-1', 'db-1', {
      name: 'New Name',
    });
  });

  it('does not save if name is unchanged', async () => {
    setupStore();
    const wrapper = mount(DatabaseHeader);
    await wrapper.find('.database-name').trigger('click');

    const input = wrapper.find('.database-name-input');
    // Keep the same name
    await input.trigger('blur');

    expect(mockDatabasesService.updateDatabase).not.toHaveBeenCalled();
  });

  it('cancels editing on Escape key', async () => {
    setupStore();
    const wrapper = mount(DatabaseHeader);
    await wrapper.find('.database-name').trigger('click');
    expect(wrapper.find('.database-name-input').exists()).toBe(true);

    const input = wrapper.find('.database-name-input');
    await input.trigger('keydown', { key: 'Escape' });

    expect(wrapper.find('.database-name-input').exists()).toBe(false);
    expect(wrapper.find('.database-name').exists()).toBe(true);
  });

  it('creates a new view when selecting from add view menu', async () => {
    const store = setupStore();
    const newView = {
      id: 'view-2',
      databaseId: 'db-1',
      name: 'Kanban view',
      type: 'KANBAN' as const,
      position: 1,
      config: null,
    };
    mockDatabasesService.createView.mockResolvedValue({ view: newView });

    const wrapper = mount(DatabaseHeader);
    const addBtn = wrapper.find('.add-view-btn');
    await addBtn.trigger('click');

    const kanbanOption = wrapper
      .findAll('.new-view-option')
      .find((btn) => btn.text().includes('Kanban'));
    await kanbanOption?.trigger('click');
    await flushPromises();

    expect(mockDatabasesService.createView).toHaveBeenCalledWith('org-1', 'db-1', {
      name: 'Kanban view',
      type: 'KANBAN',
    });
    expect(store.activeViewId).toBe('view-2');
  });

  it('does not delete view when only one view exists', async () => {
    setupStore();
    const wrapper = mount(DatabaseHeader);

    // Right-click the only view tab (contextmenu triggers deleteView)
    const viewTab = wrapper.find('.view-tab');
    await viewTab.trigger('contextmenu');

    expect(mockDatabasesService.deleteView).not.toHaveBeenCalled();
  });

  it('renders Untitled when no database name', () => {
    const store = setupStore();
    store.databases.set('db-1', {
      ...store.databases.get('db-1')!,
      name: '',
    });
    // currentDatabase?.name will be '' which is falsy, falls to 'Untitled'
    // Actually the template uses `?? 'Untitled'` which only catches null/undefined
    // An empty string would show empty. Let's test null case:
    store.currentDatabaseId = null;

    const wrapper = mount(DatabaseHeader);
    expect(wrapper.text()).toContain('Untitled');
  });
});
