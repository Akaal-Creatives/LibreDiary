<script setup lang="ts">
import { ref, computed } from 'vue';
import { useDatabasesStore } from '@/stores';
import { CellRenderer, CellEditor } from './cells';
import ColumnHeaderMenu from './ColumnHeaderMenu.vue';
import type { PropertyType } from '@librediary/shared';

const databasesStore = useDatabasesStore();

const editingCell = ref<{ rowId: string; propertyId: string } | null>(null);
const selectedRows = ref<Set<string>>(new Set());
const showAddPropertyPopover = ref(false);
const newPropertyName = ref('');
const newPropertyType = ref<PropertyType>('TEXT');
const columnMenuTarget = ref<string | null>(null);

// Drag state for row reorder
const dragRowId = ref<string | null>(null);
const dragOverRowId = ref<string | null>(null);

// Drag state for column reorder
const dragColId = ref<string | null>(null);
const dragOverColId = ref<string | null>(null);

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

function startEdit(rowId: string, propertyId: string) {
  const prop = databasesStore.properties.find((p) => p.id === propertyId);
  // Don't edit system columns
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

async function addRow() {
  await databasesStore.createRow();
}

async function addProperty() {
  const name = newPropertyName.value.trim();
  if (!name) return;
  await databasesStore.createProperty({ name, type: newPropertyType.value });
  newPropertyName.value = '';
  newPropertyType.value = 'TEXT';
  showAddPropertyPopover.value = false;
}

function handleAddPropertyKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter') {
    event.preventDefault();
    addProperty();
  }
  if (event.key === 'Escape') {
    showAddPropertyPopover.value = false;
  }
}

async function bulkDelete() {
  if (selectedRows.value.size === 0) return;
  await databasesStore.bulkDeleteRows([...selectedRows.value]);
  selectedRows.value.clear();
}

function toggleColumnMenu(propertyId: string) {
  columnMenuTarget.value = columnMenuTarget.value === propertyId ? null : propertyId;
}

function closeColumnMenu() {
  columnMenuTarget.value = null;
}

// Row drag-and-drop
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

// Column drag-and-drop
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

const propertyTypes: Array<{ value: PropertyType; label: string }> = [
  { value: 'TEXT', label: 'Text' },
  { value: 'NUMBER', label: 'Number' },
  { value: 'SELECT', label: 'Select' },
  { value: 'MULTI_SELECT', label: 'Multi-select' },
  { value: 'DATE', label: 'Date' },
  { value: 'CHECKBOX', label: 'Checkbox' },
  { value: 'URL', label: 'URL' },
  { value: 'EMAIL', label: 'Email' },
  { value: 'PHONE', label: 'Phone' },
];
</script>

<template>
  <div class="table-view">
    <!-- Bulk Actions Bar -->
    <div v-if="selectedRows.size > 0" class="bulk-actions">
      <span class="bulk-count">{{ selectedRows.size }} selected</span>
      <button class="bulk-btn delete-btn" @click="bulkDelete">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M2.5 4.5H11.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" />
          <path
            d="M5 4.5V3.5C5 2.94772 5.44772 2.5 6 2.5H8C8.55228 2.5 9 2.94772 9 3.5V4.5"
            stroke="currentColor"
            stroke-width="1.2"
          />
          <path
            d="M3.5 4.5L4 11.5C4.02 11.776 4.24772 12 4.5 12H9.5C9.75228 12 9.98 11.776 10 11.5L10.5 4.5"
            stroke="currentColor"
            stroke-width="1.2"
          />
        </svg>
        Delete
      </button>
    </div>

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
            <th
              v-for="prop in databasesStore.sortedProperties"
              :key="prop.id"
              class="col-header"
              :class="{
                'drag-over': dragOverColId === prop.id,
                dragging: dragColId === prop.id,
              }"
              draggable="true"
              @dragstart="onColDragStart($event, prop.id)"
              @dragover="onColDragOver($event, prop.id)"
              @dragleave="onColDragLeave"
              @drop="onColDrop($event, prop.id)"
              @dragend="onColDragEnd"
            >
              <div class="col-header-content">
                <span class="col-name">{{ prop.name }}</span>
                <button class="col-menu-btn" @click.stop="toggleColumnMenu(prop.id)">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path
                      d="M3 5L6 8L9 5"
                      stroke="currentColor"
                      stroke-width="1.2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </svg>
                </button>
              </div>
              <ColumnHeaderMenu
                v-if="columnMenuTarget === prop.id"
                :property="prop"
                @close="closeColumnMenu"
              />
            </th>
            <!-- Add property column -->
            <th class="col-add">
              <div class="add-property-wrapper">
                <button
                  class="add-property-btn"
                  @click="showAddPropertyPopover = !showAddPropertyPopover"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path
                      d="M7 2.5V11.5"
                      stroke="currentColor"
                      stroke-width="1.5"
                      stroke-linecap="round"
                    />
                    <path
                      d="M2.5 7H11.5"
                      stroke="currentColor"
                      stroke-width="1.5"
                      stroke-linecap="round"
                    />
                  </svg>
                </button>
                <div v-if="showAddPropertyPopover" class="add-property-popover">
                  <input
                    v-model="newPropertyName"
                    class="add-property-input"
                    type="text"
                    placeholder="Property name"
                    autofocus
                    @keydown="handleAddPropertyKeydown"
                  />
                  <select v-model="newPropertyType" class="add-property-select">
                    <option v-for="pt in propertyTypes" :key="pt.value" :value="pt.value">
                      {{ pt.label }}
                    </option>
                  </select>
                  <button class="add-property-submit" @click="addProperty">Add</button>
                </div>
              </div>
            </th>
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
            <!-- Drag handle -->
            <td
              class="cell-drag"
              draggable="true"
              @dragstart="onRowDragStart($event, row.id)"
              @dragend="onRowDragEnd"
            >
              <span class="drag-handle">
                <svg width="8" height="12" viewBox="0 0 8 12" fill="none">
                  <circle cx="2" cy="2" r="1" fill="currentColor" />
                  <circle cx="6" cy="2" r="1" fill="currentColor" />
                  <circle cx="2" cy="6" r="1" fill="currentColor" />
                  <circle cx="6" cy="6" r="1" fill="currentColor" />
                  <circle cx="2" cy="10" r="1" fill="currentColor" />
                  <circle cx="6" cy="10" r="1" fill="currentColor" />
                </svg>
              </span>
            </td>
            <!-- Data cells -->
            <td
              v-for="prop in databasesStore.sortedProperties"
              :key="prop.id"
              class="data-cell"
              @click="startEdit(row.id, prop.id)"
            >
              <CellEditor
                v-if="editingCell?.rowId === row.id && editingCell?.propertyId === prop.id"
                :value="getCellValue(row, prop.id)"
                :type="prop.type"
                :config="(prop.config as Record<string, unknown>) ?? null"
                @save="(v) => saveCell(row.id, prop.id, v)"
                @cancel="cancelEdit"
              />
              <CellRenderer
                v-else
                :value="getCellValue(row, prop.id)"
                :type="prop.type"
                :config="(prop.config as Record<string, unknown>) ?? null"
              />
            </td>
            <!-- Empty add-column spacer -->
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

/* Bulk Actions */
.bulk-actions {
  display: flex;
  gap: var(--space-3);
  align-items: center;
  padding: var(--space-2) var(--space-6);
  background: var(--color-accent-subtle);
  border-bottom: 1px solid var(--color-border-subtle);
}

.bulk-count {
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--color-accent);
}

.bulk-btn {
  display: flex;
  gap: var(--space-1);
  align-items: center;
  padding: var(--space-1) var(--space-2);
  font-family: inherit;
  font-size: var(--text-xs);
  font-weight: 500;
  color: var(--color-text-secondary);
  cursor: pointer;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  transition: all var(--transition-fast);
}

.bulk-btn:hover {
  background: var(--color-hover);
}

.delete-btn:hover {
  color: var(--color-error);
  border-color: var(--color-error);
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

.col-header {
  min-width: 140px;
  position: relative;
  cursor: grab;
  transition: background var(--transition-fast);
}

.col-header:hover {
  background: var(--color-hover);
}

.col-header.drag-over {
  background: var(--color-accent-subtle);
  border-left: 2px solid var(--color-accent);
}

.col-header.dragging {
  opacity: 0.5;
}

.col-header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-1);
}

.col-name {
  overflow: hidden;
  text-overflow: ellipsis;
}

.col-menu-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  padding: 0;
  color: var(--color-text-tertiary);
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: var(--radius-sm);
  opacity: 0;
  transition: all var(--transition-fast);
}

.col-header:hover .col-menu-btn {
  opacity: 1;
}

.col-menu-btn:hover {
  color: var(--color-text-primary);
  background: var(--color-hover);
}

.col-add {
  width: 40px;
  text-align: center;
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

.drag-handle {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-tertiary);
  opacity: 0;
  transition: opacity var(--transition-fast);
}

.data-row:hover .drag-handle {
  opacity: 1;
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

/* Add Property Popover */
.add-property-wrapper {
  position: relative;
  display: flex;
  justify-content: center;
}

.add-property-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  color: var(--color-text-tertiary);
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: var(--radius-sm);
  transition: all var(--transition-fast);
}

.add-property-btn:hover {
  color: var(--color-text-primary);
  background: var(--color-hover);
}

.add-property-popover {
  position: absolute;
  top: 100%;
  right: 0;
  z-index: var(--z-dropdown);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  min-width: 220px;
  padding: var(--space-3);
  margin-top: var(--space-1);
  background: var(--color-surface-elevated);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
}

.add-property-input {
  width: 100%;
  padding: var(--space-2);
  font-family: inherit;
  font-size: var(--text-sm);
  color: var(--color-text-primary);
  background: var(--color-surface-sunken);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  outline: none;
}

.add-property-input:focus {
  border-color: var(--color-accent);
}

.add-property-select {
  width: 100%;
  padding: var(--space-2);
  font-family: inherit;
  font-size: var(--text-sm);
  color: var(--color-text-primary);
  background: var(--color-surface-sunken);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  outline: none;
  cursor: pointer;
}

.add-property-submit {
  padding: var(--space-2);
  font-family: inherit;
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--color-text-inverse);
  cursor: pointer;
  background: var(--color-accent);
  border: none;
  border-radius: var(--radius-sm);
  transition: all var(--transition-fast);
}

.add-property-submit:hover {
  background: var(--color-accent-hover);
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
</style>
