import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';
import { ref } from 'vue';

// Hoist mocks so they are available before module imports
const mockPagesStore = vi.hoisted(() => ({
  fetchPage: vi.fn(),
  setCurrentPage: vi.fn(),
  expandToPage: vi.fn(),
  currentPage: null as any,
  updatePageData: vi.fn(),
  trashPage: vi.fn(),
  hasPageContent: vi.fn().mockReturnValue(false),
}));

const mockSyncStore = vi.hoisted(() => ({
  startOperation: vi.fn(),
  markSaving: vi.fn(),
  markSaved: vi.fn(),
  markError: vi.fn(),
}));

const mockAuthStore = vi.hoisted(() => ({
  currentOrganizationId: 'org-1',
  user: { id: 'user-1', name: 'Test User', email: 'test@example.com' },
}));

// Collaboration mock — refs are created in beforeEach after imports are resolved
let mockCollabRefs: {
  isConnected: ReturnType<typeof ref<boolean>>;
  isSynced: ReturnType<typeof ref<boolean>>;
  isConnecting: ReturnType<typeof ref<boolean>>;
  connectionError: ReturnType<typeof ref<string | null>>;
  connectedUsers: ReturnType<typeof ref<any[]>>;
  ydoc: ReturnType<typeof ref<any>>;
  provider: ReturnType<typeof ref<any>>;
  disconnect: ReturnType<typeof vi.fn>;
};

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useRoute: () => ({ params: { pageId: 'page-1' } }),
}));

vi.mock('@/stores', () => ({
  usePagesStore: () => mockPagesStore,
  useSyncStore: () => mockSyncStore,
  useAuthStore: () => mockAuthStore,
}));

vi.mock('@/composables', () => ({
  useCollaboration: () => mockCollabRefs,
}));

// Stub child components
vi.mock('@/components/editor', () => ({
  TiptapEditor: {
    name: 'TiptapEditor',
    template: '<div class="stub-tiptap-editor" />',
    props: [
      'modelValue',
      'placeholder',
      'collaborative',
      'ydoc',
      'provider',
      'providerSynced',
      'userName',
      'userColor',
    ],
    emits: ['update:modelValue'],
  },
  AiBubbleMenu: {
    name: 'AiBubbleMenu',
    template: '<div class="stub-ai-bubble-menu" />',
    props: ['editor'],
  },
}));

vi.mock('@/components/PageBreadcrumbs.vue', () => ({
  default: { name: 'PageBreadcrumbs', template: '<div class="stub-breadcrumbs" />' },
}));

vi.mock('@/components/EmojiPicker.vue', () => ({
  default: {
    name: 'EmojiPicker',
    template: '<div class="stub-emoji-picker" />',
    props: ['modelValue'],
    emits: ['update:modelValue', 'close'],
  },
}));

vi.mock('@/components/ShareModal.vue', () => ({
  default: {
    name: 'ShareModal',
    template: '<div class="stub-share-modal" />',
    props: ['pageId', 'pageTitle', 'isOpen'],
    emits: ['close', 'update'],
  },
}));

vi.mock('@/components/VersionHistoryModal.vue', () => ({
  default: {
    name: 'VersionHistoryModal',
    template: '<div class="stub-version-history" />',
    props: ['pageId', 'pageTitle', 'isOpen'],
    emits: ['close', 'restored'],
  },
}));

vi.mock('@/components/PageCoverImage.vue', () => ({
  default: {
    name: 'PageCoverImage',
    template: '<div class="stub-cover-image" />',
    props: ['coverUrl', 'pageId'],
    emits: ['update'],
  },
}));

vi.mock('@/components/CommentsPanel.vue', () => ({
  default: {
    name: 'CommentsPanel',
    template: '<div class="stub-comments-panel" />',
    props: ['pageId', 'isOpen'],
    emits: ['close', 'commentCountChange'],
  },
}));
vi.mock('@/components/skeletons/EditorSkeleton.vue', () => ({
  default: {
    name: 'EditorSkeleton',
    template: '<div class="stub-editor-skeleton" />',
  },
}));

import PageView from '../PageView.vue';

const defaultPageData = {
  title: 'Test Page',
  htmlContent: '<p>Hello</p>',
  icon: '📝',
};

function mountPage(pageId = 'page-1') {
  return mount(PageView, {
    props: { pageId },
    global: {
      stubs: {
        Teleport: true,
        ShareModal: { template: '<div class="stub-share-modal" />' },
        VersionHistoryModal: { template: '<div class="stub-version-history" />' },
        CommentsPanel: { template: '<div class="stub-comments-panel" />' },
      },
    },
  });
}

describe('PageView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setActivePinia(createPinia());

    // Create fresh refs for each test
    mockCollabRefs = {
      isConnected: ref(false),
      isSynced: ref(true),
      isConnecting: ref(false),
      connectionError: ref<string | null>(null),
      connectedUsers: ref([]),
      ydoc: ref(null),
      provider: ref(null),
      disconnect: vi.fn(),
    };

    // Reset store defaults
    mockPagesStore.currentPage = {
      id: 'page-1',
      title: 'Test Page',
      icon: '📝',
      coverUrl: null,
      updatedAt: new Date().toISOString(),
    };
    mockPagesStore.fetchPage.mockResolvedValue({ ...defaultPageData });
    mockPagesStore.setCurrentPage.mockReset();
    mockPagesStore.expandToPage.mockReset();
    mockPagesStore.updatePageData.mockReset();
    mockPagesStore.trashPage.mockReset();
  });

  // ---- Loading State ----

  it('shows loading state initially', () => {
    mockPagesStore.fetchPage.mockReturnValue(new Promise(() => {}));

    const wrapper = mountPage();

    expect(wrapper.find('.page-loading').exists()).toBe(true);
  });

  it('shows skeleton loader when loading', () => {
    mockPagesStore.fetchPage.mockReturnValue(new Promise(() => {}));

    const wrapper = mountPage();

    expect(wrapper.find('.stub-editor-skeleton').exists()).toBe(true);
  });

  // ---- Error State ----

  it('shows error state when page load fails', async () => {
    mockPagesStore.fetchPage.mockRejectedValue(new Error('Network error'));

    const wrapper = mountPage();
    await flushPromises();

    expect(wrapper.find('.page-error').exists()).toBe(true);
    expect(wrapper.text()).toContain('Failed to load page');
  });

  it('shows retry button in error state', async () => {
    mockPagesStore.fetchPage.mockRejectedValue(new Error('Network error'));

    const wrapper = mountPage();
    await flushPromises();

    const retryBtn = wrapper.find('.error-retry');
    expect(retryBtn.exists()).toBe(true);
    expect(retryBtn.text()).toBe('Try again');
  });

  // ---- Page Content Display ----

  it('shows page title after load', async () => {
    const wrapper = mountPage();
    await flushPromises();

    const title = wrapper.find('.page-title');
    expect(title.exists()).toBe(true);
    expect(title.text()).toBe('Test Page');
  });

  it('shows page icon (emoji) after load', async () => {
    const wrapper = mountPage();
    await flushPromises();

    const icon = wrapper.find('.page-icon');
    expect(icon.exists()).toBe(true);
    expect(icon.text()).toBe('📝');
  });

  it('shows breadcrumbs component', async () => {
    const wrapper = mountPage();
    await flushPromises();

    expect(wrapper.find('.page-breadcrumbs').exists()).toBe(true);
  });

  it('shows page content area after load', async () => {
    const wrapper = mountPage();
    await flushPromises();

    expect(wrapper.find('.page-content').exists()).toBe(true);
    expect(wrapper.find('.page-body').exists()).toBe(true);
  });

  // ---- Header Action Buttons ----

  it('shows share button', async () => {
    const wrapper = mountPage();
    await flushPromises();

    const shareBtn = wrapper.find('.share-btn');
    expect(shareBtn.exists()).toBe(true);
    expect(shareBtn.text()).toContain('Share');
  });

  it('shows version history button', async () => {
    const wrapper = mountPage();
    await flushPromises();

    const headerActions = wrapper.find('.header-actions');
    const actionBtns = headerActions.findAll('.action-btn');
    const versionBtn = actionBtns.find((btn) => btn.attributes('title') === 'Version history');
    expect(versionBtn).toBeDefined();
  });

  it('shows comments button', async () => {
    const wrapper = mountPage();
    await flushPromises();

    const commentsBtn = wrapper.find('.comments-btn');
    expect(commentsBtn.exists()).toBe(true);
    expect(commentsBtn.attributes('title')).toBe('Comments');
  });

  // ---- Store Calls on Mount ----

  it('calls fetchPage on mount with pageId prop', async () => {
    mountPage('page-42');
    await flushPromises();

    expect(mockPagesStore.fetchPage).toHaveBeenCalledWith('page-42');
  });

  it('calls setCurrentPage on mount', async () => {
    mountPage('page-42');
    await flushPromises();

    expect(mockPagesStore.setCurrentPage).toHaveBeenCalledWith('page-42');
  });

  it('calls expandToPage after fetch', async () => {
    mountPage('page-42');
    await flushPromises();

    expect(mockPagesStore.expandToPage).toHaveBeenCalledWith('page-42');
  });

  // ---- Collaboration Error ----

  it('shows connection error when collaboration fails', async () => {
    mockCollabRefs.connectionError.value = 'WebSocket disconnected';

    const wrapper = mountPage();
    await flushPromises();

    const connectionError = wrapper.find('.connection-error');
    expect(connectionError.exists()).toBe(true);
    expect(connectionError.text()).toContain('WebSocket disconnected');
  });
});
