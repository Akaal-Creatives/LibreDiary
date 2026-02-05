import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import PageTreeItem from '../PageTreeItem.vue';
import { usePagesStore } from '@/stores/pages';
import { useAuthStore } from '@/stores/auth';
import type { PageWithChildren } from '@librediary/shared';

// Mock the router
const mockPush = vi.fn();
vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

// Mock the toast composable
vi.mock('@/composables/useToast', () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
  }),
}));

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('PageTreeItem', () => {
  const mockPage: PageWithChildren = {
    id: 'page-1',
    title: 'Test Page',
    icon: null,
    coverUrl: null,
    htmlContent: null,
    parentId: null,
    organizationId: 'org-1',
    createdById: 'user-1',
    updatedById: null,
    position: 0,
    isPublic: false,
    publicSlug: null,
    trashedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    children: [],
  };

  const mockPageWithChildren: PageWithChildren = {
    ...mockPage,
    id: 'page-parent',
    title: 'Parent Page',
    children: [
      {
        id: 'page-child-1',
        title: 'Child 1',
        icon: null,
        coverUrl: null,
        htmlContent: null,
        parentId: 'page-parent',
        organizationId: 'org-1',
        createdById: 'user-1',
        updatedById: null,
        position: 0,
        isPublic: false,
        publicSlug: null,
        trashedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        children: [],
      },
      {
        id: 'page-child-2',
        title: 'Child 2',
        icon: '📝',
        coverUrl: null,
        htmlContent: null,
        parentId: 'page-parent',
        organizationId: 'org-1',
        createdById: 'user-1',
        updatedById: null,
        position: 1,
        isPublic: false,
        publicSlug: null,
        trashedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        children: [],
      },
    ],
  };

  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue('org-1');
    setupStores();
  });

  function setupStores() {
    const authStore = useAuthStore();
    authStore.setUser({
      id: 'user-1',
      email: 'user@test.com',
      name: 'Test User',
      emailVerified: true,
      isSuperAdmin: false,
      locale: 'en',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      avatarUrl: null,
    });
    authStore.setOrganizations(
      [
        {
          id: 'org-1',
          name: 'Test Org',
          slug: 'test-org',
          logoUrl: null,
          accentColor: null,
          allowedDomains: [],
          aiEnabled: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      [{ organizationId: 'org-1', role: 'OWNER' }]
    );

    const pagesStore = usePagesStore();
    pagesStore.movePage = vi.fn().mockResolvedValue(mockPage);

    return { authStore, pagesStore };
  }

  function mountItem(page = mockPage, depth = 0) {
    return mount(PageTreeItem, {
      props: { page, depth },
    });
  }

  // Basic rendering tests
  it('renders page title', () => {
    const wrapper = mountItem();
    expect(wrapper.text()).toContain('Test Page');
  });

  it('renders page icon when present', () => {
    const pageWithIcon = { ...mockPage, icon: '📄' };
    const wrapper = mountItem(pageWithIcon);
    expect(wrapper.text()).toContain('📄');
  });

  it('renders default icon when no emoji icon', () => {
    const wrapper = mountItem();
    expect(wrapper.find('.page-icon svg').exists()).toBe(true);
  });

  it('shows expand button when page has children', () => {
    const wrapper = mountItem(mockPageWithChildren);
    expect(wrapper.find('.expand-btn').exists()).toBe(true);
  });

  it('does not show expand button when page has no children', () => {
    const wrapper = mountItem(mockPage);
    expect(wrapper.find('.expand-btn').exists()).toBe(false);
    expect(wrapper.find('.expand-placeholder').exists()).toBe(true);
  });

  it('navigates to page on click', async () => {
    const wrapper = mountItem();
    await wrapper.find('.page-item').trigger('click');
    expect(mockPush).toHaveBeenCalledWith({ name: 'page', params: { pageId: 'page-1' } });
  });

  it('emits contextmenu event on right-click', async () => {
    const wrapper = mountItem();
    await wrapper.find('.page-item').trigger('contextmenu');
    expect(wrapper.emitted('contextmenu')).toBeTruthy();
  });

  it('applies active class when page is current', () => {
    const { pagesStore } = setupStores();
    pagesStore.currentPageId = 'page-1';
    const wrapper = mountItem();
    expect(wrapper.find('.page-item').classes()).toContain('active');
  });

  it('toggles expanded state on expand button click', async () => {
    const { pagesStore } = setupStores();
    const wrapper = mountItem(mockPageWithChildren);

    expect(pagesStore.expandedPageIds.has('page-parent')).toBe(false);

    await wrapper.find('.expand-btn').trigger('click');
    expect(pagesStore.expandedPageIds.has('page-parent')).toBe(true);
  });

  it('renders children when expanded', async () => {
    const { pagesStore } = setupStores();
    pagesStore.expandedPageIds.add('page-parent');
    const wrapper = mountItem(mockPageWithChildren);

    expect(wrapper.text()).toContain('Child 1');
    expect(wrapper.text()).toContain('Child 2');
  });

  it('does not render children when collapsed', () => {
    const wrapper = mountItem(mockPageWithChildren);
    expect(wrapper.text()).not.toContain('Child 1');
    expect(wrapper.text()).not.toContain('Child 2');
  });

  // Drag and drop tests
  it('has draggable attribute', () => {
    const wrapper = mountItem();
    expect(wrapper.find('.page-item').attributes('draggable')).toBe('true');
  });

  it('shows drag handle on hover', () => {
    const wrapper = mountItem();
    expect(wrapper.find('.drag-handle').exists()).toBe(true);
  });

  it('sets dragging class on dragstart', async () => {
    const wrapper = mountItem();
    await wrapper.find('.page-item').trigger('dragstart', {
      dataTransfer: {
        setData: vi.fn(),
        effectAllowed: 'move',
      },
    });
    expect(wrapper.find('.page-item').classes()).toContain('dragging');
  });

  it('removes dragging class on dragend', async () => {
    const wrapper = mountItem();
    await wrapper.find('.page-item').trigger('dragstart', {
      dataTransfer: { setData: vi.fn(), effectAllowed: 'move' },
    });
    expect(wrapper.find('.page-item').classes()).toContain('dragging');

    await wrapper.find('.page-item').trigger('dragend');
    expect(wrapper.find('.page-item').classes()).not.toContain('dragging');
  });

  it('shows drop-above indicator when dragging over top half', async () => {
    const wrapper = mountItem();
    const pageItem = wrapper.find('.page-item');
    const element = pageItem.element as HTMLElement;

    // Mock getBoundingClientRect on the actual element
    vi.spyOn(element, 'getBoundingClientRect').mockReturnValue({
      top: 0,
      height: 30,
      bottom: 30,
      left: 0,
      right: 100,
      width: 100,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });

    // Simulate dragover on top half (clientY = 5 is in top 25%)
    await pageItem.trigger('dragover', {
      clientY: 5,
    });

    expect(wrapper.find('.page-tree-item').classes()).toContain('drop-above');
  });

  it('shows drop-below indicator when dragging over bottom half', async () => {
    const wrapper = mountItem();
    const pageItem = wrapper.find('.page-item');
    const element = pageItem.element as HTMLElement;

    vi.spyOn(element, 'getBoundingClientRect').mockReturnValue({
      top: 0,
      height: 30,
      bottom: 30,
      left: 0,
      right: 100,
      width: 100,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });

    // Simulate dragover on bottom half (clientY = 25 is in bottom 25%)
    await pageItem.trigger('dragover', {
      clientY: 25,
    });

    expect(wrapper.find('.page-tree-item').classes()).toContain('drop-below');
  });

  it('shows drop-inside indicator when dragging over center of expandable page', async () => {
    const { pagesStore } = setupStores();
    pagesStore.expandedPageIds.add('page-parent');
    const wrapper = mountItem(mockPageWithChildren);
    const pageItem = wrapper.find('.page-item');
    const element = pageItem.element as HTMLElement;

    vi.spyOn(element, 'getBoundingClientRect').mockReturnValue({
      top: 0,
      height: 30,
      bottom: 30,
      left: 0,
      right: 100,
      width: 100,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });

    // Simulate dragover on center (clientY = 15 is in middle 50%)
    await pageItem.trigger('dragover', {
      clientY: 15,
    });

    expect(wrapper.find('.page-tree-item').classes()).toContain('drop-inside');
  });

  it('clears drop indicators on dragleave', async () => {
    const wrapper = mountItem();
    const pageItem = wrapper.find('.page-item');
    const element = pageItem.element as HTMLElement;

    vi.spyOn(element, 'getBoundingClientRect').mockReturnValue({
      top: 0,
      height: 30,
      bottom: 30,
      left: 0,
      right: 100,
      width: 100,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });

    await pageItem.trigger('dragover', {
      clientY: 5,
    });
    expect(wrapper.find('.page-tree-item').classes()).toContain('drop-above');

    await pageItem.trigger('dragleave');
    expect(wrapper.find('.page-tree-item').classes()).not.toContain('drop-above');
  });

  it('calls movePage on drop with reorder (same parent)', async () => {
    const { pagesStore } = setupStores();
    const wrapper = mountItem();

    // Set up dragged page data
    await wrapper.find('.page-item').trigger('drop', {
      preventDefault: vi.fn(),
      dataTransfer: {
        getData: () => JSON.stringify({ pageId: 'page-2', parentId: null }),
      },
    });
    await flushPromises();

    expect(pagesStore.movePage).toHaveBeenCalled();
  });

  it('calls movePage with new parentId when dropped inside', async () => {
    const { pagesStore } = setupStores();
    pagesStore.expandedPageIds.add('page-parent'); // Make it expandable/droppable inside
    const wrapper = mountItem(mockPageWithChildren);
    const pageItem = wrapper.find('.page-item');
    const element = pageItem.element as HTMLElement;

    vi.spyOn(element, 'getBoundingClientRect').mockReturnValue({
      top: 0,
      height: 30,
      bottom: 30,
      left: 0,
      right: 100,
      width: 100,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });

    // First trigger dragover to set drop position to 'inside'
    await pageItem.trigger('dragover', {
      clientY: 15, // Center of element
    });

    // Then trigger drop
    await pageItem.trigger('drop', {
      dataTransfer: {
        getData: () => JSON.stringify({ pageId: 'other-page', parentId: null }),
      },
    });
    await flushPromises();

    expect(pagesStore.movePage).toHaveBeenCalledWith(
      'other-page',
      expect.objectContaining({ parentId: 'page-parent' })
    );
  });

  it('emits move event with position data', async () => {
    const wrapper = mountItem();

    await wrapper.find('.page-item').trigger('drop', {
      preventDefault: vi.fn(),
      dataTransfer: {
        getData: () => JSON.stringify({ pageId: 'page-2', parentId: null }),
      },
    });

    expect(wrapper.emitted('move')).toBeTruthy();
  });

  it('calls movePage with null parentId when moving child to root level', async () => {
    const { pagesStore } = setupStores();
    // mockPage is a root page (parentId: null)
    const wrapper = mountItem(mockPage);
    const pageItem = wrapper.find('.page-item');
    const element = pageItem.element as HTMLElement;

    vi.spyOn(element, 'getBoundingClientRect').mockReturnValue({
      top: 0,
      height: 30,
      bottom: 30,
      left: 0,
      right: 100,
      width: 100,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    });

    // First trigger dragover to set drop position to 'below'
    await pageItem.trigger('dragover', {
      clientY: 25, // Bottom of element
    });

    // Drop a child page (parentId: 'some-parent') onto a root page
    await pageItem.trigger('drop', {
      dataTransfer: {
        getData: () => JSON.stringify({ pageId: 'child-page', parentId: 'some-parent' }),
      },
    });
    await flushPromises();

    // Should call movePage with null parentId to move to root
    expect(pagesStore.movePage).toHaveBeenCalledWith('child-page', {
      parentId: null,
      position: 1, // mockPage.position (0) + 1 for 'below'
    });
  });

  // Accessibility
  it('has aria-expanded on expand button', () => {
    const wrapper = mountItem(mockPageWithChildren);
    const expandBtn = wrapper.find('.expand-btn');
    expect(expandBtn.attributes('aria-expanded')).toBeDefined();
  });

  it('has aria-label on expand button', () => {
    const wrapper = mountItem(mockPageWithChildren);
    const expandBtn = wrapper.find('.expand-btn');
    expect(expandBtn.attributes('aria-label')).toBeDefined();
  });

  it('applies correct indentation based on depth', () => {
    const wrapper = mountItem(mockPage, 2);
    const style = wrapper.find('.page-item').attributes('style');
    expect(style).toContain('padding-left');
  });
});
