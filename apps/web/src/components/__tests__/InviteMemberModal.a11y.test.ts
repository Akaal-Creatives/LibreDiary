import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';

const mockCreateInvite = vi.fn();

vi.mock('@/stores/organizations', () => ({
  useOrganizationsStore: () => ({
    currentOrganization: { id: 'org-1', name: 'Test Org' },
    isOwner: true,
    createInvite: mockCreateInvite,
  }),
}));

vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({
    currentOrganization: { allowedDomains: [] },
  }),
}));

vi.mock('@/composables/useToast', () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn() }),
}));

vi.mock('@/services', () => ({
  ApiError: class ApiError extends Error {
    code: string;
    constructor(message: string, code = 'UNKNOWN') {
      super(message);
      this.code = code;
    }
  },
}));

import InviteMemberModal from '../InviteMemberModal.vue';
import { ApiError } from '@/services';

describe('InviteMemberModal accessibility', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    mockCreateInvite.mockResolvedValue(undefined);
  });

  function mountModal() {
    return mount(InviteMemberModal, {
      props: { open: true },
      global: { stubs: { Teleport: true } },
    });
  }

  it('modal has role="dialog" and aria-modal="true"', () => {
    const wrapper = mountModal();
    const modal = wrapper.find('.modal');
    expect(modal.exists()).toBe(true);
    expect(modal.attributes('role')).toBe('dialog');
    expect(modal.attributes('aria-modal')).toBe('true');
  });

  it('modal has aria-labelledby pointing to title', () => {
    const wrapper = mountModal();
    const modal = wrapper.find('.modal');
    expect(modal.attributes('aria-labelledby')).toBe('invite-modal-title');
  });

  it('title has matching id', () => {
    const wrapper = mountModal();
    const title = wrapper.find('#invite-modal-title');
    expect(title.exists()).toBe(true);
    expect(title.text()).toBe('Invite Member');
  });

  it('close button has aria-label', () => {
    const wrapper = mountModal();
    const closeButton = wrapper.find('.close-button');
    expect(closeButton.exists()).toBe(true);
    expect(closeButton.attributes('aria-label')).toBe('Close');
  });

  it('email input has aria-invalid when error shown', async () => {
    mockCreateInvite.mockRejectedValue(new ApiError('Invalid email'));
    const wrapper = mountModal();

    const emailInput = wrapper.find('#invite-email');
    expect(emailInput.attributes('aria-invalid')).toBe('false');

    // Trigger error by submitting with invalid data
    await emailInput.setValue('test@example.com');
    const form = wrapper.find('form');
    await form.trigger('submit');
    await flushPromises();

    expect(emailInput.attributes('aria-invalid')).toBe('true');
  });

  it('email input has aria-describedby pointing to error when error shown', async () => {
    mockCreateInvite.mockRejectedValue(new ApiError('Invalid email'));
    const wrapper = mountModal();

    const emailInput = wrapper.find('#invite-email');
    expect(emailInput.attributes('aria-describedby')).toBeUndefined();

    // Trigger error by submitting
    await emailInput.setValue('test@example.com');
    const form = wrapper.find('form');
    await form.trigger('submit');
    await flushPromises();

    expect(emailInput.attributes('aria-describedby')).toBe('invite-error');
  });

  it('error div has role="alert" and aria-live="polite"', async () => {
    mockCreateInvite.mockRejectedValue(new ApiError('Something went wrong'));
    const wrapper = mountModal();

    // Initially no error
    let errorDiv = wrapper.find('#invite-error');
    expect(errorDiv.exists()).toBe(false);

    // Trigger error
    const emailInput = wrapper.find('#invite-email');
    await emailInput.setValue('test@example.com');
    const form = wrapper.find('form');
    await form.trigger('submit');
    await flushPromises();

    // Error should now exist with correct attributes
    errorDiv = wrapper.find('#invite-error');
    expect(errorDiv.exists()).toBe(true);
    expect(errorDiv.attributes('role')).toBe('alert');
    expect(errorDiv.attributes('aria-live')).toBe('polite');
  });

  it('error div displays the error message', async () => {
    const errorMessage = 'Failed to send invitation';
    mockCreateInvite.mockRejectedValue(new ApiError(errorMessage));
    const wrapper = mountModal();

    // Trigger error
    const emailInput = wrapper.find('#invite-email');
    await emailInput.setValue('test@example.com');
    const form = wrapper.find('form');
    await form.trigger('submit');
    await flushPromises();

    const errorDiv = wrapper.find('#invite-error');
    expect(errorDiv.text()).toBe(errorMessage);
  });

  it('shows validation error for empty email', async () => {
    const wrapper = mountModal();

    // Submit without entering email
    const form = wrapper.find('form');
    await form.trigger('submit');
    await flushPromises();

    const errorDiv = wrapper.find('#invite-error');
    expect(errorDiv.exists()).toBe(true);
    expect(errorDiv.text()).toBe('Email is required');

    const emailInput = wrapper.find('#invite-email');
    expect(emailInput.attributes('aria-invalid')).toBe('true');
    expect(emailInput.attributes('aria-describedby')).toBe('invite-error');
  });
});
