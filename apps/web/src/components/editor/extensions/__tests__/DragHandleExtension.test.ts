import { describe, it, expect } from 'vitest';
import { DragHandleExtension } from '../DragHandleExtension';

describe('DragHandleExtension', () => {
  it('has name "dragHandle"', () => {
    expect(DragHandleExtension.name).toBe('dragHandle');
  });

  it('is an Extension (not a Node)', () => {
    // Extensions have type 'extension', Nodes have type 'node'
    expect(DragHandleExtension.type).toBe('extension');
  });

  it('registers ProseMirror plugins', () => {
    expect(typeof DragHandleExtension.config.addProseMirrorPlugins).toBe('function');
  });

  it('addProseMirrorPlugins returns an array with one plugin', () => {
    const addPlugins = DragHandleExtension.config.addProseMirrorPlugins;
    if (typeof addPlugins !== 'function') throw new Error('addProseMirrorPlugins not a function');

    const plugins = addPlugins.call(DragHandleExtension);
    expect(Array.isArray(plugins)).toBe(true);
    expect(plugins).toHaveLength(1);
  });

  it('plugin has the "dragHandle" key', () => {
    const addPlugins = DragHandleExtension.config.addProseMirrorPlugins;
    if (typeof addPlugins !== 'function') throw new Error('addProseMirrorPlugins not a function');

    const plugins = addPlugins.call(DragHandleExtension);
    const plugin = plugins[0];
    // The PluginKey stores its name in the key property
    expect(plugin.spec.key?.key).toContain('dragHandle');
  });

  it('plugin state initialises with null values', () => {
    const addPlugins = DragHandleExtension.config.addProseMirrorPlugins;
    if (typeof addPlugins !== 'function') throw new Error('addProseMirrorPlugins not a function');

    const plugins = addPlugins.call(DragHandleExtension);
    const plugin = plugins[0];
    const initState = plugin.spec.state?.init?.call(
      plugin,
      {} as any, // eslint-disable-line @typescript-eslint/no-explicit-any
      {} as any // eslint-disable-line @typescript-eslint/no-explicit-any
    );

    expect(initState).toEqual({
      handle: null,
      dropIndicator: null,
      draggedBlockPos: null,
      hoveredBlockPos: null,
    });
  });

  it('plugin state apply returns the same state object', () => {
    const addPlugins = DragHandleExtension.config.addProseMirrorPlugins;
    if (typeof addPlugins !== 'function') throw new Error('addProseMirrorPlugins not a function');

    const plugins = addPlugins.call(DragHandleExtension);
    const plugin = plugins[0];

    const originalState = {
      handle: null,
      dropIndicator: null,
      draggedBlockPos: 5,
      hoveredBlockPos: 10,
    };

    const newState = plugin.spec.state?.apply?.call(
      plugin,
      {} as any, // eslint-disable-line @typescript-eslint/no-explicit-any
      originalState,
      {} as any, // eslint-disable-line @typescript-eslint/no-explicit-any
      {} as any // eslint-disable-line @typescript-eslint/no-explicit-any
    );

    expect(newState).toBe(originalState);
  });
});
