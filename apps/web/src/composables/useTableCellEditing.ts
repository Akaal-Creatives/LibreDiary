import { ref } from 'vue';
import type { useDatabasesStore } from '@/stores/databases';

type DatabasesStore = ReturnType<typeof useDatabasesStore>;

interface DraftRow {
  id: string;
  cells: Record<string, unknown>;
}

export function useTableCellEditing(databasesStore: DatabasesStore) {
  const editingCell = ref<{ rowId: string; propertyId: string } | null>(null);
  const draftRow = ref<DraftRow | null>(null);

  function startEdit(rowId: string, propertyId: string) {
    const prop = databasesStore.properties.find((p) => p.id === propertyId);
    if (prop && ['CREATED_TIME', 'UPDATED_TIME', 'CREATED_BY', 'UPDATED_BY'].includes(prop.type))
      return;
    editingCell.value = { rowId, propertyId };
  }

  async function saveCell(rowId: string, propertyId: string, value: unknown) {
    editingCell.value = null;
    await databasesStore.updateRowCell(rowId, propertyId, value);
  }

  function cancelEdit() {
    editingCell.value = null;
  }

  function getCellValue(row: { cells: unknown }, propertyId: string): unknown {
    return (row.cells as Record<string, unknown>)[propertyId] ?? null;
  }

  function addRow() {
    draftRow.value = { id: 'draft', cells: {} };
  }

  async function saveDraftCell(propertyId: string, value: unknown) {
    editingCell.value = null;
    if (!draftRow.value) return;

    const hasValue = value !== null && value !== undefined && value !== '';
    if (!hasValue) return;

    const cells = { ...draftRow.value.cells, [propertyId]: value };
    draftRow.value = null;
    await databasesStore.createRow({ cells });
  }

  return {
    editingCell,
    draftRow,
    startEdit,
    saveCell,
    cancelEdit,
    getCellValue,
    addRow,
    saveDraftCell,
  };
}
