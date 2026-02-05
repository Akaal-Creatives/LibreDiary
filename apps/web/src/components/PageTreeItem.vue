<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import type { PageWithChildren } from '@librediary/shared';
import { usePagesStore } from '@/stores';

const props = defineProps<{
  page: PageWithChildren;
  depth?: number;
}>();

const emit = defineEmits<{
  contextmenu: [event: MouseEvent, page: PageWithChildren];
}>();

const router = useRouter();
const pagesStore = usePagesStore();

const depth = computed(() => props.depth ?? 0);
const hasChildren = computed(() => props.page.children && props.page.children.length > 0);
const isExpanded = computed(() => pagesStore.expandedPageIds.has(props.page.id));
const isActive = computed(() => pagesStore.currentPageId === props.page.id);
const indentStyle = computed(() => ({ paddingLeft: `${depth.value * 12 + 8}px` }));

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
</script>

<template>
  <div class="page-tree-item">
    <button
      class="page-item"
      :class="{ active: isActive }"
      :style="indentStyle"
      @click="navigateToPage"
      @contextmenu="handleContextMenu"
    >
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
</style>
