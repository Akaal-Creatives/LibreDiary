<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import type { PageWithChildren } from '@librediary/shared';
import { usePagesStore } from '@/stores';
import { useToast } from '@/composables/useToast';

const props = defineProps<{
  page: PageWithChildren;
  depth?: number;
}>();

const emit = defineEmits<{
  contextmenu: [event: MouseEvent, page: PageWithChildren];
  move: [pageId: string, targetId: string, position: 'above' | 'below' | 'inside'];
}>();

const router = useRouter();
const pagesStore = usePagesStore();
const toast = useToast();

const depth = computed(() => props.depth ?? 0);
const hasChildren = computed(() => props.page.children && props.page.children.length > 0);
const isExpanded = computed(() => pagesStore.expandedPageIds.has(props.page.id));
const isActive = computed(() => pagesStore.currentPageId === props.page.id);
const indentStyle = computed(() => ({ paddingLeft: `${depth.value * 12 + 8}px` }));

// Drag and drop state
const isDragging = ref(false);
const dropPosition = ref<'above' | 'below' | 'inside' | null>(null);

function toggleExpanded(event: MouseEvent) {
  event.stopPropagation();
  pagesStore.toggleExpanded(props.page.id);
}

function navigateToPage() {
  router.push({ name: 'page', params: { pageId: props.page.id } });
}

function handleContextMenu(event: MouseEvent) {
  event.preventDefault();
  emit('contextmenu', event, props.page);
}

// Drag and drop handlers
function handleDragStart(event: DragEvent) {
  isDragging.value = true;
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData(
      'text/plain',
      JSON.stringify({
        pageId: props.page.id,
        parentId: props.page.parentId,
      })
    );
  }
}

function handleDragEnd() {
  isDragging.value = false;
  dropPosition.value = null;
}

function handleDragOver(event: DragEvent) {
  event.preventDefault();
  if (!event.currentTarget) return;

  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
  const y = event.clientY - rect.top;
  const height = rect.height;

  // Determine drop position based on mouse Y position
  if (y < height * 0.25) {
    dropPosition.value = 'above';
  } else if (y > height * 0.75) {
    dropPosition.value = 'below';
  } else if (hasChildren.value || isExpanded.value) {
    // Can drop inside if it has children or is expandable
    dropPosition.value = 'inside';
  } else {
    dropPosition.value = 'below';
  }
}

function handleDragLeave() {
  dropPosition.value = null;
}

async function handleDrop(event: DragEvent) {
  event.preventDefault();
  const data = event.dataTransfer?.getData('text/plain');
  if (!data) {
    dropPosition.value = null;
    return;
  }

  try {
    const { pageId: draggedPageId, parentId: draggedParentId } = JSON.parse(data);

    // Don't drop on itself
    if (draggedPageId === props.page.id) {
      dropPosition.value = null;
      return;
    }

    const currentDropPosition = dropPosition.value || 'below';

    // Only check for circular reference when dropping 'inside'
    // (making the dragged page a child of the target)
    if (currentDropPosition === 'inside') {
      // Find the dragged page in the tree and check if target is its descendant
      const draggedPage = findPageInTree(pagesStore.pageTree, draggedPageId);
      if (draggedPage && isDescendant(draggedPage, props.page.id)) {
        toast.error("Can't move a page into its own children");
        dropPosition.value = null;
        return;
      }
    }
    emit('move', draggedPageId, props.page.id, currentDropPosition);

    // Determine the move parameters
    let newParentId: string | null;
    let position: number | undefined;

    if (currentDropPosition === 'inside') {
      // Move as child of this page
      newParentId = props.page.id;
      position = 0; // First child
    } else {
      // Move as sibling
      newParentId = props.page.parentId;
      position = props.page.position + (currentDropPosition === 'below' ? 1 : 0);
    }

    // Only call movePage if something actually changes
    if (draggedParentId !== newParentId || position !== undefined) {
      await pagesStore.movePage(draggedPageId, {
        parentId: newParentId,
        position,
      });
    }
  } catch (e) {
    console.error('Failed to move page:', e);
    toast.error('Failed to move page');
  }

  dropPosition.value = null;
}

// Find a page in the tree by ID
function findPageInTree(tree: PageWithChildren[], pageId: string): PageWithChildren | null {
  for (const page of tree) {
    if (page.id === pageId) return page;
    if (page.children) {
      const found = findPageInTree(page.children, pageId);
      if (found) return found;
    }
  }
  return null;
}

// Check if a page ID is a descendant of another page
function isDescendant(page: PageWithChildren, targetId: string): boolean {
  if (!page.children) return false;
  for (const child of page.children) {
    if (child.id === targetId) return true;
    if (isDescendant(child, targetId)) return true;
  }
  return false;
}
</script>

<template>
  <div
    class="page-tree-item"
    :class="{
      'drop-above': dropPosition === 'above',
      'drop-below': dropPosition === 'below',
      'drop-inside': dropPosition === 'inside',
    }"
  >
    <button
      class="page-item"
      :class="{ active: isActive, dragging: isDragging }"
      :style="indentStyle"
      draggable="true"
      @click="navigateToPage"
      @contextmenu="handleContextMenu"
      @dragstart="handleDragStart"
      @dragend="handleDragEnd"
      @dragover="handleDragOver"
      @dragleave="handleDragLeave"
      @drop="handleDrop"
    >
      <!-- Drag Handle -->
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
      <!-- Expand/Collapse Button -->
      <button
        v-if="hasChildren"
        class="expand-btn"
        :class="{ expanded: isExpanded }"
        :aria-expanded="isExpanded"
        :aria-label="isExpanded ? `Collapse ${page.title}` : `Expand ${page.title}`"
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
      <span v-else class="expand-placeholder" />

      <!-- Page Icon -->
      <span class="page-icon">
        <template v-if="page.icon">{{ page.icon }}</template>
        <svg v-else width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path
            d="M3 2.5H9.5L13 6V13.5C13 13.7761 12.7761 14 12.5 14H3.5C3.22386 14 3 13.7761 3 13.5V3C3 2.72386 3.22386 2.5 3.5 2.5Z"
            stroke="currentColor"
            stroke-width="1.25"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
          <path
            d="M9.5 2.5V6H13"
            stroke="currentColor"
            stroke-width="1.25"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </span>

      <!-- Page Title -->
      <span class="page-title">{{ page.title }}</span>
    </button>

    <!-- Children (recursive) -->
    <div v-if="hasChildren && isExpanded" class="page-children">
      <PageTreeItem
        v-for="child in page.children"
        :key="child.id"
        :page="child"
        :depth="depth + 1"
        @contextmenu="(e, p) => emit('contextmenu', e, p)"
      />
    </div>
  </div>
</template>

<style scoped>
.page-tree-item {
  width: 100%;
}

.page-item {
  display: flex;
  gap: var(--space-1);
  align-items: center;
  width: 100%;
  padding: var(--space-1) var(--space-2);
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

.page-item:hover {
  color: var(--color-text-primary);
  background: var(--color-hover);
}

.page-item.active {
  color: var(--color-accent);
  background: var(--color-accent-subtle);
}

.expand-btn {
  display: flex;
  flex-shrink: 0;
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
  background: var(--color-hover);
}

.expand-btn.expanded {
  transform: rotate(90deg);
}

.expand-placeholder {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.page-icon {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  font-size: 14px;
  color: var(--color-text-tertiary);
}

.page-item.active .page-icon {
  color: var(--color-accent);
}

.page-title {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.page-children {
  width: 100%;
}

/* Drag Handle */
.drag-handle {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  margin-left: -2px;
  color: var(--color-text-tertiary);
  cursor: grab;
  opacity: 0;
  transition: opacity var(--transition-fast);
}

.page-item:hover .drag-handle {
  opacity: 1;
}

.page-item.dragging .drag-handle {
  cursor: grabbing;
  opacity: 1;
}

/* Drag States */
.page-item.dragging {
  background: var(--color-hover);
  opacity: 0.6;
}

.page-tree-item.drop-above {
  border-top: 2px solid var(--color-accent);
}

.page-tree-item.drop-below {
  border-bottom: 2px solid var(--color-accent);
}

.page-tree-item.drop-inside > .page-item {
  background: var(--color-accent-subtle);
  box-shadow: inset 0 0 0 2px var(--color-accent);
}
</style>
