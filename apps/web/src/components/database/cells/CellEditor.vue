<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue';
import type { PropertyType } from '@librediary/shared';

const props = defineProps<{
  value: unknown;
  type: PropertyType;
  config?: Record<string, unknown> | null;
}>();

const emit = defineEmits<{
  save: [value: unknown];
  cancel: [];
}>();

const editValue = ref<string>('');
const inputRef = ref<HTMLInputElement | null>(null);
const showSelectDropdown = ref(false);

onMounted(async () => {
  if (props.type === 'CHECKBOX') {
    emit('save', props.value !== true);
    return;
  }

  if (props.type === 'SELECT' || props.type === 'MULTI_SELECT') {
    showSelectDropdown.value = true;
    editValue.value = String(props.value ?? '');
  } else {
    editValue.value = props.value != null ? String(props.value) : '';
  }

  await nextTick();
  inputRef.value?.focus();
  inputRef.value?.select();
});

function save() {
  let finalValue: unknown = editValue.value;

  if (props.type === 'NUMBER') {
    const num = Number(editValue.value);
    finalValue = editValue.value === '' ? null : isNaN(num) ? null : num;
  }

  emit('save', finalValue);
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter') {
    event.preventDefault();
    save();
  }
  if (event.key === 'Escape') {
    event.preventDefault();
    emit('cancel');
  }
  if (event.key === 'Tab') {
    save();
  }
}

function getSelectOptions(): string[] {
  const options = (props.config?.options as Array<{ label: string }>) ?? [];
  return options.map((o) => o.label);
}

function selectOption(option: string) {
  if (props.type === 'MULTI_SELECT') {
    const current = Array.isArray(props.value) ? [...(props.value as string[])] : [];
    const idx = current.indexOf(option);
    if (idx >= 0) {
      current.splice(idx, 1);
    } else {
      current.push(option);
    }
    emit('save', current);
  } else {
    emit('save', option);
  }
}

function isSelected(option: string): boolean {
  if (props.type === 'MULTI_SELECT') {
    return Array.isArray(props.value) && (props.value as string[]).includes(option);
  }
  return String(props.value ?? '') === option;
}

function getInputType(): string {
  switch (props.type) {
    case 'NUMBER':
      return 'number';
    case 'DATE':
      return 'date';
    case 'EMAIL':
      return 'email';
    case 'URL':
      return 'url';
    case 'PHONE':
      return 'tel';
    default:
      return 'text';
  }
}
</script>

<template>
  <div class="cell-editor">
    <!-- Select / Multi-select dropdown -->
    <div
      v-if="(type === 'SELECT' || type === 'MULTI_SELECT') && showSelectDropdown"
      class="select-dropdown"
    >
      <button
        v-for="option in getSelectOptions()"
        :key="option"
        class="select-option"
        :class="{ selected: isSelected(option) }"
        @mousedown.prevent="selectOption(option)"
      >
        <span v-if="type === 'MULTI_SELECT'" class="option-check">
          <svg v-if="isSelected(option)" width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path
              d="M2.5 6L5 8.5L9.5 3.5"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </span>
        {{ option }}
      </button>
      <div v-if="getSelectOptions().length === 0" class="select-empty">No options configured</div>
      <button
        v-if="type === 'MULTI_SELECT'"
        class="select-done"
        @mousedown.prevent="emit('save', value)"
      >
        Done
      </button>
    </div>

    <!-- Standard text/number/date input -->
    <input
      v-else
      ref="inputRef"
      v-model="editValue"
      class="cell-input"
      :type="getInputType()"
      @blur="save"
      @keydown="handleKeydown"
    />
  </div>
</template>

<style scoped>
.cell-editor {
  position: relative;
  width: 100%;
}

.cell-input {
  width: 100%;
  padding: var(--space-1) var(--space-2);
  font-family: inherit;
  font-size: var(--text-sm);
  color: var(--color-text-primary);
  background: var(--color-surface);
  border: 2px solid var(--color-accent);
  border-radius: var(--radius-sm);
  outline: none;
}

.cell-input:focus {
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-accent) 20%, transparent);
}

/* Select Dropdown */
.select-dropdown {
  position: absolute;
  top: 0;
  left: 0;
  z-index: var(--z-dropdown);
  display: flex;
  flex-direction: column;
  min-width: 180px;
  max-height: 240px;
  overflow-y: auto;
  padding: var(--space-1);
  background: var(--color-surface-elevated);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
}

.select-option {
  display: flex;
  gap: var(--space-2);
  align-items: center;
  width: 100%;
  padding: var(--space-2) var(--space-3);
  font-family: inherit;
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  text-align: left;
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: var(--radius-sm);
  transition: all var(--transition-fast);
}

.select-option:hover {
  background: var(--color-hover);
  color: var(--color-text-primary);
}

.select-option.selected {
  color: var(--color-accent);
  font-weight: 500;
}

.option-check {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  flex-shrink: 0;
}

.select-empty {
  padding: var(--space-3);
  font-size: var(--text-sm);
  color: var(--color-text-tertiary);
  text-align: center;
}

.select-done {
  padding: var(--space-2);
  margin-top: var(--space-1);
  font-family: inherit;
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--color-accent);
  cursor: pointer;
  background: transparent;
  border: none;
  border-top: 1px solid var(--color-border-subtle);
  transition: all var(--transition-fast);
}

.select-done:hover {
  background: var(--color-hover);
}
</style>
