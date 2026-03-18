import { ref, computed, onMounted, onUnmounted } from 'vue';
import { usePagesStore } from '@/stores/pages';

const STORAGE_KEY = 'librediary:offline-queue';

export interface QueuedCapture {
  id: string;
  title: string;
  body: string;
  parentId: string | null;
  orgId: string;
  createdAt: string;
}

function generateId(): string {
  return `capture-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function loadQueue(): QueuedCapture[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveQueue(queue: QueuedCapture[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
}

/**
 * Queues quick captures in localStorage when offline.
 * Processes the queue automatically when the browser comes back online.
 */
export function useOfflineQueue() {
  const pagesStore = usePagesStore();

  const queue = ref<QueuedCapture[]>(loadQueue());
  const processing = ref(false);

  const pending = computed(() => queue.value);

  function enqueue(capture: Omit<QueuedCapture, 'id' | 'createdAt'>): string {
    const item: QueuedCapture = {
      ...capture,
      id: generateId(),
      createdAt: new Date().toISOString(),
    };

    queue.value = [...queue.value, item];
    saveQueue(queue.value);
    return item.id;
  }

  async function processQueue(): Promise<number> {
    if (processing.value || queue.value.length === 0) return 0;

    processing.value = true;
    let processed = 0;

    try {
      const items = [...queue.value];

      for (const item of items) {
        try {
          await pagesStore.createPage({
            title: item.title || 'Untitled',
            parentId: item.parentId ?? undefined,
          });

          // Remove successfully processed item
          queue.value = queue.value.filter((q) => q.id !== item.id);
          saveQueue(queue.value);
          processed++;
        } catch (error) {
          // Leave failed items in the queue for retry
          console.warn('Failed to process queued capture:', item.id, error);
          break;
        }
      }
    } finally {
      processing.value = false;
    }

    return processed;
  }

  function remove(captureId: string): void {
    queue.value = queue.value.filter((q) => q.id !== captureId);
    saveQueue(queue.value);
  }

  function clear(): void {
    queue.value = [];
    saveQueue([]);
  }

  // Auto-process when coming back online
  function handleOnline() {
    processQueue();
  }

  onMounted(() => {
    window.addEventListener('online', handleOnline);
    // Process any pending items if we're already online
    if (navigator.onLine && queue.value.length > 0) {
      processQueue();
    }
  });

  onUnmounted(() => {
    window.removeEventListener('online', handleOnline);
  });

  return {
    pending,
    processing,
    enqueue,
    processQueue,
    remove,
    clear,
  };
}

/** Reset helper for tests */
export function _resetOfflineQueue(): void {
  localStorage.removeItem(STORAGE_KEY);
}
