import { api } from './api';
import type { Page, PageWithChildren, Favorite } from '@librediary/shared';

// ===========================================
// TYPES
// ===========================================

export interface CreatePageInput {
  title?: string;
  parentId?: string | null;
  icon?: string | null;
}

export interface UpdatePageInput {
  title?: string;
  icon?: string | null;
  coverUrl?: string | null;
  isPublic?: boolean;
  publicSlug?: string | null;
}

export interface MovePageInput {
  parentId?: string | null;
  position?: number;
}

export interface FavoriteWithPage extends Favorite {
  page: Page;
}

// ===========================================
// SERVICE
// ===========================================

export const pagesService = {
  // ===========================================
  // PAGE CRUD
  // ===========================================

  /**
   * Create a new page
   */
  async createPage(orgId: string, input: CreatePageInput): Promise<{ page: Page }> {
    return api.post<{ page: Page }>(`/organizations/${orgId}/pages`, input);
  },

  /**
   * Get page tree for organization
   */
  async getPageTree(orgId: string): Promise<{ pages: PageWithChildren[] }> {
    return api.get<{ pages: PageWithChildren[] }>(`/organizations/${orgId}/pages`);
  },

  /**
   * Get a single page
   */
  async getPage(orgId: string, pageId: string): Promise<{ page: Page }> {
    return api.get<{ page: Page }>(`/organizations/${orgId}/pages/${pageId}`);
  },

  /**
   * Update a page
   */
  async updatePage(orgId: string, pageId: string, input: UpdatePageInput): Promise<{ page: Page }> {
    return api.patch<{ page: Page }>(`/organizations/${orgId}/pages/${pageId}`, input);
  },

  /**
   * Soft delete (trash) a page
   */
  async trashPage(orgId: string, pageId: string): Promise<{ message: string }> {
    return api.delete<{ message: string }>(`/organizations/${orgId}/pages/${pageId}`);
  },

  // ===========================================
  // HIERARCHY
  // ===========================================

  /**
   * Move a page to a new parent and/or position
   */
  async movePage(orgId: string, pageId: string, input: MovePageInput): Promise<{ page: Page }> {
    return api.post<{ page: Page }>(`/organizations/${orgId}/pages/${pageId}/move`, input);
  },

  /**
   * Get page ancestors (for breadcrumbs)
   */
  async getAncestors(orgId: string, pageId: string): Promise<{ ancestors: Page[] }> {
    return api.get<{ ancestors: Page[] }>(`/organizations/${orgId}/pages/${pageId}/ancestors`);
  },

  /**
   * Duplicate a page
   */
  async duplicatePage(orgId: string, pageId: string): Promise<{ page: Page }> {
    return api.post<{ page: Page }>(`/organizations/${orgId}/pages/${pageId}/duplicate`);
  },

  // ===========================================
  // TRASH
  // ===========================================

  /**
   * Get trashed pages
   */
  async getTrashedPages(orgId: string): Promise<{ pages: Page[] }> {
    return api.get<{ pages: Page[] }>(`/organizations/${orgId}/trash`);
  },

  /**
   * Restore a page from trash
   */
  async restorePage(orgId: string, pageId: string): Promise<{ page: Page }> {
    return api.post<{ page: Page }>(`/organizations/${orgId}/pages/${pageId}/restore`);
  },

  /**
   * Permanently delete a page
   */
  async permanentlyDeletePage(orgId: string, pageId: string): Promise<{ message: string }> {
    return api.delete<{ message: string }>(`/organizations/${orgId}/trash/${pageId}`);
  },

  // ===========================================
  // FAVORITES
  // ===========================================

  /**
   * Get user's favorites for organization
   */
  async getFavorites(orgId: string): Promise<{ favorites: FavoriteWithPage[] }> {
    return api.get<{ favorites: FavoriteWithPage[] }>(`/organizations/${orgId}/favorites`);
  },

  /**
   * Add page to favorites
   */
  async addFavorite(orgId: string, pageId: string): Promise<{ favorite: Favorite }> {
    return api.post<{ favorite: Favorite }>(`/organizations/${orgId}/pages/${pageId}/favorite`);
  },

  /**
   * Remove page from favorites
   */
  async removeFavorite(orgId: string, pageId: string): Promise<{ message: string }> {
    return api.delete<{ message: string }>(`/organizations/${orgId}/pages/${pageId}/favorite`);
  },

  /**
   * Reorder favorites
   */
  async reorderFavorites(orgId: string, orderedIds: string[]): Promise<{ message: string }> {
    return api.patch<{ message: string }>(`/organizations/${orgId}/favorites/reorder`, {
      orderedIds,
    });
  },
};
