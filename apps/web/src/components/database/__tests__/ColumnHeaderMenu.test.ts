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

import ColumnHeaderMenu from '../ColumnHeaderMenu.vue';
import { useDatabasesStore } from '@/stores/databases';

describe('ColumnHeaderMenu', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setActivePinia(createPinia());
  });

  function setupStore() {
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
        config: null,
      },
    ];
    store.activeViewId = 'view-1';
    return store;
  }

  const secondProperty = {
    id: 'prop-2',
    databaseId: 'db-1',
    name: 'Status',
    type: 'SELECT' as const,
    position: 1,
    config: null,
  };

  const firstProperty = {
    id: 'prop-1',
    databaseId: 'db-1',
    name: 'Title',
    type: 'TEXT' as const,
    position: 0,
    config: null,
  };

  it('renders sort and rename menu items', () => {
    setupStore();
    const wrapper = mount(ColumnHeaderMenu, {
      props: { property: secondProperty },
    });
    expect(wrapper.text()).toContain('Sort A to Z');
    expect(wrapper.text()).toContain('Sort Z to A');
    expect(wrapper.text()).toContain('Rename');
    expect(wrapper.text()).toContain('Delete');
  });

  it('calls updateView with ascending sort on Sort A-Z click', async () => {
    const store = setupStore();
    mockDatabasesService.updateView.mockResolvedValue({
      view: { ...store.views[0], config: { sorts: [{ propertyId: 'prop-2', direction: 'asc' }] } },
    });

    const wrapper = mount(ColumnHeaderMenu, {
      props: { property: secondProperty },
    });

    const sortAscBtn = wrapper.findAll('.menu-item')[0];
    await sortAscBtn.trigger('click');

    expect(mockDatabasesService.updateView).toHaveBeenCalledWith(
      'org-1',
      'db-1',
      'view-1',
      expect.objectContaining({
        config: expect.objectContaining({
          sorts: [{ propertyId: 'prop-2', direction: 'asc' }],
        }),
      })
    );
  });

  it('calls updateView with descending sort on Sort Z-A click', async () => {
    const store = setupStore();
    mockDatabasesService.updateView.mockResolvedValue({
      view: { ...store.views[0], config: { sorts: [{ propertyId: 'prop-2', direction: 'desc' }] } },
    });

    const wrapper = mount(ColumnHeaderMenu, {
      props: { property: secondProperty },
    });

    const sortDescBtn = wrapper.findAll('.menu-item')[1];
    await sortDescBtn.trigger('click');

    expect(mockDatabasesService.updateView).toHaveBeenCalledWith(
      'org-1',
      'db-1',
      'view-1',
      expect.objectContaining({
        config: expect.objectContaining({
          sorts: [{ propertyId: 'prop-2', direction: 'desc' }],
        }),
      })
    );
  });

  it('enters rename mode when clicking Rename', async () => {
    setupStore();
    const wrapper = mount(ColumnHeaderMenu, {
      props: { property: secondProperty },
    });

    const renameBtn = wrapper.findAll('.menu-item')[2];
    await renameBtn.trigger('click');

    expect(wrapper.find('.rename-input').exists()).toBe(true);
    expect((wrapper.find('.rename-input').element as HTMLInputElement).value).toBe('Status');
  });

  it('saves rename on Enter key', async () => {
    const store = setupStore();
    mockDatabasesService.updateProperty.mockResolvedValue({
      property: { ...store.properties[1], name: 'New Name' },
    });

    const wrapper = mount(ColumnHeaderMenu, {
      props: { property: secondProperty },
    });

    // Enter rename mode
    const renameBtn = wrapper.findAll('.menu-item')[2];
    await renameBtn.trigger('click');

    const input = wrapper.find('.rename-input');
    await input.setValue('New Name');
    await input.trigger('keydown', { key: 'Enter' });

    expect(mockDatabasesService.updateProperty).toHaveBeenCalledWith('org-1', 'db-1', 'prop-2', {
      name: 'New Name',
    });
  });

  it('cancels rename on Escape key', async () => {
    setupStore();
    const wrapper = mount(ColumnHeaderMenu, {
      props: { property: secondProperty },
    });

    // Enter rename mode
    const renameBtn = wrapper.findAll('.menu-item')[2];
    await renameBtn.trigger('click');
    expect(wrapper.find('.rename-input').exists()).toBe(true);

    const input = wrapper.find('.rename-input');
    await input.trigger('keydown', { key: 'Escape' });

    // Should exit rename mode (menu items visible again)
    expect(wrapper.find('.rename-input').exists()).toBe(false);
  });

  it('disables delete button for first property (position 0)', () => {
    setupStore();
    const wrapper = mount(ColumnHeaderMenu, {
      props: { property: firstProperty },
    });

    const deleteBtn = wrapper.findAll('.menu-item').find((b) => b.text().includes('Delete'));
    expect(deleteBtn?.attributes('disabled')).toBeDefined();
  });

  it('calls deleteProperty for non-first property', async () => {
    setupStore();
    mockDatabasesService.deleteProperty.mockResolvedValue({ message: 'deleted' });

    const wrapper = mount(ColumnHeaderMenu, {
      props: { property: secondProperty },
    });

    const deleteBtn = wrapper.findAll('.menu-item').find((b) => b.text().includes('Delete'));
    await deleteBtn?.trigger('click');

    expect(mockDatabasesService.deleteProperty).toHaveBeenCalledWith('org-1', 'db-1', 'prop-2');
  });

  it('emits close after sort action', async () => {
    const store = setupStore();
    mockDatabasesService.updateView.mockResolvedValue({
      view: { ...store.views[0], config: {} },
    });

    const wrapper = mount(ColumnHeaderMenu, {
      props: { property: secondProperty },
    });

    const sortAscBtn = wrapper.findAll('.menu-item')[0];
    await sortAscBtn.trigger('click');
    await flushPromises();

    expect(wrapper.emitted('close')).toBeTruthy();
  });

  it('emits close after delete action', async () => {
    setupStore();
    mockDatabasesService.deleteProperty.mockResolvedValue({ message: 'deleted' });

    const wrapper = mount(ColumnHeaderMenu, {
      props: { property: secondProperty },
    });

    const deleteBtn = wrapper.findAll('.menu-item').find((b) => b.text().includes('Delete'));
    await deleteBtn?.trigger('click');
    await flushPromises();

    expect(wrapper.emitted('close')).toBeTruthy();
  });
});
