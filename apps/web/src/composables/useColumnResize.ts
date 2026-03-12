import { ref, computed, onBeforeUnmount } from 'vue';
import type { useDatabasesStore } from '@/stores/databases';

type DatabasesStore = ReturnType<typeof useDatabasesStore>;

const DEFAULT_COL_WIDTH = 200;
const MIN_COL_WIDTH = 80;

export function useColumnResize(databasesStore: DatabasesStore) {
  const resizingColId = ref<string | null>(null);
  const resizeStartX = ref(0);
  const resizeStartWidth = ref(0);
  const localColumnWidths = ref<Record<string, number>>({});
  const isResizing = computed(() => resizingColId.value !== null);

  const viewConfig = computed(() => {
    const view = databasesStore.activeView;
    if (!view?.config) return {} as Record<string, unknown>;
    return view.config as Record<string, unknown>;
  });

  const savedColumnWidths = computed(() => {
    return (viewConfig.value.columnWidths as Record<string, number> | undefined) ?? {};
  });

  function getColumnWidth(propertyId: string): number {
    if (localColumnWidths.value[propertyId] !== undefined) {
      return localColumnWidths.value[propertyId]!;
    }
    return savedColumnWidths.value[propertyId] ?? DEFAULT_COL_WIDTH;
  }

  function onResizeStart(event: MouseEvent, propertyId: string) {
    event.preventDefault();
    event.stopPropagation();
    resizingColId.value = propertyId;
    resizeStartX.value = event.clientX;
    resizeStartWidth.value = getColumnWidth(propertyId);
    document.addEventListener('mousemove', onResizeMove);
    document.addEventListener('mouseup', onResizeEnd);
  }

  function onResizeMove(event: MouseEvent) {
    if (!resizingColId.value) return;
    const delta = event.clientX - resizeStartX.value;
    const newWidth = Math.max(MIN_COL_WIDTH, resizeStartWidth.value + delta);
    localColumnWidths.value = { ...localColumnWidths.value, [resizingColId.value]: newWidth };
  }

  async function onResizeEnd() {
    document.removeEventListener('mousemove', onResizeMove);
    document.removeEventListener('mouseup', onResizeEnd);

    if (!resizingColId.value) return;
    resizingColId.value = null;

    const view = databasesStore.activeView;
    if (!view) return;
    const widths = { ...savedColumnWidths.value, ...localColumnWidths.value };
    const config = { ...viewConfig.value, columnWidths: widths };
    await databasesStore.updateView(view.id, { config });
    localColumnWidths.value = {};
  }

  async function onResizeHandleDblClick(event: MouseEvent, propertyId: string) {
    event.preventDefault();
    event.stopPropagation();
    const view = databasesStore.activeView;
    if (!view) return;
    const widths = { ...savedColumnWidths.value };
    delete widths[propertyId];
    localColumnWidths.value = { ...localColumnWidths.value };
    delete localColumnWidths.value[propertyId];
    const config = { ...viewConfig.value, columnWidths: widths };
    await databasesStore.updateView(view.id, { config });
  }

  function cleanup() {
    document.removeEventListener('mousemove', onResizeMove);
    document.removeEventListener('mouseup', onResizeEnd);
  }

  onBeforeUnmount(cleanup);

  return {
    isResizing,
    getColumnWidth,
    onResizeStart,
    onResizeMove,
    onResizeEnd,
    onResizeHandleDblClick,
    cleanup,
  };
}
