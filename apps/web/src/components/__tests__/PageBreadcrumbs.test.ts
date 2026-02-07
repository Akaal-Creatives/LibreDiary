import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import PageBreadcrumbs from '../PageBreadcrumbs.vue';
import { usePagesStore } from '@/stores/pages';
import { useAuthStore } from '@/stores/auth';

// Mock the router
const mockPush = vi.fn();
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Mock services used by the pages store
vi.mock('@/services', () => ({
  pagesService: {
    getPageTree: vi.fn().mockResolvedValue({ pages: [] }),
    getPage: vi.fn().mockResolvedValue({ page: {} }),
    createPage: vi.fn().mockResolvedValue({ page: {} }),
    updatePage: vi.fn().mockResolvedValue({ page: {} }),
    trashPage: vi.fn().mockResolvedValue({ message: 'ok' }),
    movePage: vi.fn().mockResolvedValue({ page: {} }),
    getAncestors: vi.fn().mockResolvedValue({ ancestors: [] }),
    duplicatePage: vi.fn().mockResolvedValue({ page: {} }),
    getTrashedPages: vi.fn().mockResolvedValue({ pages: [] }),
    restorePage: vi.fn().mockResolvedValue({ page: {} }),
    permanentlyDeletePage: vi.fn().mockResolvedValue({ message: 'ok' }),
    getFavorites: vi.fn().mockResolvedValue({ favorites: [] }),
    addFavorite: vi.fn().mockResolvedValue({ favorite: {} }),
    removeFavorite: vi.fn().mockResolvedValue({ message: 'ok' }),
    reorderFavorites: vi.fn().mockResolvedValue({ message: 'ok' }),
  },
  authService: {
    getCurrentUser: vi.fn().mockResolvedValue({ user: null, organizations: [], memberships: [] }),
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

describe('PageBreadcrumbs', () => {
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
    // Prevent actual API calls for fetchAncestors during mount
    pagesStore.fetchAncestors = vi.fn().mockResolvedValue([]);

    return { authStore, pagesStore };
  }

  it('renders home breadcrumb link', () => {
    const wrapper = mount(PageBreadcrumbs);

    const homeLink = wrapper.find('.breadcrumb-link');
    expect(homeLink.exists()).toBe(true);
    // Home link contains an SVG icon
    expect(homeLink.find('svg').exists()).toBe(true);
  });

  it('has aria-label="Breadcrumb" on nav', () => {
    const wrapper = mount(PageBreadcrumbs);

    const nav = wrapper.find('nav');
    expect(nav.attributes('aria-label')).toBe('Breadcrumb');
  });

  it('renders ancestor breadcrumbs when ancestors are set', () => {
    const { pagesStore } = setupStores();
    pagesStore.ancestors = [
      {
        id: 'ancestor-1',
        title: 'Parent Page',
        icon: null,
        coverUrl: null,
        htmlContent: null,
        parentId: null,
        organizationId: 'org-1',
        createdById: 'user-1',
        updatedById: null,
        position: 0,
        isPublic: false,
        publicSlug: null,
        trashedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'ancestor-2',
        title: 'Child Section',
        icon: null,
        coverUrl: null,
        htmlContent: null,
        parentId: 'ancestor-1',
        organizationId: 'org-1',
        createdById: 'user-1',
        updatedById: null,
        position: 0,
        isPublic: false,
        publicSlug: null,
        trashedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    const wrapper = mount(PageBreadcrumbs);

    expect(wrapper.text()).toContain('Parent Page');
    expect(wrapper.text()).toContain('Child Section');
  });

  it('renders current page name with class breadcrumb-current', () => {
    const { pagesStore } = setupStores();
    // Set current page in the store
    pagesStore.setCurrentPage('page-current');
    pagesStore.pages.set('page-current', {
      id: 'page-current',
      title: 'My Current Page',
      icon: null,
      coverUrl: null,
      htmlContent: null,
      parentId: null,
      organizationId: 'org-1',
      createdById: 'user-1',
      updatedById: null,
      position: 0,
      isPublic: false,
      publicSlug: null,
      trashedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const wrapper = mount(PageBreadcrumbs);

    const currentBreadcrumb = wrapper.find('.breadcrumb-current');
    expect(currentBreadcrumb.exists()).toBe(true);
    expect(currentBreadcrumb.text()).toContain('My Current Page');
  });

  it('shows separator "/" between items', () => {
    const { pagesStore } = setupStores();
    pagesStore.ancestors = [
      {
        id: 'ancestor-1',
        title: 'Parent Page',
        icon: null,
        coverUrl: null,
        htmlContent: null,
        parentId: null,
        organizationId: 'org-1',
        createdById: 'user-1',
        updatedById: null,
        position: 0,
        isPublic: false,
        publicSlug: null,
        trashedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    const wrapper = mount(PageBreadcrumbs);

    const separators = wrapper.findAll('.breadcrumb-separator');
    expect(separators.length).toBeGreaterThan(0);
    expect(separators[0]!.text()).toBe('/');
  });

  it('renders ancestor icon when present', () => {
    const { pagesStore } = setupStores();
    pagesStore.ancestors = [
      {
        id: 'ancestor-1',
        title: 'Emoji Page',
        icon: '📂',
        coverUrl: null,
        htmlContent: null,
        parentId: null,
        organizationId: 'org-1',
        createdById: 'user-1',
        updatedById: null,
        position: 0,
        isPublic: false,
        publicSlug: null,
        trashedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    const wrapper = mount(PageBreadcrumbs);

    const icon = wrapper.find('.breadcrumb-icon');
    expect(icon.exists()).toBe(true);
    expect(icon.text()).toBe('📂');
  });

  it('navigates to dashboard when clicking home', async () => {
    const wrapper = mount(PageBreadcrumbs);

    const homeLink = wrapper.find('.breadcrumb-link');
    await homeLink.trigger('click');

    expect(mockPush).toHaveBeenCalledWith({ name: 'dashboard' });
  });

  it('navigates to ancestor page when clicking ancestor link', async () => {
    const { pagesStore } = setupStores();
    pagesStore.ancestors = [
      {
        id: 'ancestor-1',
        title: 'Parent Page',
        icon: null,
        coverUrl: null,
        htmlContent: null,
        parentId: null,
        organizationId: 'org-1',
        createdById: 'user-1',
        updatedById: null,
        position: 0,
        isPublic: false,
        publicSlug: null,
        trashedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    const wrapper = mount(PageBreadcrumbs);

    // The first breadcrumb-link is home, the second is the ancestor
    const links = wrapper.findAll('.breadcrumb-link');
    expect(links.length).toBe(2);

    await links[1]!.trigger('click');

    expect(mockPush).toHaveBeenCalledWith({
      name: 'page',
      params: { pageId: 'ancestor-1' },
    });
  });
});
