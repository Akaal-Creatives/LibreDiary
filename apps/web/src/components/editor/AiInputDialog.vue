<script setup lang="ts">
import { ref, onMounted } from 'vue';

const props = defineProps<{
  title: string;
  placeholder: string;
  loading: boolean;
}>();

const emit = defineEmits<{
  submit: [value: string];
  cancel: [];
}>();

const input = ref('');
const inputRef = ref<HTMLTextAreaElement | null>(null);

onMounted(() => {
  inputRef.value?.focus();
});

function handleSubmit() {
  const val = input.value.trim();
  if (!val || props.loading) return;
  emit('submit', val);
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    handleSubmit();
  }
  if (e.key === 'Escape') emit('cancel');
}
</script>

<template>
  <div class="ai-dialog-backdrop" @click.self="emit('cancel')">
    <div class="ai-dialog" role="dialog" :aria-label="title">
      <p class="ai-dialog-title">{{ title }}</p>
      <textarea
        ref="inputRef"
        v-model="input"
        class="ai-dialog-input"
        :placeholder="placeholder"
        rows="3"
        :disabled="loading"
        @keydown="handleKeydown"
      />
      <div class="ai-dialog-actions">
        <button class="ai-dialog-submit" :disabled="loading || !input.trim()" @click="handleSubmit">
          <span v-if="loading" class="ai-dialog-spinner" aria-hidden="true" />
          <span>{{ loading ? 'Generating…' : 'Generate' }}</span>
        </button>
        <button class="ai-dialog-cancel" :disabled="loading" @click="emit('cancel')">Cancel</button>
      </div>
      <p class="ai-dialog-hint">Enter ↵ to generate · Shift+Enter for new line · Esc to close</p>
    </div>
  </div>
</template>

<style scoped>
.ai-dialog-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 500;
}

.ai-dialog {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-5);
  width: min(480px, 90vw);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
}

.ai-dialog-title {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-text-primary);
  margin: 0;
}

.ai-dialog-input {
  width: 100%;
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-size: var(--text-sm);
  background: var(--color-background);
  color: var(--color-text-primary);
  resize: vertical;
  outline: none;
  box-sizing: border-box;
  font-family: inherit;
  line-height: 1.5;
}

.ai-dialog-input:focus {
  border-color: var(--color-accent);
}

.ai-dialog-input:disabled {
  opacity: 0.6;
}

.ai-dialog-actions {
  display: flex;
  gap: var(--space-2);
}

.ai-dialog-submit {
  padding: var(--space-1) var(--space-4);
  background: var(--color-accent);
  color: var(--color-on-accent, #fff);
  border: none;
  border-radius: var(--radius-sm);
  font-size: var(--text-sm);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.ai-dialog-submit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.ai-dialog-cancel {
  padding: var(--space-1) var(--space-3);
  background: transparent;
  color: var(--color-text-secondary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-size: var(--text-sm);
  cursor: pointer;
}

.ai-dialog-cancel:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.ai-dialog-hint {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
  margin: 0;
}

.ai-dialog-spinner {
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255, 255, 255, 0.4);
  border-top-color: #fff;
  border-radius: 50%;
  animation: ai-spin 0.7s linear infinite;
  flex-shrink: 0;
}

@keyframes ai-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
