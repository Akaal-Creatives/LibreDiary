import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import FavoritesSection from '../FavoritesSection.vue';
import { usePagesStore } from '@/stores/pages';
import { useAuthStore } from '@/stores/auth';
import type { FavoriteWithPage } from '@/services';

// Mock the router
vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

// Mock the toast composable
vi.mock('@/composables/useToast', () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
  }),
}));

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('FavoritesSection', () => {
  const mockFavorites: FavoriteWithPage[] = [
    {
      id: 'fav-1',
      userId: 'user-1',
      pageId: 'page-1',
      position: 0,
      page: {
        id: 'page-1',
        title: 'First Page',
        icon: null,
        coverImage: null,
        content: null,
        parentId: null,
        organizationId: 'org-1',
        createdById: 'user-1',
        position: 0,
        trashedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    },
    {
      id: 'fav-2',
      userId: 'user-1',
      pageId: 'page-2',
      position: 1,
      page: {
        id: 'page-2',
        title: 'Second Page',
        icon: '📝',
        coverImage: null,
        content: null,
        parentId: null,
        organizationId: 'org-1',
        createdById: 'user-1',
        position: 1,
        trashedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    },
    {
      id: 'fav-3',
      userId: 'user-1',
      pageId: 'page-3',
      position: 2,
      page: {
        id: 'page-3',
        title: 'Third Page',
        icon: null,
        coverImage: null,
        content: null,
        parentId: null,
        organizationId: 'org-1',
        createdById: 'user-1',
        position: 2,
        trashedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    },
  ];

  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue('org-1');
    setupStores();
  });

  function setupStores() {
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
          logoUrl: null,
          accentColor: null,
          allowedDomains: [],
          aiEnabled: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      [{ organizationId: 'org-1', role: 'OWNER' }]
    );

    const pagesStore = usePagesStore();
    // Mock fetchFavorites to not make API calls
    pagesStore.fetchFavorites = vi.fn().mockResolvedValue(undefined);

    return { authStore, pagesStore };
  }

  function setupWithFavorites(favorites = mockFavorites) {
    const { authStore, pagesStore } = setupStores();
    pagesStore.favorites = [...favorites];
    return { authStore, pagesStore };
  }

  it('does not render when there are no favorites', () => {
    setupStores();
    const wrapper = mount(FavoritesSection);

    expect(wrapper.find('.favorites-section').exists()).toBe(false);
  });

  it('renders when there are favorites', () => {
    setupWithFavorites();
    const wrapper = mount(FavoritesSection);

    expect(wrapper.find('.favorites-section').exists()).toBe(true);
  });

  it('displays favorite page titles', () => {
    setupWithFavorites();
    const wrapper = mount(FavoritesSection);

    expect(wrapper.text()).toContain('First Page');
    expect(wrapper.text()).toContain('Second Page');
    expect(wrapper.text()).toContain('Third Page');
  });

  it('displays page emoji icons when present', () => {
    setupWithFavorites();
    const wrapper = mount(FavoritesSection);

    // Second page has an emoji icon
    expect(wrapper.text()).toContain('📝');
  });

  it('shows star icon for pages without emoji', () => {
    setupWithFavorites([mockFavorites[0]!]); // First page has no icon
    const wrapper = mount(FavoritesSection);

    // Should show the star SVG icon
    const favoriteIcon = wrapper.find('.favorite-icon svg');
    expect(favoriteIcon.exists()).toBe(true);
  });

  it('starts expanded by default', () => {
    setupWithFavorites();
    const wrapper = mount(FavoritesSection);

    expect(wrapper.find('.favorites-list').exists()).toBe(true);
    expect(wrapper.find('.expand-btn').classes()).toContain('expanded');
  });

  it('toggles expansion when header button is clicked', async () => {
    setupWithFavorites();
    const wrapper = mount(FavoritesSection);

    expect(wrapper.find('.favorites-list').exists()).toBe(true);

    await wrapper.find('.expand-btn').trigger('click');
    expect(wrapper.find('.favorites-list').exists()).toBe(false);
    expect(wrapper.find('.expand-btn').classes()).not.toContain('expanded');

    await wrapper.find('.expand-btn').trigger('click');
    expect(wrapper.find('.favorites-list').exists()).toBe(true);
    expect(wrapper.find('.expand-btn').classes()).toContain('expanded');
  });

  it('has section title "Favorites"', () => {
    setupWithFavorites();
    const wrapper = mount(FavoritesSection);

    expect(wrapper.find('.section-title').text()).toBe('Favorites');
  });

  it('shows active state for current page', () => {
    const { pagesStore } = setupWithFavorites();
    pagesStore.currentPageId = 'page-2';
    const wrapper = mount(FavoritesSection);

    const activeItem = wrapper.find('.favorite-item.active');
    expect(activeItem.exists()).toBe(true);
    expect(activeItem.text()).toContain('Second Page');
  });

  it('has draggable attribute on favorite items', () => {
    setupWithFavorites();
    const wrapper = mount(FavoritesSection);

    const items = wrapper.findAll('.favorite-item');
    items.forEach((item) => {
      expect(item.attributes('draggable')).toBe('true');
    });
  });

  it('handles drag start by setting dragging class', async () => {
    setupWithFavorites();
    const wrapper = mount(FavoritesSection);

    const firstItem = wrapper.findAll('.favorite-item')[0];
    await firstItem?.trigger('dragstart');

    expect(firstItem?.classes()).toContain('dragging');
  });

  it('handles drag end by removing dragging class', async () => {
    setupWithFavorites();
    const wrapper = mount(FavoritesSection);

    const firstItem = wrapper.findAll('.favorite-item')[0];
    await firstItem?.trigger('dragstart');
    expect(firstItem?.classes()).toContain('dragging');

    await firstItem?.trigger('dragend');
    expect(firstItem?.classes()).not.toContain('dragging');
  });

  it('shows drop indicator when dragging over another item', async () => {
    setupWithFavorites();
    const wrapper = mount(FavoritesSection);

    const items = wrapper.findAll('.favorite-item');
    const firstItem = items[0];
    const secondItem = items[1];

    await firstItem?.trigger('dragstart');
    await secondItem?.trigger('dragover');

    expect(secondItem?.classes()).toContain('drag-over');
  });

  it('removes drop indicator on drag leave', async () => {
    setupWithFavorites();
    const wrapper = mount(FavoritesSection);

    const items = wrapper.findAll('.favorite-item');
    const firstItem = items[0];
    const secondItem = items[1];

    await firstItem?.trigger('dragstart');
    await secondItem?.trigger('dragover');
    expect(secondItem?.classes()).toContain('drag-over');

    await secondItem?.trigger('dragleave');
    expect(secondItem?.classes()).not.toContain('drag-over');
  });

  it('calls reorderFavorites on successful drop', async () => {
    const { pagesStore } = setupWithFavorites();
    pagesStore.reorderFavorites = vi.fn().mockResolvedValue(undefined);
    const wrapper = mount(FavoritesSection);

    const items = wrapper.findAll('.favorite-item');
    const firstItem = items[0];
    const thirdItem = items[2];

    // Simulate dragging first item to third position
    await firstItem?.trigger('dragstart', {
      dataTransfer: {
        setData: vi.fn(),
        effectAllowed: 'move',
      },
    });
    await thirdItem?.trigger('drop', {
      dataTransfer: {
        getData: () => 'fav-1',
      },
    });
    await flushPromises();

    expect(pagesStore.reorderFavorites).toHaveBeenCalled();
  });

  it('has aria-label on expand button', () => {
    setupWithFavorites();
    const wrapper = mount(FavoritesSection);

    const expandBtn = wrapper.find('.expand-btn');
    expect(expandBtn.attributes('aria-label')).toBeDefined();
  });

  it('updates aria-expanded when toggling', async () => {
    setupWithFavorites();
    const wrapper = mount(FavoritesSection);

    const expandBtn = wrapper.find('.expand-btn');
    expect(expandBtn.attributes('aria-expanded')).toBe('true');

    await expandBtn.trigger('click');
    expect(expandBtn.attributes('aria-expanded')).toBe('false');
  });

  it('has correct ARIA roles for list and items', () => {
    setupWithFavorites();
    const wrapper = mount(FavoritesSection);

    const list = wrapper.find('.favorites-list');
    expect(list.attributes('role')).toBe('list');

    const items = wrapper.findAll('.favorite-item');
    items.forEach((item) => {
      expect(item.attributes('role')).toBe('listitem');
    });
  });
});
