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

import KanbanView from '../KanbanView.vue';
import { useDatabasesStore } from '@/stores/databases';

describe('KanbanView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setActivePinia(createPinia());
  });

  function setupStore(options?: { groupBy?: string | null }) {
    const store = useDatabasesStore();
    store.currentDatabaseId = 'db-1';
    store.properties = [
      {
        id: 'prop-title',
        databaseId: 'db-1',
        name: 'Title',
        type: 'TEXT',
        position: 0,
        config: null,
      },
      {
        id: 'prop-status',
        databaseId: 'db-1',
        name: 'Status',
        type: 'SELECT',
        position: 1,
        config: {
          options: [
            { label: 'Todo', colour: '#E57373' },
            { label: 'In Progress', colour: '#FFB74D' },
            { label: 'Done', colour: '#81C784' },
          ],
        },
      },
      {
        id: 'prop-number',
        databaseId: 'db-1',
        name: 'Priority',
        type: 'NUMBER',
        position: 2,
        config: null,
      },
    ];

    const groupBy = options?.groupBy !== undefined ? options.groupBy : 'prop-status';

    store.views = [
      {
        id: 'view-k',
        databaseId: 'db-1',
        name: 'Kanban view',
        type: 'KANBAN',
        position: 0,
        config: groupBy ? { groupBy } : null,
      },
    ];
    store.activeViewId = 'view-k';
    store.rows = [
      {
        id: 'row-1',
        databaseId: 'db-1',
        position: 0,
        cells: { 'prop-title': 'Buy milk', 'prop-status': 'Todo' },
        createdById: 'user-1',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      },
      {
        id: 'row-2',
        databaseId: 'db-1',
        position: 1,
        cells: { 'prop-title': 'Write tests', 'prop-status': 'Done' },
        createdById: 'user-1',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      },
      {
        id: 'row-3',
        databaseId: 'db-1',
        position: 2,
        cells: { 'prop-title': 'Fix bug', 'prop-status': 'In Progress' },
        createdById: 'user-1',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      },
      {
        id: 'row-4',
        databaseId: 'db-1',
        position: 3,
        cells: { 'prop-title': 'Unassigned task' },
        createdById: 'user-1',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      },
    ];
    return store;
  }

  it('renders group-by selector when no groupBy configured', () => {
    setupStore({ groupBy: null });
    const wrapper = mount(KanbanView);
    expect(wrapper.find('.kanban-group-by-bar').exists()).toBe(true);
    expect(wrapper.find('.kanban-board').exists()).toBe(false);
    expect(wrapper.text()).toContain('Group by');
  });

  it('renders columns from SELECT property options', () => {
    setupStore();
    const wrapper = mount(KanbanView);
    const columns = wrapper.findAll('.kanban-column');
    // 3 options + 1 Uncategorised = 4 columns
    expect(columns).toHaveLength(4);
    expect(wrapper.text()).toContain('Todo');
    expect(wrapper.text()).toContain('In Progress');
    expect(wrapper.text()).toContain('Done');
    expect(wrapper.text()).toContain('Uncategorised');
  });

  it('renders cards in correct columns', () => {
    setupStore();
    const wrapper = mount(KanbanView);
    const columns = wrapper.findAll('.kanban-column');

    // Todo column (first option)
    const todoCards = columns[0]!.findAll('.kanban-card');
    expect(todoCards).toHaveLength(1);
    expect(todoCards[0]!.text()).toContain('Buy milk');

    // In Progress column
    const ipCards = columns[1]!.findAll('.kanban-card');
    expect(ipCards).toHaveLength(1);
    expect(ipCards[0]!.text()).toContain('Fix bug');

    // Done column
    const doneCards = columns[2]!.findAll('.kanban-card');
    expect(doneCards).toHaveLength(1);
    expect(doneCards[0]!.text()).toContain('Write tests');
  });

  it('renders uncategorised column for rows with no value', () => {
    setupStore();
    const wrapper = mount(KanbanView);
    const columns = wrapper.findAll('.kanban-column');
    const uncatColumn = columns[3]!;
    expect(uncatColumn.text()).toContain('Uncategorised');
    const cards = uncatColumn.findAll('.kanban-card');
    expect(cards).toHaveLength(1);
    expect(cards[0]!.text()).toContain('Unassigned task');
  });

  it('renders card title from first property', () => {
    setupStore();
    const wrapper = mount(KanbanView);
    const cards = wrapper.findAll('.kanban-card');
    // Every card should show its title prominently
    const firstCard = cards[0]!;
    expect(firstCard.find('.card-title').text()).toContain('Buy milk');
  });

  it('renders column card counts', () => {
    setupStore();
    const wrapper = mount(KanbanView);
    const counts = wrapper.findAll('.column-count');
    // Todo: 1, In Progress: 1, Done: 1, Uncategorised: 1
    expect(counts[0]!.text()).toBe('1');
    expect(counts[1]!.text()).toBe('1');
    expect(counts[2]!.text()).toBe('1');
    expect(counts[3]!.text()).toBe('1');
  });

  it('changes groupBy property via selector', async () => {
    setupStore({ groupBy: null });
    mockDatabasesService.updateView.mockResolvedValue({
      view: {
        id: 'view-k',
        databaseId: 'db-1',
        name: 'Kanban view',
        type: 'KANBAN',
        position: 0,
        config: { groupBy: 'prop-status' },
      },
    });

    const wrapper = mount(KanbanView);
    const select = wrapper.find('.group-by-select');
    await select.setValue('prop-status');
    await flushPromises();

    expect(mockDatabasesService.updateView).toHaveBeenCalledWith(
      'org-1',
      'db-1',
      'view-k',
      expect.objectContaining({
        config: expect.objectContaining({ groupBy: 'prop-status' }),
      })
    );
  });

  it('moves card between columns on drop', async () => {
    setupStore();
    mockDatabasesService.updateRow.mockResolvedValue({
      row: {
        id: 'row-1',
        databaseId: 'db-1',
        position: 0,
        cells: { 'prop-title': 'Buy milk', 'prop-status': 'Done' },
        createdById: 'user-1',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      },
    });

    const wrapper = mount(KanbanView);
    const columns = wrapper.findAll('.kanban-column');
    const todoCard = columns[0]!.find('.kanban-card');

    // Simulate drag start on the card
    await todoCard.trigger('dragstart', {
      dataTransfer: { effectAllowed: '', setData: vi.fn() },
    });

    // Simulate drop on the Done column's drop zone
    const doneDropZone = columns[2]!.find('.column-cards');
    await doneDropZone.trigger('dragover', {
      preventDefault: vi.fn(),
    });
    await doneDropZone.trigger('drop', {
      preventDefault: vi.fn(),
    });
    await flushPromises();

    expect(mockDatabasesService.updateRow).toHaveBeenCalledWith('org-1', 'db-1', 'row-1', {
      cells: { 'prop-status': 'Done' },
    });
  });

  it('shows add card button per column', () => {
    setupStore();
    const wrapper = mount(KanbanView);
    const addBtns = wrapper.findAll('.add-card-btn');
    expect(addBtns).toHaveLength(4);
  });

  it('creates draft card on add click', async () => {
    setupStore();
    const wrapper = mount(KanbanView);
    const columns = wrapper.findAll('.kanban-column');
    const addBtn = columns[0]!.find('.add-card-btn');
    await addBtn.trigger('click');

    expect(columns[0]!.find('.draft-card').exists()).toBe(true);
    expect(mockDatabasesService.createRow).not.toHaveBeenCalled();
  });

  it('persists draft card with column value pre-set', async () => {
    setupStore();
    mockDatabasesService.createRow.mockResolvedValue({
      row: {
        id: 'row-new',
        databaseId: 'db-1',
        position: 4,
        cells: { 'prop-title': 'New task', 'prop-status': 'Todo' },
        createdById: 'user-1',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
      },
    });

    const wrapper = mount(KanbanView);
    const columns = wrapper.findAll('.kanban-column');
    const addBtn = columns[0]!.find('.add-card-btn');
    await addBtn.trigger('click');

    // Find the draft card input and type a value
    const draftInput = wrapper.find('.draft-card-input');
    expect(draftInput.exists()).toBe(true);
    await draftInput.setValue('New task');
    await draftInput.trigger('keydown', { key: 'Enter' });
    await flushPromises();

    expect(mockDatabasesService.createRow).toHaveBeenCalledWith(
      'org-1',
      'db-1',
      expect.objectContaining({
        cells: expect.objectContaining({
          'prop-status': 'Todo',
          'prop-title': 'New task',
        }),
      })
    );
  });

  it('discards empty draft card when clicking add in another column', async () => {
    setupStore();
    const wrapper = mount(KanbanView);
    const columns = wrapper.findAll('.kanban-column');

    // Click add in first column
    await columns[0]!.find('.add-card-btn').trigger('click');
    expect(columns[0]!.find('.draft-card').exists()).toBe(true);

    // Click add in second column — first draft should be discarded
    await columns[1]!.find('.add-card-btn').trigger('click');
    expect(columns[0]!.find('.draft-card').exists()).toBe(false);
    expect(columns[1]!.find('.draft-card').exists()).toBe(true);
    expect(mockDatabasesService.createRow).not.toHaveBeenCalled();
  });
});
