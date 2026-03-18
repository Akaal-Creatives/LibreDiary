import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { defineComponent, h } from 'vue';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { useOfflineQueue, _resetOfflineQueue } from '../useOfflineQueue';
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

describe('useOfflineQueue', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    _resetOfflineQueue();
    localStorage.clear();

    // Default: online
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true,
    });
  });

  afterEach(() => {
    _resetOfflineQueue();
    vi.restoreAllMocks();
  });

  it('should return the expected API shape', () => {
    const { result, unmount } = withSetup(() => useOfflineQueue());

    expect(result).toHaveProperty('pending');
    expect(result).toHaveProperty('processing');
    expect(result).toHaveProperty('enqueue');
    expect(result).toHaveProperty('processQueue');
    expect(result).toHaveProperty('remove');
    expect(result).toHaveProperty('clear');

    unmount();
  });

  it('should enqueue a capture and persist to localStorage', () => {
    const { result, unmount } = withSetup(() => useOfflineQueue());

    const id = result.enqueue({
      title: 'Test note',
      body: 'Some body text',
      parentId: null,
      orgId: 'org-1',
    });

    expect(id).toMatch(/^capture-/);
    expect(result.pending.value).toHaveLength(1);
    expect(result.pending.value[0]!.title).toBe('Test note');

    const stored = JSON.parse(localStorage.getItem('librediary:offline-queue') ?? '[]');
    expect(stored).toHaveLength(1);

    unmount();
  });

  it('should process queued items by creating pages', async () => {
    const { result, unmount } = withSetup(() => useOfflineQueue());
    const pagesStore = usePagesStore();

    vi.spyOn(pagesStore, 'createPage').mockResolvedValue({
      id: 'new-page',
      title: 'Test note',
    } as never);

    result.enqueue({
      title: 'Test note',
      body: '',
      parentId: 'parent-1',
      orgId: 'org-1',
    });

    const processed = await result.processQueue();

    expect(processed).toBe(1);
    expect(result.pending.value).toHaveLength(0);
    expect(pagesStore.createPage).toHaveBeenCalledWith({
      title: 'Test note',
      parentId: 'parent-1',
    });

    unmount();
  });

  it('should keep failed items in the queue', async () => {
    const { result, unmount } = withSetup(() => useOfflineQueue());
    const pagesStore = usePagesStore();

    vi.spyOn(pagesStore, 'createPage').mockRejectedValue(new Error('Network error'));

    result.enqueue({
      title: 'Will fail',
      body: '',
      parentId: null,
      orgId: 'org-1',
    });

    const processed = await result.processQueue();

    expect(processed).toBe(0);
    expect(result.pending.value).toHaveLength(1);

    unmount();
  });

  it('should remove a specific capture by id', () => {
    const { result, unmount } = withSetup(() => useOfflineQueue());

    const id1 = result.enqueue({ title: 'First', body: '', parentId: null, orgId: 'org-1' });
    result.enqueue({ title: 'Second', body: '', parentId: null, orgId: 'org-1' });

    result.remove(id1);

    expect(result.pending.value).toHaveLength(1);
    expect(result.pending.value[0]!.title).toBe('Second');

    unmount();
  });

  it('should clear all captures', () => {
    const { result, unmount } = withSetup(() => useOfflineQueue());

    result.enqueue({ title: 'First', body: '', parentId: null, orgId: 'org-1' });
    result.enqueue({ title: 'Second', body: '', parentId: null, orgId: 'org-1' });

    result.clear();

    expect(result.pending.value).toHaveLength(0);
    expect(JSON.parse(localStorage.getItem('librediary:offline-queue') ?? '[]')).toHaveLength(0);

    unmount();
  });

  it('should load existing queue from localStorage on init', () => {
    const existing = [
      {
        id: 'capture-1',
        title: 'Existing',
        body: '',
        parentId: null,
        orgId: 'org-1',
        createdAt: new Date().toISOString(),
      },
    ];
    localStorage.setItem('librediary:offline-queue', JSON.stringify(existing));

    // Prevent auto-processing on mount
    Object.defineProperty(navigator, 'onLine', { writable: true, value: false });

    const { result, unmount } = withSetup(() => useOfflineQueue());

    expect(result.pending.value).toHaveLength(1);
    expect(result.pending.value[0]!.title).toBe('Existing');

    unmount();
  });

  it('should not process queue concurrently', async () => {
    const { result, unmount } = withSetup(() => useOfflineQueue());
    const pagesStore = usePagesStore();

    let resolveCreate!: (value: unknown) => void;
    vi.spyOn(pagesStore, 'createPage').mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveCreate = resolve;
        })
    );

    result.enqueue({ title: 'Item', body: '', parentId: null, orgId: 'org-1' });

    const promise1 = result.processQueue();
    const promise2 = result.processQueue(); // Should return 0 immediately

    resolveCreate({ id: 'new-page', title: 'Item' });

    const [count1, count2] = await Promise.all([promise1, promise2]);
    expect(count1).toBe(1);
    expect(count2).toBe(0);

    unmount();
  });
});
