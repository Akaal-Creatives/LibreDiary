<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { usePagesStore } from '@/stores';
import { useToast } from '@/composables/useToast';

const router = useRouter();
const pagesStore = usePagesStore();
const toast = useToast();

const isExpanded = ref(true);
const draggingId = ref<string | null>(null);
const dragOverId = ref<string | null>(null);

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

// Drag and Drop handlers
function handleDragStart(event: DragEvent, favId: string) {
  draggingId.value = favId;
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', favId);
  }
}

function handleDragEnd() {
  draggingId.value = null;
  dragOverId.value = null;
}

function handleDragOver(event: DragEvent, favId: string) {
  event.preventDefault();
  if (draggingId.value && draggingId.value !== favId) {
    dragOverId.value = favId;
  }
}

function handleDragLeave() {
  dragOverId.value = null;
}

async function handleDrop(event: DragEvent, targetFavId: string) {
  event.preventDefault();
  const draggedFavId = event.dataTransfer?.getData('text/plain');

  if (!draggedFavId || draggedFavId === targetFavId) {
    dragOverId.value = null;
    return;
  }

  // Find the indices
  const favorites = pagesStore.favorites;
  const draggedIndex = favorites.findIndex((f) => f.id === draggedFavId);
  const targetIndex = favorites.findIndex((f) => f.id === targetFavId);

  if (draggedIndex === -1 || targetIndex === -1) {
    dragOverId.value = null;
    return;
  }

  // Create new order
  const newOrder = [...favorites];
  const [draggedItem] = newOrder.splice(draggedIndex, 1);
  if (draggedItem) {
    newOrder.splice(targetIndex, 0, draggedItem);
  }

  // Get the ordered IDs
  const orderedIds = newOrder.map((f) => f.id);

  try {
    await pagesStore.reorderFavorites(orderedIds);
  } catch (e) {
    console.error('Failed to reorder favorites:', e);
    toast.error('Failed to reorder favorites');
  }

  dragOverId.value = null;
}
</script>

<template>
  <div v-if="pagesStore.favorites.length > 0" class="favorites-section">
    <div class="section-header">
      <button
        class="expand-btn"
        :class="{ expanded: isExpanded }"
        :aria-expanded="isExpanded"
        :aria-label="isExpanded ? 'Collapse favorites' : 'Expand favorites'"
        @click="toggleExpanded"
      >
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

    <div v-if="isExpanded" class="favorites-list" role="list">
      <button
        v-for="fav in pagesStore.favorites"
        :key="fav.id"
        class="favorite-item"
        :class="{
          active: pagesStore.currentPageId === fav.pageId,
          dragging: draggingId === fav.id,
          'drag-over': dragOverId === fav.id,
        }"
        role="listitem"
        draggable="true"
        @click="navigateToPage(fav.pageId)"
        @dragstart="handleDragStart($event, fav.id)"
        @dragend="handleDragEnd"
        @dragover="handleDragOver($event, fav.id)"
        @dragleave="handleDragLeave"
        @drop="handleDrop($event, fav.id)"
      >
        <span class="drag-handle">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <circle cx="3" cy="2" r="1" fill="currentColor" />
            <circle cx="7" cy="2" r="1" fill="currentColor" />
            <circle cx="3" cy="5" r="1" fill="currentColor" />
            <circle cx="7" cy="5" r="1" fill="currentColor" />
            <circle cx="3" cy="8" r="1" fill="currentColor" />
            <circle cx="7" cy="8" r="1" fill="currentColor" />
          </svg>
        </span>
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

/* Drag Handle */
.drag-handle {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  color: var(--color-text-tertiary);
  cursor: grab;
  opacity: 0;
  transition: opacity var(--transition-fast);
}

.favorite-item:hover .drag-handle {
  opacity: 1;
}

.favorite-item.dragging .drag-handle {
  cursor: grabbing;
  opacity: 1;
}

/* Drag States */
.favorite-item.dragging {
  background: var(--color-hover);
  opacity: 0.6;
}

.favorite-item.drag-over {
  background: var(--color-accent-subtle);
  border-top: 2px solid var(--color-accent);
}
</style>
