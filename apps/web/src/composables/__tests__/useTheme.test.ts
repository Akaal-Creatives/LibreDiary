import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { defineComponent, h, nextTick } from 'vue';
import { mount } from '@vue/test-utils';

// We need to reset module-level singleton state between tests.
// Re-import the composable fresh each time via dynamic import would be ideal,
// but since the refs are module-level singletons we reset them manually
// through the composable's own API.

import { useTheme } from '../useTheme';

// Helper to run a composable inside a mounted component context
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

describe('useTheme', () => {
  let localStorageMock: Record<string, string>;
  let matchMediaListeners: Array<() => void>;
  let matchMediaMatches: boolean;

  beforeEach(() => {
    // Reset localStorage mock
    localStorageMock = {};
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key: string) => localStorageMock[key] ?? null),
      setItem: vi.fn((key: string, value: string) => {
        localStorageMock[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete localStorageMock[key];
      }),
      clear: vi.fn(),
    });

    // Reset matchMedia mock
    matchMediaListeners = [];
    matchMediaMatches = false;

    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: matchMediaMatches,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn((_event: string, handler: () => void) => {
          matchMediaListeners.push(handler);
        }),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    // Reset document attribute
    document.documentElement.removeAttribute('data-theme');

    // Reset the module-level singleton state by mounting and setting back to defaults
    const { result, unmount } = withSetup(() => useTheme());
    result.setTheme('system');
    unmount();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ===========================================
  // RETURNED API
  // ===========================================

  describe('returned API', () => {
    it('should return theme, resolvedTheme, setTheme, and toggleTheme', () => {
      const { result, unmount } = withSetup(() => useTheme());

      expect(result).toHaveProperty('theme');
      expect(result).toHaveProperty('resolvedTheme');
      expect(result).toHaveProperty('setTheme');
      expect(result).toHaveProperty('toggleTheme');
      expect(typeof result.setTheme).toBe('function');
      expect(typeof result.toggleTheme).toBe('function');

      unmount();
    });
  });

  // ===========================================
  // setTheme
  // ===========================================

  describe('setTheme', () => {
    it('should change theme value', async () => {
      const { result, unmount } = withSetup(() => useTheme());

      result.setTheme('dark');
      await nextTick();

      expect(result.theme.value).toBe('dark');

      unmount();
    });

    it('should save theme to localStorage', async () => {
      const { result, unmount } = withSetup(() => useTheme());

      result.setTheme('dark');
      await nextTick();

      expect(localStorage.setItem).toHaveBeenCalledWith('theme', 'dark');

      unmount();
    });

    it('should apply light theme to document', async () => {
      const { result, unmount } = withSetup(() => useTheme());

      result.setTheme('light');
      await nextTick();

      expect(document.documentElement.getAttribute('data-theme')).toBe('light');

      unmount();
    });

    it('should apply dark theme to document', async () => {
      const { result, unmount } = withSetup(() => useTheme());

      result.setTheme('dark');
      await nextTick();

      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');

      unmount();
    });

    it('should resolve system theme based on matchMedia when set to system', async () => {
      // matchMediaMatches is false (light) by default
      const { result, unmount } = withSetup(() => useTheme());

      result.setTheme('system');
      await nextTick();

      expect(result.resolvedTheme.value).toBe('light');
      expect(document.documentElement.getAttribute('data-theme')).toBe('light');

      unmount();
    });
  });

  // ===========================================
  // toggleTheme
  // ===========================================

  describe('toggleTheme', () => {
    it('should cycle light -> dark -> system -> light', async () => {
      const { result, unmount } = withSetup(() => useTheme());

      // Start at light
      result.setTheme('light');
      await nextTick();
      expect(result.theme.value).toBe('light');

      // light -> dark
      result.toggleTheme();
      await nextTick();
      expect(result.theme.value).toBe('dark');

      // dark -> system
      result.toggleTheme();
      await nextTick();
      expect(result.theme.value).toBe('system');

      // system -> light
      result.toggleTheme();
      await nextTick();
      expect(result.theme.value).toBe('light');

      unmount();
    });
  });

  // ===========================================
  // LOADING FROM localStorage
  // ===========================================

  describe('loading from localStorage', () => {
    it('should load saved theme on mount', async () => {
      localStorageMock['theme'] = 'dark';

      const { result, unmount } = withSetup(() => useTheme());
      await nextTick();

      expect(result.theme.value).toBe('dark');
      expect(document.documentElement.getAttribute('data-theme')).toBe('dark');

      unmount();
    });

    it('should load "light" from localStorage', async () => {
      localStorageMock['theme'] = 'light';

      const { result, unmount } = withSetup(() => useTheme());
      await nextTick();

      expect(result.theme.value).toBe('light');

      unmount();
    });

    it('should load "system" from localStorage', async () => {
      localStorageMock['theme'] = 'system';

      const { result, unmount } = withSetup(() => useTheme());
      await nextTick();

      expect(result.theme.value).toBe('system');

      unmount();
    });

    it('should ignore invalid saved theme values', async () => {
      localStorageMock['theme'] = 'rainbow';

      const { result, unmount } = withSetup(() => useTheme());
      await nextTick();

      // Should keep the current value (system from our beforeEach reset)
      expect(['light', 'dark', 'system']).toContain(result.theme.value);
      expect(result.theme.value).not.toBe('rainbow');

      unmount();
    });

    it('should handle missing localStorage entry gracefully', async () => {
      // localStorageMock has no 'theme' key

      const { result, unmount } = withSetup(() => useTheme());
      await nextTick();

      // Should use the default (system from our reset)
      expect(result.theme.value).toBe('system');

      unmount();
    });
  });

  // ===========================================
  // SYSTEM THEME DETECTION
  // ===========================================

  describe('system theme detection', () => {
    it('should resolve to dark when system prefers dark', async () => {
      matchMediaMatches = true;

      const { result, unmount } = withSetup(() => useTheme());

      result.setTheme('system');
      await nextTick();

      expect(result.resolvedTheme.value).toBe('dark');

      unmount();
    });

    it('should resolve to light when system prefers light', async () => {
      matchMediaMatches = false;

      const { result, unmount } = withSetup(() => useTheme());

      result.setTheme('system');
      await nextTick();

      expect(result.resolvedTheme.value).toBe('light');

      unmount();
    });
  });
});
