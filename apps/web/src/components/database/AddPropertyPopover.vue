<script setup lang="ts">
import { ref } from 'vue';
import type { PropertyType } from '@librediary/shared';

const emit = defineEmits<{
  add: [payload: { name: string; type: PropertyType }];
}>();

const showPopover = ref(false);
const newPropertyName = ref('');
const newPropertyType = ref<PropertyType>('TEXT');

/** All available property types for the select dropdown. */
const propertyTypes: Array<{ value: PropertyType; label: string }> = [
  { value: 'TEXT', label: 'Text' },
  { value: 'NUMBER', label: 'Number' },
  { value: 'SELECT', label: 'Select' },
  { value: 'MULTI_SELECT', label: 'Multi-select' },
  { value: 'DATE', label: 'Date' },
  { value: 'CHECKBOX', label: 'Checkbox' },
  { value: 'URL', label: 'URL' },
  { value: 'EMAIL', label: 'Email' },
  { value: 'PHONE', label: 'Phone' },
  { value: 'PERSON', label: 'Person' },
  { value: 'FILES', label: 'Files' },
  { value: 'RELATION', label: 'Relation' },
  { value: 'ROLLUP', label: 'Rollup' },
  { value: 'FORMULA', label: 'Formula' },
  { value: 'DURATION', label: 'Duration' },
];

/** Validate and emit the new property, then reset the form. */
function addProperty() {
  const name = newPropertyName.value.trim();
  if (!name) return;
  emit('add', { name, type: newPropertyType.value });
  newPropertyName.value = '';
  newPropertyType.value = 'TEXT';
  showPopover.value = false;
}

/** Handle keyboard shortcuts within the popover input. */
function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter') {
    event.preventDefault();
    addProperty();
  }
  if (event.key === 'Escape') {
    showPopover.value = false;
  }
}
</script>

<template>
  <th class="col-add">
    <div class="add-property-wrapper">
      <button class="add-property-btn" @click="showPopover = !showPopover">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M7 2.5V11.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
          <path d="M2.5 7H11.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
        </svg>
      </button>
      <div v-if="showPopover" class="add-property-popover">
        <input
          v-model="newPropertyName"
          class="add-property-input"
          type="text"
          placeholder="Property name"
          autofocus
          @keydown="handleKeydown"
        />
        <select v-model="newPropertyType" class="add-property-select">
          <option v-for="pt in propertyTypes" :key="pt.value" :value="pt.value">
            {{ pt.label }}
          </option>
        </select>
        <button class="add-property-submit" @click="addProperty">Add</button>
      </div>
    </div>
  </th>
</template>

<style scoped>
.col-add {
  width: 40px;
  text-align: center;
}

.add-property-wrapper {
  position: relative;
  display: flex;
  justify-content: center;
}

.add-property-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  color: var(--color-text-tertiary);
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: var(--radius-sm);
  transition: all var(--transition-fast);
}

.add-property-btn:hover {
  color: var(--color-text-primary);
  background: var(--color-hover);
}

.add-property-popover {
  position: absolute;
  top: 100%;
  right: 0;
  z-index: var(--z-dropdown);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  min-width: 220px;
  padding: var(--space-3);
  margin-top: var(--space-1);
  background: var(--color-surface-elevated);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
}

.add-property-input {
  width: 100%;
  padding: var(--space-2);
  font-family: inherit;
  font-size: var(--text-sm);
  color: var(--color-text-primary);
  background: var(--color-surface-sunken);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  outline: none;
}

.add-property-input:focus {
  border-color: var(--color-accent);
}

.add-property-select {
  width: 100%;
  padding: var(--space-2);
  font-family: inherit;
  font-size: var(--text-sm);
  color: var(--color-text-primary);
  background: var(--color-surface-sunken);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  outline: none;
  cursor: pointer;
}

.add-property-submit {
  padding: var(--space-2);
  font-family: inherit;
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--color-text-inverse);
  cursor: pointer;
  background: var(--color-accent);
  border: none;
  border-radius: var(--radius-sm);
  transition: all var(--transition-fast);
}

.add-property-submit:hover {
  background: var(--color-accent-hover);
}
</style>
