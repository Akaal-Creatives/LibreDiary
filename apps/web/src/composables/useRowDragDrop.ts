import { ref } from 'vue';
import type { useDatabasesStore } from '@/stores/databases';

type DatabasesStore = ReturnType<typeof useDatabasesStore>;

export function useRowDragDrop(databasesStore: DatabasesStore) {
  const dragRowId = ref<string | null>(null);
  const dragOverRowId = ref<string | null>(null);

  function onRowDragStart(event: DragEvent, rowId: string) {
    dragRowId.value = rowId;
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', rowId);
    }
  }

  function onRowDragOver(event: DragEvent, rowId: string) {
    event.preventDefault();
    if (dragRowId.value && dragRowId.value !== rowId) {
      dragOverRowId.value = rowId;
    }
  }

  function onRowDragLeave() {
    dragOverRowId.value = null;
  }

  async function onRowDrop(event: DragEvent, targetRowId: string) {
    event.preventDefault();
    dragOverRowId.value = null;
    if (!dragRowId.value || dragRowId.value === targetRowId) return;

    const rows = databasesStore.filteredAndSortedRows.map((r) => r.id);
    const fromIdx = rows.indexOf(dragRowId.value);
    const toIdx = rows.indexOf(targetRowId);
    if (fromIdx < 0 || toIdx < 0) return;

    rows.splice(fromIdx, 1);
    rows.splice(toIdx, 0, dragRowId.value);
    dragRowId.value = null;
    await databasesStore.reorderRows(rows);
  }

  function onRowDragEnd() {
    dragRowId.value = null;
    dragOverRowId.value = null;
  }

  return {
    dragRowId,
    dragOverRowId,
    onRowDragStart,
    onRowDragOver,
    onRowDragLeave,
    onRowDrop,
    onRowDragEnd,
  };
}
