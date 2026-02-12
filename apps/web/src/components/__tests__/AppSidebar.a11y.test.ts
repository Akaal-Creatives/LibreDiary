import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useRoute: () => ({ name: 'dashboard', fullPath: '/dashboard', params: {} }),
  RouterLink: { template: '<a><slot /></a>', props: ['to'] },
}));

vi.mock('@/stores', () => ({
  useAuthStore: () => ({
    user: { name: 'Test', email: 'test@test.com' },
    currentOrganizationId: 'org-1',
    logout: vi.fn(),
  }),
  usePagesStore: () => ({
    currentPage: null,
    pages: [],
    pageTree: [],
    rootPages: [],
    favorites: [],
    loading: false,
    loadPages: vi.fn(),
    fetchPageTree: vi.fn().mockResolvedValue([]),
    fetchFavorites: vi.fn().mockResolvedValue([]),
    createPage: vi.fn(),
  }),
  useDatabasesStore: () => ({
    databases: [],
    databaseList: [],
    loadDatabases: vi.fn(),
    fetchDatabases: vi.fn().mockResolvedValue([]),
    createDatabase: vi.fn(),
  }),
  useOrganizationsStore: () => ({
    currentOrganization: { id: 'org-1', name: 'Test Org' },
    organizations: [{ id: 'org-1', name: 'Test Org' }],
  }),
}));

vi.mock('@/composables', () => ({
  useTheme: () => ({ theme: 'light', toggleTheme: vi.fn() }),
  useToast: () => ({ show: vi.fn(), error: vi.fn(), success: vi.fn() }),
}));

vi.mock('@/composables/useKeyboardShortcuts', () => ({
  useKeyboardShortcuts: () => ({
    register: vi.fn(),
    toggleHelp: vi.fn(),
  }),
}));

vi.mock('@/composables/useSidebar', () => ({
  useSidebar: () => ({
    isOverlay: { value: false },
    isOpen: { value: true },
    toggle: vi.fn(),
    close: vi.fn(),
  }),
}));

import AppSidebar from '../AppSidebar.vue';

describe('AppSidebar accessibility', () => {
  function mountSidebar() {
    return mount(AppSidebar, {
      global: {
        stubs: {
          OrganizationSwitcher: { template: '<div />' },
          PageTreeItem: { template: '<div />' },
          PageContextMenu: { template: '<div />' },
          SaveAsTemplateModal: { template: '<div />' },
          FavoritesSection: { template: '<div />' },
          NotificationBell: { template: '<div />' },
          LanguageSwitcher: { template: '<div />' },
          SearchModal: { template: '<div />' },
          SidebarSkeleton: { template: '<div />' },
          RouterLink: { template: '<a><slot /></a>' },
          Transition: true,
          TransitionGroup: true,
        },
      },
    });
  }

  it('search button has aria-label', () => {
    const wrapper = mountSidebar();
    const searchBtn = wrapper.find('.search-wrapper');
    expect(searchBtn.attributes('aria-label')).toBeTruthy();
  });

  it('theme toggle button has aria-label', () => {
    const wrapper = mountSidebar();
    const allButtons = wrapper.findAll('button[aria-label]');
    const themeToggle = allButtons.find((btn) =>
      btn.attributes('aria-label')?.toLowerCase().includes('theme')
    );
    expect(themeToggle).toBeDefined();
  });

  it('sidebar is wrapped in a nav landmark', () => {
    const wrapper = mountSidebar();
    const nav = wrapper.find('nav');
    expect(nav.exists()).toBe(true);
  });
});
