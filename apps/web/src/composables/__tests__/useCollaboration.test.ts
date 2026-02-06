import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ref, nextTick, defineComponent, h } from 'vue';
import { mount, flushPromises } from '@vue/test-utils';

// Mock instances to track calls
const mockProviderDestroy = vi.fn();
const mockDocDestroy = vi.fn();
let mockProviderCallArgs: unknown[] = [];

// Mock HocuspocusProvider as a class
vi.mock('@hocuspocus/provider', () => ({
  HocuspocusProvider: vi.fn().mockImplementation(function (
    this: { destroy: () => void },
    options: unknown
  ) {
    mockProviderCallArgs.push(options);
    this.destroy = mockProviderDestroy;
    return this;
  }),
}));

// Mock Yjs Doc as a class
vi.mock('yjs', () => ({
  Doc: vi.fn().mockImplementation(function (this: { destroy: () => void }) {
    this.destroy = mockDocDestroy;
    return this;
  }),
}));

import { HocuspocusProvider } from '@hocuspocus/provider';
import { useCollaboration } from '../useCollaboration';

// Helper to run composable in component context
function withSetup<T>(composableFn: () => T): { result: T; unmount: () => void } {
  let result!: T;

  const TestComponent = defineComponent({
    setup() {
      result = composableFn();
      return () => h('div');
    },
  });

  const wrapper = mount(TestComponent);

  return {
    result,
    unmount: () => wrapper.unmount(),
  };
}

describe('useCollaboration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockProviderCallArgs = [];
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ===========================================
  // REACTIVITY TESTS
  // These tests verify the composable reacts to reactive inputs
  // ===========================================

  describe('Reactive Document Name', () => {
    it('should not connect when documentName is null', async () => {
      const docName = ref<string | null>(null);

      const { unmount } = withSetup(() =>
        useCollaboration({
          documentName: () => docName.value,
          enabled: () => true,
        })
      );

      await nextTick();
      await flushPromises();

      // Should not have created a provider since documentName is null
      expect(HocuspocusProvider).not.toHaveBeenCalled();

      unmount();
    });

    it('should not connect when documentName is empty string', async () => {
      const docName = ref<string | null>('');

      const { unmount } = withSetup(() =>
        useCollaboration({
          documentName: () => docName.value,
          enabled: () => true,
        })
      );

      await nextTick();
      await flushPromises();

      // Should not have created a provider since documentName is empty
      expect(HocuspocusProvider).not.toHaveBeenCalled();

      unmount();
    });

    it('should connect when documentName becomes valid', async () => {
      const docName = ref<string | null>(null);

      const { unmount } = withSetup(() =>
        useCollaboration({
          documentName: () => docName.value,
          enabled: () => true,
        })
      );

      await nextTick();
      await flushPromises();
      expect(HocuspocusProvider).not.toHaveBeenCalled();

      // Set a valid document name
      docName.value = 'org-123/page-456';
      await nextTick();
      await flushPromises();

      // Should have created a provider now
      expect(HocuspocusProvider).toHaveBeenCalledTimes(1);
      expect(mockProviderCallArgs[0]).toMatchObject({
        name: 'org-123/page-456',
      });

      unmount();
    });

    it('should reconnect when documentName changes', async () => {
      const docName = ref<string | null>('org-1/page-1');

      const { unmount } = withSetup(() =>
        useCollaboration({
          documentName: () => docName.value,
          enabled: () => true,
        })
      );

      await nextTick();
      await flushPromises();
      expect(HocuspocusProvider).toHaveBeenCalledTimes(1);
      expect(mockProviderCallArgs[0]).toMatchObject({
        name: 'org-1/page-1',
      });

      // Change document name
      docName.value = 'org-2/page-2';
      await nextTick();
      await flushPromises();

      // Should have destroyed old provider and created new one
      expect(mockProviderDestroy).toHaveBeenCalled();
      expect(HocuspocusProvider).toHaveBeenCalledTimes(2);
      expect(mockProviderCallArgs[1]).toMatchObject({
        name: 'org-2/page-2',
      });

      unmount();
    });

    it('should disconnect when documentName becomes null', async () => {
      const docName = ref<string | null>('org-123/page-456');

      const { unmount } = withSetup(() =>
        useCollaboration({
          documentName: () => docName.value,
          enabled: () => true,
        })
      );

      await nextTick();
      await flushPromises();
      expect(HocuspocusProvider).toHaveBeenCalledTimes(1);

      // Set document name to null
      docName.value = null;
      await nextTick();
      await flushPromises();

      // Should have destroyed the provider
      expect(mockProviderDestroy).toHaveBeenCalled();

      unmount();
    });
  });

  // ===========================================
  // ENABLED STATE TESTS
  // These tests verify enabled state works correctly
  // ===========================================

  describe('Enabled State', () => {
    it('should not connect when enabled is false', async () => {
      const { unmount } = withSetup(() =>
        useCollaboration({
          documentName: () => 'org-123/page-456',
          enabled: () => false,
        })
      );

      await nextTick();
      await flushPromises();

      expect(HocuspocusProvider).not.toHaveBeenCalled();

      unmount();
    });

    it('should connect when enabled becomes true', async () => {
      const enabled = ref(false);

      const { unmount } = withSetup(() =>
        useCollaboration({
          documentName: () => 'org-123/page-456',
          enabled: () => enabled.value,
        })
      );

      await nextTick();
      await flushPromises();
      expect(HocuspocusProvider).not.toHaveBeenCalled();

      // Enable collaboration
      enabled.value = true;
      await nextTick();
      await flushPromises();

      expect(HocuspocusProvider).toHaveBeenCalledTimes(1);

      unmount();
    });

    it('should disconnect when enabled becomes false', async () => {
      const enabled = ref(true);

      const { unmount } = withSetup(() =>
        useCollaboration({
          documentName: () => 'org-123/page-456',
          enabled: () => enabled.value,
        })
      );

      await nextTick();
      await flushPromises();
      expect(HocuspocusProvider).toHaveBeenCalledTimes(1);

      // Disable collaboration
      enabled.value = false;
      await nextTick();
      await flushPromises();

      expect(mockProviderDestroy).toHaveBeenCalled();

      unmount();
    });
  });

  // ===========================================
  // STATIC VALUES TESTS
  // These tests verify static values still work
  // ===========================================

  describe('Static Values', () => {
    it('should accept static string for documentName', async () => {
      const { unmount } = withSetup(() =>
        useCollaboration({
          documentName: 'org-123/page-456',
          enabled: true,
        })
      );

      await nextTick();
      await flushPromises();

      expect(mockProviderCallArgs[0]).toMatchObject({
        name: 'org-123/page-456',
      });

      unmount();
    });

    it('should accept static boolean for enabled', async () => {
      const { unmount } = withSetup(() =>
        useCollaboration({
          documentName: 'org-123/page-456',
          enabled: true,
        })
      );

      await nextTick();
      await flushPromises();

      expect(HocuspocusProvider).toHaveBeenCalledTimes(1);

      unmount();
    });
  });

  // ===========================================
  // URL CONSTRUCTION TESTS
  // These tests verify WebSocket URLs are constructed correctly
  // ===========================================

  describe('WebSocket URL Construction', () => {
    it('should construct correct WebSocket URL with documentName', async () => {
      const { unmount } = withSetup(() =>
        useCollaboration({
          documentName: 'org-123/page-456',
          enabled: true,
        })
      );

      await nextTick();
      await flushPromises();

      const options = mockProviderCallArgs[0] as { url: string };
      expect(options.url).toContain('/collaboration/org-123/page-456');

      unmount();
    });
  });

  // ===========================================
  // STATE EXPOSURE TESTS
  // These tests verify returned state is correct
  // ===========================================

  describe('Returned State', () => {
    it('should return connection state refs', () => {
      const { result, unmount } = withSetup(() =>
        useCollaboration({
          documentName: 'org-123/page-456',
          enabled: true,
        })
      );

      expect(result).toHaveProperty('isConnected');
      expect(result).toHaveProperty('isSynced');
      expect(result).toHaveProperty('isConnecting');
      expect(result).toHaveProperty('connectionError');
      expect(result).toHaveProperty('connectedUsers');

      unmount();
    });

    it('should return ydoc and provider refs', () => {
      const { result, unmount } = withSetup(() =>
        useCollaboration({
          documentName: 'org-123/page-456',
          enabled: true,
        })
      );

      expect(result).toHaveProperty('ydoc');
      expect(result).toHaveProperty('provider');

      unmount();
    });

    it('should return connect and disconnect methods', () => {
      const { result, unmount } = withSetup(() =>
        useCollaboration({
          documentName: 'org-123/page-456',
          enabled: true,
        })
      );

      expect(result).toHaveProperty('connect');
      expect(result).toHaveProperty('disconnect');
      expect(typeof result.connect).toBe('function');
      expect(typeof result.disconnect).toBe('function');

      unmount();
    });
  });

  // ===========================================
  // DISCONNECT METHOD TESTS
  // ===========================================

  describe('Disconnect Method', () => {
    it('should cleanup provider and document when disconnect is called', async () => {
      const { result, unmount } = withSetup(() =>
        useCollaboration({
          documentName: 'org-123/page-456',
          enabled: true,
        })
      );

      await nextTick();
      await flushPromises();

      result.disconnect();

      expect(mockProviderDestroy).toHaveBeenCalled();
      expect(mockDocDestroy).toHaveBeenCalled();

      unmount();
    });
  });
});
