import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import OrganizationSwitcher from '../OrganizationSwitcher.vue';
import { useAuthStore } from '@/stores/auth';
import type { Organization } from '@librediary/shared';

// Mock the router
vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: vi.fn(),
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

describe('OrganizationSwitcher', () => {
  const mockOrg: Organization = {
    id: 'org-1',
    name: 'Test Organization',
    slug: 'test-org',
    logoUrl: null,
    accentColor: '#6b8f71',
    allowedDomains: [],
    aiEnabled: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mockOrg2: Organization = {
    ...mockOrg,
    id: 'org-2',
    name: 'Another Org',
    slug: 'another-org',
  };

  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue('org-1');
  });

  function setupAuthStore(
    orgs: Organization[] = [mockOrg],
    role: 'OWNER' | 'ADMIN' | 'MEMBER' = 'OWNER'
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
      orgs,
      orgs.map((org) => ({ organizationId: org.id, role }))
    );
    return authStore;
  }

  it('renders the current organization name', () => {
    setupAuthStore();
    const wrapper = mount(OrganizationSwitcher);

    expect(wrapper.text()).toContain('Test Organization');
  });

  it('shows avatar with first letter of org name when no logo', () => {
    setupAuthStore();
    const wrapper = mount(OrganizationSwitcher);

    expect(wrapper.find('.org-avatar').text()).toBe('T');
  });

  it('shows role badge for current user', () => {
    setupAuthStore([mockOrg], 'OWNER');
    const wrapper = mount(OrganizationSwitcher);

    expect(wrapper.text()).toContain('Owner');
  });

  it('shows Admin badge for admin role', () => {
    setupAuthStore([mockOrg], 'ADMIN');
    const wrapper = mount(OrganizationSwitcher);

    expect(wrapper.text()).toContain('Admin');
  });

  it('shows Member badge for member role', () => {
    setupAuthStore([mockOrg], 'MEMBER');
    const wrapper = mount(OrganizationSwitcher);

    expect(wrapper.text()).toContain('Member');
  });

  it('toggles dropdown when button is clicked', async () => {
    setupAuthStore();
    const wrapper = mount(OrganizationSwitcher);

    expect(wrapper.find('.dropdown-menu').exists()).toBe(false);

    await wrapper.find('.switcher-button').trigger('click');

    expect(wrapper.find('.dropdown-menu').exists()).toBe(true);
  });

  it('closes dropdown when clicking backdrop', async () => {
    setupAuthStore();
    const wrapper = mount(OrganizationSwitcher);

    await wrapper.find('.switcher-button').trigger('click');
    expect(wrapper.find('.dropdown-menu').exists()).toBe(true);

    await wrapper.find('.dropdown-backdrop').trigger('click');

    expect(wrapper.find('.dropdown-menu').exists()).toBe(false);
  });

  it('shows switch organization section when multiple orgs', async () => {
    setupAuthStore([mockOrg, mockOrg2]);
    const wrapper = mount(OrganizationSwitcher);

    await wrapper.find('.switcher-button').trigger('click');

    expect(wrapper.text()).toContain('Switch Organization');
    expect(wrapper.text()).toContain('Another Org');
  });

  it('does not show switch section with single org', async () => {
    setupAuthStore([mockOrg]);
    const wrapper = mount(OrganizationSwitcher);

    await wrapper.find('.switcher-button').trigger('click');

    expect(wrapper.text()).not.toContain('Switch Organization');
  });

  it('shows Settings and Members actions in dropdown', async () => {
    setupAuthStore();
    const wrapper = mount(OrganizationSwitcher);

    await wrapper.find('.switcher-button').trigger('click');

    expect(wrapper.text()).toContain('Settings');
    expect(wrapper.text()).toContain('Members');
  });

  it('shows Create Organization option', async () => {
    setupAuthStore();
    const wrapper = mount(OrganizationSwitcher);

    await wrapper.find('.switcher-button').trigger('click');

    expect(wrapper.text()).toContain('Create Organization');
  });

  it('has correct aria attributes', () => {
    setupAuthStore();
    const wrapper = mount(OrganizationSwitcher);

    const button = wrapper.find('.switcher-button');
    expect(button.attributes('aria-haspopup')).toBe('listbox');
    expect(button.attributes('aria-expanded')).toBe('false');
  });

  it('updates aria-expanded when dropdown opens', async () => {
    setupAuthStore();
    const wrapper = mount(OrganizationSwitcher);

    await wrapper.find('.switcher-button').trigger('click');

    expect(wrapper.find('.switcher-button').attributes('aria-expanded')).toBe('true');
  });

  it('shows Select Organization when no org is selected', () => {
    const authStore = useAuthStore();
    authStore.setOrganizations([], []);
    const wrapper = mount(OrganizationSwitcher);

    expect(wrapper.text()).toContain('Select Organization');
  });

  it('shows checkmark for currently selected organization', async () => {
    setupAuthStore([mockOrg, mockOrg2]);
    const wrapper = mount(OrganizationSwitcher);

    await wrapper.find('.switcher-button').trigger('click');

    const activeOrg = wrapper.find('.org-item.active');
    expect(activeOrg.exists()).toBe(true);
    expect(activeOrg.find('.check-icon').exists()).toBe(true);
  });
});
