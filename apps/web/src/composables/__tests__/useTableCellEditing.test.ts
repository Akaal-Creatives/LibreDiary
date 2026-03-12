import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useTableCellEditing } from '../useTableCellEditing';

function createMockStore(overrides: Record<string, unknown> = {}) {
  return {
    properties: [
      { id: 'prop-1', name: 'Title', type: 'TEXT', position: 0 },
      { id: 'prop-2', name: 'Status', type: 'SELECT', position: 1 },
      { id: 'prop-sys', name: 'Created', type: 'CREATED_TIME', position: 2 },
    ],
    updateRowCell: vi.fn().mockResolvedValue({}),
    createRow: vi.fn().mockResolvedValue({ id: 'row-new', cells: {} }),
    ...overrides,
  } as unknown as Parameters<typeof useTableCellEditing>[0];
}

describe('useTableCellEditing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('editingCell is null initially', () => {
    const { editingCell } = useTableCellEditing(createMockStore());
    expect(editingCell.value).toBeNull();
  });

  it('draftRow is null initially', () => {
    const { draftRow } = useTableCellEditing(createMockStore());
    expect(draftRow.value).toBeNull();
  });

  it('startEdit sets editingCell', () => {
    const { startEdit, editingCell } = useTableCellEditing(createMockStore());
    startEdit('row-1', 'prop-1');
    expect(editingCell.value).toEqual({ rowId: 'row-1', propertyId: 'prop-1' });
  });

  it('startEdit is no-op for system columns', () => {
    const { startEdit, editingCell } = useTableCellEditing(createMockStore());
    startEdit('row-1', 'prop-sys');
    expect(editingCell.value).toBeNull();
  });

  it('saveCell calls updateRowCell and clears editingCell', async () => {
    const store = createMockStore();
    const { startEdit, saveCell, editingCell } = useTableCellEditing(store);
    startEdit('row-1', 'prop-1');
    await saveCell('row-1', 'prop-1', 'new value');
    expect(editingCell.value).toBeNull();
    expect(store.updateRowCell).toHaveBeenCalledWith('row-1', 'prop-1', 'new value');
  });

  it('cancelEdit clears editingCell', () => {
    const { startEdit, cancelEdit, editingCell } = useTableCellEditing(createMockStore());
    startEdit('row-1', 'prop-1');
    cancelEdit();
    expect(editingCell.value).toBeNull();
  });

  it('getCellValue extracts from row cells', () => {
    const { getCellValue } = useTableCellEditing(createMockStore());
    const row = { cells: { 'prop-1': 'Hello', 'prop-2': 'Done' } };
    expect(getCellValue(row, 'prop-1')).toBe('Hello');
    expect(getCellValue(row, 'prop-2')).toBe('Done');
    expect(getCellValue(row, 'prop-missing')).toBeNull();
  });

  it('addRow creates a draft row', () => {
    const { addRow, draftRow } = useTableCellEditing(createMockStore());
    addRow();
    expect(draftRow.value).toEqual({ id: 'draft', cells: {} });
  });

  it('addRow replaces existing draft', () => {
    const { addRow, draftRow } = useTableCellEditing(createMockStore());
    addRow();
    draftRow.value!.cells = { 'prop-1': 'old' };
    addRow();
    expect(draftRow.value).toEqual({ id: 'draft', cells: {} });
  });

  it('saveDraftCell calls createRow for non-empty value', async () => {
    const store = createMockStore();
    const { addRow, saveDraftCell } = useTableCellEditing(store);
    addRow();
    await saveDraftCell('prop-1', 'New entry');
    expect(store.createRow).toHaveBeenCalledWith({ cells: { 'prop-1': 'New entry' } });
  });

  it('saveDraftCell is no-op for empty value', async () => {
    const store = createMockStore();
    const { addRow, saveDraftCell, draftRow } = useTableCellEditing(store);
    addRow();
    await saveDraftCell('prop-1', '');
    expect(store.createRow).not.toHaveBeenCalled();
    // Draft should remain
    expect(draftRow.value).not.toBeNull();
  });

  it('saveDraftCell clears draftRow after persisting', async () => {
    const store = createMockStore();
    const { addRow, saveDraftCell, draftRow } = useTableCellEditing(store);
    addRow();
    await saveDraftCell('prop-1', 'value');
    expect(draftRow.value).toBeNull();
  });

  it('saveDraftCell clears editingCell', async () => {
    const store = createMockStore();
    const { addRow, startEdit, saveDraftCell, editingCell } = useTableCellEditing(store);
    addRow();
    startEdit('draft', 'prop-1');
    await saveDraftCell('prop-1', 'value');
    expect(editingCell.value).toBeNull();
  });
});
