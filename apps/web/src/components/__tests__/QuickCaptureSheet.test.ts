import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import QuickCaptureSheet from '../QuickCaptureSheet.vue';

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

vi.mock('@/stores/auth', () => ({
  useAuthStore: vi.fn(() => ({
    currentOrganizationId: 'org-1',
  })),
}));

vi.mock('@/stores/pages', () => ({
  usePagesStore: vi.fn(() => ({
    pages: new Map(),
    rootPages: [],
    createPage: vi.fn().mockResolvedValue({ id: 'new-page', title: 'Test' }),
  })),
}));

vi.mock('@/composables/useInbox', () => ({
  useInbox: vi.fn(() => ({
    ensureInbox: vi.fn().mockResolvedValue('inbox-page-id'),
    inboxPageId: { value: 'inbox-page-id' },
  })),
}));

vi.mock('@/composables/useOfflineQueue', () => ({
  useOfflineQueue: vi.fn(() => ({
    enqueue: vi.fn(),
    pending: { value: [] },
    processing: { value: false },
    processQueue: vi.fn(),
    remove: vi.fn(),
    clear: vi.fn(),
  })),
}));

vi.mock('@/composables/useToast', () => ({
  useToast: vi.fn(() => ({
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  })),
}));

vi.mock('@/composables/useSidebar', () => ({
  useSidebar: vi.fn(() => ({
    isMobile: { value: false },
    isOpen: { value: true },
    isOverlay: { value: false },
  })),
}));

vi.mock('@/services', () => ({
  pagesService: {
    createPage: vi.fn(),
    getPageTree: vi.fn(),
  },
}));

describe('QuickCaptureSheet', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('should not render when open is false', () => {
    const wrapper = mount(QuickCaptureSheet, {
      props: { open: false },
      global: { stubs: { Teleport: true } },
    });

    expect(wrapper.find('.capture-backdrop').exists()).toBe(false);
  });

  it('should render when open is true', () => {
    const wrapper = mount(QuickCaptureSheet, {
      props: { open: true },
      global: { stubs: { Teleport: true } },
    });

    expect(wrapper.find('.capture-backdrop').exists()).toBe(true);
    expect(wrapper.find('.capture-title').text()).toBe('quickCapture.title');
  });

  it('should have a title input and body textarea', () => {
    const wrapper = mount(QuickCaptureSheet, {
      props: { open: true },
      global: { stubs: { Teleport: true } },
    });

    expect(wrapper.find('.capture-input-title').exists()).toBe(true);
    expect(wrapper.find('.capture-input-body').exists()).toBe(true);
  });

  it('should have a parent page selector', () => {
    const wrapper = mount(QuickCaptureSheet, {
      props: { open: true },
      global: { stubs: { Teleport: true } },
    });

    expect(wrapper.find('.capture-select').exists()).toBe(true);
  });

  it('should emit close when close button is clicked', async () => {
    const wrapper = mount(QuickCaptureSheet, {
      props: { open: true },
      global: { stubs: { Teleport: true } },
    });

    await wrapper.find('.capture-close').trigger('click');
    expect(wrapper.emitted('close')).toHaveLength(1);
  });

  it('should emit close when cancel button is clicked', async () => {
    const wrapper = mount(QuickCaptureSheet, {
      props: { open: true },
      global: { stubs: { Teleport: true } },
    });

    await wrapper.find('.capture-btn-cancel').trigger('click');
    expect(wrapper.emitted('close')).toHaveLength(1);
  });

  it('should disable save button when title is empty', () => {
    const wrapper = mount(QuickCaptureSheet, {
      props: { open: true },
      global: { stubs: { Teleport: true } },
    });

    const saveBtn = wrapper.find('.capture-btn-save');
    expect(saveBtn.attributes('disabled')).toBeDefined();
  });

  it('should emit close on Escape key', async () => {
    const wrapper = mount(QuickCaptureSheet, {
      props: { open: true },
      global: { stubs: { Teleport: true } },
    });

    await wrapper.find('.capture-backdrop').trigger('keydown', { key: 'Escape' });
    expect(wrapper.emitted('close')).toHaveLength(1);
  });

  it('should apply mobile class when isMobile is true', async () => {
    const { useSidebar } = await import('@/composables/useSidebar');
    (useSidebar as ReturnType<typeof vi.fn>).mockReturnValue({
      isMobile: { value: true },
      isOpen: { value: true },
      isOverlay: { value: true },
    });

    const wrapper = mount(QuickCaptureSheet, {
      props: { open: true },
      global: { stubs: { Teleport: true } },
    });

    expect(wrapper.find('.capture-backdrop.is-mobile').exists()).toBe(true);
    expect(wrapper.find('.capture-sheet.is-mobile').exists()).toBe(true);
    expect(wrapper.find('.sheet-handle').exists()).toBe(true);
  });
});
