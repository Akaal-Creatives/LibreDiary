<script setup lang="ts">
import { computed } from 'vue';
import type { PropertyType, FilesCellItem, RecurrenceStatus } from '@librediary/shared';
import { formatDuration } from '@librediary/shared/utils';
import type { DurationConfig } from '@librediary/shared/utils';
import { useOrganizationsStore } from '@/stores/organizations';
import { useDatabasesStore } from '@/stores/databases';
import { resolveUploadUrl } from '@/utils/uploadUrl';

const props = defineProps<{
  value: unknown;
  type: PropertyType;
  config?: Record<string, unknown> | null;
  rowCells?: Record<string, unknown> | null;
}>();

const organizationsStore = useOrganizationsStore();
const databasesStore = useDatabasesStore();

const personUser = computed(() => {
  if (props.type !== 'PERSON' || !props.value) return null;
  const userId = String(props.value);
  const member = organizationsStore.members.find((m) => m.user.id === userId);
  return member?.user ?? null;
});

const personInitials = computed(() => {
  const user = personUser.value;
  if (!user?.name) return '?';
  return user.name
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0]!.toUpperCase())
    .slice(0, 2)
    .join('');
});

const relationItems = computed(() => {
  if (props.type !== 'RELATION' || !Array.isArray(props.value) || props.value.length === 0)
    return [];
  const targetDbId = props.config?.targetDatabaseId as string | undefined;
  const targetDb = targetDbId ? databasesStore.relatedDatabases.get(targetDbId) : undefined;
  const firstPropId = targetDb?.properties?.sort((a, b) => a.position - b.position)[0]?.id;

  return (props.value as string[]).map((rowId) => {
    if (!targetDb || !firstPropId) return { id: rowId, title: rowId };
    const row = targetDb.rows.find((r) => r.id === rowId);
    if (!row) return { id: rowId, title: rowId };
    const cells = row.cells as Record<string, unknown>;
    return { id: rowId, title: String(cells[firstPropId] ?? rowId) };
  });
});

const filesItems = computed<FilesCellItem[]>(() => {
  if (props.type !== 'FILES' || !Array.isArray(props.value) || props.value.length === 0) return [];
  return props.value as FilesCellItem[];
});

function getFileIconType(mimeType: string): string {
  return mimeType.startsWith('image/') ? 'image' : 'file';
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface RecurrenceValue {
  rule: string | null;
  status: RecurrenceStatus | null;
  nextAt: string | null;
}

const recurrenceValue = computed<RecurrenceValue | null>(() => {
  if (props.type !== 'RECURRENCE') return null;
  const v = props.value as RecurrenceValue | null;
  if (!v?.rule) return null;
  return v;
});

function formatNextOccurrence(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

const rollupValue = computed<string>(() => {
  if (props.type !== 'ROLLUP' || !props.rowCells || !props.config) return '';
  const relationPropertyId = props.config.relationPropertyId as string;
  const targetPropertyId = props.config.targetPropertyId as string;
  const aggregation = props.config.aggregation as string;
  if (!relationPropertyId || !targetPropertyId || !aggregation) return '';

  const relatedRowIds = props.rowCells[relationPropertyId];
  if (!Array.isArray(relatedRowIds) || relatedRowIds.length === 0) return '';

  // Find the relation property to get the target database ID
  const relationProp = databasesStore.properties.find((p) => p.id === relationPropertyId);
  const targetDbId = (relationProp?.config as Record<string, unknown> | null)?.targetDatabaseId as
    | string
    | undefined;
  if (!targetDbId) return '';

  const targetDb = databasesStore.relatedDatabases.get(targetDbId);
  if (!targetDb) return '';

  const values = (relatedRowIds as string[])
    .map((rowId) => {
      const row = targetDb.rows.find((r) => r.id === rowId);
      if (!row) return null;
      return Number((row.cells as Record<string, unknown>)[targetPropertyId]);
    })
    .filter((v): v is number => v !== null && !isNaN(v));

  if (aggregation === 'COUNT') return String(relatedRowIds.length);
  if (values.length === 0) return '';

  switch (aggregation) {
    case 'SUM':
      return String(values.reduce((a, b) => a + b, 0));
    case 'AVG':
      return String(values.reduce((a, b) => a + b, 0) / values.length);
    case 'MIN':
      return String(Math.min(...values));
    case 'MAX':
      return String(Math.max(...values));
    default:
      return '';
  }
});

const formulaValue = computed<string>(() => {
  if (props.type !== 'FORMULA' || !props.rowCells || !props.config) return '';
  const expression = props.config.expression as string;
  if (!expression) return '';

  // Replace prop("Name") references with actual values
  const resolved = expression.replace(/prop\("([^"]+)"\)/g, (_match, propName: string) => {
    const prop = databasesStore.properties.find((p) => p.name === propName);
    if (!prop) return 'null';
    const val = props.rowCells![prop.id];
    if (val == null) return 'null';
    return String(val);
  });

  // Check for any unresolved null values
  if (resolved.includes('null')) return '';

  try {
    // Safe evaluation of simple math expressions
    const result = Function(`"use strict"; return (${resolved});`)();
    return String(result);
  } catch {
    return '';
  }
});

function formatValue(): string {
  if (props.value == null) return '';

  switch (props.type) {
    case 'TEXT':
    case 'URL':
    case 'EMAIL':
    case 'PHONE':
      return String(props.value);

    case 'PERSON': {
      if (personUser.value) return personUser.value.name ?? String(props.value);
      return String(props.value);
    }

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

    case 'DURATION': {
      const ms = Number(props.value);
      if (isNaN(ms)) return '';
      const durationConfig: DurationConfig = {
        precision: (props.config?.precision as DurationConfig['precision']) ?? 'seconds',
        format: (props.config?.format as DurationConfig['format']) ?? 'hms',
      };
      return formatDuration(ms, durationConfig);
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

    <!-- Person -->
    <template v-else-if="type === 'PERSON' && value">
      <span class="person-badge">
        <img
          v-if="personUser?.avatarUrl"
          class="person-avatar"
          :src="resolveUploadUrl(personUser.avatarUrl)"
          :alt="personUser.name ?? ''"
        />
        <span v-else class="person-initials">{{ personInitials }}</span>
        <span class="person-name">{{ personUser?.name ?? String(value) }}</span>
      </span>
    </template>

    <!-- Relation pills -->
    <template v-else-if="type === 'RELATION' && relationItems.length > 0">
      <span v-for="item in relationItems" :key="item.id" class="relation-pill">
        {{ item.title }}
      </span>
    </template>

    <!-- Files pills -->
    <template v-else-if="type === 'FILES' && filesItems.length > 0">
      <a
        v-for="file in filesItems"
        :key="file.id"
        class="file-pill"
        :href="resolveUploadUrl(file.url)"
        target="_blank"
        rel="noopener"
        :title="`${file.name} (${formatFileSize(file.size)})`"
        @click.stop
      >
        <span
          class="file-icon"
          :class="{ 'file-icon--image': getFileIconType(file.mimeType) === 'image' }"
        >
          <!-- Image icon -->
          <svg
            v-if="getFileIconType(file.mimeType) === 'image'"
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
          >
            <rect
              x="1"
              y="2"
              width="10"
              height="8"
              rx="1"
              stroke="currentColor"
              stroke-width="1.2"
            />
            <circle cx="4" cy="5" r="1" fill="currentColor" />
            <path
              d="M1 9L4 6L6 8L8 5.5L11 9"
              stroke="currentColor"
              stroke-width="1"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          <!-- Generic file icon -->
          <svg v-else width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path
              d="M3 1H7.5L10 3.5V11H3V1Z"
              stroke="currentColor"
              stroke-width="1.2"
              stroke-linejoin="round"
            />
            <path d="M7 1V4H10" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round" />
          </svg>
        </span>
        <span class="file-pill-name">{{ file.name }}</span>
      </a>
    </template>

    <!-- Recurrence -->
    <template v-else-if="type === 'RECURRENCE' && recurrenceValue">
      <span
        class="recurrence-badge"
        :class="`recurrence-badge--${(recurrenceValue.status ?? 'active').toLowerCase()}`"
      >
        <svg width="11" height="11" viewBox="0 0 11 11" fill="none" aria-hidden="true">
          <path
            d="M1.5 5.5A4 4 0 0 1 9 3.5M9.5 5.5A4 4 0 0 1 2 7.5"
            stroke="currentColor"
            stroke-width="1.3"
            stroke-linecap="round"
          />
          <path
            d="M7.5 2L9 3.5L7.5 5"
            stroke="currentColor"
            stroke-width="1.3"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
        {{ recurrenceValue.status === 'PAUSED' ? 'Paused' : recurrenceValue.status === 'CANCELLED' ? 'Cancelled' : formatNextOccurrence(recurrenceValue.nextAt) || 'Active' }}
      </span>
    </template>

    <!-- Rollup -->
    <template v-else-if="type === 'ROLLUP' && rollupValue">
      {{ rollupValue }}
    </template>

    <!-- Formula -->
    <template v-else-if="type === 'FORMULA' && formulaValue">
      {{ formulaValue }}
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

/* Person */
.person-badge {
  display: inline-flex;
  gap: var(--space-1-5);
  align-items: center;
}

.person-avatar {
  width: 20px;
  height: 20px;
  border-radius: var(--radius-full);
  object-fit: cover;
  flex-shrink: 0;
}

.person-initials {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  font-size: 9px;
  font-weight: 600;
  color: var(--color-text-inverse);
  background: var(--color-accent);
  border-radius: var(--radius-full);
  flex-shrink: 0;
}

.person-name {
  font-size: var(--text-sm);
  color: var(--color-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Relation */
.relation-pill {
  display: inline-flex;
  padding: 1px var(--space-2);
  font-size: var(--text-xs);
  font-weight: 500;
  color: var(--color-accent);
  background: color-mix(in srgb, var(--color-accent) 10%, transparent);
  border-radius: var(--radius-sm);
  white-space: nowrap;
}

/* Files */
.file-pill {
  display: inline-flex;
  gap: var(--space-1);
  align-items: center;
  padding: 1px var(--space-2);
  font-size: var(--text-xs);
  font-weight: 500;
  color: var(--color-text-secondary);
  background: color-mix(in srgb, var(--color-accent) 8%, transparent);
  border-radius: var(--radius-sm);
  white-space: nowrap;
  text-decoration: none;
  transition: background var(--transition-fast);
}

.file-pill:hover {
  background: color-mix(in srgb, var(--color-accent) 16%, transparent);
  color: var(--color-accent);
}

.file-icon {
  display: flex;
  align-items: center;
  color: var(--color-text-tertiary);
  flex-shrink: 0;
}

.file-icon--image {
  color: var(--color-accent);
}

.file-pill-name {
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 120px;
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

/* Recurrence */
.recurrence-badge {
  display: inline-flex;
  gap: var(--space-1);
  align-items: center;
  padding: 1px var(--space-2);
  font-size: var(--text-xs);
  font-weight: 500;
  border-radius: var(--radius-sm);
  white-space: nowrap;
  color: var(--color-accent);
  background: color-mix(in srgb, var(--color-accent) 10%, transparent);
}

.recurrence-badge--paused {
  color: var(--color-warning, #d97706);
  background: color-mix(in srgb, var(--color-warning, #d97706) 10%, transparent);
}

.recurrence-badge--cancelled {
  color: var(--color-text-tertiary);
  background: var(--color-surface-sunken);
}
</style>
