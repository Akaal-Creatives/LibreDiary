import { ref, onUnmounted } from 'vue';
import * as Y from 'yjs';
import type { Annotation } from './types';

export interface UseAnnotationSyncOptions {
  ydoc: Y.Doc;
  imageId: string;
}

/**
 * Composable that syncs annotation data between Konva shapes and a
 * Y.Map shared type for real-time collaborative annotations.
 *
 * Storage structure in Yjs:
 * ```
 * Y.Doc
 *   └─ Y.Map('annotations')
 *       └─ Y.Map(imageId)
 *           ├─ annotationId → JSON string of Annotation
 *           └─ ...
 * ```
 */
export function useAnnotationSync(options: UseAnnotationSyncOptions) {
  const { ydoc, imageId } = options;
  const annotations = ref<Annotation[]>([]);

  // Get or create the annotations map for this image
  const rootMap = ydoc.getMap<Y.Map<string>>('annotations');

  function getImageMap(): Y.Map<string> {
    let imageMap = rootMap.get(imageId);
    if (!imageMap) {
      imageMap = new Y.Map<string>();
      rootMap.set(imageId, imageMap);
    }
    return imageMap;
  }

  /**
   * Rebuild the local annotations array from the Y.Map state.
   */
  function syncFromYjs() {
    const imageMap = rootMap.get(imageId);
    if (!imageMap) {
      annotations.value = [];
      return;
    }

    const result: Annotation[] = [];
    imageMap.forEach((jsonStr) => {
      try {
        result.push(JSON.parse(jsonStr) as Annotation);
      } catch {
        // Skip corrupted entries
      }
    });

    // Sort by creation time for consistent ordering
    result.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    annotations.value = result;
  }

  function addAnnotation(annotation: Annotation) {
    const imageMap = getImageMap();
    imageMap.set(annotation.id, JSON.stringify(annotation));
    syncFromYjs();
  }

  function updateAnnotation(annotation: Annotation) {
    const imageMap = getImageMap();
    if (imageMap.has(annotation.id)) {
      imageMap.set(annotation.id, JSON.stringify(annotation));
      syncFromYjs();
    }
  }

  function removeAnnotation(annotationId: string) {
    const imageMap = rootMap.get(imageId);
    if (imageMap) {
      imageMap.delete(annotationId);
      syncFromYjs();
    }
  }

  // Observe changes from remote peers
  function handleRootObserve() {
    syncFromYjs();

    // Also observe the specific image map if it exists
    const imageMap = rootMap.get(imageId);
    if (imageMap) {
      imageMap.unobserveDeep(handleImageMapChange);
      imageMap.observeDeep(handleImageMapChange);
    }
  }

  function handleImageMapChange() {
    syncFromYjs();
  }

  // Set up observers
  rootMap.observe(handleRootObserve);

  // If the image map already exists (e.g. from initial Yjs state), observe it
  const existingMap = rootMap.get(imageId);
  if (existingMap) {
    existingMap.observeDeep(handleImageMapChange);
    syncFromYjs();
  }

  onUnmounted(() => {
    rootMap.unobserve(handleRootObserve);
    const imageMap = rootMap.get(imageId);
    if (imageMap) {
      imageMap.unobserveDeep(handleImageMapChange);
    }
  });

  return {
    annotations,
    addAnnotation,
    updateAnnotation,
    removeAnnotation,
  };
}
