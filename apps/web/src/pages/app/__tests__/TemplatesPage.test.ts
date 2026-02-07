import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';

const mockRouter = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('vue-router', () => ({ useRouter: () => mockRouter }));

const { mockTemplatesStore, mockPagesStore, mockToast } = vi.hoisted(() => ({
  mockTemplatesStore: { createPageFromTemplate: vi.fn() },
  mockPagesStore: { fetchPageTree: vi.fn() },
  mockToast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@/stores', () => ({
  useTemplatesStore: () => mockTemplatesStore,
  usePagesStore: () => mockPagesStore,
}));
vi.mock('@/composables', () => ({ useToast: () => mockToast }));
vi.mock('@/components/TemplateLibrary.vue', () => ({
  default: {
    name: 'TemplateLibrary',
    emits: ['useTemplate', 'close'],
    template: '<div class="stub-template-library" />',
  },
}));

import TemplatesPage from '../TemplatesPage.vue';

const mockTemplate = {
  id: 'tpl-1',
  name: 'Meeting Notes',
  description: 'A template for meeting notes',
};

describe('TemplatesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setActivePinia(createPinia());
  });

  it('renders the templates page container', () => {
    const wrapper = mount(TemplatesPage);
    expect(wrapper.find('.templates-page').exists()).toBe(true);
  });

  it('renders TemplateLibrary component', () => {
    const wrapper = mount(TemplatesPage);
    expect(wrapper.find('.stub-template-library').exists()).toBe(true);
  });

  it('creates page from template on useTemplate event', async () => {
    const createdPage = { id: 'page-new' };
    mockTemplatesStore.createPageFromTemplate.mockResolvedValue(createdPage);
    mockPagesStore.fetchPageTree.mockResolvedValue(undefined);

    const wrapper = mount(TemplatesPage);
    const library = wrapper.findComponent({ name: 'TemplateLibrary' });
    await library.vm.$emit('useTemplate', mockTemplate);
    await flushPromises();

    expect(mockTemplatesStore.createPageFromTemplate).toHaveBeenCalledWith('tpl-1');
    expect(mockPagesStore.fetchPageTree).toHaveBeenCalled();
    expect(mockRouter.push).toHaveBeenCalledWith({
      name: 'page',
      params: { pageId: 'page-new' },
    });
    expect(mockToast.success).toHaveBeenCalledWith('Page created from "Meeting Notes"');
  });

  it('shows error toast when template creation fails', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockTemplatesStore.createPageFromTemplate.mockRejectedValue(new Error('Network error'));

    const wrapper = mount(TemplatesPage);
    const library = wrapper.findComponent({ name: 'TemplateLibrary' });
    await library.vm.$emit('useTemplate', mockTemplate);
    await flushPromises();

    expect(mockToast.error).toHaveBeenCalledWith('Failed to create page from template');
    expect(consoleError).toHaveBeenCalled();
    expect(mockRouter.push).not.toHaveBeenCalled();

    consoleError.mockRestore();
  });

  it('navigates to dashboard on close event', async () => {
    const wrapper = mount(TemplatesPage);
    const library = wrapper.findComponent({ name: 'TemplateLibrary' });
    await library.vm.$emit('close');
    await flushPromises();

    expect(mockRouter.push).toHaveBeenCalledWith({ name: 'dashboard' });
  });
});
