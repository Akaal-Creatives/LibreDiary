import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { ref } from 'vue';
import { createPinia, setActivePinia } from 'pinia';
import AppSidebar from '../AppSidebar.vue';
import { usePagesStore } from '@/stores/pages';
import { useDatabasesStore } from '@/stores/databases';
import { useAuthStore } from '@/stores/auth';

// Mock the router
const mockPush = vi.fn();
vi.mock('vue-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Mock child components as stubs
vi.mock('../OrganizationSwitcher.vue', () => ({
  default: { template: '<div class="org-switcher-stub" />' },
}));
vi.mock('../PageTreeItem.vue', () => ({
  default: { template: '<div class="page-tree-item-stub" />' },
}));
vi.mock('../PageContextMenu.vue', () => ({
  default: { template: '<div class="page-context-menu-stub" />' },
}));
vi.mock('../FavoritesSection.vue', () => ({
  default: { template: '<div class="favorites-stub" />' },
}));
vi.mock('../NotificationBell.vue', () => ({
  default: { template: '<div class="notification-bell-stub" />' },
}));
vi.mock('../SearchModal.vue', () => ({
  default: { template: '<div class="search-modal-stub" />' },
}));

// Mock composables
vi.mock('@/composables', () => ({
  useTheme: () => ({ theme: ref('light'), toggleTheme: vi.fn() }),
  useToast: () => ({ success: vi.fn(), error: vi.fn() }),
}));

// Mock services used by the stores
vi.mock('@/services', () => ({
  pagesService: {
    getPageTree: vi.fn().mockResolvedValue({ pages: [] }),
    getFavorites: vi.fn().mockResolvedValue({ favorites: [] }),
    createPage: vi.fn().mockResolvedValue({ page: { id: 'new-page' } }),
  },
  databasesService: {
    listDatabases: vi.fn().mockResolvedValue({ databases: [] }),
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

describe('AppSidebar', () => {
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
      email: 'test@example.com',
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
    // Prevent actual API calls during mount
    pagesStore.fetchPageTree = vi.fn().mockResolvedValue(undefined);
    pagesStore.fetchFavorites = vi.fn().mockResolvedValue(undefined);

    const databasesStore = useDatabasesStore();
    databasesStore.fetchDatabases = vi.fn().mockResolvedValue(undefined);

    return { authStore, pagesStore, databasesStore };
  }

  it('renders the sidebar with navigation items (Home, New Page, Trash)', () => {
    const wrapper = mount(AppSidebar);

    expect(wrapper.text()).toContain('Home');
    expect(wrapper.text()).toContain('New Page');
    expect(wrapper.text()).toContain('Trash');
  });

  it('renders user name in footer', () => {
    const wrapper = mount(AppSidebar);

    expect(wrapper.find('.user-name').text()).toBe('Test User');
  });

  it('renders user avatar initial (first letter of name, uppercase)', () => {
    const wrapper = mount(AppSidebar);

    expect(wrapper.find('.user-avatar').text()).toBe('T');
  });

  it('renders search button with placeholder "Search..."', () => {
    const wrapper = mount(AppSidebar);

    expect(wrapper.find('.search-placeholder').text()).toBe('Search...');
  });

  it('shows "No pages yet" when page tree is empty', () => {
    const wrapper = mount(AppSidebar);

    expect(wrapper.text()).toContain('No pages yet');
  });

  it('renders "Pages" section header', () => {
    const wrapper = mount(AppSidebar);

    const sectionTitles = wrapper.findAll('.nav-section-title');
    const pagesSectionTitle = sectionTitles.find((el) => el.text() === 'Pages');
    expect(pagesSectionTitle).toBeDefined();
  });

  it('renders "Databases" section header', () => {
    const wrapper = mount(AppSidebar);

    const sectionTitles = wrapper.findAll('.nav-section-title');
    const databasesSectionTitle = sectionTitles.find((el) => el.text() === 'Databases');
    expect(databasesSectionTitle).toBeDefined();
  });

  it('shows "No databases yet" when database list is empty', () => {
    const wrapper = mount(AppSidebar);

    expect(wrapper.text()).toContain('No databases yet');
  });

  it('navigates to dashboard when clicking Home', async () => {
    const wrapper = mount(AppSidebar);

    const navItems = wrapper.findAll('.nav-item');
    const homeButton = navItems.find((el) => el.text().includes('Home'));
    expect(homeButton).toBeDefined();

    await homeButton!.trigger('click');

    expect(mockPush).toHaveBeenCalledWith({ name: 'dashboard' });
  });

  it('navigates to trash when clicking Trash', async () => {
    const wrapper = mount(AppSidebar);

    const trashButton = wrapper.find('.trash-link');
    expect(trashButton.exists()).toBe(true);

    await trashButton.trigger('click');

    expect(mockPush).toHaveBeenCalledWith({ name: 'trash' });
  });
});
