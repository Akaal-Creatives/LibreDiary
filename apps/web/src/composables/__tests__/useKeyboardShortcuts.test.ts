import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { defineComponent, h, nextTick } from 'vue';
import { mount } from '@vue/test-utils';
import { useKeyboardShortcuts } from '../useKeyboardShortcuts';
import type { KeyboardShortcut } from '../useKeyboardShortcuts';

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

describe('useKeyboardShortcuts', () => {
  let cleanup: (() => void)[] = [];

  beforeEach(() => {
    cleanup = [];
  });

  afterEach(() => {
    cleanup.forEach((fn) => fn());
    vi.restoreAllMocks();
  });

  describe('returned API', () => {
    it('should return shortcuts, register, unregister, isHelpVisible, toggleHelp, modifierSymbol', () => {
      const { result, unmount } = withSetup(() => useKeyboardShortcuts());
      cleanup.push(unmount);

      expect(result).toHaveProperty('shortcuts');
      expect(result).toHaveProperty('register');
      expect(result).toHaveProperty('unregister');
      expect(result).toHaveProperty('isHelpVisible');
      expect(result).toHaveProperty('toggleHelp');
      expect(result).toHaveProperty('modifierSymbol');
      expect(typeof result.register).toBe('function');
      expect(typeof result.unregister).toBe('function');
      expect(typeof result.toggleHelp).toBe('function');
    });
  });

  describe('register and unregister', () => {
    it('should register a shortcut', () => {
      const { result, unmount } = withSetup(() => useKeyboardShortcuts());
      cleanup.push(unmount);

      const shortcut: KeyboardShortcut = {
        id: 'test-shortcut',
        keys: 'mod+k',
        label: 'Test',
        description: 'Test shortcut',
        handler: vi.fn(),
        category: 'general',
      };

      result.register(shortcut);
      expect(result.shortcuts.value.some((s) => s.id === 'test-shortcut')).toBe(true);

      // Clean up
      result.unregister('test-shortcut');
    });

    it('should unregister a shortcut', () => {
      const { result, unmount } = withSetup(() => useKeyboardShortcuts());
      cleanup.push(unmount);

      result.register({
        id: 'temp',
        keys: 'mod+t',
        label: 'Temp',
        description: 'Temp',
        handler: vi.fn(),
        category: 'general',
      });

      expect(result.shortcuts.value.some((s) => s.id === 'temp')).toBe(true);

      result.unregister('temp');
      expect(result.shortcuts.value.some((s) => s.id === 'temp')).toBe(false);
    });

    it('should replace a shortcut with the same id', () => {
      const { result, unmount } = withSetup(() => useKeyboardShortcuts());
      cleanup.push(unmount);

      const handler1 = vi.fn();
      const handler2 = vi.fn();

      result.register({
        id: 'dup',
        keys: 'mod+d',
        label: 'Dup',
        description: 'First',
        handler: handler1,
        category: 'general',
      });

      result.register({
        id: 'dup',
        keys: 'mod+d',
        label: 'Dup',
        description: 'Second',
        handler: handler2,
        category: 'general',
      });

      const matches = result.shortcuts.value.filter((s) => s.id === 'dup');
      expect(matches.length).toBe(1);
      expect(matches[0].description).toBe('Second');

      result.unregister('dup');
    });
  });

  describe('key matching', () => {
    it('should fire handler when matching key is pressed', async () => {
      const { result, unmount } = withSetup(() => useKeyboardShortcuts());
      cleanup.push(unmount);
      await nextTick();

      const handler = vi.fn();
      result.register({
        id: 'fire-test',
        keys: 'mod+k',
        label: 'Fire test',
        description: 'Fire test',
        handler,
        global: true,
        category: 'navigation',
      });

      const event = new KeyboardEvent('keydown', {
        key: 'k',
        ctrlKey: true,
        bubbles: true,
      });
      document.dispatchEvent(event);

      expect(handler).toHaveBeenCalledTimes(1);

      result.unregister('fire-test');
    });

    it('should not fire handler for non-matching keys', async () => {
      const { result, unmount } = withSetup(() => useKeyboardShortcuts());
      cleanup.push(unmount);
      await nextTick();

      const handler = vi.fn();
      result.register({
        id: 'no-fire',
        keys: 'mod+k',
        label: 'No fire',
        description: 'No fire',
        handler,
        global: true,
        category: 'navigation',
      });

      const event = new KeyboardEvent('keydown', {
        key: 'j',
        ctrlKey: true,
        bubbles: true,
      });
      document.dispatchEvent(event);

      expect(handler).not.toHaveBeenCalled();

      result.unregister('no-fire');
    });
  });

  describe('input filtering', () => {
    it('should not fire non-global shortcut when target is an input', async () => {
      const { result, unmount } = withSetup(() => useKeyboardShortcuts());
      cleanup.push(unmount);
      await nextTick();

      const handler = vi.fn();
      result.register({
        id: 'input-filter',
        keys: 'mod+n',
        label: 'Input filter',
        description: 'Input filter',
        handler,
        global: false,
        category: 'navigation',
      });

      const input = document.createElement('input');
      document.body.appendChild(input);

      const event = new KeyboardEvent('keydown', {
        key: 'n',
        ctrlKey: true,
        bubbles: true,
      });
      Object.defineProperty(event, 'target', { value: input });
      document.dispatchEvent(event);

      expect(handler).not.toHaveBeenCalled();

      document.body.removeChild(input);
      result.unregister('input-filter');
    });

    it('should fire global shortcut even when target is an input', async () => {
      const { result, unmount } = withSetup(() => useKeyboardShortcuts());
      cleanup.push(unmount);
      await nextTick();

      const handler = vi.fn();
      result.register({
        id: 'global-input',
        keys: 'mod+k',
        label: 'Global input',
        description: 'Global input',
        handler,
        global: true,
        category: 'navigation',
      });

      const input = document.createElement('input');
      document.body.appendChild(input);

      const event = new KeyboardEvent('keydown', {
        key: 'k',
        ctrlKey: true,
        bubbles: true,
      });
      Object.defineProperty(event, 'target', { value: input });
      document.dispatchEvent(event);

      expect(handler).toHaveBeenCalledTimes(1);

      document.body.removeChild(input);
      result.unregister('global-input');
    });
  });

  describe('toggleHelp', () => {
    it('should toggle isHelpVisible', () => {
      const { result, unmount } = withSetup(() => useKeyboardShortcuts());
      cleanup.push(unmount);

      expect(result.isHelpVisible.value).toBe(false);
      result.toggleHelp();
      expect(result.isHelpVisible.value).toBe(true);
      result.toggleHelp();
      expect(result.isHelpVisible.value).toBe(false);
    });
  });

  describe('modifierSymbol', () => {
    it('should return a string', () => {
      const { result, unmount } = withSetup(() => useKeyboardShortcuts());
      cleanup.push(unmount);

      expect(typeof result.modifierSymbol.value).toBe('string');
      expect(result.modifierSymbol.value.length).toBeGreaterThan(0);
    });
  });
});
