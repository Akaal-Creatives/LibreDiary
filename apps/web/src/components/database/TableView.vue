<script setup lang="ts">
import { useDatabasesStore } from '@/stores';
import { CellRenderer, CellEditor } from './cells';
import TableBulkActions from './TableBulkActions.vue';
import TableColumnHeader from './TableColumnHeader.vue';
import AddPropertyPopover from './AddPropertyPopover.vue';
import TableRowDragCell from './TableRowDragCell.vue';
import type { PropertyType } from '@librediary/shared';
import { useTimer, type TimerTarget } from '@/composables/useTimer';
import { useColumnResize } from '@/composables/useColumnResize';
import { useTableCellEditing } from '@/composables/useTableCellEditing';
import { useRowSelection } from '@/composables/useRowSelection';
import { useRowDragDrop } from '@/composables/useRowDragDrop';
import { useColumnDragDrop } from '@/composables/useColumnDragDrop';

const databasesStore = useDatabasesStore();
const timer = useTimer();

const { isResizing, getColumnWidth, onResizeStart, onResizeHandleDblClick } =
  useColumnResize(databasesStore);
const {
  editingCell,
  draftRow,
  startEdit,
  saveCell,
  cancelEdit,
  getCellValue,
  addRow,
  saveDraftCell,
} = useTableCellEditing(databasesStore);
const { selectedRows, allSelected, toggleSelectAll, toggleSelectRow, bulkDelete } =
  useRowSelection(databasesStore);
const {
  dragRowId,
  dragOverRowId,
  onRowDragStart,
  onRowDragOver,
  onRowDragLeave,
  onRowDrop,
  onRowDragEnd,
} = useRowDragDrop(databasesStore);
const {
  dragColId,
  dragOverColId,
  onColDragStart,
  onColDragOver,
  onColDragLeave,
  onColDrop,
  onColDragEnd,
} = useColumnDragDrop(databasesStore);

// Add property handler
async function handleAddProperty(payload: { name: string; type: PropertyType }) {
  await databasesStore.createProperty({ name: payload.name, type: payload.type });
}

// Timer glue
function isTimerActiveForRow(rowId: string): boolean {
  return timer.target.value?.rowId === rowId;
}

function startTimerForRow(rowId: string, propertyId: string) {
  const row = databasesStore.filteredAndSortedRows.find((r) => r.id === rowId);
  const prop = databasesStore.properties.find((p) => p.id === propertyId);
  if (!row || !prop) return;

  const firstTextProp = databasesStore.sortedProperties[0];
  const cells = row.cells as Record<string, unknown>;
  const taskName = firstTextProp ? String(cells[firstTextProp.id] ?? 'Row') : 'Row';

  const target: TimerTarget = {
    databaseId: databasesStore.currentDatabaseId!,
    rowId,
    propertyId,
    taskName,
  };
  timer.start(target);
}

function getDurationPropertyForRow(): { id: string } | undefined {
  return databasesStore.sortedProperties.find((p) => p.type === 'DURATION');
}

function getRecurrenceValue(row: (typeof databasesStore.filteredAndSortedRows)[number]) {
  return {
    rule: row.recurrenceRule,
    status: row.recurrenceStatus,
    nextAt: row.nextOccurrenceAt,
  };
}

function getCellValueForProp(
  row: (typeof databasesStore.filteredAndSortedRows)[number],
  propId: string,
  propType: string
) {
  if (propType === 'RECURRENCE') return getRecurrenceValue(row);
  return getCellValue(row, propId);
}

async function handleSaveCell(
  rowId: string,
  propId: string,
  propType: string,
  value: unknown
) {
  if (propType === 'RECURRENCE') {
    await databasesStore.setRowRecurrence(rowId, value as string);
  } else {
    await saveCell(rowId, propId, value);
  }
}
</script>

<template>
  <div class="table-view" :class="{ 'table-view--resizing': isResizing }">
    <!-- Bulk Actions Bar -->
    <TableBulkActions :selected-count="selectedRows.size" @delete="bulkDelete" />

    <!-- Table Container -->
    <div class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <!-- Checkbox column -->
            <th class="col-checkbox">
              <input
                type="checkbox"
                class="row-checkbox"
                :checked="allSelected"
                :indeterminate="selectedRows.size > 0 && !allSelected"
                @change="toggleSelectAll"
              />
            </th>
            <!-- Drag handle column -->
            <th class="col-drag"></th>
            <!-- Property columns -->
            <TableColumnHeader
              v-for="prop in databasesStore.sortedProperties"
              :key="prop.id"
              :property="prop"
              :width="getColumnWidth(prop.id)"
              :is-drag-over="dragOverColId === prop.id"
              :is-dragging="dragColId === prop.id"
              @resize-start="onResizeStart($event, prop.id)"
              @resize-dblclick="onResizeHandleDblClick($event, prop.id)"
              @col-dragstart="onColDragStart($event, prop.id)"
              @col-dragover="onColDragOver($event, prop.id)"
              @col-dragleave="onColDragLeave"
              @col-drop="onColDrop($event, prop.id)"
              @col-dragend="onColDragEnd"
            />
            <!-- Add property column -->
            <AddPropertyPopover @add="handleAddProperty" />
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in databasesStore.filteredAndSortedRows"
            :key="row.id"
            class="data-row"
            :class="{
              selected: selectedRows.has(row.id),
              'drag-over': dragOverRowId === row.id,
              dragging: dragRowId === row.id,
            }"
            @dragover="onRowDragOver($event, row.id)"
            @dragleave="onRowDragLeave"
            @drop="onRowDrop($event, row.id)"
          >
            <!-- Checkbox -->
            <td class="cell-checkbox">
              <input
                type="checkbox"
                class="row-checkbox"
                :checked="selectedRows.has(row.id)"
                @change="toggleSelectRow(row.id)"
              />
            </td>
            <!-- Drag handle / timer indicator -->
            <TableRowDragCell
              :timer-active="isTimerActiveForRow(row.id)"
              :show-start-timer="!!getDurationPropertyForRow() && !timer.isActive.value"
              @dragstart="onRowDragStart($event, row.id)"
              @dragend="onRowDragEnd"
              @start-timer="startTimerForRow(row.id, getDurationPropertyForRow()!.id)"
            />
            <!-- Data cells -->
            <td
              v-for="prop in databasesStore.sortedProperties"
              :key="prop.id"
              class="data-cell"
              @click="startEdit(row.id, prop.id)"
            >
              <CellEditor
                v-if="editingCell?.rowId === row.id && editingCell?.propertyId === prop.id"
                :value="getCellValueForProp(row, prop.id, prop.type)"
                :type="prop.type"
                :config="(prop.config as Record<string, unknown>) ?? null"
                @save="(v) => handleSaveCell(row.id, prop.id, prop.type, v)"
                @cancel="cancelEdit"
                @start-timer="startTimerForRow(row.id, prop.id)"
                @skip-recurrence="databasesStore.skipRowOccurrence(row.id)"
                @set-recurrence-status="(s) => databasesStore.setRowRecurrenceStatus(row.id, s)"
              />
              <CellRenderer
                v-else
                :value="getCellValueForProp(row, prop.id, prop.type)"
                :type="prop.type"
                :config="(prop.config as Record<string, unknown>) ?? null"
                :row-cells="row.cells as Record<string, unknown>"
              />
            </td>
            <!-- Empty add-column spacer -->
            <td class="cell-spacer"></td>
          </tr>
          <!-- Draft row -->
          <tr v-if="draftRow" class="data-row draft-row">
            <td class="cell-checkbox">
              <input type="checkbox" class="row-checkbox" disabled />
            </td>
            <td class="cell-drag"></td>
            <td
              v-for="prop in databasesStore.sortedProperties"
              :key="prop.id"
              class="data-cell"
              @click="startEdit('draft', prop.id)"
            >
              <CellEditor
                v-if="editingCell?.rowId === 'draft' && editingCell?.propertyId === prop.id"
                :value="draftRow.cells[prop.id] ?? null"
                :type="prop.type"
                :config="(prop.config as Record<string, unknown>) ?? null"
                @save="(v) => saveDraftCell(prop.id, v)"
                @cancel="cancelEdit"
                @start-timer="() => {}"
              />
              <CellRenderer
                v-else
                :value="draftRow.cells[prop.id] ?? null"
                :type="prop.type"
                :config="(prop.config as Record<string, unknown>) ?? null"
                :row-cells="draftRow.cells"
              />
            </td>
            <td class="cell-spacer"></td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Add Row -->
    <button class="add-row-btn" @click="addRow">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <path d="M7 2.5V11.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
        <path d="M2.5 7H11.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
      </svg>
      New
    </button>
  </div>
</template>

<style scoped>
.table-view {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

/* Table Container */
.table-container {
  flex: 1;
  overflow: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}

/* Header */
.data-table thead {
  position: sticky;
  top: 0;
  z-index: var(--z-sticky);
  background: var(--color-surface);
}

.data-table th {
  padding: var(--space-2) var(--space-3);
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--color-text-tertiary);
  text-align: left;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: 1px solid var(--color-border);
  white-space: nowrap;
  user-select: none;
}

.col-checkbox {
  width: 36px;
  text-align: center;
}

.col-drag {
  width: 24px;
}

.table-view--resizing {
  cursor: col-resize;
  user-select: none;
}

/* Body */
.data-row {
  transition: background var(--transition-fast);
}

.data-row:hover {
  background: var(--color-hover);
}

.data-row.selected {
  background: var(--color-accent-subtle);
}

.data-row.drag-over {
  border-top: 2px solid var(--color-accent);
}

.data-row.dragging {
  opacity: 0.5;
}

.data-table td {
  padding: var(--space-2) var(--space-3);
  font-size: var(--text-sm);
  color: var(--color-text-primary);
  border-bottom: 1px solid var(--color-border-subtle);
  vertical-align: middle;
}

.cell-checkbox {
  width: 36px;
  text-align: center;
}

.cell-drag {
  width: 24px;
  cursor: grab;
}

.data-cell {
  cursor: text;
  position: relative;
  min-height: 32px;
}

.cell-spacer {
  width: 40px;
}

.row-checkbox {
  width: 14px;
  height: 14px;
  cursor: pointer;
  accent-color: var(--color-accent);
}

/* Add Row */
.add-row-btn {
  display: flex;
  gap: var(--space-2);
  align-items: center;
  width: 100%;
  padding: var(--space-2) var(--space-6);
  font-family: inherit;
  font-size: var(--text-sm);
  color: var(--color-text-tertiary);
  text-align: left;
  cursor: pointer;
  background: transparent;
  border: none;
  border-top: 1px solid var(--color-border-subtle);
  transition: all var(--transition-fast);
}

.add-row-btn:hover {
  color: var(--color-accent);
  background: var(--color-hover);
}

/* Mobile responsive */
@media (max-width: 767px) {
  .col-drag,
  .cell-drag {
    display: none;
  }

  .col-checkbox,
  .cell-checkbox {
    width: 28px;
  }

  .data-table {
    table-layout: auto;
    min-width: max-content;
  }

  .data-table th,
  .data-table td {
    padding: var(--space-1) var(--space-2);
  }

  .add-row-btn {
    padding: var(--space-2) var(--space-3);
  }
}
</style>
