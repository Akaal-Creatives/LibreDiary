import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import MobileBottomNav from '../MobileBottomNav.vue';

const mockPush = vi.fn();
const mockRoute = { name: 'dashboard' };

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  useRoute: () => mockRoute,
}));

vi.mock('@/composables/useScrollDirection', () => ({
  useScrollDirection: vi.fn(() => ({
    direction: { value: 'idle' },
    isScrollingDown: { value: false },
  })),
}));

vi.mock('@/composables/useSidebar', () => {
  const toggleFn = vi.fn();
  return {
    useSidebar: vi.fn(() => ({
      isMobile: { value: true },
      isOpen: { value: false },
      isOverlay: { value: true },
      toggle: toggleFn,
      open: vi.fn(),
      close: vi.fn(),
    })),
    __toggleFn: toggleFn,
  };
});

describe('MobileBottomNav', () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockRoute.name = 'dashboard';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should render 5 nav items', () => {
    const wrapper = mount(MobileBottomNav);

    const items = wrapper.findAll('.bottom-nav-item');
    expect(items).toHaveLength(5);
  });

  it('should render labels for all tabs', () => {
    const wrapper = mount(MobileBottomNav);

    const labels = wrapper.findAll('.bottom-nav-label');
    expect(labels.map((l) => l.text())).toEqual([
      'bottomNav.home',
      'bottomNav.search',
      'bottomNav.pages',
      'bottomNav.settings',
    ]);
  });

  it('should have a FAB capture button', () => {
    const wrapper = mount(MobileBottomNav);

    expect(wrapper.find('.bottom-nav-fab').exists()).toBe(true);
    expect(wrapper.find('.fab-circle').exists()).toBe(true);
  });

  it('should emit capture when FAB is clicked', async () => {
    const wrapper = mount(MobileBottomNav);

    await wrapper.find('.bottom-nav-fab').trigger('click');
    expect(wrapper.emitted('capture')).toHaveLength(1);
  });

  it('should emit search when search button is clicked', async () => {
    const wrapper = mount(MobileBottomNav);

    const items = wrapper.findAll('.bottom-nav-item');
    // Search is 2nd item
    await items[1]!.trigger('click');
    expect(wrapper.emitted('search')).toHaveLength(1);
  });

  it('should navigate to dashboard when home is clicked', async () => {
    const wrapper = mount(MobileBottomNav);

    const items = wrapper.findAll('.bottom-nav-item');
    await items[0]!.trigger('click');
    expect(mockPush).toHaveBeenCalledWith({ name: 'dashboard' });
  });

  it('should navigate to settings when settings is clicked', async () => {
    const wrapper = mount(MobileBottomNav);

    const items = wrapper.findAll('.bottom-nav-item');
    await items[4]!.trigger('click');
    expect(mockPush).toHaveBeenCalledWith({ name: 'account-settings' });
  });

  it('should toggle sidebar when pages is clicked', async () => {
    const { __toggleFn } = (await import('@/composables/useSidebar')) as unknown as {
      __toggleFn: ReturnType<typeof vi.fn>;
    };
    __toggleFn.mockClear();

    const wrapper = mount(MobileBottomNav);

    const items = wrapper.findAll('.bottom-nav-item');
    await items[3]!.trigger('click');
    expect(__toggleFn).toHaveBeenCalled();
  });

  it('should highlight active tab based on route', () => {
    mockRoute.name = 'dashboard';

    const wrapper = mount(MobileBottomNav);
    const items = wrapper.findAll('.bottom-nav-item');
    expect(items[0]!.classes()).toContain('is-active');
  });

  it('should hide on scroll down', async () => {
    const { useScrollDirection } = await import('@/composables/useScrollDirection');
    (useScrollDirection as ReturnType<typeof vi.fn>).mockReturnValue({
      direction: { value: 'down' },
      isScrollingDown: { value: true },
    });

    const wrapper = mount(MobileBottomNav);
    expect(wrapper.find('.bottom-nav.is-hidden').exists()).toBe(true);
  });

  it('should have navigation role and aria-label', () => {
    const wrapper = mount(MobileBottomNav);

    const nav = wrapper.find('.bottom-nav');
    expect(nav.attributes('role')).toBe('navigation');
    expect(nav.attributes('aria-label')).toBe('nav.home');
  });
});
