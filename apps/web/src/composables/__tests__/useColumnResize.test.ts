import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { defineComponent, h } from 'vue';
import { useColumnResize } from '../useColumnResize';

function createMockStore(overrides: Record<string, unknown> = {}) {
  return {
    activeView: { id: 'view-1', config: null },
    updateView: vi.fn().mockResolvedValue({}),
    ...overrides,
  } as unknown as Parameters<typeof useColumnResize>[0];
}

function mountWithComposable(store: ReturnType<typeof createMockStore>) {
  let result!: ReturnType<typeof useColumnResize>;
  const Comp = defineComponent({
    setup() {
      result = useColumnResize(store);
      return () => h('div');
    },
  });
  const wrapper = mount(Comp);
  return { wrapper, result };
}

describe('useColumnResize', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('isResizing is false initially', () => {
    const store = createMockStore();
    const { result } = mountWithComposable(store);
    expect(result.isResizing.value).toBe(false);
  });

  it('getColumnWidth returns default 200 when no config', () => {
    const store = createMockStore();
    const { result } = mountWithComposable(store);
    expect(result.getColumnWidth('prop-1')).toBe(200);
  });

  it('getColumnWidth returns saved width from view config', () => {
    const store = createMockStore({
      activeView: { id: 'view-1', config: { columnWidths: { 'prop-1': 300 } } },
    });
    const { result } = mountWithComposable(store);
    expect(result.getColumnWidth('prop-1')).toBe(300);
  });

  it('getColumnWidth prefers local width over saved width', () => {
    const store = createMockStore({
      activeView: { id: 'view-1', config: { columnWidths: { 'prop-1': 300 } } },
    });
    const { result } = mountWithComposable(store);

    // Simulate a resize to set local width
    const mousedown = new MouseEvent('mousedown', { clientX: 100 });
    Object.assign(mousedown, { preventDefault: vi.fn(), stopPropagation: vi.fn() });
    result.onResizeStart(mousedown as MouseEvent, 'prop-1');

    const mousemove = new MouseEvent('mousemove', { clientX: 150 });
    result.onResizeMove(mousemove);

    // Local width should be 300 + 50 = 350
    expect(result.getColumnWidth('prop-1')).toBe(350);
  });

  it('onResizeStart sets resizing state and registers document listeners', () => {
    const store = createMockStore();
    const { result } = mountWithComposable(store);

    const addSpy = vi.spyOn(document, 'addEventListener');
    const event = new MouseEvent('mousedown', { clientX: 200 });
    Object.assign(event, { preventDefault: vi.fn(), stopPropagation: vi.fn() });

    result.onResizeStart(event as MouseEvent, 'prop-1');

    expect(result.isResizing.value).toBe(true);
    expect(addSpy).toHaveBeenCalledWith('mousemove', expect.any(Function));
    expect(addSpy).toHaveBeenCalledWith('mouseup', expect.any(Function));
    addSpy.mockRestore();
  });

  it('onResizeMove updates width clamped to 80px min', () => {
    const store = createMockStore();
    const { result } = mountWithComposable(store);

    const event = new MouseEvent('mousedown', { clientX: 200 });
    Object.assign(event, { preventDefault: vi.fn(), stopPropagation: vi.fn() });
    result.onResizeStart(event as MouseEvent, 'prop-1');

    // Move far left — should clamp to 80
    const moveEvent = new MouseEvent('mousemove', { clientX: 0 });
    result.onResizeMove(moveEvent);

    expect(result.getColumnWidth('prop-1')).toBe(80);
  });

  it('onResizeEnd persists via updateView and clears local state', async () => {
    const store = createMockStore();
    const { result } = mountWithComposable(store);

    const event = new MouseEvent('mousedown', { clientX: 200 });
    Object.assign(event, { preventDefault: vi.fn(), stopPropagation: vi.fn() });
    result.onResizeStart(event as MouseEvent, 'prop-1');

    const moveEvent = new MouseEvent('mousemove', { clientX: 250 });
    result.onResizeMove(moveEvent);

    await result.onResizeEnd();
    await flushPromises();

    expect(store.updateView).toHaveBeenCalledWith('view-1', {
      config: expect.objectContaining({
        columnWidths: expect.objectContaining({ 'prop-1': 250 }),
      }),
    });
    expect(result.isResizing.value).toBe(false);
  });

  it('onResizeHandleDblClick removes width from config', async () => {
    const store = createMockStore({
      activeView: { id: 'view-1', config: { columnWidths: { 'prop-1': 300, 'prop-2': 180 } } },
    });
    const { result } = mountWithComposable(store);

    const event = new MouseEvent('dblclick');
    Object.assign(event, { preventDefault: vi.fn(), stopPropagation: vi.fn() });

    await result.onResizeHandleDblClick(event as MouseEvent, 'prop-1');
    await flushPromises();

    expect(store.updateView).toHaveBeenCalledWith('view-1', {
      config: expect.objectContaining({
        columnWidths: { 'prop-2': 180 },
      }),
    });
  });

  it('cleanup removes document listeners', () => {
    const store = createMockStore();
    const { result } = mountWithComposable(store);
    const removeSpy = vi.spyOn(document, 'removeEventListener');

    result.cleanup();

    expect(removeSpy).toHaveBeenCalledWith('mousemove', expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith('mouseup', expect.any(Function));
    removeSpy.mockRestore();
  });
});
