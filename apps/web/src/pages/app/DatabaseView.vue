<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useDatabasesStore } from '@/stores';
import DatabaseHeader from '@/components/database/DatabaseHeader.vue';
import TableView from '@/components/database/TableView.vue';

const databasesStore = useDatabasesStore();

const props = defineProps<{
  databaseId: string;
}>();

const loading = ref(true);
const error = ref<string | null>(null);

onMounted(() => {
  loadDatabase();
});

watch(
  () => props.databaseId,
  () => {
    loadDatabase();
  }
);

async function loadDatabase() {
  loading.value = true;
  error.value = null;
  try {
    await databasesStore.fetchDatabase(props.databaseId);
  } catch (e) {
    error.value = 'Failed to load database';
    console.error(e);
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="database-view">
    <!-- Loading State -->
    <div v-if="loading" class="database-loading">
      <div class="loading-spinner"></div>
      <span class="loading-text">Loading...</span>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="database-error">
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none" class="error-icon">
        <circle cx="24" cy="24" r="20" stroke="currentColor" stroke-width="2" />
        <path d="M24 14V26" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
        <circle cx="24" cy="32" r="2" fill="currentColor" />
      </svg>
      <h2 class="error-title">{{ error }}</h2>
      <button class="error-retry" @click="loadDatabase">Try again</button>
    </div>

    <!-- Database Content -->
    <div v-else-if="databasesStore.currentDatabase" class="database-content">
      <DatabaseHeader />
      <TableView v-if="databasesStore.activeView?.type === 'TABLE'" />
      <div v-else class="view-placeholder">
        <span class="placeholder-text">
          {{ databasesStore.activeView?.type ?? 'Unknown' }} view is not yet supported.
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.database-view {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.database-loading {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  align-items: center;
  justify-content: center;
  padding: var(--space-20);
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--color-border);
  border-top-color: var(--color-accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.loading-text {
  font-size: var(--text-sm);
  color: var(--color-text-tertiary);
}

.database-error {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  align-items: center;
  justify-content: center;
  padding: var(--space-20);
  text-align: center;
}

.error-icon {
  color: var(--color-error);
  opacity: 0.5;
}

.error-title {
  margin: 0;
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--color-text-primary);
}

.error-retry {
  padding: var(--space-2) var(--space-4);
  font-family: inherit;
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--color-text-inverse);
  cursor: pointer;
  background: var(--color-accent);
  border: none;
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
}

.error-retry:hover {
  background: var(--color-accent-hover);
}

.database-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.view-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-20);
}

.placeholder-text {
  font-size: var(--text-sm);
  color: var(--color-text-tertiary);
}
</style>
