<script setup lang="ts">
import { computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { usePagesStore } from '@/stores';

const router = useRouter();
const pagesStore = usePagesStore();

const currentPage = computed(() => pagesStore.currentPage);
const ancestors = computed(() => pagesStore.ancestors);

// Fetch ancestors when current page changes
watch(
  () => pagesStore.currentPageId,
  async (pageId) => {
    if (pageId) {
      try {
        await pagesStore.fetchAncestors(pageId);
      } catch {
        // Ignore errors - page might not exist
      }
    }
  },
  { immediate: true }
);

function navigateToPage(pageId: string) {
  router.push({ name: 'page', params: { pageId } });
}

function navigateToHome() {
  router.push({ name: 'dashboard' });
}
</script>

<template>
  <nav class="breadcrumbs" aria-label="Breadcrumb">
    <ol class="breadcrumb-list">
      <!-- Home -->
      <li class="breadcrumb-item">
        <button class="breadcrumb-link" @click="navigateToHome">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
              d="M1.75 7.5L7 2.25L12.25 7.5"
              stroke="currentColor"
              stroke-width="1.25"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <path
              d="M3.5 6.25V11.25C3.5 11.5261 3.72386 11.75 4 11.75H5.75V8.75H8.25V11.75H10C10.2761 11.75 10.5 11.5261 10.5 11.25V6.25"
              stroke="currentColor"
              stroke-width="1.25"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </button>
      </li>

      <!-- Ancestors -->
      <li v-for="ancestor in ancestors" :key="ancestor.id" class="breadcrumb-item">
        <span class="breadcrumb-separator">/</span>
        <button class="breadcrumb-link" @click="navigateToPage(ancestor.id)">
          <span v-if="ancestor.icon" class="breadcrumb-icon">{{ ancestor.icon }}</span>
          <span class="breadcrumb-text">{{ ancestor.title }}</span>
        </button>
      </li>

      <!-- Current Page -->
      <li v-if="currentPage" class="breadcrumb-item current">
        <span class="breadcrumb-separator">/</span>
        <span class="breadcrumb-current">
          <span v-if="currentPage.icon" class="breadcrumb-icon">{{ currentPage.icon }}</span>
          <span class="breadcrumb-text">{{ currentPage.title }}</span>
        </span>
      </li>
    </ol>
  </nav>
</template>

<style scoped>
.breadcrumbs {
  display: flex;
  align-items: center;
  min-height: 28px;
}

.breadcrumb-list {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1);
  align-items: center;
  padding: 0;
  margin: 0;
  list-style: none;
}

.breadcrumb-item {
  display: flex;
  align-items: center;
  gap: var(--space-1);
}

.breadcrumb-separator {
  color: var(--color-text-tertiary);
  font-size: var(--text-sm);
}

.breadcrumb-link {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-1) var(--space-2);
  font-family: inherit;
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: var(--radius-sm);
  transition: all var(--transition-fast);
}

.breadcrumb-link:hover {
  color: var(--color-text-primary);
  background: var(--color-hover);
}

.breadcrumb-current {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-1) var(--space-2);
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--color-text-primary);
}

.breadcrumb-icon {
  font-size: 12px;
}

.breadcrumb-text {
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.breadcrumb-item.current .breadcrumb-text {
  max-width: 250px;
}
</style>
