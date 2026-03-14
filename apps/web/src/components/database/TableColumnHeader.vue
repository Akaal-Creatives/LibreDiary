<script setup lang="ts">
import { ref } from 'vue';
import ColumnHeaderMenu from './ColumnHeaderMenu.vue';
import PropertyConfigPanel from './PropertyConfigPanel.vue';
import type { DatabaseProperty } from '@librediary/shared';

defineProps<{
  property: DatabaseProperty;
  width: number;
  isDragOver: boolean;
  isDragging: boolean;
}>();

const emit = defineEmits<{
  'resize-start': [event: MouseEvent];
  'resize-dblclick': [event: MouseEvent];
  'col-dragstart': [event: DragEvent];
  'col-dragover': [event: DragEvent];
  'col-dragleave': [event: DragEvent];
  'col-drop': [event: DragEvent];
  'col-dragend': [event: DragEvent];
}>();

// Column menu and configure panel state (scoped to this single column)
const columnMenuOpen = ref(false);
const configureOpen = ref(false);

function toggleColumnMenu() {
  columnMenuOpen.value = !columnMenuOpen.value;
}

function closeColumnMenu() {
  columnMenuOpen.value = false;
}

function openConfigure() {
  columnMenuOpen.value = false;
  configureOpen.value = true;
}

function closeConfigure() {
  configureOpen.value = false;
}

function onResizeStart(event: MouseEvent) {
  emit('resize-start', event);
}

function onResizeDblClick(event: MouseEvent) {
  emit('resize-dblclick', event);
}
</script>

<template>
  <th
    class="col-header"
    :class="{
      'drag-over': isDragOver,
      dragging: isDragging,
    }"
    :style="{ width: width + 'px' }"
    draggable="true"
    @dragstart="emit('col-dragstart', $event)"
    @dragover="emit('col-dragover', $event)"
    @dragleave="emit('col-dragleave', $event)"
    @drop="emit('col-drop', $event)"
    @dragend="emit('col-dragend', $event)"
  >
    <div class="col-header-content">
      <span class="col-name">{{ property.name }}</span>
      <button class="col-menu-btn" @click.stop="toggleColumnMenu">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path
            d="M3 5L6 8L9 5"
            stroke="currentColor"
            stroke-width="1.2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>
    </div>
    <div class="col-resize-handle" @mousedown="onResizeStart" @dblclick="onResizeDblClick"></div>
    <ColumnHeaderMenu
      v-if="columnMenuOpen"
      :property="property"
      @close="closeColumnMenu"
      @configure="openConfigure"
    />
    <PropertyConfigPanel v-if="configureOpen" :property="property" @close="closeConfigure" />
  </th>
</template>

<style scoped>
.col-header {
  min-width: 140px;
  position: relative;
  cursor: grab;
  transition: background var(--transition-fast);
}

.col-header:hover {
  background: var(--color-hover);
}

.col-header.drag-over {
  background: var(--color-accent-subtle);
  border-left: 2px solid var(--color-accent);
}

.col-header.dragging {
  opacity: 0.5;
}

/* Column Resize Handle */
.col-resize-handle {
  position: absolute;
  top: 0;
  right: -2px;
  z-index: 1;
  width: 5px;
  height: 100%;
  cursor: col-resize;
  background: transparent;
  transition: background var(--transition-fast);
}

.col-resize-handle:hover {
  background: var(--color-accent);
}

.col-header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-1);
}

.col-name {
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Touch target: 36px minimum clickable area with padding (WCAG 2.5.5) */
.col-menu-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 36px;
  min-height: 36px;
  padding: 9px;
  margin: -9px;
  color: var(--color-text-tertiary);
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: var(--radius-sm);
  opacity: 0;
  transition: all var(--transition-fast);
}

.col-header:hover .col-menu-btn {
  opacity: 1;
}

.col-menu-btn:hover {
  color: var(--color-text-primary);
  background: var(--color-hover);
}
</style>
