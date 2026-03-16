<script setup lang="ts">
import { ref, computed } from 'vue';
import { useDatabasesStore } from '@/stores';
import { CellRenderer } from './cells';
import { resolveUploadUrl } from '@/utils/uploadUrl';

const databasesStore = useDatabasesStore();

const coverPropertyId = computed(() => {
  const config = databasesStore.activeView?.config as Record<string, unknown> | null;
  return (config?.coverProperty as string) ?? null;
});

const cardSize = computed(() => {
  const config = databasesStore.activeView?.config as Record<string, unknown> | null;
  return (config?.cardSize as string) ?? 'medium';
});

const urlProperties = computed(() => databasesStore.properties.filter((p) => p.type === 'URL'));

const titleProperty = computed(() => databasesStore.sortedProperties[0] ?? null);

const visibleCardProperties = computed(() =>
  databasesStore.sortedProperties.filter(
    (p) => p.id !== titleProperty.value?.id && p.id !== coverPropertyId.value
  )
);

const rows = computed(() => databasesStore.filteredAndSortedRows);

const brokenImages = ref<Set<string>>(new Set());

function getCoverUrl(row: { id: string; cells: unknown }): string | null {
  if (!coverPropertyId.value) return null;
  const val = (row.cells as Record<string, unknown>)[coverPropertyId.value];
  if (val == null || val === '') return null;
  if (brokenImages.value.has(row.id)) return null;
  return String(val);
}

function getCellValue(row: { cells: unknown }, propertyId: string): unknown {
  return (row.cells as Record<string, unknown>)[propertyId] ?? null;
}

function onImageError(rowId: string) {
  brokenImages.value.add(rowId);
}

async function setCoverProperty(value: string) {
  const view = databasesStore.activeView;
  if (!view) return;
  const config = { ...((view.config as Record<string, unknown>) ?? {}) };
  if (value === '__none__') {
    delete config.coverProperty;
  } else {
    config.coverProperty = value;
  }
  await databasesStore.updateView(view.id, { config });
}

async function setCardSize(size: string) {
  const view = databasesStore.activeView;
  if (!view) return;
  const config = { ...((view.config as Record<string, unknown>) ?? {}), cardSize: size };
  await databasesStore.updateView(view.id, { config });
}
</script>

<template>
  <div class="gallery-view">
    <!-- Cover property selector — prompt when none configured -->
    <div v-if="!coverPropertyId" class="gallery-cover-bar gallery-cover-prompt">
      <div class="cover-prompt-content">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <rect
            x="2"
            y="3"
            width="16"
            height="14"
            rx="2"
            stroke="currentColor"
            stroke-width="1.2"
          />
          <circle cx="7" cy="9" r="2" stroke="currentColor" stroke-width="1.2" />
          <path
            d="M2 14L6 10L10 14L14 8L18 14"
            stroke="currentColor"
            stroke-width="1.2"
            stroke-linejoin="round"
          />
        </svg>
        <span class="cover-property-label">Cover image</span>
        <select
          class="cover-property-select"
          @change="setCoverProperty(($event.target as HTMLSelectElement).value)"
        >
          <option value="" disabled selected>Select a URL property</option>
          <option value="__none__">None</option>
          <option v-for="prop in urlProperties" :key="prop.id" :value="prop.id">
            {{ prop.name }}
          </option>
        </select>
      </div>
    </div>

    <!-- Cover property bar when configured -->
    <div v-else class="gallery-cover-bar">
      <span class="cover-property-label">Cover</span>
      <select
        class="cover-property-select"
        :value="coverPropertyId"
        @change="setCoverProperty(($event.target as HTMLSelectElement).value)"
      >
        <option value="__none__">None</option>
        <option v-for="prop in urlProperties" :key="prop.id" :value="prop.id">
          {{ prop.name }}
        </option>
      </select>
      <span class="bar-separator"></span>
      <span class="cover-property-label">Size</span>
      <select
        class="card-size-select"
        :value="cardSize"
        @change="setCardSize(($event.target as HTMLSelectElement).value)"
      >
        <option value="small">Small</option>
        <option value="medium">Medium</option>
        <option value="large">Large</option>
      </select>
    </div>

    <!-- Gallery grid -->
    <div class="gallery-grid" :class="`gallery-grid--${cardSize}`">
      <div v-for="row in rows" :key="row.id" class="gallery-card">
        <!-- Cover image -->
        <div v-if="coverPropertyId" class="gallery-card-cover">
          <img
            v-if="getCoverUrl(row)"
            :src="resolveUploadUrl(getCoverUrl(row)!)"
            :alt="String(getCellValue(row, titleProperty?.id ?? '') ?? '')"
            class="cover-image"
            @error="onImageError(row.id)"
          />
          <div v-else class="cover-placeholder">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <rect
                x="3"
                y="4"
                width="18"
                height="16"
                rx="2"
                stroke="currentColor"
                stroke-width="1.5"
              />
              <circle cx="8.5" cy="10.5" r="2" stroke="currentColor" stroke-width="1.5" />
              <path
                d="M3 16L7.5 11.5L11.5 15.5L15.5 10L21 16"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linejoin="round"
              />
            </svg>
          </div>
        </div>

        <!-- Card content -->
        <div class="gallery-card-content">
          <div class="gallery-card-title">
            {{ titleProperty ? getCellValue(row, titleProperty.id) : '' }}
          </div>
          <div v-if="visibleCardProperties.length > 0" class="gallery-card-fields">
            <div v-for="prop in visibleCardProperties" :key="prop.id" class="gallery-card-field">
              <span class="gallery-card-field-label">{{ prop.name }}</span>
              <CellRenderer
                :value="getCellValue(row, prop.id)"
                :type="prop.type"
                :config="(prop.config as Record<string, unknown>) ?? null"
                :row-cells="row.cells as Record<string, unknown>"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.gallery-view {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

/* Cover property bar */
.gallery-cover-bar {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) var(--space-6);
  border-bottom: 1px solid var(--color-border-subtle);
}

.gallery-cover-prompt {
  justify-content: center;
  padding: var(--space-3) var(--space-6);
  border-bottom: 1px solid var(--color-border-subtle);
}

.cover-prompt-content {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  color: var(--color-text-tertiary);
}

.cover-property-label {
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--color-text-tertiary);
}

.cover-property-select,
.card-size-select {
  padding: var(--space-1) var(--space-2);
  font-family: inherit;
  font-size: var(--text-sm);
  color: var(--color-text-primary);
  background: var(--color-surface-sunken);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  outline: none;
  cursor: pointer;
  transition: border-color var(--transition-fast);
}

.cover-property-select:focus,
.card-size-select:focus {
  border-color: var(--color-accent);
}

.bar-separator {
  width: 1px;
  height: 16px;
  background: var(--color-border);
}

/* Gallery grid */
.gallery-grid {
  flex: 1;
  display: grid;
  gap: var(--space-4);
  padding: var(--space-6);
  overflow-y: auto;
  min-height: 0;
  align-content: start;
}

.gallery-grid--small {
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
}

.gallery-grid--medium {
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
}

.gallery-grid--large {
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
}

/* Gallery card */
.gallery-card {
  display: flex;
  flex-direction: column;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
  box-shadow: var(--shadow-xs);
  transition: all var(--transition-base);
}

.gallery-card:hover {
  border-color: var(--color-border-strong);
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}

/* Cover image */
.gallery-card-cover {
  width: 100%;
  aspect-ratio: 16 / 10;
  background: var(--color-surface-sunken);
  overflow: hidden;
  position: relative;
}

.cover-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.cover-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  color: var(--color-text-tertiary);
  opacity: 0.3;
}

/* Card content */
.gallery-card-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-3);
}

.gallery-card-title {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-text-primary);
  line-height: var(--leading-snug, 1.375);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.gallery-card-fields {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.gallery-card-field {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-xs);
}

.gallery-card-field-label {
  flex-shrink: 0;
  color: var(--color-text-tertiary);
  font-weight: 500;
}
</style>
