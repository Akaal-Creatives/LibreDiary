import { describe, it, expect, vi, beforeEach } from 'vitest';
import { defineComponent, h } from 'vue';
import { mount } from '@vue/test-utils';
import { useAnnotationPresence } from '../useAnnotationPresence';

// Minimal Awareness mock
function createMockAwareness() {
  const states = new Map<number, Record<string, unknown>>();
  const listeners = new Map<string, Set<() => void>>();

  return {
    clientID: 1,
    getStates: () => states,
    setLocalStateField: vi.fn((field: string, value: unknown) => {
      const current = states.get(1) ?? {};
      if (value === null) {
        delete current[field];
      } else {
        current[field] = value;
      }
      states.set(1, current);
    }),
    on: vi.fn((event: string, cb: () => void) => {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event)!.add(cb);
    }),
    off: vi.fn((event: string, cb: () => void) => {
      listeners.get(event)?.delete(cb);
    }),
    // Test helper: simulate remote awareness change
    _simulateRemote(clientId: number, state: Record<string, unknown>) {
      states.set(clientId, state);
      listeners.get('change')?.forEach((cb) => cb());
    },
    _states: states,
  };
}

function withSetup<T>(composableFn: () => T): { result: T; unmount: () => void } {
  let result!: T;
  const TestComponent = defineComponent({
    setup() {
      result = composableFn();
      return () => h('div');
    },
  });
  const wrapper = mount(TestComponent);
  return { result, unmount: () => wrapper.unmount() };
}

describe('useAnnotationPresence', () => {
  let awareness: ReturnType<typeof createMockAwareness>;

  beforeEach(() => {
    awareness = createMockAwareness();
  });

  it('should return the expected API shape', () => {
    const { result, unmount } = withSetup(() =>
      useAnnotationPresence({
        awareness: awareness as never,
        imageId: 'img-1',
        userName: 'Alice',
        userColour: '#ff0000',
      })
    );

    expect(result).toHaveProperty('remoteCursors');
    expect(result).toHaveProperty('updateLocalCursor');
    expect(result).toHaveProperty('clearLocalCursor');
    expect(result.remoteCursors.value).toEqual([]);

    unmount();
  });

  it('should update local cursor position via awareness', () => {
    const { result, unmount } = withSetup(() =>
      useAnnotationPresence({
        awareness: awareness as never,
        imageId: 'img-1',
        userName: 'Alice',
        userColour: '#ff0000',
      })
    );

    result.updateLocalCursor(100, 200);

    expect(awareness.setLocalStateField).toHaveBeenCalledWith('annotationCursor', {
      name: 'Alice',
      colour: '#ff0000',
      x: 100,
      y: 200,
      imageId: 'img-1',
    });

    unmount();
  });

  it('should show remote cursors from other clients', () => {
    const { result, unmount } = withSetup(() =>
      useAnnotationPresence({
        awareness: awareness as never,
        imageId: 'img-1',
        userName: 'Alice',
        userColour: '#ff0000',
      })
    );

    // Simulate remote user on same image
    awareness._simulateRemote(2, {
      annotationCursor: {
        name: 'Bob',
        colour: '#0000ff',
        x: 300,
        y: 400,
        imageId: 'img-1',
      },
    });

    expect(result.remoteCursors.value).toHaveLength(1);
    expect(result.remoteCursors.value[0]).toMatchObject({
      clientId: 2,
      name: 'Bob',
      x: 300,
      y: 400,
    });

    unmount();
  });

  it('should ignore remote cursors on different images', () => {
    const { result, unmount } = withSetup(() =>
      useAnnotationPresence({
        awareness: awareness as never,
        imageId: 'img-1',
        userName: 'Alice',
        userColour: '#ff0000',
      })
    );

    awareness._simulateRemote(2, {
      annotationCursor: {
        name: 'Bob',
        colour: '#0000ff',
        x: 300,
        y: 400,
        imageId: 'img-2', // Different image
      },
    });

    expect(result.remoteCursors.value).toHaveLength(0);

    unmount();
  });

  it('should clear local cursor on unmount', () => {
    const { unmount } = withSetup(() =>
      useAnnotationPresence({
        awareness: awareness as never,
        imageId: 'img-1',
        userName: 'Alice',
        userColour: '#ff0000',
      })
    );

    unmount();

    expect(awareness.setLocalStateField).toHaveBeenCalledWith('annotationCursor', null);
    expect(awareness.off).toHaveBeenCalledWith('change', expect.any(Function));
  });
});
