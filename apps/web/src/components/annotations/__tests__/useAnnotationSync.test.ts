import { describe, it, expect, beforeEach } from 'vitest';
import { defineComponent, h } from 'vue';
import { mount } from '@vue/test-utils';
import * as Y from 'yjs';
import { useAnnotationSync } from '../useAnnotationSync';
import type { Annotation } from '../types';

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

describe('useAnnotationSync', () => {
  let ydoc: Y.Doc;

  beforeEach(() => {
    ydoc = new Y.Doc();
  });

  it('should return the expected API shape', () => {
    const { result, unmount } = withSetup(() => useAnnotationSync({ ydoc, imageId: 'img-1' }));

    expect(result).toHaveProperty('annotations');
    expect(result).toHaveProperty('addAnnotation');
    expect(result).toHaveProperty('updateAnnotation');
    expect(result).toHaveProperty('removeAnnotation');
    expect(result.annotations.value).toEqual([]);

    unmount();
  });

  it('should add an annotation to Yjs and local state', () => {
    const { result, unmount } = withSetup(() => useAnnotationSync({ ydoc, imageId: 'img-1' }));

    const annotation: Annotation = {
      id: 'a1',
      type: 'freehand',
      x: 0,
      y: 0,
      points: [10, 20, 30, 40],
      stroke: '#ff0000',
      strokeWidth: 2,
      opacity: 1,
      createdBy: 'user-1',
      createdAt: new Date().toISOString(),
    };

    result.addAnnotation(annotation);

    expect(result.annotations.value).toHaveLength(1);
    expect(result.annotations.value[0]).toMatchObject({ id: 'a1', type: 'freehand' });

    // Verify it's in the Y.Map
    const ymap = ydoc.getMap('annotations');
    const imageMap = ymap.get('img-1') as Y.Map<string>;
    expect(imageMap).toBeDefined();
    expect(imageMap.get('a1')).toBeDefined();

    unmount();
  });

  it('should update an existing annotation', () => {
    const { result, unmount } = withSetup(() => useAnnotationSync({ ydoc, imageId: 'img-1' }));

    const annotation: Annotation = {
      id: 'a1',
      type: 'text',
      x: 50,
      y: 50,
      text: 'Hello',
      fontSize: 16,
      fill: '#000',
      stroke: '#000',
      strokeWidth: 0,
      opacity: 1,
      createdBy: 'user-1',
      createdAt: new Date().toISOString(),
    };

    result.addAnnotation(annotation);
    result.updateAnnotation({ ...annotation, text: 'Updated' });

    expect(result.annotations.value[0]).toMatchObject({ text: 'Updated' });

    unmount();
  });

  it('should remove an annotation', () => {
    const { result, unmount } = withSetup(() => useAnnotationSync({ ydoc, imageId: 'img-1' }));

    const annotation: Annotation = {
      id: 'a1',
      type: 'rectangle',
      x: 10,
      y: 20,
      width: 100,
      height: 50,
      stroke: '#00ff00',
      strokeWidth: 2,
      fill: '#00ff00',
      opacity: 0.1,
      createdBy: 'user-1',
      createdAt: new Date().toISOString(),
    };

    result.addAnnotation(annotation);
    expect(result.annotations.value).toHaveLength(1);

    result.removeAnnotation('a1');
    expect(result.annotations.value).toHaveLength(0);

    unmount();
  });

  it('should sync annotations from a remote Yjs doc', () => {
    // Simulate remote changes by applying updates from another doc
    const remoteDoc = new Y.Doc();
    const remoteMap = remoteDoc.getMap('annotations');
    const imageMap = new Y.Map<string>();
    remoteMap.set('img-1', imageMap);
    imageMap.set(
      'remote-1',
      JSON.stringify({
        id: 'remote-1',
        type: 'arrow',
        x: 0,
        y: 0,
        points: [0, 0, 100, 100],
        stroke: '#0000ff',
        strokeWidth: 2,
        opacity: 1,
        createdBy: 'user-2',
        createdAt: new Date().toISOString(),
      })
    );

    // Apply remote state to local doc
    const update = Y.encodeStateAsUpdate(remoteDoc);

    const { result, unmount } = withSetup(() => useAnnotationSync({ ydoc, imageId: 'img-1' }));

    Y.applyUpdate(ydoc, update);

    // The composable should pick up the remote annotation
    expect(result.annotations.value).toHaveLength(1);
    expect(result.annotations.value[0]).toMatchObject({
      id: 'remote-1',
      type: 'arrow',
    });

    unmount();
  });
});
