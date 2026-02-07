import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockApi } = vi.hoisted(() => ({
  mockApi: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('../api', () => ({
  api: mockApi,
}));

import { pagesService } from '../pages.service';

describe('Pages Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===========================================
  // PAGE CRUD
  // ===========================================

  describe('createPage', () => {
    it('should POST to correct endpoint with input', async () => {
      mockApi.post.mockResolvedValue({ page: { id: 'page-1' } });

      await pagesService.createPage('org-1', { title: 'New Page' });

      expect(mockApi.post).toHaveBeenCalledWith('/organizations/org-1/pages', {
        title: 'New Page',
      });
    });
  });

  describe('getPageTree', () => {
    it('should GET from correct endpoint', async () => {
      mockApi.get.mockResolvedValue({ pages: [] });

      await pagesService.getPageTree('org-1');

      expect(mockApi.get).toHaveBeenCalledWith('/organizations/org-1/pages');
    });
  });

  describe('getPage', () => {
    it('should GET from correct endpoint', async () => {
      mockApi.get.mockResolvedValue({ page: { id: 'page-1' } });

      await pagesService.getPage('org-1', 'page-1');

      expect(mockApi.get).toHaveBeenCalledWith('/organizations/org-1/pages/page-1');
    });
  });

  describe('updatePage', () => {
    it('should PATCH to correct endpoint with input', async () => {
      mockApi.patch.mockResolvedValue({ page: { id: 'page-1', title: 'Updated' } });

      await pagesService.updatePage('org-1', 'page-1', { title: 'Updated' });

      expect(mockApi.patch).toHaveBeenCalledWith('/organizations/org-1/pages/page-1', {
        title: 'Updated',
      });
    });
  });

  describe('trashPage', () => {
    it('should DELETE to correct endpoint', async () => {
      mockApi.delete.mockResolvedValue({ message: 'trashed' });

      await pagesService.trashPage('org-1', 'page-1');

      expect(mockApi.delete).toHaveBeenCalledWith('/organizations/org-1/pages/page-1');
    });
  });

  // ===========================================
  // HIERARCHY
  // ===========================================

  describe('movePage', () => {
    it('should POST to correct endpoint with input', async () => {
      mockApi.post.mockResolvedValue({ page: { id: 'page-1' } });

      await pagesService.movePage('org-1', 'page-1', { parentId: 'page-2', position: 0 });

      expect(mockApi.post).toHaveBeenCalledWith('/organizations/org-1/pages/page-1/move', {
        parentId: 'page-2',
        position: 0,
      });
    });
  });

  describe('getAncestors', () => {
    it('should GET from correct endpoint', async () => {
      mockApi.get.mockResolvedValue({ ancestors: [] });

      await pagesService.getAncestors('org-1', 'page-1');

      expect(mockApi.get).toHaveBeenCalledWith('/organizations/org-1/pages/page-1/ancestors');
    });
  });

  describe('duplicatePage', () => {
    it('should POST to correct endpoint', async () => {
      mockApi.post.mockResolvedValue({ page: { id: 'page-2' } });

      await pagesService.duplicatePage('org-1', 'page-1');

      expect(mockApi.post).toHaveBeenCalledWith('/organizations/org-1/pages/page-1/duplicate');
    });
  });

  // ===========================================
  // TRASH
  // ===========================================

  describe('getTrashedPages', () => {
    it('should GET from correct endpoint', async () => {
      mockApi.get.mockResolvedValue({ pages: [] });

      await pagesService.getTrashedPages('org-1');

      expect(mockApi.get).toHaveBeenCalledWith('/organizations/org-1/trash');
    });
  });

  describe('restorePage', () => {
    it('should POST to correct endpoint', async () => {
      mockApi.post.mockResolvedValue({ page: { id: 'page-1' } });

      await pagesService.restorePage('org-1', 'page-1');

      expect(mockApi.post).toHaveBeenCalledWith('/organizations/org-1/pages/page-1/restore');
    });
  });

  describe('permanentlyDeletePage', () => {
    it('should DELETE to correct endpoint', async () => {
      mockApi.delete.mockResolvedValue({ message: 'deleted permanently' });

      await pagesService.permanentlyDeletePage('org-1', 'page-1');

      expect(mockApi.delete).toHaveBeenCalledWith('/organizations/org-1/trash/page-1');
    });
  });

  // ===========================================
  // FAVORITES
  // ===========================================

  describe('getFavorites', () => {
    it('should GET from correct endpoint', async () => {
      mockApi.get.mockResolvedValue({ favorites: [] });

      await pagesService.getFavorites('org-1');

      expect(mockApi.get).toHaveBeenCalledWith('/organizations/org-1/favorites');
    });
  });

  describe('addFavorite', () => {
    it('should POST to correct endpoint', async () => {
      mockApi.post.mockResolvedValue({ favorite: { id: 'fav-1' } });

      await pagesService.addFavorite('org-1', 'page-1');

      expect(mockApi.post).toHaveBeenCalledWith('/organizations/org-1/pages/page-1/favorite');
    });
  });

  describe('removeFavorite', () => {
    it('should DELETE to correct endpoint', async () => {
      mockApi.delete.mockResolvedValue({ message: 'removed' });

      await pagesService.removeFavorite('org-1', 'page-1');

      expect(mockApi.delete).toHaveBeenCalledWith('/organizations/org-1/pages/page-1/favorite');
    });
  });

  describe('reorderFavorites', () => {
    it('should PATCH orderedIds to correct endpoint', async () => {
      mockApi.patch.mockResolvedValue({ message: 'reordered' });

      await pagesService.reorderFavorites('org-1', ['fav-b', 'fav-a']);

      expect(mockApi.patch).toHaveBeenCalledWith('/organizations/org-1/favorites/reorder', {
        orderedIds: ['fav-b', 'fav-a'],
      });
    });
  });
});
