<script setup lang="ts">
import { ref, computed, watch, onUnmounted, nextTick } from 'vue';
import { useAuthStore } from '@/stores';
import {
  searchService,
  getRecentSearches,
  removeRecentSearch,
  clearRecentSearches,
} from '@/services';
import type { SearchResult } from '@librediary/shared';

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'navigate', pageId: string): void;
}>();

const props = defineProps<{
  visible: boolean;
}>();

const authStore = useAuthStore();
const searchInput = ref<HTMLInputElement | null>(null);
const query = ref('');
const results = ref<SearchResult[]>([]);
const total = ref(0);
const loading = ref(false);
const selectedIndex = ref(0);
const recentSearches = ref<string[]>([]);
const showFilters = ref(false);
const dateFrom = ref('');
const dateTo = ref('');
const createdById = ref('');

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

const hasQuery = computed(() => query.value.trim().length > 0);
const showRecent = computed(() => !hasQuery.value && recentSearches.value.length > 0);
const showEmpty = computed(() => hasQuery.value && !loading.value && results.value.length === 0);

// Focus input when modal becomes visible
watch(
  () => props.visible,
  async (visible) => {
    if (visible) {
      recentSearches.value = getRecentSearches();
      selectedIndex.value = 0;
      await nextTick();
      searchInput.value?.focus();
    } else {
      query.value = '';
      results.value = [];
      total.value = 0;
      loading.value = false;
      showFilters.value = false;
      dateFrom.value = '';
      dateTo.value = '';
      createdById.value = '';
    }
  },
  { immediate: true }
);

// Debounced search
watch(query, (newQuery) => {
  if (debounceTimer) clearTimeout(debounceTimer);

  if (!newQuery.trim()) {
    results.value = [];
    total.value = 0;
    loading.value = false;
    selectedIndex.value = 0;
    return;
  }

  loading.value = true;
  debounceTimer = setTimeout(() => {
    performSearch();
  }, 300);
});

async function performSearch() {
  const orgId = authStore.currentOrganizationId;
  if (!orgId || !query.value.trim()) return;

  try {
    loading.value = true;
    const response = await searchService.search(orgId, {
      q: query.value.trim(),
      limit: 20,
      dateFrom: dateFrom.value || undefined,
      dateTo: dateTo.value || undefined,
      createdById: createdById.value || undefined,
    });
    results.value = response.results;
    total.value = response.total;
    selectedIndex.value = 0;
  } catch (error) {
    console.error('Search failed:', error);
    results.value = [];
    total.value = 0;
  } finally {
    loading.value = false;
  }
}

function handleKeydown(event: KeyboardEvent) {
  const itemCount = showRecent.value ? recentSearches.value.length : results.value.length;

  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault();
      selectedIndex.value = Math.min(selectedIndex.value + 1, itemCount - 1);
      break;
    case 'ArrowUp':
      event.preventDefault();
      selectedIndex.value = Math.max(selectedIndex.value - 1, 0);
      break;
    case 'Enter': {
      event.preventDefault();
      const recentItem = recentSearches.value[selectedIndex.value];
      const resultItem = results.value[selectedIndex.value];
      if (showRecent.value && recentItem) {
        query.value = recentItem;
      } else if (resultItem) {
        navigateToPage(resultItem.id);
      }
      break;
    }
    case 'Escape':
      event.preventDefault();
      emit('close');
      break;
  }
}

function navigateToPage(pageId: string) {
  emit('navigate', pageId);
}

function selectRecentSearch(search: string) {
  query.value = search;
}

function handleRemoveRecent(search: string, event: MouseEvent) {
  event.stopPropagation();
  removeRecentSearch(search);
  recentSearches.value = getRecentSearches();
}

function handleClearRecent() {
  clearRecentSearches();
  recentSearches.value = [];
}

function handleOverlayClick(event: MouseEvent) {
  if ((event.target as HTMLElement).classList.contains('search-modal-overlay')) {
    emit('close');
  }
}

function toggleFilters() {
  showFilters.value = !showFilters.value;
}

function applyFilters() {
  if (hasQuery.value) {
    performSearch();
  }
}

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
  return `${Math.floor(diffDays / 365)}y ago`;
}

// Cleanup debounce on unmount
onUnmounted(() => {
  if (debounceTimer) clearTimeout(debounceTimer);
});
</script>

<template>
  <Teleport to="body">
    <Transition name="search-modal">
      <div
        v-if="visible"
        class="search-modal-overlay"
        role="dialog"
        aria-modal="true"
        aria-label="Search pages"
        @click="handleOverlayClick"
        @keydown="handleKeydown"
      >
        <div class="search-modal">
          <!-- Search Input -->
          <div class="search-header">
            <svg class="search-header-icon" width="20" height="20" viewBox="0 0 16 16" fill="none">
              <path
                d="M7 12C9.76142 12 12 9.76142 12 7C12 4.23858 9.76142 2 7 2C4.23858 2 2 4.23858 2 7C2 9.76142 4.23858 12 7 12Z"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
              <path
                d="M14 14L10.5 10.5"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
            <input
              ref="searchInput"
              v-model="query"
              type="text"
              class="search-modal-input"
              placeholder="Search pages..."
              autocomplete="off"
              spellcheck="false"
            />
            <button
              v-if="hasQuery"
              class="search-clear-btn"
              aria-label="Clear search"
              @click="query = ''"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path
                  d="M10.5 3.5L3.5 10.5M3.5 3.5L10.5 10.5"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                />
              </svg>
            </button>
            <button
              class="search-filter-toggle"
              :class="{ active: showFilters }"
              aria-label="Toggle filters"
              @click="toggleFilters"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M2 4H14M4 8H12M6 12H10"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                />
              </svg>
            </button>
          </div>

          <!-- Filters -->
          <div v-if="showFilters" class="search-filters">
            <div class="filter-row">
              <label class="filter-label">
                From
                <input v-model="dateFrom" type="date" class="filter-input" @change="applyFilters" />
              </label>
              <label class="filter-label">
                To
                <input v-model="dateTo" type="date" class="filter-input" @change="applyFilters" />
              </label>
              <label class="filter-label">
                Author
                <input
                  v-model="createdById"
                  type="text"
                  class="filter-input"
                  placeholder="User ID"
                  @change="applyFilters"
                />
              </label>
            </div>
          </div>

          <!-- Content -->
          <div class="search-body">
            <!-- Loading -->
            <div v-if="loading" class="search-loading">
              <div class="search-spinner" />
              <span>Searching...</span>
            </div>

            <!-- Recent Searches -->
            <div v-else-if="showRecent" class="search-recent">
              <div class="search-section-header">
                <span class="search-section-title">Recent searches</span>
                <button class="search-section-action" @click="handleClearRecent">Clear</button>
              </div>
              <div class="search-results-list">
                <div
                  v-for="(search, index) in recentSearches"
                  :key="search"
                  class="search-result-item recent-item"
                  :class="{ selected: index === selectedIndex }"
                  role="button"
                  tabindex="0"
                  @click="selectRecentSearch(search)"
                  @mouseenter="selectedIndex = index"
                >
                  <svg class="result-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path
                      d="M8 3V8L11 10"
                      stroke="currentColor"
                      stroke-width="1.5"
                      stroke-linecap="round"
                    />
                    <circle cx="8" cy="8" r="5.5" stroke="currentColor" stroke-width="1.5" />
                  </svg>
                  <span class="result-title">{{ search }}</span>
                  <button
                    class="remove-recent-btn"
                    aria-label="Remove from recent"
                    @click="handleRemoveRecent(search, $event)"
                  >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path
                        d="M9 3L3 9M3 3L9 9"
                        stroke="currentColor"
                        stroke-width="1.5"
                        stroke-linecap="round"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            <!-- Search Results -->
            <div v-else-if="results.length > 0" class="search-results">
              <div class="search-section-header">
                <span class="search-section-title"
                  >{{ total }} result{{ total === 1 ? '' : 's' }}</span
                >
              </div>
              <div class="search-results-list">
                <button
                  v-for="(result, index) in results"
                  :key="result.id"
                  class="search-result-item"
                  :class="{ selected: index === selectedIndex }"
                  @click="navigateToPage(result.id)"
                  @mouseenter="selectedIndex = index"
                >
                  <span class="result-page-icon">{{ result.icon || '📄' }}</span>
                  <div class="result-content">
                    <!-- eslint-disable-next-line vue/no-v-html -- safe: ts_headline output with <mark> tags -->
                    <span class="result-title" v-html="result.titleHighlight" />
                    <!-- eslint-disable-next-line vue/no-v-html -- safe: ts_headline output with <mark> tags -->
                    <span
                      v-if="result.contentHighlight"
                      class="result-snippet"
                      v-html="result.contentHighlight"
                    />
                  </div>
                  <span class="result-meta">{{ formatRelativeDate(result.updatedAt) }}</span>
                </button>
              </div>
            </div>

            <!-- Empty State -->
            <div v-else-if="showEmpty" class="search-empty">
              <span class="search-empty-text">No results found for "{{ query }}"</span>
            </div>

            <!-- Initial State -->
            <div v-else-if="!hasQuery && !showRecent" class="search-initial">
              <span class="search-initial-text">Type to search pages...</span>
            </div>
          </div>

          <!-- Footer -->
          <div class="search-footer">
            <div class="search-hints">
              <span class="hint"><kbd>↑↓</kbd> Navigate</span>
              <span class="hint"><kbd>↵</kbd> Open</span>
              <span class="hint"><kbd>esc</kbd> Close</span>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.search-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 15vh;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
}

.search-modal {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 640px;
  max-height: 480px;
  overflow: hidden;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl, 12px);
  box-shadow:
    0 24px 48px rgba(0, 0, 0, 0.2),
    0 0 0 1px rgba(0, 0, 0, 0.05);
}

/* Header / Input */
.search-header {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-4);
  border-bottom: 1px solid var(--color-border-subtle);
}

.search-header-icon {
  flex-shrink: 0;
  color: var(--color-text-tertiary);
}

.search-modal-input {
  flex: 1;
  min-width: 0;
  font-family: inherit;
  font-size: var(--text-base, 16px);
  color: var(--color-text-primary);
  background: transparent;
  border: none;
  outline: none;
}

.search-modal-input::placeholder {
  color: var(--color-text-tertiary);
}

.search-clear-btn,
.search-filter-toggle {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  color: var(--color-text-tertiary);
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
}

.search-clear-btn:hover,
.search-filter-toggle:hover {
  color: var(--color-text-primary);
  background: var(--color-hover);
}

.search-filter-toggle.active {
  color: var(--color-accent);
  background: var(--color-accent-subtle);
}

/* Filters */
.search-filters {
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--color-border-subtle);
  background: var(--color-surface-sunken);
}

.filter-row {
  display: flex;
  gap: var(--space-3);
}

.filter-label {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  flex: 1;
  font-size: var(--text-xs);
  font-weight: 500;
  color: var(--color-text-tertiary);
}

.filter-input {
  padding: var(--space-1) var(--space-2);
  font-family: inherit;
  font-size: var(--text-sm);
  color: var(--color-text-primary);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  outline: none;
}

.filter-input:focus {
  border-color: var(--color-accent);
}

/* Body */
.search-body {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-2) 0;
}

/* Loading */
.search-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-3);
  padding: var(--space-6);
  color: var(--color-text-tertiary);
  font-size: var(--text-sm);
}

.search-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid var(--color-border);
  border-top-color: var(--color-accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Section Headers */
.search-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-2) var(--space-4);
}

.search-section-title {
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--color-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.search-section-action {
  font-family: inherit;
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
  cursor: pointer;
  background: transparent;
  border: none;
  padding: 0;
  transition: color var(--transition-fast);
}

.search-section-action:hover {
  color: var(--color-accent);
}

/* Results List */
.search-results-list {
  display: flex;
  flex-direction: column;
}

.search-result-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  width: 100%;
  padding: var(--space-2) var(--space-4);
  font-family: inherit;
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  text-align: left;
  cursor: pointer;
  background: transparent;
  border: none;
  transition: background var(--transition-fast);
}

.search-result-item:hover,
.search-result-item.selected {
  background: var(--color-hover);
}

.search-result-item.selected {
  background: var(--color-accent-subtle);
}

.result-icon {
  flex-shrink: 0;
  color: var(--color-text-tertiary);
}

.result-page-icon {
  flex-shrink: 0;
  font-size: var(--text-base, 16px);
  line-height: 1;
}

.result-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.result-title {
  overflow: hidden;
  font-weight: 500;
  color: var(--color-text-primary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.result-snippet {
  overflow: hidden;
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.result-meta {
  flex-shrink: 0;
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

.remove-recent-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  padding: 0;
  color: var(--color-text-tertiary);
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: var(--radius-sm);
  opacity: 0;
  transition: all var(--transition-fast);
}

.search-result-item:hover .remove-recent-btn {
  opacity: 1;
}

.remove-recent-btn:hover {
  color: var(--color-text-primary);
  background: var(--color-hover);
}

/* Empty / Initial States */
.search-empty,
.search-initial {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-8) var(--space-4);
}

.search-empty-text,
.search-initial-text {
  font-size: var(--text-sm);
  color: var(--color-text-tertiary);
}

/* Footer */
.search-footer {
  padding: var(--space-2) var(--space-4);
  border-top: 1px solid var(--color-border-subtle);
  background: var(--color-surface-sunken);
}

.search-hints {
  display: flex;
  gap: var(--space-4);
}

.hint {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  font-size: 11px;
  color: var(--color-text-tertiary);
}

.hint kbd {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 4px;
  font-family: var(--font-family-mono);
  font-size: 10px;
  font-weight: 500;
  line-height: 1;
  color: var(--color-text-tertiary);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 3px;
}

/* Highlight marks from ts_headline */
:deep(mark) {
  color: var(--color-accent);
  background: var(--color-accent-subtle);
  border-radius: 2px;
  padding: 0 1px;
}

/* Transition */
.search-modal-enter-active {
  transition: opacity 0.15s ease;
}

.search-modal-enter-active .search-modal {
  transition:
    transform 0.15s ease,
    opacity 0.15s ease;
}

.search-modal-leave-active {
  transition: opacity 0.1s ease;
}

.search-modal-leave-active .search-modal {
  transition:
    transform 0.1s ease,
    opacity 0.1s ease;
}

.search-modal-enter-from {
  opacity: 0;
}

.search-modal-enter-from .search-modal {
  opacity: 0;
  transform: scale(0.98) translateY(-8px);
}

.search-modal-leave-to {
  opacity: 0;
}

.search-modal-leave-to .search-modal {
  opacity: 0;
  transform: scale(0.98) translateY(-4px);
}

/* Scrollbar */
.search-body::-webkit-scrollbar {
  width: 6px;
}

.search-body::-webkit-scrollbar-track {
  background: transparent;
}

.search-body::-webkit-scrollbar-thumb {
  background: var(--color-border);
  border-radius: var(--radius-full);
}
</style>
