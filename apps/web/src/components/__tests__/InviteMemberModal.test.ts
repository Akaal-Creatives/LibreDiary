import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import InviteMemberModal from '../InviteMemberModal.vue';
import { useOrganizationsStore } from '@/stores/organizations';
import { useAuthStore } from '@/stores/auth';
import { ApiError } from '@/services';

// Mock the organizations service
vi.mock('@/services/organizations.service', () => ({
  organizationsService: {
    createInvite: vi.fn(),
  },
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

describe('InviteMemberModal', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue('org-1');
    setupStores();
  });

  function setupStores(
    role: 'OWNER' | 'ADMIN' | 'MEMBER' = 'OWNER',
    allowedDomains: string[] = []
  ) {
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
          allowedDomains,
          aiEnabled: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      [{ organizationId: 'org-1', role }]
    );
    return { authStore, orgsStore: useOrganizationsStore() };
  }

  function mountModal(open = true) {
    return mount(InviteMemberModal, {
      props: { open },
      global: {
        stubs: { teleport: true },
      },
    });
  }

  it('does not render when open is false', () => {
    const wrapper = mountModal(false);

    expect(wrapper.find('.modal').exists()).toBe(false);
  });

  it('renders when open is true', () => {
    const wrapper = mountModal(true);

    expect(wrapper.find('.modal').exists()).toBe(true);
  });

  it('renders the title "Invite Member"', () => {
    const wrapper = mountModal();

    expect(wrapper.text()).toContain('Invite Member');
  });

  it('has email input field', () => {
    const wrapper = mountModal();

    const emailInput = wrapper.find('#invite-email');
    expect(emailInput.exists()).toBe(true);
    expect(emailInput.attributes('type')).toBe('email');
  });

  it('has role select field', () => {
    const wrapper = mountModal();

    const roleSelect = wrapper.find('#invite-role');
    expect(roleSelect.exists()).toBe(true);
  });

  it('shows both Admin and Member roles for Owner', () => {
    setupStores('OWNER');
    const wrapper = mountModal();

    const options = wrapper.findAll('#invite-role option');
    expect(options.length).toBe(2);
    expect(options.map((o) => o.text())).toContain('Member');
    expect(options.map((o) => o.text())).toContain('Admin');
  });

  it('shows only Member role for Admin', () => {
    setupStores('ADMIN');
    const wrapper = mountModal();

    const options = wrapper.findAll('#invite-role option');
    expect(options.length).toBe(1);
    expect(options[0]?.text()).toBe('Member');
  });

  it('emits close when Cancel is clicked', async () => {
    const wrapper = mountModal();

    await wrapper.find('.btn-secondary').trigger('click');

    expect(wrapper.emitted('close')).toBeTruthy();
  });

  it('shows error when submitting empty email', async () => {
    const wrapper = mountModal();

    await wrapper.find('form').trigger('submit');

    expect(wrapper.text()).toContain('Email is required');
  });

  it('shows role description for Member', () => {
    const wrapper = mountModal();

    expect(wrapper.text()).toContain('view and contribute');
  });

  it('shows role description for Admin when selected', async () => {
    setupStores('OWNER');
    const wrapper = mountModal();

    await wrapper.find('#invite-role').setValue('ADMIN');

    expect(wrapper.text()).toContain('manage members and organization settings');
  });

  it('has aria-labelledby on dialog', () => {
    const wrapper = mountModal();

    const dialog = wrapper.find('[role="dialog"]');
    expect(dialog.attributes('aria-labelledby')).toBe('invite-modal-title');
  });

  it('has aria-modal attribute', () => {
    const wrapper = mountModal();

    const dialog = wrapper.find('[role="dialog"]');
    expect(dialog.attributes('aria-modal')).toBe('true');
  });

  it('close button has aria-label', () => {
    const wrapper = mountModal();

    const closeBtn = wrapper.find('.close-button');
    expect(closeBtn.attributes('aria-label')).toBe('Close');
  });

  it('emits close when close button is clicked', async () => {
    const wrapper = mountModal();

    await wrapper.find('.close-button').trigger('click');

    expect(wrapper.emitted('close')).toBeTruthy();
  });

  it('disables submit button during submission', async () => {
    const { orgsStore } = setupStores();

    // Make the createInvite take time
    orgsStore.createInvite = vi.fn(
      (): Promise<void> =>
        new Promise((resolve) => {
          setTimeout(resolve, 100);
        })
    );

    const wrapper = mountModal();
    await wrapper.find('#invite-email').setValue('test@example.com');

    // Don't await the submit
    wrapper.find('form').trigger('submit');
    await flushPromises();

    const submitBtn = wrapper.find('.btn-primary');
    expect(submitBtn.attributes('disabled')).toBeDefined();
    expect(submitBtn.text()).toContain('Sending...');
  });

  it('resets form when modal opens', async () => {
    const wrapper = mountModal(false);

    // First, mount with open=true and enter some data
    await wrapper.setProps({ open: true });
    await wrapper.find('#invite-email').setValue('test@example.com');

    // Close and reopen
    await wrapper.setProps({ open: false });
    await wrapper.setProps({ open: true });

    const emailInput = wrapper.find('#invite-email');
    expect((emailInput.element as HTMLInputElement).value).toBe('');
  });

  it('shows loading spinner during submission', async () => {
    const { orgsStore } = setupStores();
    orgsStore.createInvite = vi.fn(
      (): Promise<void> =>
        new Promise((resolve) => {
          setTimeout(resolve, 100);
        })
    );

    const wrapper = mountModal();
    await wrapper.find('#invite-email').setValue('test@example.com');

    wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(wrapper.find('.btn-spinner').exists()).toBe(true);
  });

  it('displays API error message on failure', async () => {
    const { orgsStore } = setupStores();
    orgsStore.createInvite = vi
      .fn()
      .mockRejectedValue(new ApiError('ALREADY_INVITED', 'User already invited'));

    const wrapper = mountModal();
    await wrapper.find('#invite-email').setValue('test@example.com');
    await wrapper.find('form').trigger('submit');
    await flushPromises();

    expect(wrapper.text()).toContain('User already invited');
  });

  describe('domain lockdown validation', () => {
    it('does not show domain warning when no domains are configured', async () => {
      setupStores('OWNER', []);
      const wrapper = mountModal();

      await wrapper.find('#invite-email').setValue('test@example.com');

      expect(wrapper.find('.domain-warning').exists()).toBe(false);
    });

    it('does not show domain warning for allowed domain', async () => {
      setupStores('OWNER', ['example.com', 'company.org']);
      const wrapper = mountModal();

      await wrapper.find('#invite-email').setValue('test@example.com');

      expect(wrapper.find('.domain-warning').exists()).toBe(false);
    });

    it('shows domain warning for non-allowed domain', async () => {
      setupStores('OWNER', ['company.org']);
      const wrapper = mountModal();

      await wrapper.find('#invite-email').setValue('test@other.com');

      expect(wrapper.find('.domain-warning').exists()).toBe(true);
      expect(wrapper.text()).toContain('not in the allowed domains');
    });

    it('domain check is case-insensitive', async () => {
      setupStores('OWNER', ['Company.ORG']);
      const wrapper = mountModal();

      await wrapper.find('#invite-email').setValue('test@company.org');

      expect(wrapper.find('.domain-warning').exists()).toBe(false);
    });

    it('shows allowed domains list in warning message', async () => {
      setupStores('OWNER', ['company.org', 'example.com']);
      const wrapper = mountModal();

      await wrapper.find('#invite-email').setValue('test@other.com');

      expect(wrapper.text()).toContain('company.org');
      expect(wrapper.text()).toContain('example.com');
    });

    it('still allows submission when domain is not allowed', async () => {
      const { orgsStore } = setupStores('OWNER', ['company.org']);
      orgsStore.createInvite = vi.fn().mockResolvedValue({});
      const wrapper = mountModal();

      await wrapper.find('#invite-email').setValue('test@other.com');
      await wrapper.find('form').trigger('submit');
      await flushPromises();

      expect(orgsStore.createInvite).toHaveBeenCalledWith({
        email: 'test@other.com',
        role: 'MEMBER',
      });
    });

    it('clears domain warning when switching to valid domain', async () => {
      setupStores('OWNER', ['company.org']);
      const wrapper = mountModal();

      await wrapper.find('#invite-email').setValue('test@other.com');
      expect(wrapper.find('.domain-warning').exists()).toBe(true);

      await wrapper.find('#invite-email').setValue('test@company.org');
      expect(wrapper.find('.domain-warning').exists()).toBe(false);
    });

    it('handles incomplete email gracefully', async () => {
      setupStores('OWNER', ['company.org']);
      const wrapper = mountModal();

      await wrapper.find('#invite-email').setValue('test@');
      expect(wrapper.find('.domain-warning').exists()).toBe(false);

      await wrapper.find('#invite-email').setValue('test');
      expect(wrapper.find('.domain-warning').exists()).toBe(false);
    });
  });
});
