<script setup lang="ts">
import BaseModal from './BaseModal.vue';

export type ConfirmVariant = 'default' | 'destructive';

withDefaults(
  defineProps<{
    open: boolean;
    title?: string;
    message: string;
    variant?: ConfirmVariant;
    confirmText?: string;
    cancelText?: string;
  }>(),
  {
    variant: 'default',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
  }
);

const emit = defineEmits<{
  confirm: [];
  cancel: [];
  close: [];
}>();

function handleConfirm() {
  emit('confirm');
  emit('close');
}

function handleCancel() {
  emit('cancel');
  emit('close');
}
</script>

<template>
  <BaseModal :open="open" :close-on-backdrop="false" @close="handleCancel">
    <div class="confirm-dialog">
      <!-- Icon for destructive variant -->
      <div v-if="variant === 'destructive'" class="confirm-icon">
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path
            d="M12 9v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </div>

      <!-- Content -->
      <div class="confirm-content">
        <h2 v-if="title" class="confirm-title">{{ title }}</h2>
        <p class="confirm-message">{{ message }}</p>
      </div>

      <!-- Actions -->
      <div class="confirm-actions">
        <button class="btn btn-secondary" @click="handleCancel">
          {{ cancelText }}
        </button>
        <button
          class="btn"
          :class="variant === 'destructive' ? 'btn-danger' : 'btn-primary'"
          @click="handleConfirm"
        >
          {{ confirmText }}
        </button>
      </div>
    </div>
  </BaseModal>
</template>

<style scoped>
.confirm-dialog {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.confirm-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  margin: 0 auto;
  color: var(--color-error);
  background: var(--color-error-subtle);
  border-radius: var(--radius-full);
}

.confirm-content {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  text-align: center;
}

.confirm-title {
  margin: 0;
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--color-text-primary);
  letter-spacing: -0.01em;
}

.confirm-message {
  margin: 0;
  font-size: var(--text-base);
  line-height: var(--leading-relaxed);
  color: var(--color-text-secondary);
}

.confirm-actions {
  display: flex;
  gap: var(--space-3);
  justify-content: center;
  padding-top: var(--space-2);
}

/* Button styles */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  min-width: 100px;
  padding: var(--space-2) var(--space-5);
  font-family: inherit;
  font-size: var(--text-sm);
  font-weight: 500;
  line-height: 1.5;
  text-decoration: none;
  cursor: pointer;
  border: none;
  border-radius: var(--radius-lg);
  transition: all 0.15s ease;
}

.btn:focus-visible {
  outline: 2px solid var(--color-focus-ring);
  outline-offset: 2px;
}

.btn-primary {
  color: var(--color-text-inverse);
  background: var(--color-accent);
}

.btn-primary:hover {
  background: var(--color-accent-hover);
}

.btn-primary:active {
  background: var(--color-accent-active);
  transform: scale(0.98);
}

.btn-secondary {
  color: var(--color-text-secondary);
  background: var(--color-surface-sunken);
  border: 1px solid var(--color-border);
}

.btn-secondary:hover {
  color: var(--color-text-primary);
  background: var(--color-hover);
  border-color: var(--color-border-strong);
}

.btn-secondary:active {
  background: var(--color-active);
  transform: scale(0.98);
}

.btn-danger {
  color: white;
  background: var(--color-error);
}

.btn-danger:hover {
  background: color-mix(in srgb, var(--color-error) 85%, black);
}

.btn-danger:active {
  background: color-mix(in srgb, var(--color-error) 75%, black);
  transform: scale(0.98);
}
</style>
