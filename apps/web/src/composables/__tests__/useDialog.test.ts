import { describe, it, expect } from 'vitest';
import { createApp, type App } from 'vue';
import { useDialog } from '../useDialog';

function withSetup<T>(fn: () => T): { result: T; app: App } {
  let result!: T;
  const app = createApp({
    setup() {
      result = fn();
      return () => {};
    },
  });
  app.mount(document.createElement('div'));
  return { result, app };
}

describe('useDialog', () => {
  it('returns alert and confirm functions', () => {
    const { result, app } = withSetup(() => useDialog());

    expect(typeof result.alert).toBe('function');
    expect(typeof result.confirm).toBe('function');

    app.unmount();
  });

  it('alert() creates a DOM container with id dialog-container', () => {
    const { result, app } = withSetup(() => useDialog());

    result.alert('hello');

    const container = document.getElementById('dialog-container');
    expect(container).not.toBeNull();

    app.unmount();
  });

  it('confirm() creates a DOM container with id dialog-container', () => {
    const { result, app } = withSetup(() => useDialog());

    result.confirm('Are you sure?');

    const container = document.getElementById('dialog-container');
    expect(container).not.toBeNull();

    app.unmount();
  });

  it('string argument works: alert("hello") does not throw', () => {
    const { result, app } = withSetup(() => useDialog());

    expect(() => result.alert('hello')).not.toThrow();

    app.unmount();
  });
});
