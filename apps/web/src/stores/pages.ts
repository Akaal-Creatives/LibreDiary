import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Page, PageWithChildren } from '@librediary/shared';
import { pagesService } from '@/services';
import type { CreatePageInput, UpdatePageInput, MovePageInput, FavoriteWithPage } from '@/services';
import { useAuthStore } from './auth';

export const usePagesStore = defineStore('pages', () => {
  // ===========================================
  // STATE
  // ===========================================

  const pages = ref<Map<string, Page>>(new Map());
  const pageTree = ref<PageWithChildren[]>([]);
  const currentPageId = ref<string | null>(null);
  const ancestors = ref<Page[]>([]);
  const favorites = ref<FavoriteWithPage[]>([]);
  const trashedPages = ref<Page[]>([]);
  const expandedPageIds = ref<Set<string>>(new Set());
  const loading = ref(false);
  const favoritesLoading = ref(false);
  const trashLoading = ref(false);

  // ===========================================
  // GETTERS
  // ===========================================

  const currentPage = computed(() =>
    currentPageId.value ? (pages.value.get(currentPageId.value) ?? null) : null
  );

  const rootPages = computed(() => pageTree.value.filter((page) => !page.parentId));

  const isFavorite = computed(
    () => (pageId: string) => favorites.value.some((fav) => fav.pageId === pageId)
  );

  const favoritePages = computed(() => favorites.value.map((fav) => fav.page));

  // ===========================================
  // HELPER FUNCTIONS
  // ===========================================

  function getOrgId(): string {
    const authStore = useAuthStore();
    if (!authStore.currentOrganizationId) {
      throw new Error('No organization selected');
    }
    return authStore.currentOrganizationId;
  }

  /**
   * Flatten tree to populate pages map
   */
  function flattenTree(tree: PageWithChildren[]): Page[] {
    const result: Page[] = [];
    function traverse(nodes: PageWithChildren[]) {
      for (const node of nodes) {
        // Extract just the Page fields (exclude children)
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { children, ...page } = node;
        result.push(page);
        if (children && children.length > 0) {
          traverse(children);
        }
      }
    }
    traverse(tree);
    return result;
  }

  /**
   * Update tree with a modified page
   */
  function updatePageInTree(tree: PageWithChildren[], updatedPage: Page): PageWithChildren[] {
    return tree.map((node) => {
      if (node.id === updatedPage.id) {
        return { ...updatedPage, children: node.children };
      }
      if (node.children && node.children.length > 0) {
        return { ...node, children: updatePageInTree(node.children, updatedPage) };
      }
      return node;
    });
  }

  /**
   * Remove page from tree
   */
  function removePageFromTree(tree: PageWithChildren[], pageId: string): PageWithChildren[] {
    return tree
      .filter((node) => node.id !== pageId)
      .map((node) => {
        if (node.children && node.children.length > 0) {
          return { ...node, children: removePageFromTree(node.children, pageId) };
        }
        return node;
      });
  }

  // ===========================================
  // BASIC ACTIONS
  // ===========================================

  function setPages(newPages: Page[]) {
    pages.value.clear();
    for (const page of newPages) {
      pages.value.set(page.id, page);
    }
  }

  function setPageTree(tree: PageWithChildren[]) {
    pageTree.value = tree;
    // Also populate the flat pages map
    const flatPages = flattenTree(tree);
    setPages(flatPages);
  }

  function setCurrentPage(pageId: string | null) {
    currentPageId.value = pageId;
  }

  function updatePage(page: Page) {
    pages.value.set(page.id, page);
    // Update in tree as well
    pageTree.value = updatePageInTree(pageTree.value, page);
  }

  function removePage(pageId: string) {
    pages.value.delete(pageId);
    pageTree.value = removePageFromTree(pageTree.value, pageId);
  }

  function toggleExpanded(pageId: string) {
    if (expandedPageIds.value.has(pageId)) {
      expandedPageIds.value.delete(pageId);
    } else {
      expandedPageIds.value.add(pageId);
    }
  }

  function expandToPage(_pageId: string) {
    // Expand all ancestors of the page
    for (const ancestor of ancestors.value) {
      expandedPageIds.value.add(ancestor.id);
    }
  }

  // ===========================================
  // API ACTIONS - PAGE CRUD
  // ===========================================

  async function fetchPageTree(): Promise<void> {
    const orgId = getOrgId();
    loading.value = true;
    try {
      const data = await pagesService.getPageTree(orgId);
      setPageTree(data.pages);
    } finally {
      loading.value = false;
    }
  }

  async function fetchPage(pageId: string): Promise<Page> {
    const orgId = getOrgId();
    loading.value = true;
    try {
      const data = await pagesService.getPage(orgId, pageId);
      updatePage(data.page);
      return data.page;
    } finally {
      loading.value = false;
    }
  }

  async function createPage(input: CreatePageInput): Promise<Page> {
    const orgId = getOrgId();
    loading.value = true;
    try {
      const data = await pagesService.createPage(orgId, input);
      // Refresh tree to get new page in correct position
      await fetchPageTree();
      return data.page;
    } finally {
      loading.value = false;
    }
  }

  async function updatePageData(pageId: string, input: UpdatePageInput): Promise<Page> {
    const orgId = getOrgId();
    const data = await pagesService.updatePage(orgId, pageId, input);
    updatePage(data.page);
    // Update in favorites if present
    const favIndex = favorites.value.findIndex((f) => f.pageId === pageId);
    if (favIndex !== -1) {
      favorites.value[favIndex] = { ...favorites.value[favIndex]!, page: data.page };
    }
    return data.page;
  }

  async function trashPage(pageId: string): Promise<void> {
    const orgId = getOrgId();
    await pagesService.trashPage(orgId, pageId);
    removePage(pageId);
    // Remove from favorites
    favorites.value = favorites.value.filter((f) => f.pageId !== pageId);
    // Refresh tree to update positions
    await fetchPageTree();
  }

  // ===========================================
  // API ACTIONS - HIERARCHY
  // ===========================================

  async function movePage(pageId: string, input: MovePageInput): Promise<Page> {
    const orgId = getOrgId();
    const data = await pagesService.movePage(orgId, pageId, input);
    // Refresh tree to get updated structure
    await fetchPageTree();
    return data.page;
  }

  async function fetchAncestors(pageId: string): Promise<Page[]> {
    const orgId = getOrgId();
    const data = await pagesService.getAncestors(orgId, pageId);
    ancestors.value = data.ancestors;
    return data.ancestors;
  }

  async function duplicatePage(pageId: string): Promise<Page> {
    const orgId = getOrgId();
    loading.value = true;
    try {
      const data = await pagesService.duplicatePage(orgId, pageId);
      // Refresh tree to include duplicated page
      await fetchPageTree();
      return data.page;
    } finally {
      loading.value = false;
    }
  }

  // ===========================================
  // API ACTIONS - FAVORITES
  // ===========================================

  async function fetchFavorites(): Promise<void> {
    const orgId = getOrgId();
    favoritesLoading.value = true;
    try {
      const data = await pagesService.getFavorites(orgId);
      favorites.value = data.favorites;
    } finally {
      favoritesLoading.value = false;
    }
  }

  async function toggleFavorite(pageId: string): Promise<void> {
    const orgId = getOrgId();
    const existingFav = favorites.value.find((f) => f.pageId === pageId);

    if (existingFav) {
      // Remove from favorites
      await pagesService.removeFavorite(orgId, pageId);
      favorites.value = favorites.value.filter((f) => f.pageId !== pageId);
    } else {
      // Add to favorites
      const page = pages.value.get(pageId);
      if (!page) {
        throw new Error('Page not found');
      }
      const data = await pagesService.addFavorite(orgId, pageId);
      favorites.value.push({ ...data.favorite, page });
    }
  }

  async function reorderFavorites(orderedIds: string[]): Promise<void> {
    const orgId = getOrgId();
    await pagesService.reorderFavorites(orgId, orderedIds);
    // Reorder local state
    const reordered: FavoriteWithPage[] = [];
    for (const id of orderedIds) {
      const fav = favorites.value.find((f) => f.id === id);
      if (fav) {
        reordered.push(fav);
      }
    }
    favorites.value = reordered;
  }

  // ===========================================
  // API ACTIONS - TRASH
  // ===========================================

  async function fetchTrashedPages(): Promise<void> {
    const orgId = getOrgId();
    trashLoading.value = true;
    try {
      const data = await pagesService.getTrashedPages(orgId);
      trashedPages.value = data.pages;
    } finally {
      trashLoading.value = false;
    }
  }

  async function restorePage(pageId: string): Promise<Page> {
    const orgId = getOrgId();
    const data = await pagesService.restorePage(orgId, pageId);
    // Remove from trash list
    trashedPages.value = trashedPages.value.filter((p) => p.id !== pageId);
    // Refresh page tree
    await fetchPageTree();
    return data.page;
  }

  async function permanentlyDeletePage(pageId: string): Promise<void> {
    const orgId = getOrgId();
    await pagesService.permanentlyDeletePage(orgId, pageId);
    trashedPages.value = trashedPages.value.filter((p) => p.id !== pageId);
  }

  // ===========================================
  // RESET
  // ===========================================

  function reset() {
    pages.value.clear();
    pageTree.value = [];
    currentPageId.value = null;
    ancestors.value = [];
    favorites.value = [];
    trashedPages.value = [];
    expandedPageIds.value.clear();
  }

  return {
    // State
    pages,
    pageTree,
    currentPageId,
    ancestors,
    favorites,
    trashedPages,
    expandedPageIds,
    loading,
    favoritesLoading,
    trashLoading,
    // Getters
    currentPage,
    rootPages,
    isFavorite,
    favoritePages,
    // Basic Actions
    setPages,
    setPageTree,
    setCurrentPage,
    updatePage,
    removePage,
    toggleExpanded,
    expandToPage,
    // API Actions - CRUD
    fetchPageTree,
    fetchPage,
    createPage,
    updatePageData,
    trashPage,
    // API Actions - Hierarchy
    movePage,
    fetchAncestors,
    duplicatePage,
    // API Actions - Favorites
    fetchFavorites,
    toggleFavorite,
    reorderFavorites,
    // API Actions - Trash
    fetchTrashedPages,
    restorePage,
    permanentlyDeletePage,
    // Reset
    reset,
  };
});
