<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useDatabasesStore } from '@/stores';
import type { DatabaseProperty, PropertyType } from '@librediary/shared';

const props = defineProps<{
  property: DatabaseProperty;
}>();

const emit = defineEmits<{
  close: [];
}>();

const databasesStore = useDatabasesStore();

const localName = ref(props.property.name);
const localType = ref<PropertyType>(props.property.type);

type SelectOption = { label: string; colour?: string };

const localOptions = ref<SelectOption[]>(getInitialOptions());

function getInitialOptions(): SelectOption[] {
  const config = props.property.config as Record<string, unknown> | null;
  const opts = (config?.options as SelectOption[] | undefined) ?? [];
  return opts.map((o) => ({ ...o }));
}

const localNumberFormat = ref(getInitialNumberFormat());

function getInitialNumberFormat(): string {
  const config = props.property.config as Record<string, unknown> | null;
  return (config?.format as string) ?? 'number';
}

const isSelectType = computed(
  () => localType.value === 'SELECT' || localType.value === 'MULTI_SELECT'
);
const isNumberType = computed(() => localType.value === 'NUMBER');

watch(
  () => props.property,
  () => {
    localName.value = props.property.name;
    localType.value = props.property.type;
    localOptions.value = getInitialOptions();
    localNumberFormat.value = getInitialNumberFormat();
  }
);

async function saveName() {
  const trimmed = localName.value.trim();
  if (!trimmed || trimmed === props.property.name) return;
  await databasesStore.updateProperty(props.property.id, { name: trimmed });
}

async function saveType() {
  if (localType.value === props.property.type) return;
  await databasesStore.updateProperty(props.property.id, { type: localType.value });
}

function addOption() {
  localOptions.value.push({ label: '', colour: undefined });
}

function removeOption(index: number) {
  localOptions.value = localOptions.value.filter((_, i) => i !== index);
}

async function saveOptions() {
  const config = {
    ...((props.property.config as Record<string, unknown>) ?? {}),
    options: localOptions.value.filter((o) => o.label.trim()),
  };
  await databasesStore.updateProperty(props.property.id, { config });
}

async function saveNumberFormat() {
  const config = {
    ...((props.property.config as Record<string, unknown>) ?? {}),
    format: localNumberFormat.value,
  };
  await databasesStore.updateProperty(props.property.id, { config });
}

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
];
</script>

<template>
  <div class="property-config-panel">
    <div class="config-header">
      <span class="config-title">Configure property</span>
      <button class="config-close-btn" @click="emit('close')">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M4 4L10 10" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" />
          <path d="M10 4L4 10" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" />
        </svg>
      </button>
    </div>

    <!-- Property Name -->
    <div class="config-field">
      <label class="config-label">Name</label>
      <input
        v-model="localName"
        class="config-name-input"
        type="text"
        @blur="saveName"
        @keydown.enter.prevent="($event.target as HTMLInputElement).blur()"
      />
    </div>

    <!-- Property Type -->
    <div class="config-field">
      <label class="config-label">Type</label>
      <select v-model="localType" class="config-type-select" @change="saveType">
        <option v-for="pt in propertyTypes" :key="pt.value" :value="pt.value">
          {{ pt.label }}
        </option>
      </select>
    </div>

    <!-- SELECT / MULTI_SELECT Options -->
    <div v-if="isSelectType" class="config-field select-options-editor">
      <label class="config-label">Options</label>
      <div class="options-list">
        <div v-for="(option, idx) in localOptions" :key="idx" class="option-row">
          <input v-model="option.colour" type="color" class="option-colour" @change="saveOptions" />
          <input
            v-model="option.label"
            class="option-label-input"
            type="text"
            placeholder="Option name..."
            @blur="saveOptions"
            @keydown.enter.prevent="($event.target as HTMLInputElement).blur()"
          />
          <button class="remove-option-btn" @click="removeOption(idx)">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M3 3L9 9" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" />
              <path d="M9 3L3 9" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" />
            </svg>
          </button>
        </div>
      </div>
      <button class="add-option-btn" @click="addOption">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M6 2V10" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" />
          <path d="M2 6H10" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" />
        </svg>
        Add option
      </button>
    </div>

    <!-- NUMBER Format -->
    <div v-if="isNumberType" class="config-field">
      <label class="config-label">Format</label>
      <select v-model="localNumberFormat" class="number-format-select" @change="saveNumberFormat">
        <option value="number">Number</option>
        <option value="percent">Percent</option>
        <option value="currency">Currency</option>
      </select>
    </div>
  </div>
</template>

<style scoped>
.property-config-panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  min-width: 260px;
  padding: var(--space-3);
  background: var(--color-surface-elevated);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
}

.config-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.config-title {
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--color-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.config-close-btn {
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

.config-close-btn:hover {
  color: var(--color-text-primary);
  background: var(--color-hover);
}

.config-field {
  display: flex;
  flex-direction: column;
  gap: var(--space-1-5);
}

.config-label {
  font-size: var(--text-xs);
  font-weight: 500;
  color: var(--color-text-tertiary);
}

.config-name-input,
.config-type-select,
.number-format-select {
  padding: var(--space-1-5) var(--space-2);
  font-family: inherit;
  font-size: var(--text-sm);
  color: var(--color-text-primary);
  background: var(--color-surface-sunken);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  outline: none;
  transition: border-color var(--transition-fast);
}

.config-name-input:focus,
.config-type-select:focus,
.number-format-select:focus {
  border-color: var(--color-accent);
}

/* Select Options Editor */
.options-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-1-5);
}

.option-row {
  display: flex;
  gap: var(--space-1-5);
  align-items: center;
}

.option-colour {
  width: 24px;
  height: 24px;
  padding: 0;
  cursor: pointer;
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  flex-shrink: 0;
}

.option-label-input {
  flex: 1;
  padding: var(--space-1) var(--space-2);
  font-family: inherit;
  font-size: var(--text-sm);
  color: var(--color-text-primary);
  background: var(--color-surface-sunken);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  outline: none;
}

.option-label-input:focus {
  border-color: var(--color-accent);
}

.remove-option-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  padding: 0;
  color: var(--color-text-tertiary);
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: var(--radius-sm);
  flex-shrink: 0;
  transition: all var(--transition-fast);
}

.remove-option-btn:hover {
  color: var(--color-error);
  background: var(--color-hover);
}

.add-option-btn {
  display: flex;
  gap: var(--space-1);
  align-items: center;
  align-self: flex-start;
  padding: var(--space-1) var(--space-2);
  font-family: inherit;
  font-size: var(--text-xs);
  font-weight: 500;
  color: var(--color-accent);
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: var(--radius-sm);
  transition: background var(--transition-fast);
}

.add-option-btn:hover {
  background: var(--color-hover);
}
</style>
