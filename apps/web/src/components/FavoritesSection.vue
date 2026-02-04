<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { usePagesStore } from '@/stores';

const router = useRouter();
const pagesStore = usePagesStore();

const isExpanded = ref(true);

onMounted(async () => {
  try {
    await pagesStore.fetchFavorites();
  } catch {
    // Ignore errors
  }
});

function toggleExpanded() {
  isExpanded.value = !isExpanded.value;
}

function navigateToPage(pageId: string) {
  router.push({ name: 'page', params: { pageId } });
}
</script>

<template>
  <div v-if="pagesStore.favorites.length > 0" class="favorites-section">
    <div class="section-header">
      <button class="expand-btn" :class="{ expanded: isExpanded }" @click="toggleExpanded">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path
            d="M4.5 3L7.5 6L4.5 9"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>
      <span class="section-title">Favorites</span>
    </div>

    <div v-if="isExpanded" class="favorites-list">
      <button
        v-for="fav in pagesStore.favorites"
        :key="fav.id"
        class="favorite-item"
        :class="{ active: pagesStore.currentPageId === fav.pageId }"
        @click="navigateToPage(fav.pageId)"
      >
        <span class="favorite-icon">
          <template v-if="fav.page.icon">{{ fav.page.icon }}</template>
          <svg v-else width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
              d="M7 1L8.79 4.64L12.76 5.22L9.88 8.02L10.58 12L7 10.11L3.42 12L4.12 8.02L1.24 5.22L5.21 4.64L7 1Z"
              stroke="currentColor"
              stroke-width="1.25"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </span>
        <span class="favorite-title">{{ fav.page.title }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.favorites-section {
  margin-bottom: var(--space-3);
}

.section-header {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-1) var(--space-2);
}

.expand-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  padding: 0;
  color: var(--color-text-tertiary);
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: var(--radius-xs);
  transition: transform var(--transition-fast);
}

.expand-btn:hover {
  color: var(--color-text-primary);
}

.expand-btn.expanded {
  transform: rotate(90deg);
}

.section-title {
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--color-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.favorites-list {
  display: flex;
  flex-direction: column;
}

.favorite-item {
  display: flex;
  gap: var(--space-2);
  align-items: center;
  width: 100%;
  padding: var(--space-1) var(--space-3);
  padding-left: calc(var(--space-3) + 16px);
  font-family: inherit;
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  text-align: left;
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: var(--radius-sm);
  transition: all var(--transition-fast);
}

.favorite-item:hover {
  color: var(--color-text-primary);
  background: var(--color-hover);
}

.favorite-item.active {
  color: var(--color-accent);
  background: var(--color-accent-subtle);
}

.favorite-icon {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  font-size: 12px;
  color: var(--color-text-tertiary);
}

.favorite-item.active .favorite-icon {
  color: var(--color-accent);
}

.favorite-title {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
