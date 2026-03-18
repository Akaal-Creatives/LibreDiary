import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { defineComponent, h } from 'vue';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { useInbox, _resetInbox } from '../useInbox';
import { usePagesStore } from '@/stores/pages';

vi.mock('@/stores/auth', () => ({
  useAuthStore: vi.fn(() => ({
    currentOrganizationId: 'org-1',
  })),
}));

vi.mock('@/services', () => ({
  pagesService: {
    createPage: vi.fn(),
    getPageTree: vi.fn(),
  },
}));

function withSetup<T>(composableFn: () => T): { result: T; unmount: () => void } {
  let result!: T;
  const TestComponent = defineComponent({
    setup() {
      result = composableFn();
      return () => h('div');
    },
  });
  const wrapper = mount(TestComponent);
  return { result, unmount: () => wrapper.unmount() };
}

describe('useInbox', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    _resetInbox();
    localStorage.clear();
  });

  afterEach(() => {
    _resetInbox();
    vi.restoreAllMocks();
  });

  it('should return the expected API shape', () => {
    const { result, unmount } = withSetup(() => useInbox());

    expect(result).toHaveProperty('inboxPageId');
    expect(result).toHaveProperty('inboxPage');
    expect(result).toHaveProperty('loading');
    expect(result).toHaveProperty('ensureInbox');
    expect(typeof result.ensureInbox).toBe('function');

    unmount();
  });

  it('should return cached inbox page from localStorage', async () => {
    const pagesStore = usePagesStore();
    const fakePage = {
      id: 'page-inbox',
      title: 'Inbox',
      icon: '\uD83D\uDCE5',
      parentId: null,
      position: 0,
    };
    pagesStore.pages.set('page-inbox', fakePage as never);
    localStorage.setItem('librediary:inbox:org-1', 'page-inbox');

    const { result, unmount } = withSetup(() => useInbox());
    const id = await result.ensureInbox();

    expect(id).toBe('page-inbox');
    expect(result.inboxPageId.value).toBe('page-inbox');

    unmount();
  });

  it('should find existing inbox page by title when no cache', async () => {
    const pagesStore = usePagesStore();
    const fakePage = {
      id: 'page-existing',
      title: 'Inbox',
      icon: '\uD83D\uDCE5',
      parentId: null,
      position: 0,
    };
    pagesStore.pages.set('page-existing', fakePage as never);

    const { result, unmount } = withSetup(() => useInbox());
    const id = await result.ensureInbox();

    expect(id).toBe('page-existing');
    expect(localStorage.getItem('librediary:inbox:org-1')).toBe('page-existing');

    unmount();
  });

  it('should create a new inbox page when none exists', async () => {
    const pagesStore = usePagesStore();
    const createdPage = {
      id: 'page-new',
      title: 'Inbox',
      icon: '\uD83D\uDCE5',
      parentId: null,
      position: 0,
    };

    vi.spyOn(pagesStore, 'createPage').mockResolvedValue(createdPage as never);

    const { result, unmount } = withSetup(() => useInbox());
    const id = await result.ensureInbox();

    expect(id).toBe('page-new');
    expect(pagesStore.createPage).toHaveBeenCalledWith({
      title: 'Inbox',
      icon: '\uD83D\uDCE5',
    });
    expect(localStorage.getItem('librediary:inbox:org-1')).toBe('page-new');

    unmount();
  });

  it('should re-create inbox if cached page no longer exists (trashed)', async () => {
    localStorage.setItem('librediary:inbox:org-1', 'page-deleted');
    // page-deleted is NOT in the pages map, simulating a trashed page

    const pagesStore = usePagesStore();
    const createdPage = {
      id: 'page-recreated',
      title: 'Inbox',
      icon: '\uD83D\uDCE5',
      parentId: null,
      position: 0,
    };
    vi.spyOn(pagesStore, 'createPage').mockResolvedValue(createdPage as never);

    const { result, unmount } = withSetup(() => useInbox());
    const id = await result.ensureInbox();

    expect(id).toBe('page-recreated');
    expect(localStorage.getItem('librediary:inbox:org-1')).toBe('page-recreated');

    unmount();
  });

  it('should set loading to true while creating', async () => {
    const pagesStore = usePagesStore();
    let resolveCreate!: (value: unknown) => void;
    const createPromise = new Promise((resolve) => {
      resolveCreate = resolve;
    });
    vi.spyOn(pagesStore, 'createPage').mockReturnValue(createPromise as never);

    const { result, unmount } = withSetup(() => useInbox());
    const promise = result.ensureInbox();

    expect(result.loading.value).toBe(true);

    resolveCreate({
      id: 'page-new',
      title: 'Inbox',
      icon: '\uD83D\uDCE5',
      parentId: null,
      position: 0,
    });
    await promise;

    expect(result.loading.value).toBe(false);

    unmount();
  });
});
