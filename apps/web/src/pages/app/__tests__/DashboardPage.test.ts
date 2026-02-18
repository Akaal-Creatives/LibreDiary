import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';

// Hoist mocks so they are available before module imports
const mockRouter = vi.hoisted(() => ({
  push: vi.fn(),
}));

vi.mock('vue-router', () => ({
  useRouter: () => mockRouter,
}));

const { mockAuthStore, mockPagesStore, mockTemplatesStore, mockDialog, mockToast } = vi.hoisted(
  () => ({
    mockAuthStore: {
      user: { name: 'Test User', isSuperAdmin: false },
    },
    mockPagesStore: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      rootPages: [] as any[],
      createPage: vi.fn(),
      fetchPageTree: vi.fn(),
    },
    mockTemplatesStore: {
      createPageFromTemplate: vi.fn(),
    },
    mockDialog: {
      alert: vi.fn(),
      confirm: vi.fn(),
    },
    mockToast: {
      success: vi.fn(),
      error: vi.fn(),
    },
  })
);

vi.mock('@/stores', () => ({
  useAuthStore: () => mockAuthStore,
  usePagesStore: () => mockPagesStore,
  useTemplatesStore: () => mockTemplatesStore,
}));

vi.mock('@/composables', () => ({
  useDialog: () => mockDialog,
  useToast: () => mockToast,
}));

// Stub the TemplateLibrary child component with a named component for reliable lookup
vi.mock('@/components/TemplateLibrary.vue', () => ({
  default: {
    name: 'TemplateLibrary',
    template: '<div class="stub-template-library" />',
    emits: ['useTemplate', 'close'],
  },
}));

import DashboardPage from '../DashboardPage.vue';
import TemplateLibrary from '@/components/TemplateLibrary.vue';

// Helper to mount the component with standard config
function mountDashboard() {
  return mount(DashboardPage, {
    global: {
      stubs: { Teleport: true },
    },
  });
}

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setActivePinia(createPinia());

    // Reset store defaults
    mockAuthStore.user = { name: 'Test User', isSuperAdmin: false };
    mockPagesStore.rootPages = [];
    mockPagesStore.createPage.mockReset();
    mockPagesStore.fetchPageTree.mockReset();
    mockTemplatesStore.createPageFromTemplate.mockReset();
  });

  // ---- Welcome Section ----

  it('renders welcome section with greeting text', () => {
    const wrapper = mountDashboard();

    // The greeting should contain one of the time-of-day words
    const title = wrapper.find('.welcome-title').text();
    expect(title).toMatch(/Good (morning|afternoon|evening)/);
    expect(wrapper.find('.welcome-subtitle').text()).toBe('What would you like to work on today?');
  });

  it('shows user name in welcome title when available', () => {
    mockAuthStore.user = { name: 'Alice', isSuperAdmin: false };
    const wrapper = mountDashboard();

    const title = wrapper.find('.welcome-title').text();
    expect(title).toContain('Alice');
  });

  it('omits user name from welcome title when user has no name', () => {
    mockAuthStore.user = { name: '', isSuperAdmin: false };
    const wrapper = mountDashboard();

    const title = wrapper.find('.welcome-title').text();
    // Should just be "Good morning/afternoon/evening" with no trailing comma
    expect(title).toMatch(/^Good (morning|afternoon|evening)$/);
  });

  // ---- Action Cards ----

  it('renders 3 action cards (New Page, Templates, Import)', () => {
    const wrapper = mountDashboard();

    const actionCards = wrapper.findAll('.action-card');
    expect(actionCards).toHaveLength(3);

    const labels = actionCards.map((card) => card.find('h3').text());
    expect(labels).toEqual(['New Page', 'Templates', 'Import']);
  });

  it('shows "Soon" badge on the Import action card', () => {
    const wrapper = mountDashboard();

    const badge = wrapper.find('.action-badge');
    expect(badge.exists()).toBe(true);
    expect(badge.text()).toBe('Soon');
  });

  // ---- New Page ----

  it('creates a new page and navigates when "New Page" is clicked', async () => {
    const newPage = { id: 'page-123' };
    mockPagesStore.createPage.mockResolvedValue(newPage);

    const wrapper = mountDashboard();
    const newPageButton = wrapper.findAll('.action-card')[0];

    await newPageButton.trigger('click');
    await flushPromises();

    expect(mockPagesStore.createPage).toHaveBeenCalledWith({ title: 'Untitled' });
    expect(mockRouter.push).toHaveBeenCalledWith({
      name: 'page',
      params: { pageId: 'page-123' },
    });
  });

  it('does not create multiple pages when clicked rapidly', async () => {
    // Simulate a slow createPage call that never resolves
    mockPagesStore.createPage.mockReturnValue(new Promise(() => {}));

    const wrapper = mountDashboard();
    const newPageButton = wrapper.findAll('.action-card')[0];

    await newPageButton.trigger('click');
    await newPageButton.trigger('click');
    await newPageButton.trigger('click');

    // Only the first call should go through due to the creating guard
    expect(mockPagesStore.createPage).toHaveBeenCalledTimes(1);
  });

  // ---- Import ----

  it('shows coming soon dialog when Import is clicked', async () => {
    const wrapper = mountDashboard();
    const importButton = wrapper.findAll('.action-card')[2];

    await importButton.trigger('click');

    expect(mockDialog.alert).toHaveBeenCalledWith({
      title: 'Coming Soon',
      message: "Import is coming soon! We're working hard to bring you this feature.",
      variant: 'info',
      confirmText: 'Got it',
    });
  });

  // ---- Empty State ----

  it('shows empty state when no pages exist', () => {
    mockPagesStore.rootPages = [];

    const wrapper = mountDashboard();

    expect(wrapper.find('.empty-section').exists()).toBe(true);
    expect(wrapper.find('.empty-title').text()).toBe('Your workspace is empty');
    expect(wrapper.find('.recent-section').exists()).toBe(false);
  });

  it('creates a new page when "Create your first page" button in empty state is clicked', async () => {
    mockPagesStore.rootPages = [];
    const newPage = { id: 'page-first' };
    mockPagesStore.createPage.mockResolvedValue(newPage);

    const wrapper = mountDashboard();
    const emptyAction = wrapper.find('.empty-action');
    expect(emptyAction.exists()).toBe(true);

    await emptyAction.trigger('click');
    await flushPromises();

    expect(mockPagesStore.createPage).toHaveBeenCalledWith({ title: 'Untitled' });
    expect(mockRouter.push).toHaveBeenCalledWith({
      name: 'page',
      params: { pageId: 'page-first' },
    });
  });

  // ---- Recent Pages ----

  it('shows recent pages section when pages exist', () => {
    mockPagesStore.rootPages = [
      { id: 'p1', title: 'Meeting Notes' },
      { id: 'p2', title: 'Project Plan' },
    ];

    const wrapper = mountDashboard();

    expect(wrapper.find('.recent-section').exists()).toBe(true);
    expect(wrapper.find('.empty-section').exists()).toBe(false);
    expect(wrapper.text()).toContain('Recent Pages');

    const pageCards = wrapper.findAll('.page-card');
    expect(pageCards).toHaveLength(2);
    expect(pageCards[0].find('.page-card-title').text()).toBe('Meeting Notes');
    expect(pageCards[1].find('.page-card-title').text()).toBe('Project Plan');
  });

  it('displays at most 6 page cards', () => {
    mockPagesStore.rootPages = Array.from({ length: 10 }, (_, i) => ({
      id: `p${i}`,
      title: `Page ${i}`,
    }));

    const wrapper = mountDashboard();

    const pageCards = wrapper.findAll('.page-card');
    expect(pageCards).toHaveLength(6);
  });

  it('navigates to page when a page card is clicked', async () => {
    mockPagesStore.rootPages = [{ id: 'p42', title: 'My Page' }];

    const wrapper = mountDashboard();
    const pageCard = wrapper.find('.page-card');

    await pageCard.trigger('click');

    expect(mockRouter.push).toHaveBeenCalledWith({
      name: 'page',
      params: { pageId: 'p42' },
    });
  });

  // ---- Template Library Modal ----

  it('opens template library modal when Templates action is clicked', async () => {
    const wrapper = mountDashboard();

    // Modal should not be visible initially
    expect(wrapper.find('.modal-overlay').exists()).toBe(false);

    const templatesButton = wrapper.findAll('.action-card')[1];
    await templatesButton.trigger('click');

    expect(wrapper.find('.modal-overlay').exists()).toBe(true);
    expect(wrapper.find('.stub-template-library').exists()).toBe(true);
  });

  it('closes template library modal when overlay is clicked', async () => {
    const wrapper = mountDashboard();

    // Open the modal
    const templatesButton = wrapper.findAll('.action-card')[1];
    await templatesButton.trigger('click');
    expect(wrapper.find('.modal-overlay').exists()).toBe(true);

    // Click the overlay itself (not a child)
    await wrapper.find('.modal-overlay').trigger('click');
    expect(wrapper.find('.modal-overlay').exists()).toBe(false);
  });

  it('handles use template flow: creates page, fetches tree, navigates, and shows toast', async () => {
    const createdPage = { id: 'page-from-template' };
    mockTemplatesStore.createPageFromTemplate.mockResolvedValue(createdPage);
    mockPagesStore.fetchPageTree.mockResolvedValue(undefined);

    const wrapper = mountDashboard();

    // Open the modal
    const templatesButton = wrapper.findAll('.action-card')[1];
    await templatesButton.trigger('click');

    // Find the TemplateLibrary stub component and emit the useTemplate event
    const template = { id: 'tpl-1', name: 'Meeting Notes' };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const templateLib = wrapper.findComponent(TemplateLibrary as any);
    templateLib.vm.$emit('useTemplate', template);

    await flushPromises();

    expect(mockTemplatesStore.createPageFromTemplate).toHaveBeenCalledWith('tpl-1');
    expect(mockPagesStore.fetchPageTree).toHaveBeenCalled();
    expect(mockRouter.push).toHaveBeenCalledWith({
      name: 'page',
      params: { pageId: 'page-from-template' },
    });
    expect(mockToast.success).toHaveBeenCalledWith('Page created from "Meeting Notes"');

    // Modal should be closed after successful template use
    expect(wrapper.find('.modal-overlay').exists()).toBe(false);
  });

  it('shows error toast when template creation fails', async () => {
    mockTemplatesStore.createPageFromTemplate.mockRejectedValue(new Error('Server error'));

    const wrapper = mountDashboard();

    // Open the modal
    const templatesButton = wrapper.findAll('.action-card')[1];
    await templatesButton.trigger('click');

    // Find the TemplateLibrary stub component and emit the useTemplate event
    const template = { id: 'tpl-bad', name: 'Broken Template' };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const templateLib = wrapper.findComponent(TemplateLibrary as any);
    templateLib.vm.$emit('useTemplate', template);

    await flushPromises();

    expect(mockTemplatesStore.createPageFromTemplate).toHaveBeenCalledWith('tpl-bad');
    expect(mockToast.error).toHaveBeenCalledWith('Failed to create page from template');
    // Navigation should not occur on failure
    expect(mockRouter.push).not.toHaveBeenCalled();
  });
});
