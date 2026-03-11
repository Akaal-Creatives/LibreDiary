<script setup lang="ts">
import { computed } from 'vue';
import { useTimer } from '@/composables/useTimer';
import { formatDuration } from '@librediary/shared/utils';

const emit = defineEmits<{
  stop: [payload: { target: ReturnType<typeof useTimer>['target']['value']; elapsedMs: number }];
}>();

const { target, elapsedMs, isActive, isRunning, isPaused, pause, resume, stop, discard } =
  useTimer();

const formattedTime = computed(() => formatDuration(elapsedMs.value));

const truncatedName = computed(() => {
  const name = target.value?.taskName ?? '';
  if (name.length <= 28) return name;
  return name.slice(0, 25) + '…';
});

function handlePlayPause() {
  if (isPaused.value) {
    resume();
  } else {
    pause();
  }
}

function handleStop() {
  const result = stop();
  if (result) {
    emit('stop', result);
  }
}
</script>

<template>
  <Transition name="timer-widget">
    <div v-if="isActive" class="timer-widget" role="timer" :aria-label="`Timer: ${truncatedName}`">
      <div class="timer-task-row">
        <span class="timer-indicator" :class="{ pulsing: isRunning }" aria-hidden="true" />
        <span class="timer-task-name" :title="target?.taskName">{{ truncatedName }}</span>
        <button class="timer-btn timer-btn--discard" aria-label="Discard timer" @click="discard">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
              d="M3.5 3.5L10.5 10.5M10.5 3.5L3.5 10.5"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
            />
          </svg>
        </button>
      </div>

      <div class="timer-controls-row">
        <span class="timer-elapsed" :class="{ 'timer-elapsed--running': isRunning }">
          {{ formattedTime }}
        </span>

        <div class="timer-actions">
          <button
            class="timer-btn timer-btn--play-pause"
            :aria-label="isPaused ? 'Resume timer' : 'Pause timer'"
            @click="handlePlayPause"
          >
            <!-- Pause icon -->
            <svg v-if="isRunning" width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect x="4" y="3" width="2.5" height="10" rx="0.75" fill="currentColor" />
              <rect x="9.5" y="3" width="2.5" height="10" rx="0.75" fill="currentColor" />
            </svg>
            <!-- Play icon -->
            <svg v-else width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M5 3.5V12.5L12.5 8L5 3.5Z"
                fill="currentColor"
                stroke="currentColor"
                stroke-width="1"
                stroke-linejoin="round"
              />
            </svg>
          </button>

          <button
            class="timer-btn timer-btn--stop"
            aria-label="Stop timer and save"
            @click="handleStop"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <rect x="3.5" y="3.5" width="9" height="9" rx="1.5" fill="currentColor" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.timer-widget {
  position: fixed;
  right: var(--space-5);
  bottom: var(--space-5);
  z-index: 500;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  width: 280px;
  padding: var(--space-3) var(--space-4);
  background: var(--color-surface-elevated);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  box-shadow:
    0 12px 28px -6px rgba(0, 0, 0, 0.12),
    0 4px 10px -4px rgba(0, 0, 0, 0.06);
}

/* --- Task row --- */
.timer-task-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.timer-indicator {
  width: 7px;
  height: 7px;
  border-radius: var(--radius-full);
  background: var(--color-success);
  flex-shrink: 0;
  transition: background var(--transition-fast);
}

.timer-indicator.pulsing {
  animation: indicator-pulse 1.6s ease-in-out infinite;
}

@keyframes indicator-pulse {
  0%,
  100% {
    opacity: 1;
    box-shadow: 0 0 0 0 color-mix(in srgb, var(--color-success) 40%, transparent);
  }
  50% {
    opacity: 0.7;
    box-shadow: 0 0 0 4px color-mix(in srgb, var(--color-success) 0%, transparent);
  }
}

.timer-task-name {
  flex: 1;
  font-size: var(--text-xs);
  font-weight: 500;
  color: var(--color-text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  letter-spacing: 0.01em;
}

/* --- Controls row --- */
.timer-controls-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.timer-elapsed {
  font-size: var(--text-lg);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: var(--color-text-primary);
  letter-spacing: -0.01em;
  transition: color var(--transition-fast);
}

.timer-elapsed--running {
  animation: time-breathe 2s ease-in-out infinite;
}

@keyframes time-breathe {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.65;
  }
}

.timer-actions {
  display: flex;
  gap: var(--space-1-5);
  align-items: center;
}

/* --- Buttons --- */
.timer-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  background: transparent;
  border: none;
  cursor: pointer;
  border-radius: var(--radius-sm);
  transition: all var(--transition-fast);
}

.timer-btn--discard {
  width: 22px;
  height: 22px;
  color: var(--color-text-tertiary);
  margin-left: auto;
  flex-shrink: 0;
}

.timer-btn--discard:hover {
  color: var(--color-error);
  background: color-mix(in srgb, var(--color-error) 10%, transparent);
}

.timer-btn--play-pause {
  width: 32px;
  height: 32px;
  color: var(--color-accent);
  background: color-mix(in srgb, var(--color-accent) 10%, transparent);
}

.timer-btn--play-pause:hover {
  background: color-mix(in srgb, var(--color-accent) 18%, transparent);
}

.timer-btn--stop {
  width: 32px;
  height: 32px;
  color: var(--color-error);
  background: color-mix(in srgb, var(--color-error) 10%, transparent);
}

.timer-btn--stop:hover {
  background: color-mix(in srgb, var(--color-error) 18%, transparent);
}

.timer-btn:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 1px;
}

/* --- Entrance / exit transition --- */
.timer-widget-enter-active {
  animation: widget-in 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
}

.timer-widget-leave-active {
  animation: widget-out 0.2s cubic-bezier(0.4, 0, 0.2, 1) forwards;
}

@keyframes widget-in {
  from {
    opacity: 0;
    transform: translateY(12px) scale(0.96);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes widget-out {
  from {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
  to {
    opacity: 0;
    transform: translateY(8px) scale(0.97);
  }
}
</style>
