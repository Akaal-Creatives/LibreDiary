<script setup lang="ts">
import { databaseTemplates } from './databaseTemplates';

defineProps<{
  open: boolean;
}>();

const emit = defineEmits<{
  select: [templateId: string];
  close: [];
}>();

function getTemplateIcon(templateId: string): string {
  switch (templateId) {
    case 'blank':
      return '+';
    case 'task-tracker':
      return '\u2713';
    case 'bug-tracker':
      return '\u2691';
    case 'crm':
      return '\u263A';
    case 'sprint-board':
      return '\u25B6';
    case 'content-calendar':
      return '\u25A6';
    default:
      return '\u25A0';
  }
}
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="modal-overlay" @click.self="emit('close')">
      <div class="modal" role="dialog" aria-labelledby="db-template-picker-title">
        <!-- Header -->
        <div class="modal-header">
          <h2 id="db-template-picker-title" class="modal-title">
            {{ $t('databases.templatePicker.title') }}
          </h2>
          <button class="close-btn" :aria-label="$t('common.close')" @click="emit('close')">
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

        <!-- Template Grid -->
        <div class="modal-body">
          <p class="picker-hint">{{ $t('databases.templatePicker.hint') }}</p>
          <div class="templates-grid">
            <button
              v-for="template in databaseTemplates"
              :key="template.id"
              class="template-card"
              @click="emit('select', template.id)"
            >
              <div :class="['template-icon', `template-icon--${template.id}`]">
                {{ getTemplateIcon(template.id) }}
              </div>
              <div class="template-info">
                <h3 class="template-name">{{ template.name }}</h3>
                <p class="template-description">{{ template.description }}</p>
              </div>
              <span v-if="template.properties.length > 0" class="property-count">
                {{
                  $t('databases.templatePicker.propertyCount', {
                    count: template.properties.length,
                  })
                }}
              </span>
            </button>
          </div>
        </div>
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
  max-width: 560px;
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
  padding: var(--space-4) var(--space-5) var(--space-5);
}

.picker-hint {
  margin: 0 0 var(--space-4);
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

.templates-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--space-3);
}

@media (max-width: 480px) {
  .templates-grid {
    grid-template-columns: 1fr;
  }
}

.template-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-4);
  text-align: left;
  cursor: pointer;
  background: var(--color-surface);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-lg);
  transition: all var(--transition-base);
}

.template-card:hover {
  border-color: var(--color-accent);
  box-shadow: var(--shadow-sm);
}

.template-card:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}

.template-icon {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  font-size: var(--text-lg);
  color: var(--color-accent);
  background: var(--color-accent-subtle);
  border-radius: var(--radius-md);
}

.template-icon--blank {
  color: var(--color-text-tertiary);
  background: var(--color-surface-sunken);
}

.template-icon--bug-tracker {
  color: var(--color-error);
  background: var(--color-error-subtle);
}

.template-info {
  flex: 1;
  min-width: 0;
}

.template-name {
  margin: 0 0 var(--space-1);
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-text-primary);
}

.template-description {
  margin: 0;
  font-size: var(--text-xs);
  line-height: 1.4;
  color: var(--color-text-secondary);
}

.property-count {
  display: inline-flex;
  align-self: flex-start;
  padding: 2px 8px;
  font-size: var(--text-xs);
  font-weight: 500;
  color: var(--color-text-tertiary);
  background: var(--color-surface-sunken);
  border-radius: var(--radius-full);
}
</style>
