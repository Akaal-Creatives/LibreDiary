<script setup lang="ts">
import { useToast } from '@/composables/useToast';

const { toasts, removeToast } = useToast();

function getIcon(type: 'success' | 'error' | 'info' | 'warning') {
  const icons = {
    success: 'M5 9l4 4 6-7',
    error: 'M6 6l8 8M14 6l-8 8',
    info: 'M10 7v4m0 2v.01',
    warning: 'M10 6v5m0 2v.01',
  };
  return icons[type];
}
</script>

<template>
  <Teleport to="body">
    <div class="toast-container" role="region" aria-label="Notifications" aria-live="polite">
      <TransitionGroup name="toast">
        <div
          v-for="toast in toasts"
          :key="toast.id"
          class="toast"
          :class="`toast--${toast.type}`"
          role="alert"
        >
          <svg class="toast-icon" width="18" height="18" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="10" r="9" stroke="currentColor" stroke-width="1.5" />
            <path
              :d="getIcon(toast.type)"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          <span class="toast-message">{{ toast.message }}</span>
          <button
            class="toast-close"
            aria-label="Dismiss notification"
            @click="removeToast(toast.id)"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path
                d="M3 3L11 11M11 3L3 11"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
              />
            </svg>
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
.toast-container {
  position: fixed;
  right: var(--space-4);
  bottom: var(--space-4);
  z-index: 9999;
  display: flex;
  flex-direction: column-reverse;
  gap: var(--space-2);
  max-width: 400px;
}

.toast {
  display: flex;
  gap: var(--space-3);
  align-items: flex-start;
  padding: var(--space-3) var(--space-4);
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
}

.toast--success {
  border-left: 3px solid var(--color-success);
}

.toast--success .toast-icon {
  color: var(--color-success);
}

.toast--error {
  border-left: 3px solid var(--color-error);
}

.toast--error .toast-icon {
  color: var(--color-error);
}

.toast--info {
  border-left: 3px solid var(--color-accent);
}

.toast--info .toast-icon {
  color: var(--color-accent);
}

.toast--warning {
  border-left: 3px solid var(--color-warning);
}

.toast--warning .toast-icon {
  color: var(--color-warning);
}

.toast-icon {
  flex-shrink: 0;
  margin-top: 1px;
}

.toast-message {
  flex: 1;
  font-size: var(--text-sm);
  color: var(--color-text-primary);
  line-height: 1.5;
}

.toast-close {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-1);
  margin: -4px -4px -4px 0;
  color: var(--color-text-tertiary);
  background: transparent;
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  opacity: 0.6;
  transition: all var(--transition-fast);
}

.toast-close:hover {
  color: var(--color-text-primary);
  background: var(--color-hover);
  opacity: 1;
}

/* Transitions */
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from {
  opacity: 0;
  transform: translateX(100%);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(100%);
}

.toast-move {
  transition: transform 0.3s ease;
}
</style>
