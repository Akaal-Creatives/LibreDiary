<script setup lang="ts">
import { ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useTemplatesStore } from '@/stores/templates';
import { useToast } from '@/composables/useToast';

const props = defineProps<{
  open: boolean;
  pageId: string;
  pageTitle: string;
}>();

const emit = defineEmits<{
  close: [];
  saved: [];
}>();

const { t } = useI18n();
const templatesStore = useTemplatesStore();
const toast = useToast();

const name = ref('');
const description = ref('');
const category = ref('');
const submitting = ref(false);
const error = ref<string | null>(null);

const categories = ['Meeting', 'Project', 'Personal', 'Team', 'Other'];

// Reset form when modal opens
watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      name.value = props.pageTitle;
      description.value = '';
      category.value = '';
      error.value = null;
    }
  }
);

async function handleSubmit() {
  if (!name.value.trim()) {
    error.value = 'Name is required';
    return;
  }

  submitting.value = true;
  error.value = null;

  try {
    await templatesStore.createTemplateFromPage({
      pageId: props.pageId,
      name: name.value.trim(),
      description: description.value.trim() || undefined,
      category: category.value || undefined,
    });

    toast.success(t('templates.saveAsTemplate'));
    emit('saved');
    emit('close');
  } catch (e) {
    console.error('Failed to save template:', e);
    error.value = 'Failed to save template. Please try again.';
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="modal-overlay" @click.self="$emit('close')">
      <div class="modal" role="dialog" aria-labelledby="save-template-title">
        <div class="modal-header">
          <h2 id="save-template-title" class="modal-title">{{ $t('templates.saveAsTemplate') }}</h2>
          <button class="close-btn" aria-label="Close" @click="$emit('close')">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path
                d="M15 5L5 15M5 5L15 15"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
              />
            </svg>
          </button>
        </div>

        <form class="modal-body" @submit.prevent="handleSubmit">
          <div v-if="error" class="error-message">{{ error }}</div>

          <div class="form-group">
            <label class="form-label" for="template-name">Name</label>
            <input
              id="template-name"
              v-model="name"
              type="text"
              class="form-input"
              placeholder="Template name"
              maxlength="200"
              required
            />
          </div>

          <div class="form-group">
            <label class="form-label" for="template-description">Description</label>
            <textarea
              id="template-description"
              v-model="description"
              class="form-textarea"
              placeholder="Describe what this template is for..."
              maxlength="1000"
              rows="3"
            />
          </div>

          <div class="form-group">
            <label class="form-label" for="template-category">Category</label>
            <select id="template-category" v-model="category" class="form-select">
              <option value="">No category</option>
              <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
            </select>
          </div>

          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" @click="$emit('close')">
              {{ $t('common.cancel') }}
            </button>
            <button type="submit" class="btn btn-primary" :disabled="submitting">
              {{ submitting ? 'Saving...' : $t('templates.saveAsTemplate') }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.5);
}

.modal {
  width: 100%;
  max-width: 480px;
  max-height: 90vh;
  overflow-y: auto;
  background: var(--color-surface-raised);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-xl);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-4) var(--space-5);
  border-bottom: 1px solid var(--color-border);
}

.modal-title {
  margin: 0;
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--color-text-primary);
}

.close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  color: var(--color-text-tertiary);
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
}

.close-btn:hover {
  color: var(--color-text-primary);
  background: var(--color-hover);
}

.modal-body {
  padding: var(--space-5);
}

.error-message {
  padding: var(--space-3);
  margin-bottom: var(--space-4);
  font-size: var(--text-sm);
  color: var(--color-error);
  background: var(--color-error-subtle);
  border-radius: var(--radius-md);
}

.form-group {
  margin-bottom: var(--space-4);
}

.form-label {
  display: block;
  margin-bottom: var(--space-1);
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--color-text-primary);
}

.form-input,
.form-textarea,
.form-select {
  width: 100%;
  padding: var(--space-2) var(--space-3);
  font-family: inherit;
  font-size: var(--text-sm);
  color: var(--color-text-primary);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  outline: none;
  transition: border-color var(--transition-fast);
  box-sizing: border-box;
}

.form-input:focus,
.form-textarea:focus,
.form-select:focus {
  border-color: var(--color-accent);
}

.form-textarea {
  resize: vertical;
  min-height: 80px;
}

.modal-actions {
  display: flex;
  gap: var(--space-3);
  justify-content: flex-end;
  margin-top: var(--space-5);
}

.btn {
  padding: var(--space-2) var(--space-4);
  font-family: inherit;
  font-size: var(--text-sm);
  font-weight: 500;
  cursor: pointer;
  border: none;
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
}

.btn:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.btn-secondary {
  color: var(--color-text-secondary);
  background: var(--color-surface-sunken);
}

.btn-secondary:hover:not(:disabled) {
  background: var(--color-hover);
}

.btn-primary {
  color: var(--color-text-inverse);
  background: var(--color-accent);
}

.btn-primary:hover:not(:disabled) {
  background: var(--color-accent-hover);
}
</style>
