/**
 * Pages Store — E2EE integration tests
 *
 * Verifies that htmlContent is transparently encrypted before save
 * and decrypted after load when the workspace is encrypted.
 *
 * Developed by Akaal Creatives
 * https://www.akaalcreatives.com
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { usePagesStore } from '../pages';
import { useAuthStore } from '../auth';
import { pagesService } from '@/services/pages.service';
import type { Page } from '@librediary/shared';

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

// Mock useEncryption composable
const mockEncryption = vi.hoisted(() => ({
  isUnlocked: { value: false },
  isSetUp: { value: false },
  masterKey: { value: null },
  privateKey: { value: null },
  checkStatus: vi.fn(),
  setupEncryption: vi.fn(),
  unlock: vi.fn(),
  lock: vi.fn(),
  encryptContent: vi.fn(),
  decryptContent: vi.fn(),
  getWorkspaceKey: vi.fn(),
  recoverWithRecoveryKey: vi.fn(),
}));

vi.mock('@/composables/useEncryption', () => ({
  useEncryption: () => mockEncryption,
}));

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('Pages Store — E2EE integration', () => {
  const mockWorkspaceKey = new Uint8Array(32).fill(42);

  const makePage = (overrides: Partial<Page> = {}): Page => ({
    id: 'page-1',
    title: 'Test Page',
    icon: '📄',
    coverUrl: null,
    htmlContent: '<p>Hello World</p>',
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
    ...overrides,
  });

  function setupAuthStore(isEncrypted = false) {
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
          isEncrypted,
        },
      ],
      [{ organizationId: 'org-1', role: 'OWNER' }]
    );
    return authStore;
  }

  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue('org-1');

    // Reset encryption mock state
    mockEncryption.isUnlocked.value = false;
    mockEncryption.isSetUp.value = false;
    mockEncryption.getWorkspaceKey.mockResolvedValue(null);
    mockEncryption.encryptContent.mockResolvedValue('ENCRYPTED_BASE64');
    mockEncryption.decryptContent.mockResolvedValue('<p>Hello World</p>');
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // =============================================
  // fetchPage — decryption on load
  // =============================================

  describe('fetchPage — decryption', () => {
    it('should decrypt htmlContent when org is encrypted and encryption is unlocked', async () => {
      setupAuthStore(true);
      mockEncryption.isUnlocked.value = true;
      mockEncryption.getWorkspaceKey.mockResolvedValue(mockWorkspaceKey);
      mockEncryption.decryptContent.mockResolvedValue('<p>Decrypted Content</p>');

      const encryptedPage = makePage({ htmlContent: 'ENCRYPTED_BLOB_BASE64' });
      vi.mocked(pagesService.getPage).mockResolvedValue({ page: encryptedPage });

      const store = usePagesStore();
      const page = await store.fetchPage('page-1');

      expect(mockEncryption.getWorkspaceKey).toHaveBeenCalledWith('org-1');
      expect(mockEncryption.decryptContent).toHaveBeenCalledWith(
        'ENCRYPTED_BLOB_BASE64',
        mockWorkspaceKey
      );
      expect(page.htmlContent).toBe('<p>Decrypted Content</p>');
    });

    it('should NOT decrypt htmlContent when org is not encrypted', async () => {
      setupAuthStore(false);

      const page = makePage({ htmlContent: '<p>Plain text</p>' });
      vi.mocked(pagesService.getPage).mockResolvedValue({ page });

      const store = usePagesStore();
      const result = await store.fetchPage('page-1');

      expect(mockEncryption.decryptContent).not.toHaveBeenCalled();
      expect(result.htmlContent).toBe('<p>Plain text</p>');
    });

    it('should NOT decrypt when encryption is not unlocked', async () => {
      setupAuthStore(true);
      mockEncryption.isUnlocked.value = false;

      const page = makePage({ htmlContent: 'ENCRYPTED_BLOB' });
      vi.mocked(pagesService.getPage).mockResolvedValue({ page });

      const store = usePagesStore();
      const result = await store.fetchPage('page-1');

      expect(mockEncryption.decryptContent).not.toHaveBeenCalled();
      expect(result.htmlContent).toBe('ENCRYPTED_BLOB');
    });

    it('should handle null htmlContent without attempting decryption', async () => {
      setupAuthStore(true);
      mockEncryption.isUnlocked.value = true;
      mockEncryption.getWorkspaceKey.mockResolvedValue(mockWorkspaceKey);

      const page = makePage({ htmlContent: null });
      vi.mocked(pagesService.getPage).mockResolvedValue({ page });

      const store = usePagesStore();
      const result = await store.fetchPage('page-1');

      expect(mockEncryption.decryptContent).not.toHaveBeenCalled();
      expect(result.htmlContent).toBeNull();
    });

    it('should handle empty string htmlContent without attempting decryption', async () => {
      setupAuthStore(true);
      mockEncryption.isUnlocked.value = true;
      mockEncryption.getWorkspaceKey.mockResolvedValue(mockWorkspaceKey);

      const page = makePage({ htmlContent: '' });
      vi.mocked(pagesService.getPage).mockResolvedValue({ page });

      const store = usePagesStore();
      const result = await store.fetchPage('page-1');

      expect(mockEncryption.decryptContent).not.toHaveBeenCalled();
      expect(result.htmlContent).toBe('');
    });

    it('should return page as-is if workspace key is unavailable', async () => {
      setupAuthStore(true);
      mockEncryption.isUnlocked.value = true;
      mockEncryption.getWorkspaceKey.mockResolvedValue(null);

      const page = makePage({ htmlContent: 'ENCRYPTED_BLOB' });
      vi.mocked(pagesService.getPage).mockResolvedValue({ page });

      const store = usePagesStore();
      const result = await store.fetchPage('page-1');

      expect(mockEncryption.decryptContent).not.toHaveBeenCalled();
      expect(result.htmlContent).toBe('ENCRYPTED_BLOB');
    });
  });

  // =============================================
  // updatePageData — encryption on save
  // =============================================

  describe('updatePageData — encryption', () => {
    it('should encrypt htmlContent before sending when org is encrypted', async () => {
      setupAuthStore(true);
      mockEncryption.isUnlocked.value = true;
      mockEncryption.getWorkspaceKey.mockResolvedValue(mockWorkspaceKey);
      mockEncryption.encryptContent.mockResolvedValue('ENCRYPTED_OUTPUT');

      const savedPage = makePage({ htmlContent: 'ENCRYPTED_OUTPUT' });
      vi.mocked(pagesService.updatePage).mockResolvedValue({ page: savedPage });

      const store = usePagesStore();

      // Pre-populate page in store so fetchedPageIds check passes
      store.pages.set('page-1', makePage());

      await store.updatePageData('page-1', { htmlContent: '<p>New content</p>' });

      expect(mockEncryption.encryptContent).toHaveBeenCalledWith(
        '<p>New content</p>',
        mockWorkspaceKey
      );
      // The service should receive encrypted content
      expect(pagesService.updatePage).toHaveBeenCalledWith('org-1', 'page-1', {
        htmlContent: 'ENCRYPTED_OUTPUT',
      });
    });

    it('should NOT encrypt htmlContent when org is not encrypted', async () => {
      setupAuthStore(false);

      const savedPage = makePage({ htmlContent: '<p>Plain text</p>' });
      vi.mocked(pagesService.updatePage).mockResolvedValue({ page: savedPage });

      const store = usePagesStore();
      store.pages.set('page-1', makePage());

      await store.updatePageData('page-1', { htmlContent: '<p>Plain text</p>' });

      expect(mockEncryption.encryptContent).not.toHaveBeenCalled();
      expect(pagesService.updatePage).toHaveBeenCalledWith('org-1', 'page-1', {
        htmlContent: '<p>Plain text</p>',
      });
    });

    it('should NOT encrypt when encryption is not unlocked', async () => {
      setupAuthStore(true);
      mockEncryption.isUnlocked.value = false;

      const savedPage = makePage({ htmlContent: '<p>Content</p>' });
      vi.mocked(pagesService.updatePage).mockResolvedValue({ page: savedPage });

      const store = usePagesStore();
      store.pages.set('page-1', makePage());

      await store.updatePageData('page-1', { htmlContent: '<p>Content</p>' });

      expect(mockEncryption.encryptContent).not.toHaveBeenCalled();
    });

    it('should pass through non-content updates without encryption', async () => {
      setupAuthStore(true);
      mockEncryption.isUnlocked.value = true;
      mockEncryption.getWorkspaceKey.mockResolvedValue(mockWorkspaceKey);

      const savedPage = makePage({ title: 'New Title' });
      vi.mocked(pagesService.updatePage).mockResolvedValue({ page: savedPage });

      const store = usePagesStore();
      store.pages.set('page-1', makePage());

      await store.updatePageData('page-1', { title: 'New Title' });

      // No htmlContent in the update — encryption should not be called
      expect(mockEncryption.encryptContent).not.toHaveBeenCalled();
      expect(pagesService.updatePage).toHaveBeenCalledWith('org-1', 'page-1', {
        title: 'New Title',
      });
    });

    it('should decrypt the returned page after encrypted save', async () => {
      setupAuthStore(true);
      mockEncryption.isUnlocked.value = true;
      mockEncryption.getWorkspaceKey.mockResolvedValue(mockWorkspaceKey);
      mockEncryption.encryptContent.mockResolvedValue('ENCRYPTED_OUTPUT');
      mockEncryption.decryptContent.mockResolvedValue('<p>Decrypted result</p>');

      const serverPage = makePage({ htmlContent: 'ENCRYPTED_OUTPUT' });
      vi.mocked(pagesService.updatePage).mockResolvedValue({ page: serverPage });

      const store = usePagesStore();
      store.pages.set('page-1', makePage());

      const result = await store.updatePageData('page-1', { htmlContent: '<p>Content</p>' });

      // The returned page should have decrypted content
      expect(result.htmlContent).toBe('<p>Decrypted result</p>');
    });
  });
});
