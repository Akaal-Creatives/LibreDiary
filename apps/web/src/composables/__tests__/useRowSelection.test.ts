import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useRowSelection } from '../useRowSelection';

function createMockStore(rows: Array<{ id: string }> = [{ id: 'row-1' }, { id: 'row-2' }]) {
  return {
    filteredAndSortedRows: rows,
    bulkDeleteRows: vi.fn().mockResolvedValue(1),
  } as unknown as Parameters<typeof useRowSelection>[0];
}

describe('useRowSelection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('selectedRows is empty initially', () => {
    const { selectedRows } = useRowSelection(createMockStore());
    expect(selectedRows.value.size).toBe(0);
  });

  it('allSelected is false when nothing selected', () => {
    const { allSelected } = useRowSelection(createMockStore());
    expect(allSelected.value).toBe(false);
  });

  it('allSelected is false when no rows exist', () => {
    const { allSelected } = useRowSelection(createMockStore([]));
    expect(allSelected.value).toBe(false);
  });

  it('toggleSelectRow adds a row', () => {
    const { toggleSelectRow, selectedRows } = useRowSelection(createMockStore());
    toggleSelectRow('row-1');
    expect(selectedRows.value.has('row-1')).toBe(true);
    expect(selectedRows.value.size).toBe(1);
  });

  it('toggleSelectRow removes an already-selected row', () => {
    const { toggleSelectRow, selectedRows } = useRowSelection(createMockStore());
    toggleSelectRow('row-1');
    toggleSelectRow('row-1');
    expect(selectedRows.value.has('row-1')).toBe(false);
  });

  it('allSelected is true when all rows selected', () => {
    const { toggleSelectRow, allSelected } = useRowSelection(createMockStore());
    toggleSelectRow('row-1');
    toggleSelectRow('row-2');
    expect(allSelected.value).toBe(true);
  });

  it('toggleSelectAll selects all rows', () => {
    const { toggleSelectAll, selectedRows } = useRowSelection(createMockStore());
    toggleSelectAll();
    expect(selectedRows.value.size).toBe(2);
    expect(selectedRows.value.has('row-1')).toBe(true);
    expect(selectedRows.value.has('row-2')).toBe(true);
  });

  it('toggleSelectAll deselects all when all are selected', () => {
    const { toggleSelectAll, selectedRows } = useRowSelection(createMockStore());
    toggleSelectAll(); // select all
    toggleSelectAll(); // deselect all
    expect(selectedRows.value.size).toBe(0);
  });

  it('bulkDelete calls store and clears selection', async () => {
    const store = createMockStore();
    const { toggleSelectRow, bulkDelete, selectedRows } = useRowSelection(store);
    toggleSelectRow('row-1');
    await bulkDelete();
    expect(store.bulkDeleteRows).toHaveBeenCalledWith(['row-1']);
    expect(selectedRows.value.size).toBe(0);
  });

  it('bulkDelete is no-op when nothing selected', async () => {
    const store = createMockStore();
    const { bulkDelete } = useRowSelection(store);
    await bulkDelete();
    expect(store.bulkDeleteRows).not.toHaveBeenCalled();
  });
});
