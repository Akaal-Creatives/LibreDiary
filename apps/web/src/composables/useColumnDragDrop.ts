import { ref } from 'vue';
import type { useDatabasesStore } from '@/stores/databases';

type DatabasesStore = ReturnType<typeof useDatabasesStore>;

export function useColumnDragDrop(databasesStore: DatabasesStore) {
  const dragColId = ref<string | null>(null);
  const dragOverColId = ref<string | null>(null);

  function onColDragStart(event: DragEvent, colId: string) {
    dragColId.value = colId;
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', colId);
    }
  }

  function onColDragOver(event: DragEvent, colId: string) {
    event.preventDefault();
    if (dragColId.value && dragColId.value !== colId) {
      dragOverColId.value = colId;
    }
  }

  function onColDragLeave() {
    dragOverColId.value = null;
  }

  async function onColDrop(event: DragEvent, targetColId: string) {
    event.preventDefault();
    dragOverColId.value = null;
    if (!dragColId.value || dragColId.value === targetColId) return;

    const cols = databasesStore.sortedProperties.map((p) => p.id);
    const fromIdx = cols.indexOf(dragColId.value);
    const toIdx = cols.indexOf(targetColId);
    if (fromIdx < 0 || toIdx < 0) return;

    cols.splice(fromIdx, 1);
    cols.splice(toIdx, 0, dragColId.value);
    dragColId.value = null;
    await databasesStore.reorderProperties(cols);
  }

  function onColDragEnd() {
    dragColId.value = null;
    dragOverColId.value = null;
  }

  return {
    dragColId,
    dragOverColId,
    onColDragStart,
    onColDragOver,
    onColDragLeave,
    onColDrop,
    onColDragEnd,
  };
}
