import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';

vi.mock('@/stores', () => ({
  useAuthStore: () => ({
    user: { name: 'Admin', email: 'admin@test.com' },
    logout: vi.fn(),
  }),
}));

vi.mock('@/composables', () => ({
  useTheme: () => ({ theme: 'light', toggleTheme: vi.fn() }),
}));

vi.mock('@/composables/useSidebar', () => ({
  useSidebar: () => ({
    isOverlay: { value: false },
    isOpen: { value: true },
    toggle: vi.fn(),
    close: vi.fn(),
  }),
}));

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useRoute: () => ({ name: 'admin-dashboard', fullPath: '/admin', params: {} }),
  RouterView: { template: '<div />' },
  RouterLink: {
    template: '<a :aria-current="$attrs[\'aria-current\']"><slot /></a>',
    props: ['to'],
  },
}));

import AdminLayout from '../AdminLayout.vue';

describe('AdminLayout accessibility', () => {
  function mountLayout() {
    return mount(AdminLayout, {
      global: {
        stubs: {
          RouterView: { template: '<div />' },
          RouterLink: {
            template: '<a :aria-current="$attrs[\'aria-current\']"><slot /></a>',
            props: ['to'],
          },
          Transition: true,
        },
      },
    });
  }

  it('has a skip-to-content link targeting admin main content', () => {
    const wrapper = mountLayout();
    const skipLink = wrapper.find('a.skip-to-content');
    expect(skipLink.exists()).toBe(true);
    expect(skipLink.attributes('href')).toBe('#admin-main-content');
  });

  it('main element has id matching skip-to-content target', () => {
    const wrapper = mountLayout();
    const main = wrapper.find('main#admin-main-content');
    expect(main.exists()).toBe(true);
  });

  it('theme toggle button has aria-label', () => {
    const wrapper = mountLayout();
    const themeBtn = wrapper.find('.header-btn');
    expect(themeBtn.attributes('aria-label')).toBeTruthy();
  });

  it('logout button has aria-label', () => {
    const wrapper = mountLayout();
    const logoutBtn = wrapper.find('.logout-btn');
    expect(logoutBtn.attributes('aria-label')).toBeTruthy();
  });

  it('sidebar uses aside landmark element', () => {
    const wrapper = mountLayout();
    const aside = wrapper.find('aside.admin-sidebar');
    expect(aside.exists()).toBe(true);
  });
});
