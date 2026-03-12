import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useColumnDragDrop } from '../useColumnDragDrop';

function createMockStore(colIds: string[] = ['col-1', 'col-2', 'col-3']) {
  return {
    sortedProperties: colIds.map((id) => ({ id })),
    reorderProperties: vi.fn().mockResolvedValue(undefined),
  } as unknown as Parameters<typeof useColumnDragDrop>[0];
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

describe('useColumnDragDrop', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initial state has null drag refs', () => {
    const { dragColId, dragOverColId } = useColumnDragDrop(createMockStore());
    expect(dragColId.value).toBeNull();
    expect(dragOverColId.value).toBeNull();
  });

  it('onColDragStart sets dragColId and configures dataTransfer', () => {
    const { onColDragStart, dragColId } = useColumnDragDrop(createMockStore());
    const event = createDragEvent();
    onColDragStart(event, 'col-1');
    expect(dragColId.value).toBe('col-1');
    expect(event.dataTransfer!.effectAllowed).toBe('move');
    expect(event.dataTransfer!.setData).toHaveBeenCalledWith('text/plain', 'col-1');
  });

  it('onColDragOver sets dragOverColId for different column', () => {
    const { onColDragStart, onColDragOver, dragOverColId } = useColumnDragDrop(createMockStore());
    onColDragStart(createDragEvent(), 'col-1');
    onColDragOver(createDragEvent(), 'col-2');
    expect(dragOverColId.value).toBe('col-2');
  });

  it('onColDragOver does not set dragOverColId for same column', () => {
    const { onColDragStart, onColDragOver, dragOverColId } = useColumnDragDrop(createMockStore());
    onColDragStart(createDragEvent(), 'col-1');
    onColDragOver(createDragEvent(), 'col-1');
    expect(dragOverColId.value).toBeNull();
  });

  it('onColDragLeave clears dragOverColId', () => {
    const { onColDragStart, onColDragOver, onColDragLeave, dragOverColId } =
      useColumnDragDrop(createMockStore());
    onColDragStart(createDragEvent(), 'col-1');
    onColDragOver(createDragEvent(), 'col-2');
    onColDragLeave();
    expect(dragOverColId.value).toBeNull();
  });

  it('onColDrop reorders columns correctly', async () => {
    const store = createMockStore();
    const { onColDragStart, onColDrop } = useColumnDragDrop(store);
    onColDragStart(createDragEvent(), 'col-1');
    await onColDrop(createDragEvent(), 'col-3');
    expect(store.reorderProperties).toHaveBeenCalledWith(['col-2', 'col-3', 'col-1']);
  });

  it('onColDrop is no-op when dropping on self', async () => {
    const store = createMockStore();
    const { onColDragStart, onColDrop } = useColumnDragDrop(store);
    onColDragStart(createDragEvent(), 'col-1');
    await onColDrop(createDragEvent(), 'col-1');
    expect(store.reorderProperties).not.toHaveBeenCalled();
  });

  it('onColDrop is no-op when no drag active', async () => {
    const store = createMockStore();
    const { onColDrop } = useColumnDragDrop(store);
    await onColDrop(createDragEvent(), 'col-1');
    expect(store.reorderProperties).not.toHaveBeenCalled();
  });

  it('onColDragEnd clears all drag state', () => {
    const { onColDragStart, onColDragOver, onColDragEnd, dragColId, dragOverColId } =
      useColumnDragDrop(createMockStore());
    onColDragStart(createDragEvent(), 'col-1');
    onColDragOver(createDragEvent(), 'col-2');
    onColDragEnd();
    expect(dragColId.value).toBeNull();
    expect(dragOverColId.value).toBeNull();
  });
});
