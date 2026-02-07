<script setup lang="ts">
import { ref, computed } from 'vue';
import { useDatabasesStore } from '@/stores';

const databasesStore = useDatabasesStore();

const showFilterPanel = ref(false);
const showSortPanel = ref(false);

type FilterEntry = { propertyId: string; operator: string; value: unknown };
type SortEntry = { propertyId: string; direction: 'asc' | 'desc' };

const viewConfig = computed(() => {
  const view = databasesStore.activeView;
  if (!view?.config) return {};
  return view.config as Record<string, unknown>;
});

const activeFilters = computed(() => {
  return (viewConfig.value.filters as FilterEntry[] | undefined) ?? [];
});

const activeSorts = computed(() => {
  return (viewConfig.value.sorts as SortEntry[] | undefined) ?? [];
});

const localFilters = ref<FilterEntry[]>([]);
const localSorts = ref<SortEntry[]>([]);

function toggleFilterPanel() {
  showFilterPanel.value = !showFilterPanel.value;
  showSortPanel.value = false;
  if (showFilterPanel.value) {
    localFilters.value = [...activeFilters.value];
  }
}

function toggleSortPanel() {
  showSortPanel.value = !showSortPanel.value;
  showFilterPanel.value = false;
  if (showSortPanel.value) {
    localSorts.value = [...activeSorts.value];
  }
}

function addFilter() {
  const firstProp = databasesStore.sortedProperties[0];
  if (!firstProp) return;
  localFilters.value.push({
    propertyId: firstProp.id,
    operator: 'contains',
    value: '',
  });
}

function removeFilter(index: number) {
  localFilters.value.splice(index, 1);
  saveFilters();
}

function clearFilters() {
  localFilters.value = [];
  saveFilters();
}

async function saveFilters() {
  const view = databasesStore.activeView;
  if (!view) return;
  const config = { ...viewConfig.value, filters: [...localFilters.value] };
  await databasesStore.updateView(view.id, { config });
}

function addSort() {
  const firstProp = databasesStore.sortedProperties[0];
  if (!firstProp) return;
  localSorts.value.push({
    propertyId: firstProp.id,
    direction: 'asc',
  });
}

function removeSort(index: number) {
  localSorts.value.splice(index, 1);
  saveSorts();
}

async function saveSorts() {
  const view = databasesStore.activeView;
  if (!view) return;
  const config = { ...viewConfig.value, sorts: [...localSorts.value] };
  await databasesStore.updateView(view.id, { config });
}

function getOperatorsForProperty(propertyId: string): Array<{ value: string; label: string }> {
  const prop = databasesStore.properties.find((p) => p.id === propertyId);
  if (!prop) return [{ value: 'contains', label: 'contains' }];

  switch (prop.type) {
    case 'TEXT':
    case 'URL':
    case 'EMAIL':
    case 'PHONE':
      return [
        { value: 'contains', label: 'contains' },
        { value: 'equals', label: 'equals' },
        { value: 'not_equals', label: 'does not equal' },
        { value: 'is_empty', label: 'is empty' },
        { value: 'is_not_empty', label: 'is not empty' },
      ];
    case 'NUMBER':
      return [
        { value: 'equals', label: '=' },
        { value: 'not_equals', label: '!=' },
        { value: 'gt', label: '>' },
        { value: 'lt', label: '<' },
        { value: 'gte', label: '>=' },
        { value: 'lte', label: '<=' },
        { value: 'is_empty', label: 'is empty' },
        { value: 'is_not_empty', label: 'is not empty' },
      ];
    case 'SELECT':
    case 'MULTI_SELECT':
      return [
        { value: 'is', label: 'is' },
        { value: 'is_not', label: 'is not' },
        { value: 'is_empty', label: 'is empty' },
        { value: 'is_not_empty', label: 'is not empty' },
      ];
    case 'DATE':
    case 'CREATED_TIME':
    case 'UPDATED_TIME':
      return [
        { value: 'equals', label: 'is' },
        { value: 'before', label: 'is before' },
        { value: 'after', label: 'is after' },
        { value: 'is_empty', label: 'is empty' },
        { value: 'is_not_empty', label: 'is not empty' },
      ];
    case 'CHECKBOX':
      return [
        { value: 'is_checked', label: 'is checked' },
        { value: 'is_unchecked', label: 'is unchecked' },
      ];
    default:
      return [
        { value: 'contains', label: 'contains' },
        { value: 'is_empty', label: 'is empty' },
      ];
  }
}

function onFilterPropertyChange(index: number) {
  const filter = localFilters.value[index]!;
  const operators = getOperatorsForProperty(filter.propertyId);
  filter.operator = operators[0]?.value ?? 'contains';
  filter.value = '';
}
</script>

<template>
  <div class="database-toolbar">
    <div class="toolbar-actions">
      <!-- Filter Button -->
      <button
        class="toolbar-btn toolbar-btn-filter"
        :class="{ active: showFilterPanel || activeFilters.length > 0 }"
        @click="toggleFilterPanel"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path
            d="M1.5 2.5H12.5L8.5 7.5V11.5L5.5 10.5V7.5L1.5 2.5Z"
            stroke="currentColor"
            stroke-width="1.2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
        Filter
        <span v-if="activeFilters.length > 0" class="toolbar-badge filter-badge">
          {{ activeFilters.length }}
        </span>
      </button>

      <!-- Sort Button -->
      <button
        class="toolbar-btn toolbar-btn-sort"
        :class="{ active: showSortPanel || activeSorts.length > 0 }"
        @click="toggleSortPanel"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M2 4H12" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" />
          <path d="M3.5 7H10.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" />
          <path d="M5 10H9" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" />
        </svg>
        Sort
        <span v-if="activeSorts.length > 0" class="toolbar-badge sort-badge">
          {{ activeSorts.length }}
        </span>
      </button>
    </div>

    <!-- Filter Panel -->
    <div v-if="showFilterPanel" class="filter-panel">
      <div class="panel-header">
        <span class="panel-title">Filters</span>
        <button v-if="localFilters.length > 0" class="clear-filters-btn" @click="clearFilters">
          Clear all
        </button>
      </div>

      <div v-for="(filter, idx) in localFilters" :key="idx" class="filter-row">
        <select
          v-model="filter.propertyId"
          class="filter-select filter-property"
          @change="onFilterPropertyChange(idx)"
        >
          <option v-for="prop in databasesStore.sortedProperties" :key="prop.id" :value="prop.id">
            {{ prop.name }}
          </option>
        </select>

        <select
          v-model="filter.operator"
          class="filter-select filter-operator"
          @change="saveFilters"
        >
          <option
            v-for="op in getOperatorsForProperty(filter.propertyId)"
            :key="op.value"
            :value="op.value"
          >
            {{ op.label }}
          </option>
        </select>

        <input
          v-if="
            !['is_empty', 'is_not_empty', 'is_checked', 'is_unchecked'].includes(filter.operator)
          "
          v-model="filter.value"
          class="filter-input filter-value"
          type="text"
          placeholder="Value..."
          @change="saveFilters"
        />

        <button class="remove-filter-btn" title="Remove filter" @click="removeFilter(idx)">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M3 3L9 9" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" />
            <path d="M9 3L3 9" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" />
          </svg>
        </button>
      </div>

      <button class="add-filter-btn" @click="addFilter">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M6 2V10" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" />
          <path d="M2 6H10" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" />
        </svg>
        Add filter
      </button>
    </div>

    <!-- Sort Panel -->
    <div v-if="showSortPanel" class="sort-panel">
      <div class="panel-header">
        <span class="panel-title">Sorts</span>
        <button
          v-if="localSorts.length > 0"
          class="clear-sorts-btn"
          @click="
            localSorts = [];
            saveSorts();
          "
        >
          Clear all
        </button>
      </div>

      <div v-for="(sort, idx) in localSorts" :key="idx" class="sort-row">
        <select v-model="sort.propertyId" class="filter-select sort-property" @change="saveSorts">
          <option v-for="prop in databasesStore.sortedProperties" :key="prop.id" :value="prop.id">
            {{ prop.name }}
          </option>
        </select>

        <select v-model="sort.direction" class="filter-select sort-direction" @change="saveSorts">
          <option value="asc">Ascending</option>
          <option value="desc">Descending</option>
        </select>

        <button class="remove-sort-btn" title="Remove sort" @click="removeSort(idx)">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M3 3L9 9" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" />
            <path d="M9 3L3 9" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" />
          </svg>
        </button>
      </div>

      <button class="add-sort-btn" @click="addSort">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M6 2V10" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" />
          <path d="M2 6H10" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" />
        </svg>
        Add sort
      </button>
    </div>
  </div>
</template>

<style scoped>
.database-toolbar {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-6);
  border-bottom: 1px solid var(--color-border-subtle);
}

.toolbar-actions {
  display: flex;
  gap: var(--space-2);
  align-items: center;
}

.toolbar-btn {
  display: flex;
  gap: var(--space-1-5);
  align-items: center;
  padding: var(--space-1) var(--space-2-5);
  font-family: inherit;
  font-size: var(--text-xs);
  font-weight: 500;
  color: var(--color-text-tertiary);
  cursor: pointer;
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
}

.toolbar-btn:hover {
  color: var(--color-text-secondary);
  background: var(--color-hover);
}

.toolbar-btn.active {
  color: var(--color-accent);
  background: color-mix(in srgb, var(--color-accent) 8%, transparent);
  border-color: color-mix(in srgb, var(--color-accent) 20%, transparent);
}

.toolbar-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 16px;
  height: 16px;
  padding: 0 var(--space-1);
  font-size: 10px;
  font-weight: 600;
  color: var(--color-text-inverse);
  background: var(--color-accent);
  border-radius: var(--radius-full);
}

/* Panels */
.filter-panel,
.sort-panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-3);
  background: var(--color-surface-elevated);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.panel-title {
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.clear-filters-btn,
.clear-sorts-btn {
  padding: var(--space-1) var(--space-2);
  font-family: inherit;
  font-size: var(--text-xs);
  color: var(--color-error);
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: var(--radius-sm);
  transition: background var(--transition-fast);
}

.clear-filters-btn:hover,
.clear-sorts-btn:hover {
  background: var(--color-hover);
}

/* Filter / Sort Rows */
.filter-row,
.sort-row {
  display: flex;
  gap: var(--space-2);
  align-items: center;
}

.filter-select {
  padding: var(--space-1-5) var(--space-2);
  font-family: inherit;
  font-size: var(--text-sm);
  color: var(--color-text-primary);
  background: var(--color-surface-sunken);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  outline: none;
}

.filter-select:focus {
  border-color: var(--color-accent);
}

.filter-property,
.sort-property {
  min-width: 120px;
}

.filter-operator {
  min-width: 100px;
}

.sort-direction {
  min-width: 110px;
}

.filter-input {
  flex: 1;
  min-width: 100px;
  padding: var(--space-1-5) var(--space-2);
  font-family: inherit;
  font-size: var(--text-sm);
  color: var(--color-text-primary);
  background: var(--color-surface-sunken);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  outline: none;
}

.filter-input:focus {
  border-color: var(--color-accent);
}

.remove-filter-btn,
.remove-sort-btn {
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
  flex-shrink: 0;
}

.remove-filter-btn:hover,
.remove-sort-btn:hover {
  color: var(--color-error);
  background: var(--color-hover);
}

.add-filter-btn,
.add-sort-btn {
  display: flex;
  gap: var(--space-1);
  align-items: center;
  align-self: flex-start;
  padding: var(--space-1) var(--space-2);
  font-family: inherit;
  font-size: var(--text-xs);
  font-weight: 500;
  color: var(--color-accent);
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: var(--radius-sm);
  transition: background var(--transition-fast);
}

.add-filter-btn:hover,
.add-sort-btn:hover {
  background: var(--color-hover);
}
</style>
