<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { usePagesStore } from '@/stores';
import type { Page } from '@librediary/shared';

const pagesStore = usePagesStore();

const restoring = ref<Set<string>>(new Set());
const deleting = ref<Set<string>>(new Set());
const error = ref<string | null>(null);

onMounted(async () => {
  try {
    await pagesStore.fetchTrashedPages();
  } catch (e) {
    error.value = 'Failed to load trashed pages';
    console.error(e);
  }
});

async function handleRestore(page: Page) {
  restoring.value.add(page.id);
  error.value = null;
  try {
    await pagesStore.restorePage(page.id);
  } catch (e) {
    error.value = 'Failed to restore page';
    console.error(e);
  } finally {
    restoring.value.delete(page.id);
  }
}

async function handleDelete(page: Page) {
  if (
    !confirm(
      `Are you sure you want to permanently delete "${page.title}"? This action cannot be undone.`
    )
  ) {
    return;
  }

  deleting.value.add(page.id);
  error.value = null;
  try {
    await pagesStore.permanentlyDeletePage(page.id);
  } catch (e) {
    error.value = 'Failed to delete page';
    console.error(e);
  } finally {
    deleting.value.delete(page.id);
  }
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
</script>

<template>
  <div class="trash-page">
    <header class="page-header">
      <h1 class="page-title">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" class="title-icon">
          <path d="M4 7H20" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          <path
            d="M7 7V5C7 4.44772 7.44772 4 8 4H16C16.5523 4 17 4.44772 17 5V7"
            stroke="currentColor"
            stroke-width="2"
          />
          <path
            d="M5 7L6 19C6.05 19.55 6.51 20 7.06 20H16.94C17.49 20 17.95 19.55 18 19L19 7"
            stroke="currentColor"
            stroke-width="2"
          />
          <path d="M10 11V16" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
          <path d="M14 11V16" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
        </svg>
        Trash
      </h1>
      <p class="page-description">Items in trash will be permanently deleted after 30 days.</p>
    </header>

    <!-- Error Message -->
    <div v-if="error" class="error-message">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.5" />
        <path d="M8 5V8.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
        <circle cx="8" cy="11" r="0.75" fill="currentColor" />
      </svg>
      {{ error }}
    </div>

    <!-- Loading State -->
    <div v-if="pagesStore.trashLoading" class="loading-state">
      <div class="spinner" />
      <span>Loading trashed pages...</span>
    </div>

    <!-- Empty State -->
    <div v-else-if="pagesStore.trashedPages.length === 0" class="empty-state">
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none" class="empty-icon">
        <path d="M8 14H40" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
        <path
          d="M14 14V10C14 8.89543 14.8954 8 16 8H32C33.1046 8 34 8.89543 34 10V14"
          stroke="currentColor"
          stroke-width="2"
        />
        <path
          d="M10 14L12 38C12.1 39.1 13.02 40 14.12 40H33.88C34.98 40 35.9 39.1 36 38L38 14"
          stroke="currentColor"
          stroke-width="2"
        />
        <path d="M20 22V32" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
        <path d="M28 22V32" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
      </svg>
      <h2 class="empty-title">Trash is empty</h2>
      <p class="empty-text">Items you delete will appear here.</p>
    </div>

    <!-- Trash List -->
    <div v-else class="trash-list">
      <div v-for="page in pagesStore.trashedPages" :key="page.id" class="trash-item">
        <div class="item-icon">
          <template v-if="page.icon">{{ page.icon }}</template>
          <svg v-else width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path
              d="M4 3H12L16 7V17C16 17.5523 15.5523 18 15 18H5C4.44772 18 4 17.5523 4 17V4C4 3.44772 4.44772 3 5 3Z"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <path
              d="M12 3V7H16"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </div>

        <div class="item-info">
          <span class="item-title">{{ page.title }}</span>
          <span v-if="page.trashedAt" class="item-date">
            Deleted {{ formatDate(page.trashedAt) }}
          </span>
        </div>

        <div class="item-actions">
          <button
            class="action-btn restore-btn"
            :disabled="restoring.has(page.id)"
            @click="handleRestore(page)"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M2 8C2 11.3137 4.68629 14 8 14C11.3137 14 14 11.3137 14 8C14 4.68629 11.3137 2 8 2C5.79086 2 3.87539 3.25361 2.87539 5.07179"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
              />
              <path
                d="M2 2.5V5.5H5"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
            {{ restoring.has(page.id) ? 'Restoring...' : 'Restore' }}
          </button>

          <button
            class="action-btn delete-btn"
            :disabled="deleting.has(page.id)"
            @click="handleDelete(page)"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M4 4L12 12"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
              />
              <path
                d="M12 4L4 12"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
              />
            </svg>
            {{ deleting.has(page.id) ? 'Deleting...' : 'Delete' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.trash-page {
  max-width: 800px;
  margin: 0 auto;
  padding: var(--space-8);
}

.page-header {
  margin-bottom: var(--space-8);
}

.page-title {
  display: flex;
  gap: var(--space-3);
  align-items: center;
  margin: 0 0 var(--space-2);
  font-size: var(--text-2xl);
  font-weight: 600;
  color: var(--color-text-primary);
}

.title-icon {
  color: var(--color-text-tertiary);
}

.page-description {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

.error-message {
  display: flex;
  gap: var(--space-2);
  align-items: center;
  padding: var(--space-3) var(--space-4);
  margin-bottom: var(--space-4);
  font-size: var(--text-sm);
  color: var(--color-error);
  background: var(--color-error-subtle);
  border-radius: var(--radius-md);
}

.loading-state {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  align-items: center;
  padding: var(--space-12);
  color: var(--color-text-tertiary);
}

.spinner {
  width: 24px;
  height: 24px;
  border: 2px solid var(--color-border);
  border-top-color: var(--color-accent);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.empty-state {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  align-items: center;
  padding: var(--space-16);
  text-align: center;
}

.empty-icon {
  color: var(--color-text-tertiary);
  opacity: 0.5;
}

.empty-title {
  margin: 0;
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--color-text-primary);
}

.empty-text {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--color-text-tertiary);
}

.trash-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.trash-item {
  display: flex;
  gap: var(--space-3);
  align-items: center;
  padding: var(--space-3) var(--space-4);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  transition: all var(--transition-fast);
}

.trash-item:hover {
  background: var(--color-surface-raised);
  border-color: var(--color-border-strong);
}

.item-icon {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  font-size: 18px;
  color: var(--color-text-tertiary);
  background: var(--color-surface-sunken);
  border-radius: var(--radius-md);
}

.item-info {
  flex: 1;
  min-width: 0;
}

.item-title {
  display: block;
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--color-text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-date {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

.item-actions {
  display: flex;
  gap: var(--space-2);
  flex-shrink: 0;
}

.action-btn {
  display: flex;
  gap: var(--space-1);
  align-items: center;
  padding: var(--space-2) var(--space-3);
  font-family: inherit;
  font-size: var(--text-sm);
  cursor: pointer;
  border: none;
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
}

.action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.restore-btn {
  color: var(--color-text-primary);
  background: var(--color-surface-sunken);
}

.restore-btn:hover:not(:disabled) {
  background: var(--color-hover);
}

.delete-btn {
  color: var(--color-error);
  background: transparent;
}

.delete-btn:hover:not(:disabled) {
  background: var(--color-error-subtle);
}
</style>
