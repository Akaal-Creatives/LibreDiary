import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { usePagesStore } from '../pages';
import { useAuthStore } from '../auth';
import { pagesService } from '@/services/pages.service';
import type { Page, PageWithChildren, Favorite } from '@librediary/shared';
import type { FavoriteWithPage } from '@/services/pages.service';

// Mock the pages service
vi.mock('@/services/pages.service', () => ({
  pagesService: {
    createPage: vi.fn(),
    getPageTree: vi.fn(),
    getPage: vi.fn(),
    updatePage: vi.fn(),
    trashPage: vi.fn(),
    movePage: vi.fn(),
    getAncestors: vi.fn(),
    duplicatePage: vi.fn(),
    getTrashedPages: vi.fn(),
    restorePage: vi.fn(),
    permanentlyDeletePage: vi.fn(),
    getFavorites: vi.fn(),
    addFavorite: vi.fn(),
    removeFavorite: vi.fn(),
    reorderFavorites: vi.fn(),
  },
}));

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('usePagesStore', () => {
  // Test data
  const mockPage: Page = {
    id: 'page-1',
    title: 'Test Page',
    icon: '📄',
    coverUrl: null,
    htmlContent: '<p>Content</p>',
    isPublic: false,
    publicSlug: null,
    parentId: null,
    position: 0,
    organizationId: 'org-1',
    createdById: 'user-1',
    updatedById: 'user-1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    trashedAt: null,
  };

  const mockChildPage: Page = {
    ...mockPage,
    id: 'page-2',
    title: 'Child Page',
    parentId: 'page-1',
    position: 0,
  };

  const mockPageTree: PageWithChildren[] = [
    {
      ...mockPage,
      children: [
        {
          ...mockChildPage,
          children: [],
        },
      ],
    },
  ];

  const mockFavorite: Favorite = {
    id: 'fav-1',
    userId: 'user-1',
    pageId: 'page-1',
    position: 0,
  };

  const mockFavoriteWithPage: FavoriteWithPage = {
    ...mockFavorite,
    page: mockPage,
  };

  const mockTrashedPage: Page = {
    ...mockPage,
    id: 'page-trashed',
    title: 'Trashed Page',
    trashedAt: new Date().toISOString(),
  };

  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue('org-1');
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // Helper to setup auth store
  function setupAuthStore() {
    const authStore = useAuthStore();
    authStore.setUser({
      id: 'user-1',
      email: 'user@test.com',
      name: 'Test User',
      emailVerified: true,
      isSuperAdmin: false,
      locale: 'en',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      avatarUrl: null,
    });
    authStore.setOrganizations(
      [
        {
          id: 'org-1',
          name: 'Test Org',
          slug: 'test-org',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          logoUrl: null,
          accentColor: null,
          allowedDomains: [],
          aiEnabled: false,
        },
      ],
      [{ organizationId: 'org-1', role: 'OWNER' }]
    );
    return authStore;
  }

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const store = usePagesStore();

      expect(store.pages.size).toBe(0);
      expect(store.pageTree).toEqual([]);
      expect(store.currentPageId).toBeNull();
      expect(store.ancestors).toEqual([]);
      expect(store.favorites).toEqual([]);
      expect(store.trashedPages).toEqual([]);
      expect(store.expandedPageIds.size).toBe(0);
      expect(store.loading).toBe(false);
      expect(store.favoritesLoading).toBe(false);
      expect(store.trashLoading).toBe(false);
    });
  });

  describe('Computed Properties', () => {
    it('should return currentPage when currentPageId is set', () => {
      setupAuthStore();
      const store = usePagesStore();
      store.pages.set(mockPage.id, mockPage);
      store.setCurrentPage(mockPage.id);

      expect(store.currentPage).toEqual(mockPage);
    });

    it('should return null when currentPageId is not set', () => {
      const store = usePagesStore();

      expect(store.currentPage).toBeNull();
    });

    it('should return rootPages without parentId', () => {
      setupAuthStore();
      const store = usePagesStore();
      store.setPageTree(mockPageTree);

      expect(store.rootPages).toHaveLength(1);
      expect(store.rootPages[0]?.id).toBe('page-1');
    });

    it('should correctly check if page is favorite', () => {
      setupAuthStore();
      const store = usePagesStore();
      store.favorites = [mockFavoriteWithPage];

      expect(store.isFavorite('page-1')).toBe(true);
      expect(store.isFavorite('page-2')).toBe(false);
    });

    it('should return favorite pages', () => {
      setupAuthStore();
      const store = usePagesStore();
      store.favorites = [mockFavoriteWithPage];

      expect(store.favoritePages).toEqual([mockPage]);
    });
  });

  describe('Basic Actions', () => {
    describe('setPages', () => {
      it('should set pages map from array', () => {
        const store = usePagesStore();
        store.setPages([mockPage, mockChildPage]);

        expect(store.pages.size).toBe(2);
        expect(store.pages.get('page-1')).toEqual(mockPage);
        expect(store.pages.get('page-2')).toEqual(mockChildPage);
      });

      it('should clear existing pages before setting', () => {
        const store = usePagesStore();
        store.pages.set('old-page', { ...mockPage, id: 'old-page' });
        store.setPages([mockPage]);

        expect(store.pages.size).toBe(1);
        expect(store.pages.has('old-page')).toBe(false);
      });
    });

    describe('setPageTree', () => {
      it('should set page tree and flatten to pages map', () => {
        const store = usePagesStore();
        store.setPageTree(mockPageTree);

        expect(store.pageTree).toEqual(mockPageTree);
        expect(store.pages.size).toBe(2);
        expect(store.pages.has('page-1')).toBe(true);
        expect(store.pages.has('page-2')).toBe(true);
      });
    });

    describe('setCurrentPage', () => {
      it('should set current page id', () => {
        const store = usePagesStore();
        store.setCurrentPage('page-1');

        expect(store.currentPageId).toBe('page-1');
      });

      it('should allow null', () => {
        const store = usePagesStore();
        store.setCurrentPage('page-1');
        store.setCurrentPage(null);

        expect(store.currentPageId).toBeNull();
      });
    });

    describe('updatePage', () => {
      it('should update page in map', () => {
        const store = usePagesStore();
        store.setPageTree(mockPageTree);

        const updatedPage = { ...mockPage, title: 'Updated Title' };
        store.updatePage(updatedPage);

        expect(store.pages.get('page-1')?.title).toBe('Updated Title');
      });

      it('should update page in tree', () => {
        const store = usePagesStore();
        store.setPageTree(mockPageTree);

        const updatedPage = { ...mockPage, title: 'Updated Title' };
        store.updatePage(updatedPage);

        expect(store.pageTree[0]?.title).toBe('Updated Title');
      });

      it('should update nested page in tree', () => {
        const store = usePagesStore();
        store.setPageTree(mockPageTree);

        const updatedChild = { ...mockChildPage, title: 'Updated Child' };
        store.updatePage(updatedChild);

        expect(store.pageTree[0]?.children?.[0]?.title).toBe('Updated Child');
      });
    });

    describe('removePage', () => {
      it('should remove page from map', () => {
        const store = usePagesStore();
        store.setPageTree(mockPageTree);

        store.removePage('page-1');

        expect(store.pages.has('page-1')).toBe(false);
      });

      it('should remove page from tree', () => {
        const store = usePagesStore();
        store.setPageTree(mockPageTree);

        store.removePage('page-1');

        expect(store.pageTree).toHaveLength(0);
      });

      it('should remove nested page from tree', () => {
        const store = usePagesStore();
        store.setPageTree(mockPageTree);

        store.removePage('page-2');

        expect(store.pageTree[0]?.children).toHaveLength(0);
      });
    });

    describe('toggleExpanded', () => {
      it('should add page id to expanded set', () => {
        const store = usePagesStore();
        store.toggleExpanded('page-1');

        expect(store.expandedPageIds.has('page-1')).toBe(true);
      });

      it('should remove page id from expanded set', () => {
        const store = usePagesStore();
        store.expandedPageIds.add('page-1');
        store.toggleExpanded('page-1');

        expect(store.expandedPageIds.has('page-1')).toBe(false);
      });
    });

    describe('expandToPage', () => {
      it('should expand all ancestors', () => {
        const store = usePagesStore();
        store.ancestors = [mockPage, mockChildPage];

        store.expandToPage('page-3');

        expect(store.expandedPageIds.has('page-1')).toBe(true);
        expect(store.expandedPageIds.has('page-2')).toBe(true);
      });
    });
  });

  describe('API Actions - Page CRUD', () => {
    describe('fetchPageTree', () => {
      it('should fetch and set page tree', async () => {
        setupAuthStore();
        const store = usePagesStore();

        vi.mocked(pagesService.getPageTree).mockResolvedValue({ pages: mockPageTree });

        await store.fetchPageTree();

        expect(pagesService.getPageTree).toHaveBeenCalledWith('org-1');
        expect(store.pageTree).toEqual(mockPageTree);
        expect(store.loading).toBe(false);
      });

      it('should throw when no organization selected', async () => {
        // Reset localStorage to return null for this test
        localStorageMock.getItem.mockReturnValue(null);
        // Create a fresh pinia to reset state
        setActivePinia(createPinia());
        const authStore = useAuthStore();
        authStore.setOrganizations([], []);
        const store = usePagesStore();

        await expect(store.fetchPageTree()).rejects.toThrow('No organization selected');
      });

      it('should set loading state correctly', async () => {
        setupAuthStore();
        const store = usePagesStore();

        vi.mocked(pagesService.getPageTree).mockImplementation(
          () =>
            new Promise((resolve) => {
              expect(store.loading).toBe(true);
              resolve({ pages: mockPageTree });
            })
        );

        await store.fetchPageTree();

        expect(store.loading).toBe(false);
      });
    });

    describe('fetchPage', () => {
      it('should fetch and update page', async () => {
        setupAuthStore();
        const store = usePagesStore();

        vi.mocked(pagesService.getPage).mockResolvedValue({ page: mockPage });

        const result = await store.fetchPage('page-1');

        expect(pagesService.getPage).toHaveBeenCalledWith('org-1', 'page-1');
        expect(result).toEqual(mockPage);
        expect(store.pages.get('page-1')).toEqual(mockPage);
      });
    });

    describe('createPage', () => {
      it('should create page and refresh tree', async () => {
        setupAuthStore();
        const store = usePagesStore();

        vi.mocked(pagesService.createPage).mockResolvedValue({ page: mockPage });
        vi.mocked(pagesService.getPageTree).mockResolvedValue({ pages: mockPageTree });

        const result = await store.createPage({ title: 'Test Page' });

        expect(pagesService.createPage).toHaveBeenCalledWith('org-1', { title: 'Test Page' });
        expect(result).toEqual(mockPage);
        expect(pagesService.getPageTree).toHaveBeenCalled();
      });
    });

    describe('updatePageData', () => {
      it('should update page and return result', async () => {
        setupAuthStore();
        const store = usePagesStore();
        store.setPageTree(mockPageTree);

        const updatedPage = { ...mockPage, title: 'Updated' };
        vi.mocked(pagesService.updatePage).mockResolvedValue({ page: updatedPage });

        const result = await store.updatePageData('page-1', { title: 'Updated' });

        expect(pagesService.updatePage).toHaveBeenCalledWith('org-1', 'page-1', {
          title: 'Updated',
        });
        expect(result.title).toBe('Updated');
        expect(store.pages.get('page-1')?.title).toBe('Updated');
      });

      it('should update page in favorites if present', async () => {
        setupAuthStore();
        const store = usePagesStore();
        store.setPageTree(mockPageTree);
        store.favorites = [mockFavoriteWithPage];

        const updatedPage = { ...mockPage, title: 'Updated' };
        vi.mocked(pagesService.updatePage).mockResolvedValue({ page: updatedPage });

        await store.updatePageData('page-1', { title: 'Updated' });

        expect(store.favorites[0]?.page.title).toBe('Updated');
      });
    });

    describe('trashPage', () => {
      it('should trash page and remove from state', async () => {
        setupAuthStore();
        const store = usePagesStore();
        store.setPageTree(mockPageTree);
        store.favorites = [mockFavoriteWithPage];

        vi.mocked(pagesService.trashPage).mockResolvedValue({ message: 'Trashed' });
        vi.mocked(pagesService.getPageTree).mockResolvedValue({ pages: [] });

        await store.trashPage('page-1');

        expect(pagesService.trashPage).toHaveBeenCalledWith('org-1', 'page-1');
        expect(store.favorites).toHaveLength(0);
      });
    });
  });

  describe('API Actions - Hierarchy', () => {
    describe('movePage', () => {
      it('should move page and refresh tree', async () => {
        setupAuthStore();
        const store = usePagesStore();

        const movedPage = { ...mockPage, parentId: 'page-2' };
        vi.mocked(pagesService.movePage).mockResolvedValue({ page: movedPage });
        vi.mocked(pagesService.getPageTree).mockResolvedValue({ pages: mockPageTree });

        const result = await store.movePage('page-1', { parentId: 'page-2' });

        expect(pagesService.movePage).toHaveBeenCalledWith('org-1', 'page-1', {
          parentId: 'page-2',
        });
        expect(result.parentId).toBe('page-2');
      });
    });

    describe('fetchAncestors', () => {
      it('should fetch and set ancestors', async () => {
        setupAuthStore();
        const store = usePagesStore();

        vi.mocked(pagesService.getAncestors).mockResolvedValue({ ancestors: [mockPage] });

        const result = await store.fetchAncestors('page-2');

        expect(pagesService.getAncestors).toHaveBeenCalledWith('org-1', 'page-2');
        expect(result).toEqual([mockPage]);
        expect(store.ancestors).toEqual([mockPage]);
      });
    });

    describe('duplicatePage', () => {
      it('should duplicate page and refresh tree', async () => {
        setupAuthStore();
        const store = usePagesStore();

        const duplicatedPage = { ...mockPage, id: 'page-copy', title: 'Test Page (copy)' };
        vi.mocked(pagesService.duplicatePage).mockResolvedValue({ page: duplicatedPage });
        vi.mocked(pagesService.getPageTree).mockResolvedValue({ pages: mockPageTree });

        const result = await store.duplicatePage('page-1');

        expect(pagesService.duplicatePage).toHaveBeenCalledWith('org-1', 'page-1');
        expect(result.id).toBe('page-copy');
      });
    });
  });

  describe('API Actions - Favorites', () => {
    describe('fetchFavorites', () => {
      it('should fetch and set favorites', async () => {
        setupAuthStore();
        const store = usePagesStore();

        vi.mocked(pagesService.getFavorites).mockResolvedValue({
          favorites: [mockFavoriteWithPage],
        });

        await store.fetchFavorites();

        expect(pagesService.getFavorites).toHaveBeenCalledWith('org-1');
        expect(store.favorites).toEqual([mockFavoriteWithPage]);
        expect(store.favoritesLoading).toBe(false);
      });

      it('should set favoritesLoading state correctly', async () => {
        setupAuthStore();
        const store = usePagesStore();

        vi.mocked(pagesService.getFavorites).mockImplementation(
          () =>
            new Promise((resolve) => {
              expect(store.favoritesLoading).toBe(true);
              resolve({ favorites: [mockFavoriteWithPage] });
            })
        );

        await store.fetchFavorites();

        expect(store.favoritesLoading).toBe(false);
      });
    });

    describe('toggleFavorite', () => {
      it('should add page to favorites', async () => {
        setupAuthStore();
        const store = usePagesStore();
        store.pages.set(mockPage.id, mockPage);

        vi.mocked(pagesService.addFavorite).mockResolvedValue({ favorite: mockFavorite });

        await store.toggleFavorite('page-1');

        expect(pagesService.addFavorite).toHaveBeenCalledWith('org-1', 'page-1');
        expect(store.favorites).toHaveLength(1);
        expect(store.favorites[0]?.pageId).toBe('page-1');
      });

      it('should remove page from favorites', async () => {
        setupAuthStore();
        const store = usePagesStore();
        store.favorites = [mockFavoriteWithPage];

        vi.mocked(pagesService.removeFavorite).mockResolvedValue({ message: 'Removed' });

        await store.toggleFavorite('page-1');

        expect(pagesService.removeFavorite).toHaveBeenCalledWith('org-1', 'page-1');
        expect(store.favorites).toHaveLength(0);
      });

      it('should throw error if page not found when adding', async () => {
        setupAuthStore();
        const store = usePagesStore();

        await expect(store.toggleFavorite('non-existent')).rejects.toThrow('Page not found');
      });
    });

    describe('reorderFavorites', () => {
      it('should reorder favorites and update local state', async () => {
        setupAuthStore();
        const store = usePagesStore();
        const fav2: FavoriteWithPage = {
          ...mockFavoriteWithPage,
          id: 'fav-2',
          pageId: 'page-2',
          page: mockChildPage,
        };
        store.favorites = [mockFavoriteWithPage, fav2];

        vi.mocked(pagesService.reorderFavorites).mockResolvedValue({ message: 'Reordered' });

        await store.reorderFavorites(['fav-2', 'fav-1']);

        expect(pagesService.reorderFavorites).toHaveBeenCalledWith('org-1', ['fav-2', 'fav-1']);
        expect(store.favorites[0]?.id).toBe('fav-2');
        expect(store.favorites[1]?.id).toBe('fav-1');
      });
    });
  });

  describe('API Actions - Trash', () => {
    describe('fetchTrashedPages', () => {
      it('should fetch and set trashed pages', async () => {
        setupAuthStore();
        const store = usePagesStore();

        vi.mocked(pagesService.getTrashedPages).mockResolvedValue({ pages: [mockTrashedPage] });

        await store.fetchTrashedPages();

        expect(pagesService.getTrashedPages).toHaveBeenCalledWith('org-1');
        expect(store.trashedPages).toEqual([mockTrashedPage]);
        expect(store.trashLoading).toBe(false);
      });

      it('should set trashLoading state correctly', async () => {
        setupAuthStore();
        const store = usePagesStore();

        vi.mocked(pagesService.getTrashedPages).mockImplementation(
          () =>
            new Promise((resolve) => {
              expect(store.trashLoading).toBe(true);
              resolve({ pages: [mockTrashedPage] });
            })
        );

        await store.fetchTrashedPages();

        expect(store.trashLoading).toBe(false);
      });
    });

    describe('restorePage', () => {
      it('should restore page and refresh tree', async () => {
        setupAuthStore();
        const store = usePagesStore();
        store.trashedPages = [mockTrashedPage];

        const restoredPage = { ...mockTrashedPage, trashedAt: null };
        vi.mocked(pagesService.restorePage).mockResolvedValue({ page: restoredPage });
        vi.mocked(pagesService.getPageTree).mockResolvedValue({ pages: mockPageTree });

        const result = await store.restorePage('page-trashed');

        expect(pagesService.restorePage).toHaveBeenCalledWith('org-1', 'page-trashed');
        expect(result.trashedAt).toBeNull();
        expect(store.trashedPages).toHaveLength(0);
      });
    });

    describe('permanentlyDeletePage', () => {
      it('should permanently delete page and remove from trash', async () => {
        setupAuthStore();
        const store = usePagesStore();
        store.trashedPages = [mockTrashedPage];

        vi.mocked(pagesService.permanentlyDeletePage).mockResolvedValue({ message: 'Deleted' });

        await store.permanentlyDeletePage('page-trashed');

        expect(pagesService.permanentlyDeletePage).toHaveBeenCalledWith('org-1', 'page-trashed');
        expect(store.trashedPages).toHaveLength(0);
      });
    });
  });

  describe('Reset Action', () => {
    it('should reset all store state', () => {
      setupAuthStore();
      const store = usePagesStore();
      store.setPageTree(mockPageTree);
      store.currentPageId = 'page-1';
      store.ancestors = [mockPage];
      store.favorites = [mockFavoriteWithPage];
      store.trashedPages = [mockTrashedPage];
      store.expandedPageIds.add('page-1');

      store.reset();

      expect(store.pages.size).toBe(0);
      expect(store.pageTree).toEqual([]);
      expect(store.currentPageId).toBeNull();
      expect(store.ancestors).toEqual([]);
      expect(store.favorites).toEqual([]);
      expect(store.trashedPages).toEqual([]);
      expect(store.expandedPageIds.size).toBe(0);
    });
  });

  describe('Tree Flattening', () => {
    it('should correctly flatten deep nested tree', () => {
      const store = usePagesStore();
      const deepTree: PageWithChildren[] = [
        {
          ...mockPage,
          id: 'level-1',
          children: [
            {
              ...mockPage,
              id: 'level-2',
              parentId: 'level-1',
              children: [
                {
                  ...mockPage,
                  id: 'level-3',
                  parentId: 'level-2',
                  children: [],
                },
              ],
            },
          ],
        },
      ];

      store.setPageTree(deepTree);

      expect(store.pages.size).toBe(3);
      expect(store.pages.has('level-1')).toBe(true);
      expect(store.pages.has('level-2')).toBe(true);
      expect(store.pages.has('level-3')).toBe(true);
    });

    it('should handle empty tree', () => {
      const store = usePagesStore();
      store.setPageTree([]);

      expect(store.pages.size).toBe(0);
      expect(store.pageTree).toEqual([]);
    });

    it('should handle tree with multiple roots', () => {
      const store = usePagesStore();
      const multiRootTree: PageWithChildren[] = [
        { ...mockPage, id: 'root-1', children: [] },
        { ...mockPage, id: 'root-2', children: [] },
        { ...mockPage, id: 'root-3', children: [] },
      ];

      store.setPageTree(multiRootTree);

      expect(store.pages.size).toBe(3);
      expect(store.rootPages).toHaveLength(3);
    });
  });

  describe('Error Handling', () => {
    it('should reset loading on fetchPageTree error', async () => {
      setupAuthStore();
      const store = usePagesStore();

      vi.mocked(pagesService.getPageTree).mockRejectedValue(new Error('Network error'));

      await expect(store.fetchPageTree()).rejects.toThrow();
      expect(store.loading).toBe(false);
    });

    it('should reset favoritesLoading on fetchFavorites error', async () => {
      setupAuthStore();
      const store = usePagesStore();

      vi.mocked(pagesService.getFavorites).mockRejectedValue(new Error('Network error'));

      await expect(store.fetchFavorites()).rejects.toThrow();
      expect(store.favoritesLoading).toBe(false);
    });

    it('should reset trashLoading on fetchTrashedPages error', async () => {
      setupAuthStore();
      const store = usePagesStore();

      vi.mocked(pagesService.getTrashedPages).mockRejectedValue(new Error('Network error'));

      await expect(store.fetchTrashedPages()).rejects.toThrow();
      expect(store.trashLoading).toBe(false);
    });
  });
});
