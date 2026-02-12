import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { defineComponent, h, nextTick } from 'vue';
import { mount } from '@vue/test-utils';
import { useSidebar, _resetSidebar } from '../useSidebar';

function withSetup<T>(composableFn: () => T): { result: T; unmount: () => void } {
  let result!: T;

  const TestComponent = defineComponent({
    setup() {
      result = composableFn();
      return () => h('div');
    },
  });

  const wrapper = mount(TestComponent);

  return {
    result,
    unmount: () => wrapper.unmount(),
  };
}

describe('useSidebar', () => {
  beforeEach(() => {
    _resetSidebar();

    // Mock matchMedia for desktop by default
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  afterEach(() => {
    _resetSidebar();
    vi.restoreAllMocks();
  });

  describe('returned API', () => {
    it('should return isOpen, isOverlay, isMobile, toggle, open, close', () => {
      const { result, unmount } = withSetup(() => useSidebar());

      expect(result).toHaveProperty('isOpen');
      expect(result).toHaveProperty('isOverlay');
      expect(result).toHaveProperty('isMobile');
      expect(result).toHaveProperty('toggle');
      expect(result).toHaveProperty('open');
      expect(result).toHaveProperty('close');
      expect(typeof result.toggle).toBe('function');
      expect(typeof result.open).toBe('function');
      expect(typeof result.close).toBe('function');

      unmount();
    });
  });

  describe('desktop defaults', () => {
    it('should default to open on desktop', async () => {
      const { result, unmount } = withSetup(() => useSidebar());
      await nextTick();

      expect(result.isOpen.value).toBe(true);
      expect(result.isOverlay.value).toBe(false);
      expect(result.isMobile.value).toBe(false);

      unmount();
    });
  });

  describe('toggle', () => {
    it('should toggle isOpen', async () => {
      const { result, unmount } = withSetup(() => useSidebar());
      await nextTick();

      expect(result.isOpen.value).toBe(true);
      result.toggle();
      expect(result.isOpen.value).toBe(false);
      result.toggle();
      expect(result.isOpen.value).toBe(true);

      unmount();
    });
  });

  describe('open and close', () => {
    it('should open the sidebar', async () => {
      const { result, unmount } = withSetup(() => useSidebar());
      await nextTick();

      result.close();
      expect(result.isOpen.value).toBe(false);

      result.open();
      expect(result.isOpen.value).toBe(true);

      unmount();
    });

    it('should close the sidebar', async () => {
      const { result, unmount } = withSetup(() => useSidebar());
      await nextTick();

      result.close();
      expect(result.isOpen.value).toBe(false);

      unmount();
    });
  });
});
