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

import TableView from '../TableView.vue';
import { useDatabasesStore } from '@/stores/databases';

describe('TableView', () => {
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
        config: { options: [{ label: 'Done' }, { label: 'Todo' }] },
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
    store.rows = [
      {
        id: 'row-1',
        databaseId: 'db-1',
        position: 0,
        cells: { 'prop-1': 'Buy milk', 'prop-2': 'Todo' },
        createdById: 'user-1',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      },
      {
        id: 'row-2',
        databaseId: 'db-1',
        position: 1,
        cells: { 'prop-1': 'Write tests', 'prop-2': 'Done' },
        createdById: 'user-1',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      },
    ];
    return store;
  }

  it('renders column headers', () => {
    setupStore();
    const wrapper = mount(TableView);
    expect(wrapper.text()).toContain('Title');
    expect(wrapper.text()).toContain('Status');
  });

  it('renders data rows', () => {
    setupStore();
    const wrapper = mount(TableView);
    expect(wrapper.text()).toContain('Buy milk');
    expect(wrapper.text()).toContain('Write tests');
  });

  it('renders correct number of rows', () => {
    setupStore();
    const wrapper = mount(TableView);
    const rows = wrapper.findAll('.data-row');
    expect(rows).toHaveLength(2);
  });

  it('renders add row button', () => {
    setupStore();
    const wrapper = mount(TableView);
    const addBtn = wrapper.find('.add-row-btn');
    expect(addBtn.exists()).toBe(true);
    expect(addBtn.text()).toContain('New');
  });

  it('shows add property popover on plus click', async () => {
    setupStore();
    const wrapper = mount(TableView);
    const addBtn = wrapper.find('.add-property-btn');
    await addBtn.trigger('click');
    expect(wrapper.find('.add-property-popover').exists()).toBe(true);
  });

  it('selects a row on checkbox click', async () => {
    setupStore();
    const wrapper = mount(TableView);
    const checkboxes = wrapper.findAll('.row-checkbox');
    await checkboxes[1]!.setValue(true);
    expect(wrapper.find('.bulk-actions').exists()).toBe(true);
    expect(wrapper.text()).toContain('1 selected');
  });

  it('selects all rows on header checkbox click', async () => {
    setupStore();
    const wrapper = mount(TableView);
    const checkboxes = wrapper.findAll('.row-checkbox');
    await checkboxes[0]!.setValue(true);
    expect(wrapper.text()).toContain('2 selected');
  });

  it('enters edit mode on cell click', async () => {
    setupStore();
    const wrapper = mount(TableView);
    const cells = wrapper.findAll('.data-cell');
    await cells[0]!.trigger('click');
    expect(wrapper.find('.cell-input').exists()).toBe(true);
  });

  it('renders empty state when no rows exist', () => {
    const store = setupStore();
    store.rows = [];
    const wrapper = mount(TableView);
    const rows = wrapper.findAll('.data-row');
    expect(rows).toHaveLength(0);
    // Add row button should still be present
    expect(wrapper.find('.add-row-btn').exists()).toBe(true);
  });

  it('calls createRow when clicking add row button', async () => {
    setupStore();
    mockDatabasesService.createRow.mockResolvedValue({
      row: {
        id: 'row-new',
        databaseId: 'db-1',
        position: 2,
        cells: {},
        createdById: 'user-1',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      },
    });

    const wrapper = mount(TableView);
    const addBtn = wrapper.find('.add-row-btn');
    await addBtn.trigger('click');

    expect(mockDatabasesService.createRow).toHaveBeenCalledWith('org-1', 'db-1', {});
  });

  it('deselects row when unchecking checkbox', async () => {
    setupStore();
    const wrapper = mount(TableView);
    const checkboxes = wrapper.findAll('.row-checkbox');

    // Select the row
    await checkboxes[1]!.setValue(true);
    expect(wrapper.find('.bulk-actions').exists()).toBe(true);

    // Deselect the row
    await checkboxes[1]!.setValue(false);
    expect(wrapper.find('.bulk-actions').exists()).toBe(false);
  });

  it('calls bulkDeleteRows when clicking delete in bulk actions', async () => {
    setupStore();
    mockDatabasesService.bulkDeleteRows.mockResolvedValue({ count: 1, message: '1 deleted' });

    const wrapper = mount(TableView);
    const checkboxes = wrapper.findAll('.row-checkbox');
    await checkboxes[1]!.setValue(true);

    const deleteBtn = wrapper.find('.delete-btn');
    await deleteBtn.trigger('click');

    expect(mockDatabasesService.bulkDeleteRows).toHaveBeenCalledWith('org-1', 'db-1', ['row-1']);
  });

  it('does not enter edit mode for system column types', async () => {
    const store = setupStore();
    store.properties.push({
      id: 'prop-sys',
      databaseId: 'db-1',
      name: 'Created',
      type: 'CREATED_TIME',
      position: 2,
      config: null,
    });
    store.rows = [
      {
        id: 'row-1',
        databaseId: 'db-1',
        position: 0,
        cells: { 'prop-1': 'Test', 'prop-2': 'Todo', 'prop-sys': '2024-01-01' },
        createdById: 'user-1',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      },
    ];

    const wrapper = mount(TableView);
    // Find the system column cell (last data-cell in the row)
    const cells = wrapper.findAll('.data-cell');
    const systemCell = cells[cells.length - 1]!;
    await systemCell.trigger('click');

    // Should not show editor for system columns
    expect(wrapper.findAll('.cell-input').length).toBe(0);
  });
});
