<script setup lang="ts">
import type { ElementType } from './canvasTypes';

const props = defineProps<{ activeTool: ElementType | 'select' }>();
const emit = defineEmits<{ 'update:activeTool': [tool: ElementType | 'select'] }>();

const tools: { id: ElementType | 'select'; label: string }[] = [
  { id: 'select', label: 'Select' },
  { id: 'sticky', label: 'Sticky Note' },
  { id: 'rectangle', label: 'Rectangle' },
  { id: 'circle', label: 'Circle' },
  { id: 'arrow', label: 'Arrow' },
  { id: 'text', label: 'Text' },
];
</script>

<template>
  <div class="canvas-toolbar">
    <button
      v-for="tool in tools"
      :key="tool.id"
      class="tool-btn"
      :class="{ active: props.activeTool === tool.id }"
      :title="tool.label"
      @click="emit('update:activeTool', tool.id)"
    >
      <!-- Select -->
      <svg v-if="tool.id === 'select'" width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M4 2L14 9L9 10.5L7 15L4 2Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
      </svg>
      <!-- Sticky -->
      <svg v-else-if="tool.id === 'sticky'" width="18" height="18" viewBox="0 0 18 18" fill="none">
        <rect x="2" y="2" width="14" height="14" rx="2" stroke="currentColor" stroke-width="1.5"/>
        <path d="M11 2V8L14 11H11" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>
        <path d="M5 7H9M5 10H8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      </svg>
      <!-- Rectangle -->
      <svg v-else-if="tool.id === 'rectangle'" width="18" height="18" viewBox="0 0 18 18" fill="none">
        <rect x="2.5" y="4.5" width="13" height="9" rx="1.5" stroke="currentColor" stroke-width="1.5"/>
      </svg>
      <!-- Circle -->
      <svg v-else-if="tool.id === 'circle'" width="18" height="18" viewBox="0 0 18 18" fill="none">
        <circle cx="9" cy="9" r="6.5" stroke="currentColor" stroke-width="1.5"/>
      </svg>
      <!-- Arrow -->
      <svg v-else-if="tool.id === 'arrow'" width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M3 15L15 3M15 3H9M15 3V9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <!-- Text -->
      <svg v-else-if="tool.id === 'text'" width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M3 4H15M9 4V14M6 14H12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      </svg>
    </button>
  </div>
</template>

<style scoped>
.canvas-toolbar {
  position: absolute;
  top: 50%;
  left: var(--space-4);
  z-index: 10;
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  padding: var(--space-2);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  transform: translateY(-50%);
}

.tool-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  padding: 0;
  color: var(--color-text-secondary);
  cursor: pointer;
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
}

.tool-btn:hover {
  color: var(--color-accent);
  background: var(--color-hover);
}

.tool-btn.active {
  color: var(--color-accent);
  background: rgba(107, 143, 113, 0.12);
  border-color: var(--color-accent);
}
</style>
