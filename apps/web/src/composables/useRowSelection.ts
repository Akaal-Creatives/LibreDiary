import { ref, computed } from 'vue';
import type { useDatabasesStore } from '@/stores/databases';

type DatabasesStore = ReturnType<typeof useDatabasesStore>;

export function useRowSelection(databasesStore: DatabasesStore) {
  const selectedRows = ref<Set<string>>(new Set());

  const allSelected = computed(() => {
    const rows = databasesStore.filteredAndSortedRows;
    return rows.length > 0 && selectedRows.value.size === rows.length;
  });

  function toggleSelectAll() {
    if (allSelected.value) {
      selectedRows.value.clear();
    } else {
      selectedRows.value = new Set(databasesStore.filteredAndSortedRows.map((r) => r.id));
    }
  }

  function toggleSelectRow(rowId: string) {
    if (selectedRows.value.has(rowId)) {
      selectedRows.value.delete(rowId);
    } else {
      selectedRows.value.add(rowId);
    }
  }

  async function bulkDelete() {
    if (selectedRows.value.size === 0) return;
    await databasesStore.bulkDeleteRows([...selectedRows.value]);
    selectedRows.value.clear();
  }

  return {
    selectedRows,
    allSelected,
    toggleSelectAll,
    toggleSelectRow,
    bulkDelete,
  };
}
