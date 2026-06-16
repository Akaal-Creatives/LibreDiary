import { ref, watch, onUnmounted } from 'vue';
import * as Y from 'yjs';
import type { CanvasElement, CanvasElementMap } from './canvasTypes';

export function useCanvasCollab(ydoc: ReturnType<typeof ref<Y.Doc | null>>) {
  const elements = ref<CanvasElementMap>({});

  let yElements: Y.Map<CanvasElement> | null = null;

  function onYChange() {
    if (!yElements) return;
    const snapshot: CanvasElementMap = {};
    yElements.forEach((val, key) => {
      snapshot[key] = val;
    });
    elements.value = snapshot;
  }

  function setupObserver(doc: Y.Doc) {
    yElements = doc.getMap<CanvasElement>('canvas-elements');
    yElements.observe(onYChange);
    onYChange();
  }

  function teardownObserver() {
    yElements?.unobserve(onYChange);
    yElements = null;
  }

  watch(
    ydoc,
    (doc, oldDoc) => {
      if (oldDoc) teardownObserver();
      if (doc) setupObserver(doc);
    },
    { immediate: true }
  );

  onUnmounted(teardownObserver);

  function addElement(el: CanvasElement) {
    if (!yElements) return;
    yElements.doc!.transact(() => {
      yElements!.set(el.id, el);
    });
  }

  function updateElement(id: string, patch: Partial<CanvasElement>) {
    if (!yElements) return;
    const existing = yElements.get(id);
    if (!existing) return;
    yElements.doc!.transact(() => {
      yElements!.set(id, { ...existing, ...patch });
    });
  }

  function deleteElement(id: string) {
    if (!yElements) return;
    yElements.doc!.transact(() => {
      yElements!.delete(id);
    });
  }

  return { elements, addElement, updateElement, deleteElement };
}
