<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useDatabasesStore } from '@/stores';
import type { DatabaseProperty } from '@librediary/shared';

const props = defineProps<{
  property: DatabaseProperty;
}>();

const emit = defineEmits<{
  close: [];
}>();

const databasesStore = useDatabasesStore();
const isRenaming = ref(false);
const renameName = ref('');
const menuRef = ref<HTMLElement | null>(null);

function handleClickOutside(event: MouseEvent) {
  if (menuRef.value && !menuRef.value.contains(event.target as Node)) {
    emit('close');
  }
}

onMounted(() => {
  document.addEventListener('mousedown', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('mousedown', handleClickOutside);
});

function startRename() {
  renameName.value = props.property.name;
  isRenaming.value = true;
}

async function saveRename() {
  isRenaming.value = false;
  const trimmed = renameName.value.trim();
  if (!trimmed || trimmed === props.property.name) return;
  await databasesStore.updateProperty(props.property.id, { name: trimmed });
  emit('close');
}

function handleRenameKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter') {
    event.preventDefault();
    saveRename();
  }
  if (event.key === 'Escape') {
    isRenaming.value = false;
  }
}

async function sortAsc() {
  const view = databasesStore.activeView;
  if (!view) return;
  const config = (view.config as Record<string, unknown>) ?? {};
  config.sorts = [{ propertyId: props.property.id, direction: 'asc' }];
  await databasesStore.updateView(view.id, { config });
  emit('close');
}

async function sortDesc() {
  const view = databasesStore.activeView;
  if (!view) return;
  const config = (view.config as Record<string, unknown>) ?? {};
  config.sorts = [{ propertyId: props.property.id, direction: 'desc' }];
  await databasesStore.updateView(view.id, { config });
  emit('close');
}

async function deleteProperty() {
  if (props.property.position === 0) return;
  await databasesStore.deleteProperty(props.property.id);
  emit('close');
}

const isFirstProperty = props.property.position === 0;
</script>

<template>
  <div ref="menuRef" class="column-menu" @click.stop>
    <!-- Rename mode -->
    <div v-if="isRenaming" class="menu-rename">
      <input
        v-model="renameName"
        class="rename-input"
        type="text"
        autofocus
        @blur="saveRename"
        @keydown="handleRenameKeydown"
      />
    </div>

    <!-- Menu options -->
    <template v-else>
      <button class="menu-item" @click="sortAsc">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M7 2.5V11.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" />
          <path
            d="M3.5 6L7 2.5L10.5 6"
            stroke="currentColor"
            stroke-width="1.2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
        Sort A to Z
      </button>
      <button class="menu-item" @click="sortDesc">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M7 2.5V11.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" />
          <path
            d="M3.5 8L7 11.5L10.5 8"
            stroke="currentColor"
            stroke-width="1.2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
        Sort Z to A
      </button>
      <div class="menu-separator"></div>
      <button class="menu-item" @click="startRename">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path
            d="M8.5 2.5L11.5 5.5L5 12H2V9L8.5 2.5Z"
            stroke="currentColor"
            stroke-width="1.2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
        Rename
      </button>
      <button class="menu-item danger" :disabled="isFirstProperty" @click="deleteProperty">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M2.5 4.5H11.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" />
          <path
            d="M5 4.5V3.5C5 2.94772 5.44772 2.5 6 2.5H8C8.55228 2.5 9 2.94772 9 3.5V4.5"
            stroke="currentColor"
            stroke-width="1.2"
          />
          <path
            d="M3.5 4.5L4 11.5C4.02 11.776 4.24772 12 4.5 12H9.5C9.75228 12 9.98 11.776 10 11.5L10.5 4.5"
            stroke="currentColor"
            stroke-width="1.2"
          />
        </svg>
        Delete
      </button>
    </template>
  </div>
</template>

<style scoped>
.column-menu {
  position: absolute;
  top: 100%;
  left: 0;
  z-index: var(--z-dropdown);
  display: flex;
  flex-direction: column;
  min-width: 180px;
  padding: var(--space-1);
  margin-top: var(--space-1);
  background: var(--color-surface-elevated);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
}

.menu-item {
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

.menu-item:hover {
  color: var(--color-text-primary);
  background: var(--color-hover);
}

.menu-item.danger:hover {
  color: var(--color-error);
}

.menu-item:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.menu-item:disabled:hover {
  background: transparent;
  color: var(--color-text-secondary);
}

.menu-separator {
  height: 1px;
  margin: var(--space-1) 0;
  background: var(--color-border-subtle);
}

.menu-rename {
  padding: var(--space-2);
}

.rename-input {
  width: 100%;
  padding: var(--space-2);
  font-family: inherit;
  font-size: var(--text-sm);
  color: var(--color-text-primary);
  background: var(--color-surface-sunken);
  border: 1px solid var(--color-accent);
  border-radius: var(--radius-sm);
  outline: none;
}
</style>
