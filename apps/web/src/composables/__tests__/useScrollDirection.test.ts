import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { defineComponent, h, ref } from 'vue';
import { mount } from '@vue/test-utils';
import { useScrollDirection } from '../useScrollDirection';

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

describe('useScrollDirection', () => {
  let addEventSpy: ReturnType<typeof vi.spyOn>;
  let removeEventSpy: ReturnType<typeof vi.spyOn>;
  let rafCallbacks: FrameRequestCallback[];

  beforeEach(() => {
    addEventSpy = vi.spyOn(window, 'addEventListener');
    removeEventSpy = vi.spyOn(window, 'removeEventListener');

    rafCallbacks = [];
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      rafCallbacks.push(cb);
      return rafCallbacks.length;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return the expected API shape', () => {
    const { result, unmount } = withSetup(() => useScrollDirection());

    expect(result).toHaveProperty('direction');
    expect(result).toHaveProperty('isScrollingDown');
    expect(result.direction.value).toBe('idle');
    expect(result.isScrollingDown.value).toBe(false);

    unmount();
  });

  it('should attach scroll listener to window on mount', () => {
    const { unmount } = withSetup(() => useScrollDirection());

    expect(addEventSpy).toHaveBeenCalledWith('scroll', expect.any(Function), { passive: true });

    unmount();
  });

  it('should remove scroll listener on unmount', () => {
    const { unmount } = withSetup(() => useScrollDirection());
    unmount();

    expect(removeEventSpy).toHaveBeenCalledWith('scroll', expect.any(Function));
  });

  it('should detect downward scroll', () => {
    const { result, unmount } = withSetup(() => useScrollDirection());

    // Get the scroll handler
    const scrollHandler = addEventSpy.mock.calls.find(
      (call) => call[0] === 'scroll'
    )?.[1] as EventListener;

    // Simulate scroll down past threshold
    Object.defineProperty(document.documentElement, 'scrollTop', {
      writable: true,
      value: 20,
    });
    scrollHandler(new Event('scroll'));

    // Flush rAF
    rafCallbacks.forEach((cb) => cb(0));

    expect(result.direction.value).toBe('down');
    expect(result.isScrollingDown.value).toBe(true);

    unmount();
  });

  it('should detect upward scroll', () => {
    const { result, unmount } = withSetup(() => useScrollDirection());

    const scrollHandler = addEventSpy.mock.calls.find(
      (call) => call[0] === 'scroll'
    )?.[1] as EventListener;

    // First scroll down
    Object.defineProperty(document.documentElement, 'scrollTop', {
      writable: true,
      value: 50,
    });
    scrollHandler(new Event('scroll'));
    rafCallbacks.forEach((cb) => cb(0));
    rafCallbacks = [];

    // Then scroll up
    Object.defineProperty(document.documentElement, 'scrollTop', {
      writable: true,
      value: 20,
    });
    scrollHandler(new Event('scroll'));
    rafCallbacks.forEach((cb) => cb(0));

    expect(result.direction.value).toBe('up');
    expect(result.isScrollingDown.value).toBe(false);

    unmount();
  });

  it('should ignore micro-scrolls below threshold', () => {
    const { result, unmount } = withSetup(() => useScrollDirection());

    const scrollHandler = addEventSpy.mock.calls.find(
      (call) => call[0] === 'scroll'
    )?.[1] as EventListener;

    // Scroll less than threshold (8px)
    Object.defineProperty(document.documentElement, 'scrollTop', {
      writable: true,
      value: 5,
    });
    scrollHandler(new Event('scroll'));
    rafCallbacks.forEach((cb) => cb(0));

    expect(result.direction.value).toBe('idle');

    unmount();
  });

  it('should use element ref when provided', () => {
    const el = document.createElement('div');
    const elementRef = ref(el);
    const addSpy = vi.spyOn(el, 'addEventListener');

    const { unmount } = withSetup(() => useScrollDirection(elementRef));

    expect(addSpy).toHaveBeenCalledWith('scroll', expect.any(Function), { passive: true });

    unmount();
  });
});
