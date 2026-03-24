<script setup lang="ts">
import type { AnnotationTool, AnnotationToolState } from './types';

const props = defineProps<{
  toolState: AnnotationToolState;
}>();

const emit = defineEmits<{
  'update:toolState': [state: AnnotationToolState];
}>();

const tools: Array<{ id: AnnotationTool; label: string; icon: string }> = [
  { id: 'select', label: 'Select', icon: 'M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z' },
  { id: 'freehand', label: 'Freehand', icon: 'M3 17c3-3 5-8 9-8s4 5 7 5' },
  { id: 'rectangle', label: 'Rectangle', icon: 'M3 3h18v14H3z' },
  { id: 'ellipse', label: 'Ellipse', icon: 'M12 5.5a6.5 4.5 0 1 0 0 9 6.5 4.5 0 0 0 0-9z' },
  { id: 'arrow', label: 'Arrow', icon: 'M5 12h14M13 6l6 6-6 6' },
  { id: 'text', label: 'Text', icon: 'M6 4v16M6 4h12M6 12h8' },
  {
    id: 'pin',
    label: 'Pin comment',
    icon: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 0 1 0-5 2.5 2.5 0 0 1 0 5z',
  },
];

function selectTool(toolId: AnnotationTool) {
  emit('update:toolState', { ...props.toolState, activeTool: toolId });
}

function updateColour(event: Event) {
  const value = (event.target as HTMLInputElement).value;
  emit('update:toolState', { ...props.toolState, strokeColour: value, fillColour: value });
}

function updateStrokeWidth(event: Event) {
  const value = Number((event.target as HTMLInputElement).value);
  emit('update:toolState', { ...props.toolState, strokeWidth: value });
}
</script>

<template>
  <div class="annotation-toolbar" role="toolbar" aria-label="Annotation tools">
    <!-- Tool buttons -->
    <div class="annotation-toolbar__tools">
      <button
        v-for="tool in tools"
        :key="tool.id"
        :data-tool="tool.id"
        class="annotation-toolbar__tool-btn"
        :class="{ 'annotation-toolbar__tool-btn--active': toolState.activeTool === tool.id }"
        :aria-label="tool.label"
        :aria-pressed="String(toolState.activeTool === tool.id)"
        @click="selectTool(tool.id)"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            :d="tool.icon"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </button>
    </div>

    <!-- Divider -->
    <div class="annotation-toolbar__divider" />

    <!-- Colour picker -->
    <div class="annotation-toolbar__control" data-testid="colour-picker">
      <label
        class="annotation-toolbar__colour-swatch"
        :style="{ background: toolState.strokeColour }"
      >
        <input
          type="color"
          :value="toolState.strokeColour"
          class="annotation-toolbar__colour-input"
          aria-label="Annotation colour"
          @input="updateColour"
        />
      </label>
    </div>

    <!-- Stroke width -->
    <div class="annotation-toolbar__control" data-testid="stroke-width">
      <input
        type="range"
        min="1"
        max="10"
        step="1"
        :value="toolState.strokeWidth"
        class="annotation-toolbar__range"
        aria-label="Stroke width"
        @input="updateStrokeWidth"
      />
    </div>
  </div>
</template>

<style scoped>
.annotation-toolbar {
  display: flex;
  gap: var(--space-1, 4px);
  align-items: center;
  padding: var(--space-1, 4px) var(--space-2, 8px);
  background: var(--color-surface, #ffffff);
  border: 1px solid var(--color-border, #e2e8e2);
  border-radius: var(--radius-md, 6px);
  box-shadow:
    0 2px 8px rgba(0, 0, 0, 0.08),
    0 0 0 1px rgba(0, 0, 0, 0.04);
  user-select: none;
}

.annotation-toolbar__tools {
  display: flex;
  gap: 2px;
}

.annotation-toolbar__tool-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  color: var(--color-text-secondary, #5c635c);
  cursor: pointer;
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--radius-sm, 4px);
  transition:
    background var(--transition-fast, 150ms),
    color var(--transition-fast, 150ms),
    border-color var(--transition-fast, 150ms);
}

.annotation-toolbar__tool-btn:hover {
  color: var(--color-text-primary, #2c2f2c);
  background: var(--color-hover, rgba(107, 143, 113, 0.08));
}

.annotation-toolbar__tool-btn--active {
  color: var(--color-accent, #6b8f71);
  background: var(--color-accent-subtle, rgba(107, 143, 113, 0.1));
  border-color: var(--color-accent-muted, rgba(107, 143, 113, 0.3));
}

.annotation-toolbar__tool-btn:focus-visible {
  outline: 2px solid var(--color-focus-ring, rgba(107, 143, 113, 0.25));
  outline-offset: 1px;
}

.annotation-toolbar__divider {
  width: 1px;
  height: 20px;
  margin: 0 var(--space-1, 4px);
  background: var(--color-border, #e2e8e2);
}

.annotation-toolbar__control {
  display: flex;
  align-items: center;
}

.annotation-toolbar__colour-swatch {
  display: block;
  width: 24px;
  height: 24px;
  cursor: pointer;
  border: 2px solid var(--color-border, #e2e8e2);
  border-radius: var(--radius-sm, 4px);
  overflow: hidden;
}

.annotation-toolbar__colour-input {
  width: 0;
  height: 0;
  padding: 0;
  border: 0;
  opacity: 0;
}

.annotation-toolbar__range {
  width: 60px;
  height: 4px;
  cursor: pointer;
  appearance: none;
  background: var(--color-border, #e2e8e2);
  border-radius: 2px;
}

.annotation-toolbar__range::-webkit-slider-thumb {
  width: 14px;
  height: 14px;
  cursor: pointer;
  appearance: none;
  background: var(--color-accent, #6b8f71);
  border: 2px solid var(--color-surface, #ffffff);
  border-radius: 50%;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
}
</style>
