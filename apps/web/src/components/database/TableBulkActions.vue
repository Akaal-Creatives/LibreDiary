<script setup lang="ts">
/**
 * TableBulkActions — displays a bar with bulk action buttons
 * when one or more table rows are selected.
 */

defineProps<{
  selectedCount: number;
}>();

const emit = defineEmits<{
  delete: [];
}>();
</script>

<template>
  <div v-if="selectedCount > 0" class="bulk-actions">
    <span class="bulk-count">{{ selectedCount }} selected</span>
    <button class="bulk-btn delete-btn" @click="emit('delete')">
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
</template>

<style scoped>
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
</style>
