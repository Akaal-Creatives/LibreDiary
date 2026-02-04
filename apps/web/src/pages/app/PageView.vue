<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { usePagesStore } from '@/stores';
import { TiptapEditor } from '@/components/editor';

const pagesStore = usePagesStore();

const props = defineProps<{
  pageId: string;
}>();

const loading = ref(true);
const pageTitle = ref('');
const pageContent = ref('');

onMounted(() => {
  loadPage();
});

watch(
  () => props.pageId,
  () => {
    loadPage();
  }
);

async function loadPage() {
  loading.value = true;
  pagesStore.setCurrentPage(props.pageId);

  // TODO: Fetch page data from API
  // For now, use mock data
  pageTitle.value = pagesStore.currentPage?.title ?? 'Untitled';
  pageContent.value = '';

  loading.value = false;
}

function updateTitle(event: Event) {
  const target = event.target as HTMLHeadingElement;
  pageTitle.value = target.textContent ?? 'Untitled';
  // TODO: Save to API
}

function onContentUpdate(content: string) {
  pageContent.value = content;
  // TODO: Save to API (debounced)
}
</script>

<template>
  <div class="page-view">
    <!-- Loading State -->
    <div v-if="loading" class="page-loading">
      <div class="loading-spinner"></div>
      <span class="loading-text">Loading...</span>
    </div>

    <!-- Page Content -->
    <div v-else class="page-content">
      <!-- Page Header -->
      <header class="page-header">
        <button class="page-icon-btn" title="Change icon">
          <span class="page-icon">{{ pagesStore.currentPage?.icon ?? '📄' }}</span>
        </button>
        <div class="page-meta">
          <h1 class="page-title" contenteditable="true" spellcheck="false" @blur="updateTitle">
            {{ pageTitle }}
          </h1>
          <div class="page-info">
            <span class="info-item">Last edited recently</span>
          </div>
        </div>
      </header>

      <!-- Page Body -->
      <div class="page-body">
        <TiptapEditor
          v-model="pageContent"
          placeholder="Start writing, or press '/' for commands..."
          @update:model-value="onContentUpdate"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.page-view {
  max-width: 800px;
  margin: 0 auto;
  padding: var(--space-4) 0;
}

/* Loading State */
.page-loading {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  align-items: center;
  justify-content: center;
  padding: var(--space-20);
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--color-border);
  border-top-color: var(--color-accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.loading-text {
  font-size: var(--text-sm);
  color: var(--color-text-tertiary);
}

/* Page Header */
.page-header {
  display: flex;
  gap: var(--space-4);
  align-items: flex-start;
  margin-bottom: var(--space-8);
  padding-bottom: var(--space-6);
  border-bottom: 1px solid var(--color-border);
}

.page-icon-btn {
  flex-shrink: 0;
  padding: var(--space-2);
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: var(--radius-lg);
  transition: all var(--transition-fast);
}

.page-icon-btn:hover {
  background: var(--color-hover);
}

.page-icon {
  font-size: 3rem;
  line-height: 1;
}

.page-meta {
  flex: 1;
  min-width: 0;
  padding-top: var(--space-2);
}

.page-title {
  margin: 0 0 var(--space-2);
  padding: 0;
  font-size: var(--text-4xl);
  font-weight: 700;
  line-height: 1.2;
  color: var(--color-text-primary);
  letter-spacing: -0.02em;
  border: none;
  outline: none;
}

.page-title:empty::before {
  color: var(--color-text-tertiary);
  content: 'Untitled';
}

.page-title:focus {
  outline: none;
}

.page-info {
  display: flex;
  gap: var(--space-4);
  align-items: center;
}

.info-item {
  font-size: var(--text-sm);
  color: var(--color-text-tertiary);
}

/* Page Body */
.page-body {
  min-height: 400px;
}
</style>
