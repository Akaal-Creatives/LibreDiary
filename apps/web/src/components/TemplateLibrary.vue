<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useTemplatesStore } from '@/stores/templates';
import type { Template } from '@librediary/shared';

const emit = defineEmits<{
  useTemplate: [template: Template];
  close: [];
}>();

const templatesStore = useTemplatesStore();

const allCategories = ['All', 'Meeting', 'Project', 'Personal', 'Team', 'Other'];
const activeCategory = ref('All');

onMounted(() => {
  templatesStore.fetchTemplates();
});

watch(activeCategory, (cat) => {
  templatesStore.categoryFilter = cat === 'All' ? null : cat;
});

function handleSearch(event: Event) {
  const target = event.target as HTMLInputElement;
  templatesStore.searchQuery = target.value;
}

function selectTemplate(template: Template) {
  emit('useTemplate', template);
}

function getCategoryIcon(category: string | null): string {
  switch (category) {
    case 'Meeting':
      return '🤝';
    case 'Project':
      return '📋';
    case 'Personal':
      return '📓';
    case 'Team':
      return '👥';
    default:
      return '📄';
  }
}
</script>

<template>
  <div class="template-library">
    <!-- Header -->
    <div class="library-header">
      <h2 class="library-title">Templates</h2>
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

    <!-- Search -->
    <div class="library-search">
      <svg class="search-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path
          d="M7 12C9.76142 12 12 9.76142 12 7C12 4.23858 9.76142 2 7 2C4.23858 2 2 4.23858 2 7C2 9.76142 4.23858 12 7 12Z"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
        />
        <path
          d="M14 14L10.5 10.5"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
        />
      </svg>
      <input
        type="text"
        class="search-input"
        placeholder="Search templates..."
        :value="templatesStore.searchQuery"
        @input="handleSearch"
      />
    </div>

    <!-- Category Tabs -->
    <div class="category-tabs">
      <button
        v-for="cat in allCategories"
        :key="cat"
        :class="['category-tab', { active: activeCategory === cat }]"
        @click="activeCategory = cat"
      >
        {{ cat }}
      </button>
    </div>

    <!-- Templates Grid -->
    <div v-if="templatesStore.loading" class="loading-state">
      <div class="spinner" />
      <span>Loading templates...</span>
    </div>

    <div v-else-if="templatesStore.filteredTemplates.length === 0" class="empty-state">
      <div class="empty-icon">
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
          <rect
            x="4"
            y="4"
            width="24"
            height="24"
            rx="3"
            stroke="currentColor"
            stroke-width="1.5"
          />
          <path d="M4 11H28" stroke="currentColor" stroke-width="1.5" />
          <path d="M12 11V28" stroke="currentColor" stroke-width="1.5" />
        </svg>
      </div>
      <p class="empty-text">No templates found</p>
      <p class="empty-hint">Try adjusting your search or category filter</p>
    </div>

    <div v-else class="templates-grid">
      <button
        v-for="template in templatesStore.filteredTemplates"
        :key="template.id"
        class="template-card"
        @click="selectTemplate(template)"
      >
        <div class="template-icon">
          {{ template.icon || getCategoryIcon(template.category) }}
        </div>
        <div class="template-info">
          <h3 class="template-name">{{ template.name }}</h3>
          <p v-if="template.description" class="template-description">
            {{ template.description }}
          </p>
        </div>
        <div class="template-meta">
          <span v-if="template.category" class="category-badge">{{ template.category }}</span>
          <span v-if="template.isBuiltIn" class="builtin-badge">Built-in</span>
        </div>
      </button>
    </div>
  </div>
</template>

<style scoped>
.template-library {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.library-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-4) var(--space-5);
  border-bottom: 1px solid var(--color-border);
}

.library-title {
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

.library-search {
  position: relative;
  display: flex;
  align-items: center;
  padding: var(--space-3) var(--space-5);
}

.search-icon {
  position: absolute;
  left: calc(var(--space-5) + var(--space-3));
  color: var(--color-text-tertiary);
  pointer-events: none;
}

.search-input {
  width: 100%;
  padding: var(--space-2) var(--space-3) var(--space-2) var(--space-8);
  font-family: inherit;
  font-size: var(--text-sm);
  color: var(--color-text-primary);
  background: var(--color-surface-sunken);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-lg);
  outline: none;
  transition: border-color var(--transition-fast);
}

.search-input:focus {
  border-color: var(--color-accent);
}

.search-input::placeholder {
  color: var(--color-text-tertiary);
}

.category-tabs {
  display: flex;
  gap: var(--space-1);
  padding: 0 var(--space-5) var(--space-3);
  overflow-x: auto;
}

.category-tab {
  flex-shrink: 0;
  padding: var(--space-1) var(--space-3);
  font-family: inherit;
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  cursor: pointer;
  background: transparent;
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-full);
  transition: all var(--transition-fast);
}

.category-tab:hover {
  border-color: var(--color-border);
}

.category-tab.active {
  color: var(--color-text-inverse);
  background: var(--color-accent);
  border-color: var(--color-accent);
}

.templates-grid {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  flex: 1;
  padding: var(--space-3) var(--space-5) var(--space-5);
  overflow-y: auto;
}

.template-card {
  display: flex;
  gap: var(--space-3);
  align-items: flex-start;
  padding: var(--space-3) var(--space-4);
  text-align: left;
  cursor: pointer;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  transition: all var(--transition-base);
}

.template-card:hover {
  border-color: var(--color-accent);
  box-shadow: var(--shadow-sm);
}

.template-icon {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  font-size: 20px;
  background: var(--color-accent-subtle);
  border-radius: var(--radius-md);
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
  color: var(--color-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.template-meta {
  display: flex;
  gap: var(--space-1);
  flex-shrink: 0;
  align-items: center;
}

.category-badge {
  padding: 2px 8px;
  font-size: var(--text-xs);
  font-weight: 500;
  color: var(--color-text-secondary);
  background: var(--color-surface-sunken);
  border-radius: var(--radius-full);
}

.builtin-badge {
  padding: 2px 8px;
  font-size: var(--text-xs);
  font-weight: 500;
  color: var(--color-accent);
  background: var(--color-accent-subtle);
  border-radius: var(--radius-full);
}

.loading-state {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  align-items: center;
  justify-content: center;
  flex: 1;
  padding: var(--space-10);
  color: var(--color-text-tertiary);
}

.spinner {
  width: 24px;
  height: 24px;
  border: 2px solid var(--color-border);
  border-top-color: var(--color-accent);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex: 1;
  padding: var(--space-10);
  text-align: center;
}

.empty-icon {
  margin-bottom: var(--space-3);
  color: var(--color-text-tertiary);
  opacity: 0.5;
}

.empty-text {
  margin: 0 0 var(--space-1);
  font-size: var(--text-base);
  font-weight: 500;
  color: var(--color-text-secondary);
}

.empty-hint {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--color-text-tertiary);
}
</style>
