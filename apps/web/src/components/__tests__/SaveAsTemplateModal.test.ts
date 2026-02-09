import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';

const { mockTemplatesStore } = vi.hoisted(() => ({
  mockTemplatesStore: {
    createTemplateFromPage: vi.fn(),
  },
}));

vi.mock('@/stores/templates', () => ({
  useTemplatesStore: () => mockTemplatesStore,
}));

const mockToast = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
}));

vi.mock('@/composables/useToast', () => ({
  useToast: () => mockToast,
}));

import SaveAsTemplateModal from '../SaveAsTemplateModal.vue';

const defaultProps = {
  open: true,
  pageId: 'page-1',
  pageTitle: 'My Test Page',
};

function mountModal(props: Partial<typeof defaultProps> = {}) {
  return mount(SaveAsTemplateModal, {
    props: { ...defaultProps, ...props },
    global: {
      stubs: { Teleport: true },
    },
  });
}

describe('SaveAsTemplateModal', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    mockTemplatesStore.createTemplateFromPage.mockResolvedValue({});
  });

  it('does not render when open is false', () => {
    const wrapper = mountModal({ open: false });

    expect(wrapper.find('.modal-overlay').exists()).toBe(false);
  });

  it('renders modal with form when open is true', () => {
    const wrapper = mountModal();

    expect(wrapper.find('.modal').exists()).toBe(true);
    expect(wrapper.find('form').exists()).toBe(true);
    expect(wrapper.find('.modal-title').text()).toBe('Save as Template');
  });

  it('pre-fills name input with pageTitle', async () => {
    const wrapper = mountModal({ open: false });

    await wrapper.setProps({ open: true });

    const nameInput = wrapper.find('#template-name');
    expect((nameInput.element as HTMLInputElement).value).toBe('My Test Page');
  });

  it('shows all category options in select', () => {
    const wrapper = mountModal();

    const options = wrapper.findAll('#template-category option');
    const optionTexts = options.map((o) => o.text());

    expect(optionTexts).toContain('No category');
    expect(optionTexts).toContain('Meeting');
    expect(optionTexts).toContain('Project');
    expect(optionTexts).toContain('Personal');
    expect(optionTexts).toContain('Team');
    expect(optionTexts).toContain('Other');
    expect(options).toHaveLength(6);
  });

  it('shows validation error when submitting with empty name', async () => {
    const wrapper = mountModal();

    await wrapper.find('#template-name').setValue('');
    await wrapper.find('form').trigger('submit');

    expect(wrapper.text()).toContain('Name is required');
    expect(mockTemplatesStore.createTemplateFromPage).not.toHaveBeenCalled();
  });

  it('submits template successfully', async () => {
    const wrapper = mountModal();

    await wrapper.find('#template-name').setValue('Weekly Standup');
    await wrapper.find('#template-description').setValue('A weekly standup template');
    await wrapper.find('#template-category').setValue('Meeting');
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(mockTemplatesStore.createTemplateFromPage).toHaveBeenCalledWith({
      pageId: 'page-1',
      name: 'Weekly Standup',
      description: 'A weekly standup template',
      category: 'Meeting',
    });
    expect(mockToast.success).toHaveBeenCalledWith('Save as Template');
    expect(wrapper.emitted('saved')).toHaveLength(1);
    expect(wrapper.emitted('close')).toHaveLength(1);
  });

  it('shows error message when store action fails', async () => {
    mockTemplatesStore.createTemplateFromPage.mockRejectedValue(new Error('Server error'));

    const wrapper = mountModal();

    await wrapper.find('#template-name').setValue('Some Template');
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(wrapper.text()).toContain('Failed to save template. Please try again.');
    expect(wrapper.emitted('saved')).toBeUndefined();
    expect(wrapper.emitted('close')).toBeUndefined();
  });

  it('shows "Saving..." and disables button during submission', async () => {
    mockTemplatesStore.createTemplateFromPage.mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 100))
    );

    const wrapper = mountModal();

    await wrapper.find('#template-name').setValue('Test Template');
    wrapper.find('form').trigger('submit');
    await flushPromises();

    const submitBtn = wrapper.find('.btn-primary');
    expect(submitBtn.text()).toBe('Saving...');
    expect(submitBtn.attributes('disabled')).toBeDefined();
  });

  it('emits close when cancel button is clicked', async () => {
    const wrapper = mountModal();

    await wrapper.find('.btn-secondary').trigger('click');

    expect(wrapper.emitted('close')).toHaveLength(1);
  });

  it('emits close when close (X) button is clicked', async () => {
    const wrapper = mountModal();

    await wrapper.find('.close-btn').trigger('click');

    expect(wrapper.emitted('close')).toHaveLength(1);
  });

  it('resets form fields when modal reopens', async () => {
    const wrapper = mountModal({ open: false });

    // Open the modal and modify form fields
    await wrapper.setProps({ open: true });
    await wrapper.find('#template-name').setValue('Changed Name');
    await wrapper.find('#template-description').setValue('Some description');
    await wrapper.find('#template-category').setValue('Team');

    // Close and reopen
    await wrapper.setProps({ open: false });
    await wrapper.setProps({ open: true });

    const nameInput = wrapper.find('#template-name');
    const descInput = wrapper.find('#template-description');
    const categorySelect = wrapper.find('#template-category');

    expect((nameInput.element as HTMLInputElement).value).toBe('My Test Page');
    expect((descInput.element as HTMLTextAreaElement).value).toBe('');
    expect((categorySelect.element as HTMLSelectElement).value).toBe('');
  });
});
