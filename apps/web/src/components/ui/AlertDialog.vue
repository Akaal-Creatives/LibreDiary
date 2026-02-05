<script setup lang="ts">
import { computed } from 'vue';
import BaseModal from './BaseModal.vue';

export type AlertVariant = 'info' | 'success' | 'warning' | 'error';

const props = withDefaults(
  defineProps<{
    open: boolean;
    title?: string;
    message: string;
    variant?: AlertVariant;
    confirmText?: string;
  }>(),
  {
    variant: 'info',
    confirmText: 'OK',
  }
);

const emit = defineEmits<{
  confirm: [];
  close: [];
}>();

const iconMap: Record<AlertVariant, string> = {
  info: 'ℹ️',
  success: '✓',
  warning: '⚠',
  error: '✕',
};

const icon = computed(() => iconMap[props.variant]);

function handleConfirm() {
  emit('confirm');
  emit('close');
}
</script>

<template>
  <BaseModal :open="open" :close-on-backdrop="false" @close="$emit('close')">
    <div class="alert-dialog" :class="[`variant-${variant}`]">
      <!-- Icon -->
      <div class="alert-icon" :class="[`icon-${variant}`]">
        <span class="icon-symbol">{{ icon }}</span>
      </div>

      <!-- Content -->
      <div class="alert-content">
        <h2 v-if="title" class="alert-title">{{ title }}</h2>
        <p class="alert-message">{{ message }}</p>
      </div>

      <!-- Actions -->
      <div class="alert-actions">
        <button class="btn btn-primary" @click="handleConfirm">
          {{ confirmText }}
        </button>
      </div>
    </div>
  </BaseModal>
</template>

<style scoped>
.alert-dialog {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  text-align: center;
}

.alert-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  margin: 0 auto;
  border-radius: var(--radius-full);
  font-size: 1.25rem;
}

.icon-symbol {
  line-height: 1;
}

.icon-info {
  background: var(--color-info-subtle);
  color: var(--color-info);
}

.icon-success {
  background: var(--color-success-subtle);
  color: var(--color-success);
}

.icon-warning {
  background: var(--color-warning-subtle);
  color: var(--color-warning);
}

.icon-error {
  background: var(--color-error-subtle);
  color: var(--color-error);
}

.alert-content {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.alert-title {
  margin: 0;
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--color-text-primary);
  letter-spacing: -0.01em;
}

.alert-message {
  margin: 0;
  font-size: var(--text-base);
  line-height: var(--leading-relaxed);
  color: var(--color-text-secondary);
}

.alert-actions {
  display: flex;
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
</style>
