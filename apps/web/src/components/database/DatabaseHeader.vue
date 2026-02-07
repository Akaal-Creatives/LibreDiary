<script setup lang="ts">
import { ref } from 'vue';
import { useDatabasesStore } from '@/stores';
import type { ViewType } from '@librediary/shared';

const databasesStore = useDatabasesStore();

const isEditingName = ref(false);
const editName = ref('');
const showNewViewMenu = ref(false);

function startEditing() {
  editName.value = databasesStore.currentDatabase?.name ?? '';
  isEditingName.value = true;
}

async function saveName() {
  isEditingName.value = false;
  const trimmed = editName.value.trim();
  if (!trimmed || !databasesStore.currentDatabaseId) return;
  if (trimmed === databasesStore.currentDatabase?.name) return;
  await databasesStore.updateDatabase(databasesStore.currentDatabaseId, { name: trimmed });
}

function handleNameKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter') {
    event.preventDefault();
    (event.target as HTMLInputElement).blur();
  }
  if (event.key === 'Escape') {
    isEditingName.value = false;
  }
}

function switchView(viewId: string) {
  databasesStore.setActiveView(viewId);
}

async function addView(type: ViewType) {
  showNewViewMenu.value = false;
  const name =
    type === 'TABLE'
      ? 'Table view'
      : type === 'KANBAN'
        ? 'Kanban view'
        : type === 'CALENDAR'
          ? 'Calendar view'
          : 'Gallery view';
  const view = await databasesStore.createView({ name, type });
  databasesStore.setActiveView(view.id);
}

async function deleteView(viewId: string) {
  if (databasesStore.views.length <= 1) return;
  await databasesStore.deleteView(viewId);
}
</script>

<template>
  <div class="database-header">
    <!-- Database Name -->
    <div class="database-name-section">
      <input
        v-if="isEditingName"
        v-model="editName"
        class="database-name-input"
        type="text"
        autofocus
        @blur="saveName"
        @keydown="handleNameKeydown"
      />
      <h1 v-else class="database-name" @click="startEditing">
        {{ databasesStore.currentDatabase?.name ?? 'Untitled' }}
      </h1>
    </div>

    <!-- View Tabs -->
    <div class="view-tabs">
      <button
        v-for="view in databasesStore.views"
        :key="view.id"
        class="view-tab"
        :class="{ active: databasesStore.activeView?.id === view.id }"
        @click="switchView(view.id)"
        @contextmenu.prevent="deleteView(view.id)"
      >
        <span class="view-tab-icon">
          <!-- Table icon -->
          <svg v-if="view.type === 'TABLE'" width="14" height="14" viewBox="0 0 14 14" fill="none">
            <rect
              x="1"
              y="1"
              width="12"
              height="12"
              rx="1.5"
              stroke="currentColor"
              stroke-width="1.2"
            />
            <line x1="1" y1="4.5" x2="13" y2="4.5" stroke="currentColor" stroke-width="1.2" />
            <line x1="5" y1="4.5" x2="5" y2="13" stroke="currentColor" stroke-width="1.2" />
            <line x1="9" y1="4.5" x2="9" y2="13" stroke="currentColor" stroke-width="1.2" />
          </svg>
          <!-- Kanban icon -->
          <svg
            v-else-if="view.type === 'KANBAN'"
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
          >
            <rect
              x="1"
              y="1"
              width="3.5"
              height="8"
              rx="0.75"
              stroke="currentColor"
              stroke-width="1.2"
            />
            <rect
              x="5.25"
              y="1"
              width="3.5"
              height="11"
              rx="0.75"
              stroke="currentColor"
              stroke-width="1.2"
            />
            <rect
              x="9.5"
              y="1"
              width="3.5"
              height="6"
              rx="0.75"
              stroke="currentColor"
              stroke-width="1.2"
            />
          </svg>
          <!-- Calendar icon -->
          <svg
            v-else-if="view.type === 'CALENDAR'"
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill="none"
          >
            <rect
              x="1"
              y="2.5"
              width="12"
              height="10.5"
              rx="1.5"
              stroke="currentColor"
              stroke-width="1.2"
            />
            <line x1="1" y1="5.5" x2="13" y2="5.5" stroke="currentColor" stroke-width="1.2" />
            <line
              x1="4"
              y1="1"
              x2="4"
              y2="3.5"
              stroke="currentColor"
              stroke-width="1.2"
              stroke-linecap="round"
            />
            <line
              x1="10"
              y1="1"
              x2="10"
              y2="3.5"
              stroke="currentColor"
              stroke-width="1.2"
              stroke-linecap="round"
            />
          </svg>
          <!-- Gallery icon -->
          <svg v-else width="14" height="14" viewBox="0 0 14 14" fill="none">
            <rect
              x="1"
              y="1"
              width="5"
              height="5"
              rx="1"
              stroke="currentColor"
              stroke-width="1.2"
            />
            <rect
              x="8"
              y="1"
              width="5"
              height="5"
              rx="1"
              stroke="currentColor"
              stroke-width="1.2"
            />
            <rect
              x="1"
              y="8"
              width="5"
              height="5"
              rx="1"
              stroke="currentColor"
              stroke-width="1.2"
            />
            <rect
              x="8"
              y="8"
              width="5"
              height="5"
              rx="1"
              stroke="currentColor"
              stroke-width="1.2"
            />
          </svg>
        </span>
        <span class="view-tab-label">{{ view.name }}</span>
      </button>

      <!-- Add View Button -->
      <div class="add-view-wrapper">
        <button class="add-view-btn" title="Add view" @click="showNewViewMenu = !showNewViewMenu">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 2.5V11.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
            <path d="M2.5 7H11.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
          </svg>
        </button>
        <div v-if="showNewViewMenu" class="new-view-menu">
          <button class="new-view-option" @click="addView('TABLE')">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect
                x="1"
                y="1"
                width="12"
                height="12"
                rx="1.5"
                stroke="currentColor"
                stroke-width="1.2"
              />
              <line x1="1" y1="4.5" x2="13" y2="4.5" stroke="currentColor" stroke-width="1.2" />
              <line x1="5" y1="4.5" x2="5" y2="13" stroke="currentColor" stroke-width="1.2" />
            </svg>
            Table
          </button>
          <button class="new-view-option" @click="addView('KANBAN')">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect
                x="1"
                y="1"
                width="3.5"
                height="8"
                rx="0.75"
                stroke="currentColor"
                stroke-width="1.2"
              />
              <rect
                x="5.25"
                y="1"
                width="3.5"
                height="11"
                rx="0.75"
                stroke="currentColor"
                stroke-width="1.2"
              />
              <rect
                x="9.5"
                y="1"
                width="3.5"
                height="6"
                rx="0.75"
                stroke="currentColor"
                stroke-width="1.2"
              />
            </svg>
            Kanban
          </button>
          <button class="new-view-option" @click="addView('CALENDAR')">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect
                x="1"
                y="2.5"
                width="12"
                height="10.5"
                rx="1.5"
                stroke="currentColor"
                stroke-width="1.2"
              />
              <line x1="1" y1="5.5" x2="13" y2="5.5" stroke="currentColor" stroke-width="1.2" />
              <line
                x1="4"
                y1="1"
                x2="4"
                y2="3.5"
                stroke="currentColor"
                stroke-width="1.2"
                stroke-linecap="round"
              />
              <line
                x1="10"
                y1="1"
                x2="10"
                y2="3.5"
                stroke="currentColor"
                stroke-width="1.2"
                stroke-linecap="round"
              />
            </svg>
            Calendar
          </button>
          <button class="new-view-option" @click="addView('GALLERY')">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect
                x="1"
                y="1"
                width="5"
                height="5"
                rx="1"
                stroke="currentColor"
                stroke-width="1.2"
              />
              <rect
                x="8"
                y="1"
                width="5"
                height="5"
                rx="1"
                stroke="currentColor"
                stroke-width="1.2"
              />
              <rect
                x="1"
                y="8"
                width="5"
                height="5"
                rx="1"
                stroke="currentColor"
                stroke-width="1.2"
              />
              <rect
                x="8"
                y="8"
                width="5"
                height="5"
                rx="1"
                stroke="currentColor"
                stroke-width="1.2"
              />
            </svg>
            Gallery
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.database-header {
  padding: var(--space-4) var(--space-6);
  border-bottom: 1px solid var(--color-border-subtle);
}

.database-name-section {
  margin-bottom: var(--space-3);
}

.database-name {
  margin: 0;
  padding: var(--space-1) 0;
  font-size: var(--text-2xl);
  font-weight: 700;
  color: var(--color-text-primary);
  cursor: pointer;
  letter-spacing: -0.02em;
  border-radius: var(--radius-sm);
  transition: background var(--transition-fast);
}

.database-name:hover {
  background: var(--color-hover);
}

.database-name-input {
  width: 100%;
  padding: var(--space-1) 0;
  font-family: inherit;
  font-size: var(--text-2xl);
  font-weight: 700;
  color: var(--color-text-primary);
  background: transparent;
  border: none;
  border-bottom: 2px solid var(--color-accent);
  outline: none;
  letter-spacing: -0.02em;
}

/* View Tabs */
.view-tabs {
  display: flex;
  gap: var(--space-1);
  align-items: center;
  overflow-x: auto;
}

.view-tabs::-webkit-scrollbar {
  display: none;
}

.view-tab {
  display: flex;
  gap: var(--space-2);
  align-items: center;
  padding: var(--space-2) var(--space-3);
  font-family: inherit;
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--color-text-tertiary);
  white-space: nowrap;
  cursor: pointer;
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  border-radius: var(--radius-sm) var(--radius-sm) 0 0;
  transition: all var(--transition-fast);
}

.view-tab:hover {
  color: var(--color-text-secondary);
  background: var(--color-hover);
}

.view-tab.active {
  color: var(--color-accent);
  border-bottom-color: var(--color-accent);
}

.view-tab-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.view-tab-label {
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Add View */
.add-view-wrapper {
  position: relative;
}

.add-view-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  color: var(--color-text-tertiary);
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: var(--radius-sm);
  transition: all var(--transition-fast);
}

.add-view-btn:hover {
  color: var(--color-text-primary);
  background: var(--color-hover);
}

.new-view-menu {
  position: absolute;
  top: 100%;
  left: 0;
  z-index: var(--z-dropdown);
  display: flex;
  flex-direction: column;
  min-width: 160px;
  margin-top: var(--space-1);
  padding: var(--space-1);
  background: var(--color-surface-elevated);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
}

.new-view-option {
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

.new-view-option:hover {
  color: var(--color-text-primary);
  background: var(--color-hover);
}
</style>
