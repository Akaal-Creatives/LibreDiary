import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useRowDragDrop } from '../useRowDragDrop';

function createMockStore(rowIds: string[] = ['row-1', 'row-2', 'row-3']) {
  return {
    filteredAndSortedRows: rowIds.map((id) => ({ id })),
    reorderRows: vi.fn().mockResolvedValue(undefined),
  } as unknown as Parameters<typeof useRowDragDrop>[0];
}

function createDragEvent(overrides: Partial<DragEvent> = {}): DragEvent {
  const event = {
    preventDefault: vi.fn(),
    dataTransfer: {
      effectAllowed: '',
      setData: vi.fn(),
    },
    ...overrides,
  };
  return event as unknown as DragEvent;
}

describe('useRowDragDrop', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initial state has null drag refs', () => {
    const { dragRowId, dragOverRowId } = useRowDragDrop(createMockStore());
    expect(dragRowId.value).toBeNull();
    expect(dragOverRowId.value).toBeNull();
  });

  it('onRowDragStart sets dragRowId and configures dataTransfer', () => {
    const { onRowDragStart, dragRowId } = useRowDragDrop(createMockStore());
    const event = createDragEvent();
    onRowDragStart(event, 'row-1');
    expect(dragRowId.value).toBe('row-1');
    expect(event.dataTransfer!.effectAllowed).toBe('move');
    expect(event.dataTransfer!.setData).toHaveBeenCalledWith('text/plain', 'row-1');
  });

  it('onRowDragOver sets dragOverRowId for different row', () => {
    const { onRowDragStart, onRowDragOver, dragOverRowId } = useRowDragDrop(createMockStore());
    onRowDragStart(createDragEvent(), 'row-1');
    onRowDragOver(createDragEvent(), 'row-2');
    expect(dragOverRowId.value).toBe('row-2');
  });

  it('onRowDragOver does not set dragOverRowId for same row', () => {
    const { onRowDragStart, onRowDragOver, dragOverRowId } = useRowDragDrop(createMockStore());
    onRowDragStart(createDragEvent(), 'row-1');
    onRowDragOver(createDragEvent(), 'row-1');
    expect(dragOverRowId.value).toBeNull();
  });

  it('onRowDragLeave clears dragOverRowId', () => {
    const { onRowDragStart, onRowDragOver, onRowDragLeave, dragOverRowId } =
      useRowDragDrop(createMockStore());
    onRowDragStart(createDragEvent(), 'row-1');
    onRowDragOver(createDragEvent(), 'row-2');
    onRowDragLeave();
    expect(dragOverRowId.value).toBeNull();
  });

  it('onRowDrop reorders rows correctly', async () => {
    const store = createMockStore();
    const { onRowDragStart, onRowDrop } = useRowDragDrop(store);
    onRowDragStart(createDragEvent(), 'row-1');
    await onRowDrop(createDragEvent(), 'row-3');
    expect(store.reorderRows).toHaveBeenCalledWith(['row-2', 'row-3', 'row-1']);
  });

  it('onRowDrop is no-op when dropping on self', async () => {
    const store = createMockStore();
    const { onRowDragStart, onRowDrop } = useRowDragDrop(store);
    onRowDragStart(createDragEvent(), 'row-1');
    await onRowDrop(createDragEvent(), 'row-1');
    expect(store.reorderRows).not.toHaveBeenCalled();
  });

  it('onRowDrop is no-op when no drag active', async () => {
    const store = createMockStore();
    const { onRowDrop } = useRowDragDrop(store);
    await onRowDrop(createDragEvent(), 'row-1');
    expect(store.reorderRows).not.toHaveBeenCalled();
  });

  it('onRowDragEnd clears all drag state', () => {
    const { onRowDragStart, onRowDragOver, onRowDragEnd, dragRowId, dragOverRowId } =
      useRowDragDrop(createMockStore());
    onRowDragStart(createDragEvent(), 'row-1');
    onRowDragOver(createDragEvent(), 'row-2');
    onRowDragEnd();
    expect(dragRowId.value).toBeNull();
    expect(dragOverRowId.value).toBeNull();
  });
});
