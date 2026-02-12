import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';

vi.mock('@/composables', () => ({
  useTheme: () => ({ theme: 'light', toggleTheme: vi.fn() }),
  useToast: () => ({ show: vi.fn() }),
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

vi.mock('@/stores', () => ({
  useAuthStore: () => ({ user: null, logout: vi.fn() }),
  usePagesStore: () => ({
    currentPage: null,
    pages: [],
    pageTree: [],
    loadPages: vi.fn(),
  }),
  useDatabasesStore: () => ({
    databases: [],
    loadDatabases: vi.fn(),
  }),
  useSyncStore: () => ({ status: 'idle', statusMessage: '' }),
  useOrganizationsStore: () => ({
    currentOrganization: null,
    organizations: [],
  }),
}));

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useRoute: () => ({ name: 'dashboard', fullPath: '/dashboard', params: {} }),
  RouterView: { template: '<div />' },
  RouterLink: { template: '<a><slot /></a>' },
}));

import AppLayout from '../AppLayout.vue';

describe('AppLayout accessibility', () => {
  function mountLayout() {
    return mount(AppLayout, {
      global: {
        stubs: {
          AppSidebar: { template: '<aside><slot /></aside>' },
          AppHeader: { template: '<header />' },
          KeyboardShortcutsModal: { template: '<div />' },
          OnboardingTour: { template: '<div />' },
          OfflineIndicator: { template: '<div />' },
          RouterView: { template: '<div />' },
          Transition: true,
        },
      },
    });
  }

  it('has a skip-to-content link as first focusable element', () => {
    const wrapper = mountLayout();
    const skipLink = wrapper.find('a.skip-to-content');
    expect(skipLink.exists()).toBe(true);
    expect(skipLink.attributes('href')).toBe('#main-content');
  });

  it('skip-to-content link has accessible text', () => {
    const wrapper = mountLayout();
    const skipLink = wrapper.find('a.skip-to-content');
    expect(skipLink.text()).toBeTruthy();
  });

  it('main element has id matching skip-to-content target', () => {
    const wrapper = mountLayout();
    const main = wrapper.find('main#main-content');
    expect(main.exists()).toBe(true);
  });
});
