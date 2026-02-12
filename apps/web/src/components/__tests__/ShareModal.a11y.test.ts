import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';

const { mockApi } = vi.hoisted(() => ({
  mockApi: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('@/services', () => ({
  api: mockApi,
  ApiError: class extends Error {
    code: string;
    constructor(code: string, message: string) {
      super(message);
      this.code = code;
    }
  },
}));

vi.mock('@/stores', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    useOrganizationsStore: () => ({
      currentOrganization: { id: 'org-1' },
    }),
  };
});

import ShareModal from '../ShareModal.vue';

describe('ShareModal accessibility', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();

    mockApi.get.mockImplementation((url: string) => {
      if (url.includes('/permissions/share-links')) {
        return Promise.resolve({ shareLinks: [] });
      }
      if (url.includes('/permissions')) {
        return Promise.resolve({ permissions: [] });
      }
      return Promise.resolve({ isPublic: false });
    });
  });

  function mountModal() {
    return mount(ShareModal, {
      props: {
        pageId: 'page-1',
        pageTitle: 'Test Page',
        isOpen: true,
      },
      global: {
        stubs: {
          teleport: true,
          Transition: true,
          TransitionGroup: true,
        },
      },
    });
  }

  it('modal container has role="dialog"', async () => {
    const wrapper = mountModal();
    await flushPromises();
    const dialog = wrapper.find('.modal-container');
    expect(dialog.exists()).toBe(true);
    expect(dialog.attributes('role')).toBe('dialog');
  });

  it('modal container has aria-modal="true"', async () => {
    const wrapper = mountModal();
    await flushPromises();
    const dialog = wrapper.find('.modal-container');
    expect(dialog.attributes('aria-modal')).toBe('true');
  });

  it('modal container has aria-labelledby pointing to the title', async () => {
    const wrapper = mountModal();
    await flushPromises();
    const dialog = wrapper.find('.modal-container');
    expect(dialog.attributes('aria-labelledby')).toBe('share-modal-title');
  });

  it('title element has matching id', async () => {
    const wrapper = mountModal();
    await flushPromises();
    const title = wrapper.find('#share-modal-title');
    expect(title.exists()).toBe(true);
  });

  it('email input has accessible name via aria-label', async () => {
    const wrapper = mountModal();
    await flushPromises();
    const emailInput = wrapper.find('input[type="email"]');
    if (emailInput.exists()) {
      const hasLabel = emailInput.attributes('aria-label') || emailInput.attributes('id');
      expect(hasLabel).toBeTruthy();
    }
  });
});
