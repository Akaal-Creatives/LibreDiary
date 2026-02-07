<script setup lang="ts">
import type { PropertyType } from '@librediary/shared';

const props = defineProps<{
  value: unknown;
  type: PropertyType;
  config?: Record<string, unknown> | null;
}>();

function formatValue(): string {
  if (props.value == null) return '';

  switch (props.type) {
    case 'TEXT':
    case 'URL':
    case 'EMAIL':
    case 'PHONE':
      return String(props.value);

    case 'NUMBER': {
      const num = Number(props.value);
      if (isNaN(num)) return '';
      const format = (props.config?.format as string) ?? 'number';
      if (format === 'percent') return `${num}%`;
      if (format === 'currency') {
        const currency = (props.config?.currency as string) ?? 'GBP';
        return new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(num);
      }
      return String(num);
    }

    case 'DATE': {
      const dateStr = String(props.value);
      if (!dateStr) return '';
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    }

    case 'SELECT':
      return String(props.value);

    case 'MULTI_SELECT': {
      if (Array.isArray(props.value)) return props.value.join(', ');
      return String(props.value);
    }

    case 'CREATED_TIME':
    case 'UPDATED_TIME': {
      const ts = String(props.value);
      if (!ts) return '';
      const date = new Date(ts);
      if (isNaN(date.getTime())) return ts;
      return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    }

    default:
      return String(props.value);
  }
}

function getSelectOptions(): Array<{ label: string; colour?: string }> {
  return (props.config?.options as Array<{ label: string; colour?: string }>) ?? [];
}

function getSelectColour(val: string): string {
  const options = getSelectOptions();
  const opt = options.find((o) => o.label === val);
  return opt?.colour ?? 'var(--color-accent)';
}
</script>

<template>
  <span class="cell-renderer" :class="`type-${type.toLowerCase()}`">
    <!-- Checkbox -->
    <template v-if="type === 'CHECKBOX'">
      <span class="checkbox-display" :class="{ checked: value === true }">
        <svg v-if="value === true" width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path
            d="M2.5 6L5 8.5L9.5 3.5"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </span>
    </template>

    <!-- Select with colour tag -->
    <template v-else-if="type === 'SELECT' && value">
      <span class="select-tag" :style="{ '--tag-colour': getSelectColour(String(value)) }">
        {{ value }}
      </span>
    </template>

    <!-- Multi-select tags -->
    <template v-else-if="type === 'MULTI_SELECT' && Array.isArray(value) && value.length > 0">
      <span
        v-for="(item, i) in value"
        :key="i"
        class="select-tag"
        :style="{ '--tag-colour': getSelectColour(String(item)) }"
      >
        {{ item }}
      </span>
    </template>

    <!-- URL as link -->
    <template v-else-if="type === 'URL' && value">
      <a class="url-link" :href="String(value)" target="_blank" rel="noopener" @click.stop>
        {{ value }}
      </a>
    </template>

    <!-- Email as mailto -->
    <template v-else-if="type === 'EMAIL' && value">
      <a class="email-link" :href="`mailto:${value}`" @click.stop>
        {{ value }}
      </a>
    </template>

    <!-- Default text display -->
    <template v-else>
      {{ formatValue() }}
    </template>
  </span>
</template>

<style scoped>
.cell-renderer {
  display: flex;
  gap: var(--space-1);
  align-items: center;
  flex-wrap: wrap;
  min-height: 20px;
  font-size: var(--text-sm);
  color: var(--color-text-primary);
  overflow: hidden;
}

.type-created_time,
.type-updated_time,
.type-created_by {
  color: var(--color-text-tertiary);
}

.checkbox-display {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border: 1.5px solid var(--color-border-strong);
  border-radius: var(--radius-sm);
  transition: all var(--transition-fast);
}

.checkbox-display.checked {
  color: var(--color-text-inverse);
  background: var(--color-accent);
  border-color: var(--color-accent);
}

.select-tag {
  display: inline-flex;
  padding: 1px var(--space-2);
  font-size: var(--text-xs);
  font-weight: 500;
  color: var(--tag-colour, var(--color-accent));
  background: color-mix(in srgb, var(--tag-colour, var(--color-accent)) 12%, transparent);
  border-radius: var(--radius-sm);
  white-space: nowrap;
}

.url-link,
.email-link {
  color: var(--color-accent);
  text-decoration: none;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.url-link:hover,
.email-link:hover {
  text-decoration: underline;
}
</style>
