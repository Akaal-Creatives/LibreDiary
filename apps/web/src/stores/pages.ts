import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Page, PageWithChildren } from '@librediary/shared';

export const usePagesStore = defineStore('pages', () => {
  // State
  const pages = ref<Map<string, Page>>(new Map());
  const pageTree = ref<PageWithChildren[]>([]);
  const currentPageId = ref<string | null>(null);
  const loading = ref(false);

  // Getters
  const currentPage = computed(() =>
    currentPageId.value ? (pages.value.get(currentPageId.value) ?? null) : null
  );

  const rootPages = computed(() => pageTree.value.filter((page) => !page.parentId));

  // Actions
  function setPages(newPages: Page[]) {
    pages.value.clear();
    for (const page of newPages) {
      pages.value.set(page.id, page);
    }
  }

  function setPageTree(tree: PageWithChildren[]) {
    pageTree.value = tree;
  }

  function setCurrentPage(pageId: string | null) {
    currentPageId.value = pageId;
  }

  function updatePage(page: Page) {
    pages.value.set(page.id, page);
  }

  function removePage(pageId: string) {
    pages.value.delete(pageId);
  }

  return {
    // State
    pages,
    pageTree,
    currentPageId,
    loading,
    // Getters
    currentPage,
    rootPages,
    // Actions
    setPages,
    setPageTree,
    setCurrentPage,
    updatePage,
    removePage,
  };
});
