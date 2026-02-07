<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useFilesStore } from '@/stores/files';

const filesStore = useFilesStore();

const loading = ref(true);
const testingConnection = ref(false);
const connectionResult = ref<{ success: boolean; message: string } | null>(null);

onMounted(async () => {
  await loadStorageInfo();
});

async function loadStorageInfo() {
  loading.value = true;
  try {
    await filesStore.fetchStorageInfo();
  } catch (error) {
    console.error('Failed to load storage info:', error);
  } finally {
    loading.value = false;
  }
}

async function handleTestConnection() {
  testingConnection.value = true;
  connectionResult.value = null;
  try {
    connectionResult.value = await filesStore.testConnection();
  } catch (error) {
    connectionResult.value = {
      success: false,
      message: error instanceof Error ? error.message : 'Connection test failed',
    };
  } finally {
    testingConnection.value = false;
  }
}

const formattedSize = computed(() => {
  const size = filesStore.storageInfo?.totalSize ?? 0;
  if (size === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(size) / Math.log(1024));
  return `${(size / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
});

const storageTypeLabel = computed(() => {
  const type = filesStore.storageInfo?.type;
  switch (type) {
    case 'LOCAL':
      return 'Local Disk';
    case 'MINIO':
      return 'MinIO';
    case 'S3':
      return 'Amazon S3';
    default:
      return type ?? 'Unknown';
  }
});
</script>

<template>
  <div class="admin-settings">
    <div class="page-header">
      <h1 class="page-title">System Settings</h1>
      <p class="page-description">Storage configuration and system preferences</p>
    </div>

    <!-- Storage Section -->
    <section class="settings-section">
      <div class="section-header">
        <div class="section-icon">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <rect
              x="2"
              y="3"
              width="16"
              height="5"
              rx="1"
              stroke="currentColor"
              stroke-width="1.5"
            />
            <rect
              x="2"
              y="12"
              width="16"
              height="5"
              rx="1"
              stroke="currentColor"
              stroke-width="1.5"
            />
            <circle cx="5" cy="5.5" r="1" fill="currentColor" />
            <circle cx="5" cy="14.5" r="1" fill="currentColor" />
          </svg>
        </div>
        <div>
          <h2 class="section-title">File Storage</h2>
          <p class="section-description">
            Storage provider is configured via environment variables
          </p>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="stats-row">
        <div v-for="i in 3" :key="i" class="stat-item skeleton">
          <div class="skeleton-value"></div>
          <div class="skeleton-label"></div>
        </div>
      </div>

      <!-- Storage Stats -->
      <div v-else-if="filesStore.storageInfo" class="stats-row">
        <div class="stat-item">
          <span class="stat-value">{{ storageTypeLabel }}</span>
          <span class="stat-label">Storage Type</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">{{ filesStore.storageInfo.totalFiles }}</span>
          <span class="stat-label">Total Files</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">{{ formattedSize }}</span>
          <span class="stat-label">Total Size</span>
        </div>
      </div>

      <!-- Connection Test -->
      <div class="connection-test">
        <button class="test-button" :disabled="testingConnection" @click="handleTestConnection">
          <svg
            v-if="testingConnection"
            class="spinner"
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
          >
            <circle
              cx="8"
              cy="8"
              r="6"
              stroke="currentColor"
              stroke-width="2"
              stroke-dasharray="28"
              stroke-dashoffset="8"
              stroke-linecap="round"
            />
          </svg>
          <svg v-else width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M14 8A6 6 0 1 1 2 8a6 6 0 0 1 12 0Z"
              stroke="currentColor"
              stroke-width="1.5"
            />
            <path
              d="M8 5v3l2 1"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          {{ testingConnection ? 'Testing...' : 'Test Connection' }}
        </button>

        <div
          v-if="connectionResult"
          class="connection-result"
          :class="{ success: connectionResult.success, failure: !connectionResult.success }"
        >
          <svg
            v-if="connectionResult.success"
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
          >
            <path
              d="M3 8L6.5 11.5L13 4.5"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          <svg v-else width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M4 4L12 12M12 4L4 12"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
            />
          </svg>
          <span>{{ connectionResult.message }}</span>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.admin-settings {
  max-width: 800px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: var(--space-8);
}

.page-title {
  font-size: var(--text-3xl);
  font-weight: 700;
  color: var(--color-text-primary);
  margin-bottom: var(--space-2);
}

.page-description {
  font-size: var(--text-base);
  color: var(--color-text-secondary);
}

/* Section */
.settings-section {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  padding: var(--space-6);
}

.section-header {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  margin-bottom: var(--space-6);
}

.section-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: var(--radius-lg);
  background: var(--admin-accent-subtle);
  color: var(--admin-accent);
  flex-shrink: 0;
}

.section-title {
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: var(--space-1);
}

.section-description {
  font-size: var(--text-sm);
  color: var(--color-text-tertiary);
}

/* Stats */
.stats-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-4);
  margin-bottom: var(--space-6);
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  padding: var(--space-4);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
}

.stat-value {
  font-size: var(--text-xl);
  font-weight: 600;
  color: var(--color-text-primary);
}

.stat-label {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* Connection Test */
.connection-test {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  flex-wrap: wrap;
}

.test-button {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--color-text-primary);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition:
    background 0.15s,
    border-color 0.15s;
}

.test-button:hover:not(:disabled) {
  background: var(--color-surface-hover);
  border-color: var(--color-border-hover);
}

.test-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.connection-result {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  font-size: var(--text-sm);
  border-radius: var(--radius-md);
}

.connection-result.success {
  color: var(--color-success);
  background: var(--color-success-bg, rgba(34, 197, 94, 0.1));
}

.connection-result.failure {
  color: var(--color-error);
  background: var(--color-error-bg, rgba(239, 68, 68, 0.1));
}

/* Skeleton */
.stat-item.skeleton {
  animation: pulse 1.5s ease-in-out infinite;
}

.skeleton-value {
  height: 24px;
  width: 60%;
  background: var(--color-border);
  border-radius: var(--radius-sm);
}

.skeleton-label {
  height: 12px;
  width: 80%;
  background: var(--color-border);
  border-radius: var(--radius-sm);
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}
</style>
