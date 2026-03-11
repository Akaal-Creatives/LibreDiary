<script setup lang="ts">
import { ref } from 'vue';
import { useTimeReport } from '@/composables/useTimeReport';

const {
  dateFrom,
  dateTo,
  selectedPropertyId,
  durationProperties,
  activeProperty,
  summary,
  formatMs,
  exportCsv,
  clearFilters,
} = useTimeReport();

const isOpen = ref(false);

function toggle() {
  isOpen.value = !isOpen.value;
}

const hasDateFilter = ref(false);

function onDateChange() {
  hasDateFilter.value = !!(dateFrom.value || dateTo.value);
}

function handleClearFilters() {
  clearFilters();
  hasDateFilter.value = false;
}
</script>

<template>
  <div class="time-report" :class="{ 'time-report--open': isOpen }">
    <!-- Collapsed header -->
    <button
      class="time-report__header"
      :aria-expanded="isOpen"
      aria-controls="time-report-body"
      @click="toggle"
    >
      <span class="time-report__header-left">
        <svg
          class="time-report__clock-icon"
          width="14"
          height="14"
          viewBox="0 0 14 14"
          fill="none"
          aria-hidden="true"
        >
          <circle cx="7" cy="7" r="5.5" stroke="currentColor" stroke-width="1.2" />
          <path
            d="M7 4V7L9 9"
            stroke="currentColor"
            stroke-width="1.2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
        <span class="time-report__title">Time Report</span>
        <span v-if="!isOpen && summary.rowCount > 0" class="time-report__badge">
          {{ formatMs(summary.totalMs) }}
        </span>
      </span>
      <svg
        class="time-report__chevron"
        width="12"
        height="12"
        viewBox="0 0 12 12"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M3 5L6 8L9 5"
          stroke="currentColor"
          stroke-width="1.2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </button>

    <!-- Expandable body -->
    <div v-if="isOpen" id="time-report-body" class="time-report__body" role="region">
      <!-- Controls row -->
      <div class="time-report__controls">
        <!-- Property selector (only if multiple DURATION properties) -->
        <select
          v-if="durationProperties.length > 1"
          v-model="selectedPropertyId"
          class="time-report__select"
          aria-label="Select duration property"
        >
          <option v-for="prop in durationProperties" :key="prop.id" :value="prop.id">
            {{ prop.name }}
          </option>
        </select>

        <!-- Date filters -->
        <div class="time-report__dates">
          <input
            v-model="dateFrom"
            type="date"
            class="time-report__date-input"
            aria-label="From date"
            @change="onDateChange"
          />
          <span class="time-report__date-sep" aria-hidden="true">–</span>
          <input
            v-model="dateTo"
            type="date"
            class="time-report__date-input"
            aria-label="To date"
            @change="onDateChange"
          />
          <button
            v-if="hasDateFilter"
            class="time-report__clear-btn"
            aria-label="Clear date filters"
            @click="handleClearFilters"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path
                d="M3 3L9 9M9 3L3 9"
                stroke="currentColor"
                stroke-width="1.2"
                stroke-linecap="round"
              />
            </svg>
          </button>
        </div>
      </div>

      <!-- No data -->
      <div v-if="!activeProperty" class="time-report__empty">
        No duration properties found. Add a Duration property to see time reports.
      </div>

      <template v-else>
        <!-- Summary cards -->
        <div class="time-report__cards">
          <div class="time-report__card">
            <span class="time-report__card-label">Total</span>
            <span class="time-report__card-value">{{ formatMs(summary.totalMs) }}</span>
          </div>
          <div class="time-report__card">
            <span class="time-report__card-label">Average</span>
            <span class="time-report__card-value">{{ formatMs(summary.averageMs) }}</span>
          </div>
          <div class="time-report__card">
            <span class="time-report__card-label">Entries</span>
            <span class="time-report__card-value time-report__card-value--num">
              {{ summary.rowCount }}
            </span>
          </div>
        </div>

        <!-- Per-user breakdown -->
        <div v-if="summary.perUser.length > 0" class="time-report__users">
          <div class="time-report__users-header">
            <span>User</span>
            <span>Time</span>
            <span>Entries</span>
          </div>
          <div v-for="entry in summary.perUser" :key="entry.userId" class="time-report__user-row">
            <span class="time-report__user-name">{{ entry.userName }}</span>
            <span class="time-report__user-time">{{ formatMs(entry.totalMs) }}</span>
            <span class="time-report__user-count">{{ entry.rowCount }}</span>
          </div>
        </div>

        <div v-else class="time-report__empty">No tracked time in the current view.</div>

        <!-- Export -->
        <button
          class="time-report__export-btn"
          :disabled="summary.rowCount === 0"
          @click="exportCsv"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <path
              d="M6 2V8M6 8L3.5 5.5M6 8L8.5 5.5"
              stroke="currentColor"
              stroke-width="1.2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <path d="M2 10H10" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" />
          </svg>
          Export CSV
        </button>
      </template>
    </div>
  </div>
</template>

<style scoped>
.time-report {
  border-top: 1px solid var(--color-border-subtle);
}

/* --- Header toggle --- */
.time-report__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: var(--space-2) var(--space-4);
  font-family: inherit;
  background: transparent;
  border: none;
  cursor: pointer;
  transition: background var(--transition-fast);
}

.time-report__header:hover {
  background: var(--color-hover);
}

.time-report__header:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: -2px;
}

.time-report__header-left {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.time-report__clock-icon {
  color: var(--color-text-tertiary);
  flex-shrink: 0;
}

.time-report__title {
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.time-report__badge {
  padding: 0 var(--space-2);
  font-size: var(--text-xs);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: var(--color-accent);
  background: color-mix(in srgb, var(--color-accent) 10%, transparent);
  border-radius: var(--radius-sm);
  line-height: 1.6;
}

.time-report__chevron {
  color: var(--color-text-tertiary);
  transition: transform var(--transition-fast);
  flex-shrink: 0;
}

.time-report--open .time-report__chevron {
  transform: rotate(180deg);
}

/* --- Body --- */
.time-report__body {
  padding: var(--space-2) var(--space-4) var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  animation: report-in 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes report-in {
  from {
    opacity: 0;
    transform: translateY(-4px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* --- Controls --- */
.time-report__controls {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  flex-wrap: wrap;
}

.time-report__select {
  padding: var(--space-1) var(--space-2);
  font-family: inherit;
  font-size: var(--text-xs);
  color: var(--color-text-primary);
  background: var(--color-surface-sunken);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  outline: none;
  cursor: pointer;
}

.time-report__select:focus {
  border-color: var(--color-accent);
}

.time-report__dates {
  display: flex;
  align-items: center;
  gap: var(--space-1);
}

.time-report__date-input {
  padding: var(--space-1) var(--space-2);
  font-family: inherit;
  font-size: var(--text-xs);
  color: var(--color-text-primary);
  background: var(--color-surface-sunken);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  outline: none;
  max-width: 130px;
}

.time-report__date-input:focus {
  border-color: var(--color-accent);
}

.time-report__date-sep {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

.time-report__clear-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  padding: 0;
  color: var(--color-text-tertiary);
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: var(--radius-sm);
  transition: all var(--transition-fast);
}

.time-report__clear-btn:hover {
  color: var(--color-error);
  background: color-mix(in srgb, var(--color-error) 10%, transparent);
}

/* --- Summary cards --- */
.time-report__cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-2);
}

.time-report__card {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: var(--space-2) var(--space-3);
  background: var(--color-surface-sunken);
  border-radius: var(--radius-md);
}

.time-report__card-label {
  font-size: 10px;
  font-weight: 500;
  color: var(--color-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.time-report__card-value {
  font-size: var(--text-base);
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--color-text-primary);
  letter-spacing: -0.01em;
}

.time-report__card-value--num {
  color: var(--color-accent);
}

/* --- Per-user table --- */
.time-report__users {
  display: flex;
  flex-direction: column;
}

.time-report__users-header {
  display: grid;
  grid-template-columns: 1fr auto auto;
  gap: var(--space-4);
  padding: var(--space-1) var(--space-2);
  font-size: 10px;
  font-weight: 600;
  color: var(--color-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: 1px solid var(--color-border-subtle);
}

.time-report__user-row {
  display: grid;
  grid-template-columns: 1fr auto auto;
  gap: var(--space-4);
  padding: var(--space-1-5) var(--space-2);
  font-size: var(--text-sm);
  border-bottom: 1px solid var(--color-border-subtle);
  transition: background var(--transition-fast);
}

.time-report__user-row:last-child {
  border-bottom: none;
}

.time-report__user-row:hover {
  background: var(--color-hover);
}

.time-report__user-name {
  color: var(--color-text-primary);
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.time-report__user-time {
  font-variant-numeric: tabular-nums;
  color: var(--color-text-secondary);
  font-weight: 500;
  white-space: nowrap;
}

.time-report__user-count {
  font-variant-numeric: tabular-nums;
  color: var(--color-text-tertiary);
  text-align: right;
  min-width: 24px;
}

/* --- Empty state --- */
.time-report__empty {
  padding: var(--space-3);
  font-size: var(--text-sm);
  color: var(--color-text-tertiary);
  text-align: center;
}

/* --- Export button --- */
.time-report__export-btn {
  display: flex;
  gap: var(--space-1-5);
  align-items: center;
  align-self: flex-start;
  padding: var(--space-1-5) var(--space-3);
  font-family: inherit;
  font-size: var(--text-xs);
  font-weight: 500;
  color: var(--color-accent);
  cursor: pointer;
  background: color-mix(in srgb, var(--color-accent) 8%, transparent);
  border: none;
  border-radius: var(--radius-sm);
  transition: all var(--transition-fast);
}

.time-report__export-btn:hover {
  background: color-mix(in srgb, var(--color-accent) 16%, transparent);
}

.time-report__export-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.time-report__export-btn:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 1px;
}

/* --- Responsive --- */
@media (max-width: 560px) {
  .time-report__cards {
    grid-template-columns: 1fr;
  }

  .time-report__controls {
    flex-direction: column;
    align-items: stretch;
  }

  .time-report__dates {
    flex-wrap: wrap;
  }
}
</style>
