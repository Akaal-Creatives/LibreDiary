import { ref, onUnmounted } from 'vue';
import type { Awareness } from 'y-protocols/awareness';

export interface AnnotationCursor {
  clientId: number;
  name: string;
  colour: string;
  x: number;
  y: number;
  imageId: string;
}

export interface UseAnnotationPresenceOptions {
  awareness: Awareness | null;
  imageId: string;
  userName: string;
  userColour: string;
}

/**
 * Composable that tracks annotation cursor positions via Yjs Awareness.
 * Shows where other users' cursors are on the annotation canvas.
 */
export function useAnnotationPresence(options: UseAnnotationPresenceOptions) {
  const { awareness, imageId, userName, userColour } = options;
  const remoteCursors = ref<AnnotationCursor[]>([]);

  function updateLocalCursor(x: number, y: number) {
    if (!awareness) return;

    awareness.setLocalStateField('annotationCursor', {
      name: userName,
      colour: userColour,
      x,
      y,
      imageId,
    });
  }

  function clearLocalCursor() {
    if (!awareness) return;
    awareness.setLocalStateField('annotationCursor', null);
  }

  function handleAwarenessChange() {
    if (!awareness) return;

    const cursors: AnnotationCursor[] = [];
    awareness.getStates().forEach((state, clientId) => {
      if (clientId === awareness.clientID) return; // Skip self
      const cursor = state.annotationCursor as {
        name: string;
        colour: string;
        x: number;
        y: number;
        imageId: string;
      } | null;
      if (cursor && cursor.imageId === imageId) {
        cursors.push({ clientId, ...cursor });
      }
    });
    remoteCursors.value = cursors;
  }

  if (awareness) {
    awareness.on('change', handleAwarenessChange);
  }

  onUnmounted(() => {
    clearLocalCursor();
    if (awareness) {
      awareness.off('change', handleAwarenessChange);
    }
  });

  return {
    remoteCursors,
    updateLocalCursor,
    clearLocalCursor,
  };
}
