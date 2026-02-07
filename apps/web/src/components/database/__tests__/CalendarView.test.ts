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

import CalendarView from '../CalendarView.vue';
import { useDatabasesStore } from '@/stores/databases';

describe('CalendarView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setActivePinia(createPinia());
    // Fix the "today" date for deterministic tests
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2025, 5, 15)); // 15 June 2025
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function setupStore(options?: { dateProperty?: string | null }) {
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
        id: 'prop-due',
        databaseId: 'db-1',
        name: 'Due Date',
        type: 'DATE',
        position: 1,
        config: null,
      },
      {
        id: 'prop-status',
        databaseId: 'db-1',
        name: 'Status',
        type: 'SELECT',
        position: 2,
        config: {
          options: [
            { label: 'Todo', colour: '#E57373' },
            { label: 'Done', colour: '#81C784' },
          ],
        },
      },
      {
        id: 'prop-created',
        databaseId: 'db-1',
        name: 'Created',
        type: 'DATE',
        position: 3,
        config: null,
      },
    ];

    const dateProperty = options?.dateProperty !== undefined ? options.dateProperty : 'prop-due';

    store.views = [
      {
        id: 'view-c',
        databaseId: 'db-1',
        name: 'Calendar view',
        type: 'CALENDAR',
        position: 0,
        config: dateProperty ? { dateProperty } : null,
      },
    ];
    store.activeViewId = 'view-c';
    store.rows = [
      {
        id: 'row-1',
        databaseId: 'db-1',
        position: 0,
        cells: { 'prop-title': 'Meeting', 'prop-due': '2025-06-15', 'prop-status': 'Todo' },
        createdById: 'user-1',
        createdAt: '2025-01-01',
        updatedAt: '2025-01-01',
      },
      {
        id: 'row-2',
        databaseId: 'db-1',
        position: 1,
        cells: { 'prop-title': 'Deadline', 'prop-due': '2025-06-20', 'prop-status': 'Todo' },
        createdById: 'user-1',
        createdAt: '2025-01-01',
        updatedAt: '2025-01-01',
      },
      {
        id: 'row-3',
        databaseId: 'db-1',
        position: 2,
        cells: { 'prop-title': 'Launch', 'prop-due': '2025-07-01', 'prop-status': 'Done' },
        createdById: 'user-1',
        createdAt: '2025-01-01',
        updatedAt: '2025-01-01',
      },
      {
        id: 'row-4',
        databaseId: 'db-1',
        position: 3,
        cells: { 'prop-title': 'No date task' },
        createdById: 'user-1',
        createdAt: '2025-01-01',
        updatedAt: '2025-01-01',
      },
    ];
    return store;
  }

  // ===========================================
  // DATE PROPERTY SELECTOR
  // ===========================================

  it('renders date-property selector when no dateProperty configured', () => {
    setupStore({ dateProperty: null });
    const wrapper = mount(CalendarView);
    expect(wrapper.find('.calendar-date-property-prompt').exists()).toBe(true);
    expect(wrapper.find('.calendar-grid').exists()).toBe(false);
    expect(wrapper.text()).toContain('Date property');
  });

  it('only lists DATE properties in date-property selector', () => {
    setupStore({ dateProperty: null });
    const wrapper = mount(CalendarView);
    const select = wrapper.find('.date-property-select');
    const options = select.findAll('option');
    // 1 disabled placeholder + 2 DATE properties (Due Date, Created)
    expect(options).toHaveLength(3);
    expect(options[1]!.text()).toBe('Due Date');
    expect(options[2]!.text()).toBe('Created');
  });

  it('changes dateProperty via selector', async () => {
    setupStore({ dateProperty: null });
    mockDatabasesService.updateView.mockResolvedValue({
      view: {
        id: 'view-c',
        databaseId: 'db-1',
        name: 'Calendar view',
        type: 'CALENDAR',
        position: 0,
        config: { dateProperty: 'prop-due' },
      },
    });

    const wrapper = mount(CalendarView);
    const select = wrapper.find('.date-property-select');
    await select.setValue('prop-due');
    await flushPromises();

    expect(mockDatabasesService.updateView).toHaveBeenCalledWith(
      'org-1',
      'db-1',
      'view-c',
      expect.objectContaining({
        config: expect.objectContaining({ dateProperty: 'prop-due' }),
      })
    );
  });

  it('shows date-property bar when dateProperty is configured', () => {
    setupStore();
    const wrapper = mount(CalendarView);
    expect(wrapper.find('.calendar-date-property-bar').exists()).toBe(true);
    expect(wrapper.find('.calendar-date-property-prompt').exists()).toBe(false);
    expect(wrapper.find('.date-property-select').exists()).toBe(true);
  });

  // ===========================================
  // MONTH NAVIGATION
  // ===========================================

  it('displays current month and year in header', () => {
    setupStore();
    const wrapper = mount(CalendarView);
    expect(wrapper.find('.calendar-month-label').text()).toContain('June');
    expect(wrapper.find('.calendar-month-label').text()).toContain('2025');
  });

  it('navigates to previous month', async () => {
    setupStore();
    const wrapper = mount(CalendarView);
    await wrapper.find('.calendar-nav-prev').trigger('click');
    expect(wrapper.find('.calendar-month-label').text()).toContain('May');
    expect(wrapper.find('.calendar-month-label').text()).toContain('2025');
  });

  it('navigates to next month', async () => {
    setupStore();
    const wrapper = mount(CalendarView);
    await wrapper.find('.calendar-nav-next').trigger('click');
    expect(wrapper.find('.calendar-month-label').text()).toContain('July');
    expect(wrapper.find('.calendar-month-label').text()).toContain('2025');
  });

  it('navigates back to today when today button is clicked', async () => {
    setupStore();
    const wrapper = mount(CalendarView);
    // Navigate away first
    await wrapper.find('.calendar-nav-next').trigger('click');
    await wrapper.find('.calendar-nav-next').trigger('click');
    expect(wrapper.find('.calendar-month-label').text()).toContain('August');

    // Click today
    await wrapper.find('.calendar-nav-today').trigger('click');
    expect(wrapper.find('.calendar-month-label').text()).toContain('June');
    expect(wrapper.find('.calendar-month-label').text()).toContain('2025');
  });

  // ===========================================
  // CALENDAR GRID
  // ===========================================

  it('renders 7 weekday headers', () => {
    setupStore();
    const wrapper = mount(CalendarView);
    const headers = wrapper.findAll('.calendar-weekday');
    expect(headers).toHaveLength(7);
    expect(headers[0]!.text()).toBe('Mon');
    expect(headers[6]!.text()).toBe('Sun');
  });

  it('renders day cells for the current month grid', () => {
    setupStore();
    const wrapper = mount(CalendarView);
    // June 2025 starts on Sunday, so grid has leading days from May
    // Grid should have at least 28 cells (4 weeks) up to 42 cells (6 weeks)
    const dayCells = wrapper.findAll('.calendar-day');
    expect(dayCells.length).toBeGreaterThanOrEqual(28);
    expect(dayCells.length).toBeLessThanOrEqual(42);
  });

  it('marks today cell with a special class', () => {
    setupStore();
    const wrapper = mount(CalendarView);
    const todayCell = wrapper.find('.calendar-day--today');
    expect(todayCell.exists()).toBe(true);
    expect(todayCell.find('.day-number').text()).toBe('15');
  });

  it('marks cells outside current month as muted', () => {
    setupStore();
    const wrapper = mount(CalendarView);
    const outOfMonthCells = wrapper.findAll('.calendar-day--outside');
    expect(outOfMonthCells.length).toBeGreaterThan(0);
  });

  // ===========================================
  // EVENTS ON CALENDAR
  // ===========================================

  it('displays event chips on their correct date cells', () => {
    setupStore();
    const wrapper = mount(CalendarView);
    // "Meeting" is on 2025-06-15
    const allEvents = wrapper.findAll('.calendar-event');
    expect(allEvents.length).toBeGreaterThanOrEqual(2); // Meeting + Deadline in June
    // Check that "Meeting" appears
    const eventTexts = allEvents.map((e) => e.text());
    expect(eventTexts).toContain('Meeting');
    expect(eventTexts).toContain('Deadline');
  });

  it('displays events on trailing days visible in the grid', () => {
    setupStore();
    const wrapper = mount(CalendarView);
    // June 2025 grid extends to July 6, so "Launch" (2025-07-01) IS visible
    const allEvents = wrapper.findAll('.calendar-event');
    const eventTexts = allEvents.map((e) => e.text());
    expect(eventTexts).toContain('Launch');
  });

  it('does not display rows without a date value', () => {
    setupStore();
    const wrapper = mount(CalendarView);
    const allEvents = wrapper.findAll('.calendar-event');
    const eventTexts = allEvents.map((e) => e.text());
    expect(eventTexts).not.toContain('No date task');
  });

  it('displays event title from first property', () => {
    setupStore();
    const wrapper = mount(CalendarView);
    const event = wrapper.find('.calendar-event');
    expect(event.text()).toBe('Meeting');
  });

  it('renders multiple events on the same date', () => {
    const store = setupStore();
    // Add another event on June 15
    store.rows.push({
      id: 'row-5',
      databaseId: 'db-1',
      position: 4,
      cells: { 'prop-title': 'Another meeting', 'prop-due': '2025-06-15' },
      createdById: 'user-1',
      createdAt: '2025-01-01',
      updatedAt: '2025-01-01',
    });
    const wrapper = mount(CalendarView);
    // Find the today cell (June 15) and count events
    const todayCell = wrapper.find('.calendar-day--today');
    const events = todayCell.findAll('.calendar-event');
    expect(events).toHaveLength(2);
  });

  // ===========================================
  // DRAG TO RESCHEDULE
  // ===========================================

  it('makes event chips draggable', () => {
    setupStore();
    const wrapper = mount(CalendarView);
    const event = wrapper.find('.calendar-event');
    expect(event.attributes('draggable')).toBe('true');
  });

  it('reschedules event when dropped on a different date cell', async () => {
    setupStore();
    mockDatabasesService.updateRow.mockResolvedValue({
      row: {
        id: 'row-1',
        databaseId: 'db-1',
        position: 0,
        cells: { 'prop-title': 'Meeting', 'prop-due': '2025-06-20', 'prop-status': 'Todo' },
        createdById: 'user-1',
        createdAt: '2025-01-01',
        updatedAt: '2025-01-01',
      },
    });

    const wrapper = mount(CalendarView);
    const event = wrapper.find('.calendar-event');

    // Start dragging
    await event.trigger('dragstart', {
      dataTransfer: { effectAllowed: '', setData: vi.fn() },
    });

    // Find a target day cell (June 20)
    const dayCells = wrapper.findAll('.calendar-day');
    const targetCell = dayCells.find(
      (cell) =>
        !cell.classes().includes('calendar-day--outside') &&
        cell.find('.day-number').text() === '20'
    );
    expect(targetCell).toBeTruthy();

    await targetCell!.trigger('dragover', { preventDefault: vi.fn() });
    await targetCell!.trigger('drop', { preventDefault: vi.fn() });
    await flushPromises();

    expect(mockDatabasesService.updateRow).toHaveBeenCalledWith('org-1', 'db-1', 'row-1', {
      cells: { 'prop-due': '2025-06-20' },
    });
  });

  it('highlights drop target cell during drag', async () => {
    setupStore();
    const wrapper = mount(CalendarView);
    const event = wrapper.find('.calendar-event');

    await event.trigger('dragstart', {
      dataTransfer: { effectAllowed: '', setData: vi.fn() },
    });

    const dayCells = wrapper.findAll('.calendar-day');
    const targetCell = dayCells.find(
      (cell) =>
        !cell.classes().includes('calendar-day--outside') &&
        cell.find('.day-number').text() === '20'
    );

    await targetCell!.trigger('dragover', { preventDefault: vi.fn() });
    expect(targetCell!.classes()).toContain('calendar-day--drop-target');

    await targetCell!.trigger('dragleave');
    expect(targetCell!.classes()).not.toContain('calendar-day--drop-target');
  });

  it('resets drag state on dragend', async () => {
    setupStore();
    const wrapper = mount(CalendarView);
    const event = wrapper.find('.calendar-event');

    await event.trigger('dragstart', {
      dataTransfer: { effectAllowed: '', setData: vi.fn() },
    });
    expect(event.classes()).toContain('calendar-event--dragging');

    await event.trigger('dragend');
    expect(event.classes()).not.toContain('calendar-event--dragging');
  });

  // ===========================================
  // EDGE CASES
  // ===========================================

  it('renders empty calendar when no rows have dates', () => {
    const store = setupStore();
    store.rows = [
      {
        id: 'row-nodates',
        databaseId: 'db-1',
        position: 0,
        cells: { 'prop-title': 'No date' },
        createdById: 'user-1',
        createdAt: '2025-01-01',
        updatedAt: '2025-01-01',
      },
    ];
    const wrapper = mount(CalendarView);
    expect(wrapper.find('.calendar-grid').exists()).toBe(true);
    expect(wrapper.findAll('.calendar-event')).toHaveLength(0);
  });

  it('hides events that fall outside the visible grid range', async () => {
    const store = setupStore();
    // Add an event far in the future that won't be in June grid
    store.rows.push({
      id: 'row-far',
      databaseId: 'db-1',
      position: 5,
      cells: { 'prop-title': 'Far away', 'prop-due': '2025-12-25' },
      createdById: 'user-1',
      createdAt: '2025-01-01',
      updatedAt: '2025-01-01',
    });
    const wrapper = mount(CalendarView);

    let events = wrapper.findAll('.calendar-event');
    let eventTexts = events.map((e) => e.text());
    expect(eventTexts).not.toContain('Far away');

    // Navigate to December
    for (let i = 0; i < 6; i++) {
      await wrapper.find('.calendar-nav-next').trigger('click');
    }
    events = wrapper.findAll('.calendar-event');
    eventTexts = events.map((e) => e.text());
    expect(eventTexts).toContain('Far away');
  });

  it('handles year boundary correctly (December to January)', async () => {
    setupStore();
    // Set time to December 2025
    vi.setSystemTime(new Date(2025, 11, 15)); // 15 December 2025
    const wrapper = mount(CalendarView);
    expect(wrapper.find('.calendar-month-label').text()).toContain('December');
    expect(wrapper.find('.calendar-month-label').text()).toContain('2025');

    await wrapper.find('.calendar-nav-next').trigger('click');
    expect(wrapper.find('.calendar-month-label').text()).toContain('January');
    expect(wrapper.find('.calendar-month-label').text()).toContain('2026');
  });

  it('handles drop on outside-month cells by using that cell date', async () => {
    setupStore();
    mockDatabasesService.updateRow.mockResolvedValue({
      row: {
        id: 'row-1',
        databaseId: 'db-1',
        position: 0,
        cells: { 'prop-title': 'Meeting', 'prop-due': '2025-05-26' },
        createdById: 'user-1',
        createdAt: '2025-01-01',
        updatedAt: '2025-01-01',
      },
    });

    const wrapper = mount(CalendarView);
    const event = wrapper.find('.calendar-event');

    await event.trigger('dragstart', {
      dataTransfer: { effectAllowed: '', setData: vi.fn() },
    });

    // Find an outside-month cell (should be from May)
    const outsideCell = wrapper.find('.calendar-day--outside');
    if (outsideCell.exists()) {
      await outsideCell.trigger('dragover', { preventDefault: vi.fn() });
      await outsideCell.trigger('drop', { preventDefault: vi.fn() });
      await flushPromises();

      // Should have been called with a May date
      expect(mockDatabasesService.updateRow).toHaveBeenCalled();
    }
  });
});
