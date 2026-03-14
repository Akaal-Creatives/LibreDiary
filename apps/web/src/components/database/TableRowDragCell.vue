<script setup lang="ts">
/**
 * TableRowDragCell — renders the drag handle / timer indicator cell
 * within a table row. Displays one of three states:
 *   1. Timer active indicator (pulsing clock icon)
 *   2. Start timer button (play icon, shown on hover)
 *   3. Default drag handle (dot grid, shown on hover)
 */

defineProps<{
  /** Whether a timer is currently running for this row */
  timerActive: boolean;
  /** Whether to show the start-timer button (when a duration property exists and no timer is active globally) */
  showStartTimer: boolean;
}>();

const emit = defineEmits<{
  (e: 'dragstart', event: DragEvent): void;
  (e: 'dragend', event: DragEvent): void;
  (e: 'start-timer'): void;
}>();

function onDragStart(event: DragEvent): void {
  emit('dragstart', event);
}

function onDragEnd(event: DragEvent): void {
  emit('dragend', event);
}

function onStartTimer(): void {
  emit('start-timer');
}
</script>

<template>
  <td class="cell-drag" draggable="true" @dragstart="onDragStart" @dragend="onDragEnd">
    <!-- Timer active indicator -->
    <span v-if="timerActive" class="timer-row-indicator" title="Timer running">
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
        <circle cx="6" cy="6" r="4.5" stroke="currentColor" stroke-width="1.2" />
        <path
          d="M6 3.5V6L7.5 7.5"
          stroke="currentColor"
          stroke-width="1.2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </span>

    <!-- Start timer button (visible on hover) -->
    <button
      v-else-if="showStartTimer"
      class="start-timer-btn"
      title="Start timer"
      @click.stop="onStartTimer"
    >
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
        <path d="M2.5 1.5V8.5L8 5L2.5 1.5Z" fill="currentColor" />
      </svg>
    </button>

    <!-- Default drag handle -->
    <span v-else class="drag-handle">
      <svg width="8" height="12" viewBox="0 0 8 12" fill="none">
        <circle cx="2" cy="2" r="1" fill="currentColor" />
        <circle cx="6" cy="2" r="1" fill="currentColor" />
        <circle cx="2" cy="6" r="1" fill="currentColor" />
        <circle cx="6" cy="6" r="1" fill="currentColor" />
        <circle cx="2" cy="10" r="1" fill="currentColor" />
        <circle cx="6" cy="10" r="1" fill="currentColor" />
      </svg>
    </span>
  </td>
</template>

<style scoped>
.cell-drag {
  width: 24px;
  cursor: grab;
}

.drag-handle {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-tertiary);
  opacity: 0;
  transition: opacity var(--transition-fast);
}

.cell-drag:hover .drag-handle {
  opacity: 1;
}

.timer-row-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-accent);
  animation: timer-pulse 1.6s ease-in-out infinite;
}

@keyframes timer-pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.4;
  }
}

.start-timer-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  padding: 0;
  color: var(--color-text-tertiary);
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: var(--radius-sm);
  opacity: 0;
  transition: all var(--transition-fast);
}

.cell-drag:hover .start-timer-btn {
  opacity: 1;
}

.start-timer-btn:hover {
  color: var(--color-accent);
  background: color-mix(in srgb, var(--color-accent) 10%, transparent);
}
</style>
