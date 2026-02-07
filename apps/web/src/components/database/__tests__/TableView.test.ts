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

  it('does not call createRow immediately when clicking add row button', async () => {
    setupStore();
    const wrapper = mount(TableView);
    const addBtn = wrapper.find('.add-row-btn');
    await addBtn.trigger('click');

    expect(mockDatabasesService.createRow).not.toHaveBeenCalled();
  });

  it('shows a draft row when clicking add row button', async () => {
    setupStore();
    const wrapper = mount(TableView);
    const addBtn = wrapper.find('.add-row-btn');
    await addBtn.trigger('click');

    // Should now have 3 rows: 2 real + 1 draft
    const rows = wrapper.findAll('.data-row');
    expect(rows).toHaveLength(3);
    expect(wrapper.find('.draft-row').exists()).toBe(true);
  });

  it('persists draft row when a cell is edited', async () => {
    setupStore();
    mockDatabasesService.createRow.mockResolvedValue({
      row: {
        id: 'row-new',
        databaseId: 'db-1',
        position: 2,
        cells: { 'prop-1': 'New entry' },
        createdById: 'user-1',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      },
    });

    const wrapper = mount(TableView);
    // Click New to create draft
    await wrapper.find('.add-row-btn').trigger('click');

    // Find the draft row's first data cell and click to edit
    const draftRow = wrapper.find('.draft-row');
    const cells = draftRow.findAll('.data-cell');
    await cells[0]!.trigger('click');

    // Find the editor input and type a value
    const input = wrapper.find('.cell-input');
    expect(input.exists()).toBe(true);
    await input.setValue('New entry');
    await input.trigger('blur');
    await flushPromises();

    expect(mockDatabasesService.createRow).toHaveBeenCalledWith(
      'org-1',
      'db-1',
      expect.objectContaining({ cells: { 'prop-1': 'New entry' } })
    );
  });

  it('discards draft row when clicking New again without entering data', async () => {
    setupStore();
    const wrapper = mount(TableView);

    // Click New to create first draft
    await wrapper.find('.add-row-btn').trigger('click');
    expect(wrapper.findAll('.data-row')).toHaveLength(3);

    // Click New again - old empty draft should be discarded, new one created
    await wrapper.find('.add-row-btn').trigger('click');
    expect(wrapper.findAll('.data-row')).toHaveLength(3);
    expect(mockDatabasesService.createRow).not.toHaveBeenCalled();
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

  // ========================================
  // Column Resizing
  // ========================================

  describe('column resizing', () => {
    it('renders resize handles on column headers', () => {
      setupStore();
      const wrapper = mount(TableView);
      const handles = wrapper.findAll('.col-resize-handle');
      // One handle per property column
      expect(handles).toHaveLength(2);
    });

    it('applies default column width when no config exists', () => {
      setupStore();
      const wrapper = mount(TableView);
      const headers = wrapper.findAll('.col-header');
      // Default width should be applied as inline style
      expect(headers[0]!.attributes('style')).toContain('width');
    });

    it('applies saved column widths from view config', () => {
      const store = setupStore();
      store.views = [
        {
          id: 'view-1',
          databaseId: 'db-1',
          name: 'Table view',
          type: 'TABLE',
          position: 0,
          config: { columnWidths: { 'prop-1': 250, 'prop-2': 180 } },
        },
      ];
      const wrapper = mount(TableView);
      const headers = wrapper.findAll('.col-header');
      expect(headers[0]!.attributes('style')).toContain('250px');
      expect(headers[1]!.attributes('style')).toContain('180px');
    });

    it('starts resizing on mousedown on resize handle', async () => {
      setupStore();
      const wrapper = mount(TableView);
      const handle = wrapper.find('.col-resize-handle');
      await handle.trigger('mousedown', { clientX: 200 });
      // The resizing class should be applied to the table or a parent
      expect(wrapper.find('.table-view--resizing').exists()).toBe(true);
    });

    it('updates column width during mousemove while resizing', async () => {
      setupStore();
      const wrapper = mount(TableView);
      const handle = wrapper.findAll('.col-resize-handle')[0]!;

      // Start resize at x=200
      await handle.trigger('mousedown', { clientX: 200 });

      // Simulate mousemove on document (move 50px right)
      const moveEvent = new MouseEvent('mousemove', { clientX: 250 });
      document.dispatchEvent(moveEvent);
      await wrapper.vm.$nextTick();

      // Column width should have increased by 50px from default
      const headers = wrapper.findAll('.col-header');
      const style = headers[0]!.attributes('style') ?? '';
      // Extract width value - should be default (200) + 50 = 250
      expect(style).toMatch(/width:\s*250px/);
    });

    it('persists column width on mouseup after resize', async () => {
      setupStore();
      mockDatabasesService.updateView.mockResolvedValue({
        view: {
          id: 'view-1',
          databaseId: 'db-1',
          name: 'Table view',
          type: 'TABLE',
          position: 0,
          config: { columnWidths: { 'prop-1': 250 } },
        },
      });

      const wrapper = mount(TableView);
      const handle = wrapper.findAll('.col-resize-handle')[0]!;

      // Start resize
      await handle.trigger('mousedown', { clientX: 200 });

      // Move mouse
      document.dispatchEvent(new MouseEvent('mousemove', { clientX: 250 }));
      await wrapper.vm.$nextTick();

      // End resize
      document.dispatchEvent(new MouseEvent('mouseup'));
      await flushPromises();

      // Should persist widths via updateView
      expect(mockDatabasesService.updateView).toHaveBeenCalledWith(
        'org-1',
        'db-1',
        'view-1',
        expect.objectContaining({
          config: expect.objectContaining({
            columnWidths: expect.objectContaining({ 'prop-1': 250 }),
          }),
        })
      );
    });

    it('enforces minimum column width of 80px', async () => {
      setupStore();
      const wrapper = mount(TableView);
      const handle = wrapper.findAll('.col-resize-handle')[0]!;

      // Start resize at x=200
      await handle.trigger('mousedown', { clientX: 200 });

      // Move mouse far left to try to make column very small
      document.dispatchEvent(new MouseEvent('mousemove', { clientX: 10 }));
      await wrapper.vm.$nextTick();

      const headers = wrapper.findAll('.col-header');
      const style = headers[0]!.attributes('style') ?? '';
      // Should not go below 80px
      expect(style).toMatch(/width:\s*80px/);
    });

    it('resets column width to default on double-click', async () => {
      const store = setupStore();
      store.views = [
        {
          id: 'view-1',
          databaseId: 'db-1',
          name: 'Table view',
          type: 'TABLE',
          position: 0,
          config: { columnWidths: { 'prop-1': 300, 'prop-2': 180 } },
        },
      ];
      mockDatabasesService.updateView.mockResolvedValue({
        view: { ...store.views[0]!, config: { columnWidths: { 'prop-2': 180 } } },
      });

      const wrapper = mount(TableView);
      const handle = wrapper.findAll('.col-resize-handle')[0]!;
      await handle.trigger('dblclick');
      await flushPromises();

      // Should reset prop-1 width (remove from config) and persist
      expect(mockDatabasesService.updateView).toHaveBeenCalledWith(
        'org-1',
        'db-1',
        'view-1',
        expect.objectContaining({
          config: expect.objectContaining({
            columnWidths: expect.not.objectContaining({ 'prop-1': expect.anything() }),
          }),
        })
      );
    });

    it('stops resizing and removes event listeners on mouseup', async () => {
      setupStore();
      const wrapper = mount(TableView);
      const handle = wrapper.findAll('.col-resize-handle')[0]!;

      // Start resize
      await handle.trigger('mousedown', { clientX: 200 });
      expect(wrapper.find('.table-view--resizing').exists()).toBe(true);

      // End resize
      document.dispatchEvent(new MouseEvent('mouseup'));
      await wrapper.vm.$nextTick();

      expect(wrapper.find('.table-view--resizing').exists()).toBe(false);
    });

    it('does not interfere with column drag when clicking header content', async () => {
      setupStore();
      const wrapper = mount(TableView);
      const header = wrapper.find('.col-header');

      // Clicking on the header content area should not trigger resize
      await header.trigger('mousedown', { clientX: 100 });
      expect(wrapper.find('.table-view--resizing').exists()).toBe(false);
    });
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
