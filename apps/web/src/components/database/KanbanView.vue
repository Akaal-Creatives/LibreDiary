<script setup lang="ts">
import { ref, computed } from 'vue';
import { useDatabasesStore } from '@/stores';
import { CellRenderer } from './cells';

const databasesStore = useDatabasesStore();

interface DraftCard {
  columnValue: string | null;
  title: string;
}

const dragCardId = ref<string | null>(null);
const dragOverColumnValue = ref<string | null>(null);
const draftCard = ref<DraftCard | null>(null);

const groupByPropertyId = computed(() => {
  const config = databasesStore.activeView?.config as Record<string, unknown> | null;
  return (config?.groupBy as string) ?? null;
});

const groupByProperty = computed(() => {
  if (!groupByPropertyId.value) return null;
  return databasesStore.properties.find((p) => p.id === groupByPropertyId.value) ?? null;
});

const selectProperties = computed(() =>
  databasesStore.properties.filter((p) => p.type === 'SELECT' || p.type === 'MULTI_SELECT')
);

const titleProperty = computed(() => databasesStore.sortedProperties[0] ?? null);

const visibleCardProperties = computed(() =>
  databasesStore.sortedProperties.filter(
    (p) => p.id !== groupByPropertyId.value && p.id !== titleProperty.value?.id
  )
);

interface KanbanColumn {
  value: string | null;
  label: string;
  colour: string | null;
  rows: typeof databasesStore.filteredAndSortedRows;
}

const columns = computed<KanbanColumn[]>(() => {
  const prop = groupByProperty.value;
  if (!prop) return [];

  const options =
    ((prop.config as Record<string, unknown>)?.options as Array<{
      label: string;
      colour?: string;
    }>) ?? [];

  const allRows = databasesStore.filteredAndSortedRows;

  const result: KanbanColumn[] = options.map((opt) => ({
    value: opt.label,
    label: opt.label,
    colour: opt.colour ?? null,
    rows: allRows.filter((r) => (r.cells as Record<string, unknown>)[prop.id] === opt.label),
  }));

  // Uncategorised column
  const categorisedValues = new Set(options.map((o) => o.label));
  const uncatRows = allRows.filter((r) => {
    const val = (r.cells as Record<string, unknown>)[prop.id];
    return val == null || val === '' || !categorisedValues.has(String(val));
  });

  result.push({
    value: null,
    label: 'Uncategorised',
    colour: null,
    rows: uncatRows,
  });

  return result;
});

async function setGroupBy(propertyId: string) {
  const view = databasesStore.activeView;
  if (!view) return;
  const config = { ...((view.config as Record<string, unknown>) ?? {}), groupBy: propertyId };
  await databasesStore.updateView(view.id, { config });
}

function getCellValue(row: { cells: unknown }, propertyId: string): unknown {
  return (row.cells as Record<string, unknown>)[propertyId] ?? null;
}

function onCardDragStart(event: DragEvent, rowId: string) {
  dragCardId.value = rowId;
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', rowId);
  }
}

function onColumnDragOver(event: DragEvent, columnValue: string | null) {
  event.preventDefault();
  if (dragCardId.value) {
    dragOverColumnValue.value = columnValue;
  }
}

function onColumnDragLeave() {
  dragOverColumnValue.value = null;
}

async function onColumnDrop(event: DragEvent, columnValue: string | null) {
  event.preventDefault();
  dragOverColumnValue.value = null;
  if (!dragCardId.value || !groupByPropertyId.value) return;

  await databasesStore.updateRowCell(dragCardId.value, groupByPropertyId.value, columnValue);
  dragCardId.value = null;
}

function onCardDragEnd() {
  dragCardId.value = null;
  dragOverColumnValue.value = null;
}

function addCard(columnValue: string | null) {
  draftCard.value = { columnValue, title: '' };
}

async function saveDraftCard(event: KeyboardEvent) {
  if (event.key !== 'Enter') return;
  if (!draftCard.value || !draftCard.value.title.trim()) return;
  if (!titleProperty.value) return;

  const cells: Record<string, unknown> = {
    [titleProperty.value.id]: draftCard.value.title.trim(),
  };
  if (groupByPropertyId.value && draftCard.value.columnValue !== null) {
    cells[groupByPropertyId.value] = draftCard.value.columnValue;
  }

  draftCard.value = null;
  await databasesStore.createRow({ cells });
}

function onDraftBlur() {
  if (draftCard.value && !draftCard.value.title.trim()) {
    draftCard.value = null;
  }
}
</script>

<template>
  <div class="kanban-view">
    <!-- Group-by selector (shown when no groupBy or always for changing) -->
    <div v-if="!groupByPropertyId" class="kanban-group-by-bar kanban-group-by-prompt">
      <div class="group-by-prompt-content">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <rect
            x="1"
            y="3"
            width="5"
            height="14"
            rx="1.5"
            stroke="currentColor"
            stroke-width="1.2"
          />
          <rect
            x="7.5"
            y="3"
            width="5"
            height="10"
            rx="1.5"
            stroke="currentColor"
            stroke-width="1.2"
          />
          <rect
            x="14"
            y="3"
            width="5"
            height="7"
            rx="1.5"
            stroke="currentColor"
            stroke-width="1.2"
          />
        </svg>
        <span class="group-by-label">Group by</span>
        <select
          class="group-by-select"
          @change="setGroupBy(($event.target as HTMLSelectElement).value)"
        >
          <option value="" disabled selected>Select a property</option>
          <option v-for="prop in selectProperties" :key="prop.id" :value="prop.id">
            {{ prop.name }}
          </option>
        </select>
      </div>
    </div>

    <!-- Group-by bar when configured -->
    <div v-else class="kanban-group-by-bar">
      <span class="group-by-label">Group by</span>
      <select
        class="group-by-select"
        :value="groupByPropertyId"
        @change="setGroupBy(($event.target as HTMLSelectElement).value)"
      >
        <option v-for="prop in selectProperties" :key="prop.id" :value="prop.id">
          {{ prop.name }}
        </option>
      </select>
    </div>

    <!-- Kanban board -->
    <div v-if="groupByPropertyId" class="kanban-board">
      <div
        v-for="column in columns"
        :key="column.value ?? '__uncategorised__'"
        class="kanban-column"
      >
        <!-- Column header -->
        <div class="column-header">
          <span
            v-if="column.colour"
            class="column-colour-dot"
            :style="{ background: column.colour }"
          ></span>
          <span v-else class="column-colour-dot column-colour-dot--neutral"></span>
          <span class="column-title">{{ column.label }}</span>
          <span class="column-count">{{ column.rows.length }}</span>
        </div>

        <!-- Cards drop zone -->
        <div
          class="column-cards"
          :class="{ 'drop-target': dragOverColumnValue === column.value && dragCardId !== null }"
          @dragover="onColumnDragOver($event, column.value)"
          @dragleave="onColumnDragLeave"
          @drop="onColumnDrop($event, column.value)"
        >
          <!-- Kanban cards -->
          <div
            v-for="row in column.rows"
            :key="row.id"
            class="kanban-card"
            :class="{ dragging: dragCardId === row.id }"
            draggable="true"
            @dragstart="onCardDragStart($event, row.id)"
            @dragend="onCardDragEnd"
          >
            <div class="card-title">
              {{ titleProperty ? getCellValue(row, titleProperty.id) : '' }}
            </div>
            <div v-if="visibleCardProperties.length > 0" class="card-fields">
              <div v-for="prop in visibleCardProperties" :key="prop.id" class="card-field">
                <CellRenderer
                  :value="getCellValue(row, prop.id)"
                  :type="prop.type"
                  :config="(prop.config as Record<string, unknown>) ?? null"
                />
              </div>
            </div>
          </div>

          <!-- Draft card -->
          <div
            v-if="draftCard && draftCard.columnValue === column.value"
            class="kanban-card draft-card"
          >
            <input
              v-model="draftCard.title"
              class="draft-card-input"
              type="text"
              placeholder="Untitled"
              autofocus
              @keydown="saveDraftCard"
              @blur="onDraftBlur"
            />
          </div>
        </div>

        <!-- Add card button -->
        <button class="add-card-btn" @click="addCard(column.value)">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 2.5V11.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
            <path d="M2.5 7H11.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
          </svg>
          New
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.kanban-view {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

/* Group-by bar */
.kanban-group-by-bar {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) var(--space-6);
  border-bottom: 1px solid var(--color-border-subtle);
}

.kanban-group-by-prompt {
  flex: 1;
  justify-content: center;
  padding: var(--space-20) var(--space-6);
  border-bottom: none;
}

.group-by-prompt-content {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  color: var(--color-text-tertiary);
}

.group-by-label {
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--color-text-tertiary);
}

.group-by-select {
  padding: var(--space-1) var(--space-2);
  font-family: inherit;
  font-size: var(--text-sm);
  color: var(--color-text-primary);
  background: var(--color-surface-sunken);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  outline: none;
  cursor: pointer;
  transition: border-color var(--transition-fast);
}

.group-by-select:focus {
  border-color: var(--color-accent);
}

/* Kanban board */
.kanban-board {
  flex: 1;
  display: flex;
  gap: var(--space-4);
  padding: var(--space-4) var(--space-6);
  overflow-x: auto;
  min-height: 0;
}

/* Column */
.kanban-column {
  flex: 0 0 280px;
  display: flex;
  flex-direction: column;
  max-height: 100%;
  background: var(--color-surface-sunken);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border-subtle);
}

.column-header {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-3);
  user-select: none;
}

.column-colour-dot {
  width: 10px;
  height: 10px;
  border-radius: var(--radius-full);
  flex-shrink: 0;
}

.column-colour-dot--neutral {
  background: var(--color-text-tertiary);
}

.column-title {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.column-count {
  margin-left: auto;
  font-size: var(--text-xs);
  font-weight: 500;
  color: var(--color-text-tertiary);
  background: var(--color-hover);
  padding: 0 var(--space-2);
  border-radius: var(--radius-full);
  min-width: 20px;
  text-align: center;
}

/* Cards container */
.column-cards {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: 0 var(--space-2) var(--space-2);
  overflow-y: auto;
  min-height: 40px;
  transition:
    background var(--transition-fast),
    border-color var(--transition-fast);
  border-radius: var(--radius-md);
}

.column-cards.drop-target {
  background: var(--color-accent-subtle);
  outline: 2px dashed var(--color-accent);
  outline-offset: -2px;
}

/* Cards */
.kanban-card {
  background: var(--color-surface-elevated);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-md);
  padding: var(--space-3);
  box-shadow: var(--shadow-sm);
  cursor: grab;
  transition:
    box-shadow var(--transition-fast),
    opacity var(--transition-fast);
  user-select: none;
}

.kanban-card:hover {
  box-shadow: var(--shadow-md);
}

.kanban-card.dragging {
  opacity: 0.5;
  cursor: grabbing;
}

.card-title {
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--color-text-primary);
  line-height: var(--leading-snug);
  word-break: break-word;
}

.card-fields {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  margin-top: var(--space-2);
}

.card-field {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
}

/* Draft card */
.draft-card {
  cursor: default;
}

.draft-card-input {
  width: 100%;
  padding: 0;
  font-family: inherit;
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--color-text-primary);
  background: transparent;
  border: none;
  outline: none;
}

.draft-card-input::placeholder {
  color: var(--color-text-tertiary);
}

/* Add card button */
.add-card-btn {
  display: flex;
  gap: var(--space-2);
  align-items: center;
  width: 100%;
  padding: var(--space-2) var(--space-3);
  font-family: inherit;
  font-size: var(--text-sm);
  color: var(--color-text-tertiary);
  text-align: left;
  cursor: pointer;
  background: transparent;
  border: none;
  border-top: 1px solid var(--color-border-subtle);
  border-radius: 0 0 var(--radius-lg) var(--radius-lg);
  transition: all var(--transition-fast);
}

.add-card-btn:hover {
  color: var(--color-accent);
  background: var(--color-hover);
}
</style>
