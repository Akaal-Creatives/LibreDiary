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
    <div v-if="loading" class="page-loading">
      <VaProgressCircle indeterminate />
    </div>

    <div v-else class="page-content">
      <div class="page-header">
        <div class="page-icon">
          {{ pagesStore.currentPage?.icon ?? '📄' }}
        </div>
        <h1 class="page-title" contenteditable="true" spellcheck="false" @blur="updateTitle">
          {{ pageTitle }}
        </h1>
      </div>

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
  max-width: 850px;
  margin: 0 auto;
}

.page-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 60px;
}

.page-header {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 32px;
}

.page-icon {
  font-size: 48px;
  cursor: pointer;
}

.page-title {
  flex: 1;
  margin: 0;
  padding: 0;
  font-size: 40px;
  font-weight: 700;
  line-height: 1.2;
  border: none;
  outline: none;
}

.page-title:empty::before {
  color: var(--va-secondary);
  content: 'Untitled';
}

.page-body {
  min-height: 300px;
}
</style>
