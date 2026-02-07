import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';

// Hoist mocks so they are available before module imports
const { mockApi, MockApiError } = vi.hoisted(() => ({
  mockApi: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
  MockApiError: class extends Error {
    code: string;
    constructor(code: string, message: string) {
      super(message);
      this.code = code;
      this.name = 'ApiError';
    }
  },
}));

vi.mock('@/services', () => ({
  api: mockApi,
  ApiError: MockApiError,
}));

vi.mock('@/stores', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    useOrganizationsStore: () => ({
      currentOrganization: { id: 'org-1' },
    }),
  };
});

import ShareModal from '../ShareModal.vue';

// -- Test helpers --

const defaultProps = {
  pageId: 'page-1',
  pageTitle: 'My Test Page',
  isOpen: true,
};

/**
 * Sets up the mockApi.get implementation to return appropriate data for
 * the three parallel requests made by loadData().
 */
function setupLoadMock(options?: { isPublic?: boolean; permissions?: any[] }) {
  const permissions = options?.permissions ?? [];
  mockApi.get.mockImplementation((url: string) => {
    if (url.includes('/permissions/share-links')) {
      return Promise.resolve({ shareLinks: [] });
    }
    if (url.includes('/permissions')) {
      return Promise.resolve({ permissions });
    }
    // Page info endpoint
    return Promise.resolve({
      page: {
        isPublic: options?.isPublic ?? false,
        publicSlug: options?.isPublic ? 'test-slug' : null,
      },
    });
  });
}

function mountModal(props: Partial<typeof defaultProps> = {}) {
  return mount(ShareModal, {
    props: { ...defaultProps, ...props },
    global: {
      stubs: {
        Teleport: true,
        Transition: true,
        TransitionGroup: true,
      },
    },
  });
}

// -- Test data factories --

function makePermission(overrides: Record<string, unknown> = {}) {
  return {
    id: 'perm-1',
    userId: 'user-2',
    level: 'VIEW',
    shareToken: null,
    expiresAt: null,
    createdAt: new Date().toISOString(),
    user: {
      id: 'user-2',
      email: 'alice@example.com',
      name: 'Alice Smith',
    },
    ...overrides,
  };
}

describe('ShareModal', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    setupLoadMock();
  });

  // -------------------------------------------------------
  // 1. Loading state
  // -------------------------------------------------------
  it('shows loading state while data is being fetched', () => {
    // Keep the API promises pending so loading remains true
    mockApi.get.mockImplementation(() => new Promise(() => {}));

    const wrapper = mountModal();

    expect(wrapper.find('.modal-loading').exists()).toBe(true);
    expect(wrapper.text()).toContain('Loading sharing settings...');
  });

  // -------------------------------------------------------
  // 2. Modal title and page title subtitle
  // -------------------------------------------------------
  it('shows modal title "Share" and the page title as subtitle when open', async () => {
    const wrapper = mountModal();
    await flushPromises();

    expect(wrapper.find('.modal-title').text()).toBe('Share');
    expect(wrapper.find('.modal-subtitle').text()).toBe('My Test Page');
  });

  // -------------------------------------------------------
  // 3. Close button emits close
  // -------------------------------------------------------
  it('emits close when the close button is clicked', async () => {
    const wrapper = mountModal();
    await flushPromises();

    await wrapper.find('.close-btn').trigger('click');

    expect(wrapper.emitted('close')).toHaveLength(1);
  });

  // -------------------------------------------------------
  // 4. Public access toggle section after loading
  // -------------------------------------------------------
  it('shows the public access toggle section after loading completes', async () => {
    const wrapper = mountModal();
    await flushPromises();

    // Loading should be finished
    expect(wrapper.find('.modal-loading').exists()).toBe(false);

    // The public access section should be present
    const sectionTitle = wrapper.find('.section-title');
    expect(sectionTitle.exists()).toBe(true);
    expect(sectionTitle.text()).toBe('Public Access');

    // The toggle checkbox should exist
    const toggle = wrapper.find('.toggle input[type="checkbox"]');
    expect(toggle.exists()).toBe(true);
  });

  // -------------------------------------------------------
  // 5. Calls api.patch when toggling public access
  // -------------------------------------------------------
  it('calls api.patch to toggle public access when the toggle is clicked', async () => {
    setupLoadMock({ isPublic: false });
    mockApi.patch.mockResolvedValue({
      page: { isPublic: true, publicSlug: 'new-slug' },
    });

    const wrapper = mountModal();
    await flushPromises();

    const checkbox = wrapper.find('.toggle input[type="checkbox"]');
    await checkbox.trigger('change');
    await flushPromises();

    expect(mockApi.patch).toHaveBeenCalledWith('/organizations/org-1/pages/page-1', {
      isPublic: true,
    });

    // Should also emit update
    expect(wrapper.emitted('update')).toBeTruthy();
  });

  // -------------------------------------------------------
  // 6. Shows public URL input when page is public
  // -------------------------------------------------------
  it('shows the public URL input when the page is public', async () => {
    setupLoadMock({ isPublic: true });

    const wrapper = mountModal();
    await flushPromises();

    const linkInput = wrapper.find('.link-input');
    expect(linkInput.exists()).toBe(true);
    expect((linkInput.element as HTMLInputElement).value).toContain('/p/test-slug');
  });

  it('does not show the public URL input when the page is private', async () => {
    setupLoadMock({ isPublic: false });

    const wrapper = mountModal();
    await flushPromises();

    expect(wrapper.find('.public-link-box').exists()).toBe(false);
  });

  // -------------------------------------------------------
  // 7. "People with access" section with add form
  // -------------------------------------------------------
  it('shows the "People with access" section with the add form', async () => {
    const wrapper = mountModal();
    await flushPromises();

    expect(wrapper.find('.section-label').text()).toBe('People with access');

    // Email input
    const emailInput = wrapper.find('.email-input');
    expect(emailInput.exists()).toBe(true);
    expect(emailInput.attributes('type')).toBe('email');

    // Level select
    const levelSelect = wrapper.find('.add-person-form .level-select');
    expect(levelSelect.exists()).toBe(true);

    // Add button
    const addBtn = wrapper.find('.add-btn');
    expect(addBtn.exists()).toBe(true);
    expect(addBtn.text()).toBe('Add');
  });

  // -------------------------------------------------------
  // 8. Permission list with user info
  // -------------------------------------------------------
  it('shows the permission list with user information', async () => {
    setupLoadMock({
      permissions: [
        makePermission({
          id: 'perm-1',
          userId: 'user-2',
          level: 'EDIT',
          user: { id: 'user-2', email: 'alice@example.com', name: 'Alice Smith' },
        }),
        makePermission({
          id: 'perm-2',
          userId: 'user-3',
          level: 'VIEW',
          user: { id: 'user-3', email: 'bob@example.com', name: 'Bob Jones' },
        }),
      ],
    });

    const wrapper = mountModal();
    await flushPromises();

    const items = wrapper.findAll('.permission-item');
    expect(items).toHaveLength(2);

    // First user
    expect(items[0]!.find('.user-name').text()).toBe('Alice Smith');
    expect(items[0]!.find('.user-email').text()).toBe('alice@example.com');
    expect(items[0]!.find('.user-avatar').text()).toBe('A');

    // Second user
    expect(items[1]!.find('.user-name').text()).toBe('Bob Jones');
    expect(items[1]!.find('.user-email').text()).toBe('bob@example.com');
  });

  // -------------------------------------------------------
  // 9. Empty state when no permissions exist
  // -------------------------------------------------------
  it('shows empty state message when no permissions exist', async () => {
    setupLoadMock({ permissions: [] });

    const wrapper = mountModal();
    await flushPromises();

    const emptyState = wrapper.find('.empty-state');
    expect(emptyState.exists()).toBe(true);
    expect(emptyState.text()).toBe('No one else has access yet');
  });

  // -------------------------------------------------------
  // 10. Calls api.post to add a permission
  // -------------------------------------------------------
  it('calls api.post to add a permission on form submit', async () => {
    mockApi.post.mockResolvedValue({});

    const wrapper = mountModal();
    await flushPromises();

    // Fill in the email
    const emailInput = wrapper.find('.email-input');
    await emailInput.setValue('newuser@example.com');

    // Select a level
    const levelSelect = wrapper.find('.add-person-form .level-select');
    await levelSelect.setValue('EDIT');

    // Click add
    await wrapper.find('.add-btn').trigger('click');
    await flushPromises();

    expect(mockApi.post).toHaveBeenCalledWith('/organizations/org-1/pages/page-1/permissions', {
      userId: 'newuser@example.com',
      level: 'EDIT',
    });

    // Should emit update after successful add
    expect(wrapper.emitted('update')).toBeTruthy();
  });

  // -------------------------------------------------------
  // 11. Error message for PERMISSION_EXISTS
  // -------------------------------------------------------
  it('shows error message when ApiError with PERMISSION_EXISTS code is thrown', async () => {
    mockApi.post.mockRejectedValue(
      new MockApiError('PERMISSION_EXISTS', 'Permission already exists')
    );

    const wrapper = mountModal();
    await flushPromises();

    // Fill in the email and submit
    await wrapper.find('.email-input').setValue('existing@example.com');
    await wrapper.find('.add-btn').trigger('click');
    await flushPromises();

    const errorEl = wrapper.find('.form-error');
    expect(errorEl.exists()).toBe(true);
    expect(errorEl.text()).toBe('This user already has access');
  });

  it('shows generic ApiError message for non-PERMISSION_EXISTS codes', async () => {
    mockApi.post.mockRejectedValue(new MockApiError('FORBIDDEN', 'You do not have permission'));

    const wrapper = mountModal();
    await flushPromises();

    await wrapper.find('.email-input').setValue('someone@example.com');
    await wrapper.find('.add-btn').trigger('click');
    await flushPromises();

    const errorEl = wrapper.find('.form-error');
    expect(errorEl.exists()).toBe(true);
    expect(errorEl.text()).toBe('You do not have permission');
  });

  it('shows fallback error message for non-ApiError exceptions', async () => {
    mockApi.post.mockRejectedValue(new Error('Network failure'));

    const wrapper = mountModal();
    await flushPromises();

    await wrapper.find('.email-input').setValue('someone@example.com');
    await wrapper.find('.add-btn').trigger('click');
    await flushPromises();

    const errorEl = wrapper.find('.form-error');
    expect(errorEl.exists()).toBe(true);
    expect(errorEl.text()).toBe('Failed to add permission');
  });

  // -------------------------------------------------------
  // 12. Calls api.patch to update permission level
  // -------------------------------------------------------
  it('calls api.patch to update permission level when the select changes', async () => {
    setupLoadMock({
      permissions: [makePermission({ id: 'perm-1', userId: 'user-2', level: 'VIEW' })],
    });
    mockApi.patch.mockResolvedValue({});

    const wrapper = mountModal();
    await flushPromises();

    // Find the permission level select (the compact one inside permission-item)
    const permSelect = wrapper.find('.permission-item .level-select.compact');
    expect(permSelect.exists()).toBe(true);

    // Simulate changing the value
    await permSelect.setValue('FULL_ACCESS');
    await flushPromises();

    expect(mockApi.patch).toHaveBeenCalledWith(
      '/organizations/org-1/pages/page-1/permissions/perm-1',
      { level: 'FULL_ACCESS' }
    );
  });

  // -------------------------------------------------------
  // 13. Calls api.delete to remove permission
  // -------------------------------------------------------
  it('calls api.delete to remove a permission when the remove button is clicked', async () => {
    setupLoadMock({
      permissions: [makePermission({ id: 'perm-42', userId: 'user-2' })],
    });
    mockApi.delete.mockResolvedValue({});

    const wrapper = mountModal();
    await flushPromises();

    const removeBtn = wrapper.find('.remove-btn');
    expect(removeBtn.exists()).toBe(true);

    await removeBtn.trigger('click');
    await flushPromises();

    expect(mockApi.delete).toHaveBeenCalledWith(
      '/organizations/org-1/pages/page-1/permissions/perm-42'
    );

    // Should emit update after removal
    expect(wrapper.emitted('update')).toBeTruthy();
  });

  // -------------------------------------------------------
  // 14. Does not render when isOpen is false
  // -------------------------------------------------------
  it('does not render the modal overlay when isOpen is false', () => {
    const wrapper = mountModal({ isOpen: false });

    expect(wrapper.find('.modal-overlay').exists()).toBe(false);
  });

  // -------------------------------------------------------
  // Additional edge case tests
  // -------------------------------------------------------
  it('emits close when clicking the overlay background', async () => {
    const wrapper = mountModal();
    await flushPromises();

    // .self modifier means only direct clicks on .modal-overlay trigger close
    await wrapper.find('.modal-overlay').trigger('click');

    expect(wrapper.emitted('close')).toBeTruthy();
  });

  it('does not call api.post when submitting with an empty email', async () => {
    const wrapper = mountModal();
    await flushPromises();

    // Leave email empty, click Add
    await wrapper.find('.add-btn').trigger('click');
    await flushPromises();

    expect(mockApi.post).not.toHaveBeenCalled();
  });

  it('resets the email input and level after a successful add', async () => {
    mockApi.post.mockResolvedValue({});

    const wrapper = mountModal();
    await flushPromises();

    await wrapper.find('.email-input').setValue('newuser@example.com');
    await wrapper.find('.add-person-form .level-select').setValue('FULL_ACCESS');

    await wrapper.find('.add-btn').trigger('click');
    await flushPromises();

    const emailInput = wrapper.find('.email-input');
    expect((emailInput.element as HTMLInputElement).value).toBe('');
  });

  it('copies the public URL to clipboard when the copy button is clicked', async () => {
    setupLoadMock({ isPublic: true });

    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: writeTextMock },
      writable: true,
      configurable: true,
    });

    const wrapper = mountModal();
    await flushPromises();

    const copyBtn = wrapper.find('.copy-btn');
    expect(copyBtn.exists()).toBe(true);

    await copyBtn.trigger('click');
    await flushPromises();

    expect(writeTextMock).toHaveBeenCalledWith(expect.stringContaining('/p/test-slug'));

    // Button text should change to "Copied!"
    expect(wrapper.find('.copy-btn').text()).toContain('Copied!');
  });

  it('filters out permissions where userId is null', async () => {
    setupLoadMock({
      permissions: [
        makePermission({ id: 'perm-1', userId: 'user-2' }),
        makePermission({ id: 'perm-2', userId: null, user: null }),
      ],
    });

    const wrapper = mountModal();
    await flushPromises();

    // Only the permission with a non-null userId should be displayed
    const items = wrapper.findAll('.permission-item');
    expect(items).toHaveLength(1);
  });

  it('shows the add button as disabled when email is empty', async () => {
    const wrapper = mountModal();
    await flushPromises();

    const addBtn = wrapper.find('.add-btn');
    expect(addBtn.attributes('disabled')).toBeDefined();
  });

  it('reloads data when isOpen changes from false to true', async () => {
    const wrapper = mountModal({ isOpen: false });

    expect(mockApi.get).not.toHaveBeenCalled();

    await wrapper.setProps({ isOpen: true });
    await flushPromises();

    // loadData should have been called — three parallel GET requests
    expect(mockApi.get).toHaveBeenCalledTimes(3);
  });
});
