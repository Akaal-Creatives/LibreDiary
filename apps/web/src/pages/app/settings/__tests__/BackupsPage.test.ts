import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';

// Hoist mocks so they are available before module imports
const { mockBackupsStore, mockToast } = vi.hoisted(() => ({
  mockBackupsStore: {
    orgBackups: [] as any[],
    creating: false,
    fetchOrgBackups: vi.fn(),
    createOrgBackup: vi.fn(),
    downloadOrgBackup: vi.fn(),
    deleteOrgBackup: vi.fn(),
  },
  mockToast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/stores/backups', () => ({
  useBackupsStore: () => mockBackupsStore,
}));

vi.mock('@/composables', () => ({
  useToast: () => mockToast,
}));

vi.mock('@/components/ui/ConfirmDialog.vue', () => ({
  default: {
    name: 'ConfirmDialog',
    template: '<div class="stub-confirm-dialog" />',
    props: ['open', 'title', 'message', 'confirmText', 'variant'],
    emits: ['confirm', 'close'],
  },
}));

vi.mock('@/components/ui/BaseModal.vue', () => ({
  default: {
    name: 'BaseModal',
    template: '<div class="stub-base-modal"><slot v-if="open" /></div>',
    props: ['open'],
    emits: ['close'],
  },
}));

import BackupsPage from '../BackupsPage.vue';

function mountPage() {
  return mount(BackupsPage, {
    global: {
      stubs: { Teleport: true },
    },
  });
}

describe('BackupsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setActivePinia(createPinia());

    // Reset store defaults
    mockBackupsStore.orgBackups = [];
    mockBackupsStore.creating = false;
    mockBackupsStore.fetchOrgBackups.mockResolvedValue(undefined);
    mockBackupsStore.createOrgBackup.mockResolvedValue(undefined);
    mockBackupsStore.downloadOrgBackup.mockResolvedValue(new Blob());
    mockBackupsStore.deleteOrgBackup.mockResolvedValue(undefined);
  });

  // ---- Page Header ----

  describe('page header', () => {
    it('renders the page title "Backups"', async () => {
      const wrapper = mountPage();
      await flushPromises();

      expect(wrapper.find('.page-title').text()).toBe('Backups');
    });

    it('renders the page description', async () => {
      const wrapper = mountPage();
      await flushPromises();

      expect(wrapper.text()).toContain('Create and manage organisation data backups');
    });

    it('renders the "Create Backup" button', async () => {
      const wrapper = mountPage();
      await flushPromises();

      const btn = wrapper.find('.btn-primary');
      expect(btn.exists()).toBe(true);
      expect(btn.text()).toContain('Create Backup');
    });
  });

  // ---- Loading State ----

  describe('loading state', () => {
    it('shows skeleton rows while loading', () => {
      mockBackupsStore.fetchOrgBackups.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(undefined), 100))
      );
      const wrapper = mountPage();

      const skeletonRows = wrapper.findAll('.skeleton-row');
      expect(skeletonRows.length).toBe(3);
    });

    it('hides skeleton rows after data loads', async () => {
      const wrapper = mountPage();
      await flushPromises();

      expect(wrapper.find('.skeleton-row').exists()).toBe(false);
    });
  });

  // ---- Empty State ----

  describe('empty state', () => {
    it('shows empty state when there are no backups', async () => {
      mockBackupsStore.orgBackups = [];
      const wrapper = mountPage();
      await flushPromises();

      expect(wrapper.find('.empty-state').exists()).toBe(true);
      expect(wrapper.text()).toContain('No backups yet');
    });
  });

  // ---- Backup List ----

  describe('backup list', () => {
    const mockBackups = [
      {
        id: 'b1',
        fileName: 'backup-2025-01-15.tar.gz',
        fileSize: 1048576, // 1 MB
        status: 'COMPLETED',
        isEncrypted: true,
        createdAt: '2025-01-15T10:30:00Z',
      },
      {
        id: 'b2',
        fileName: 'backup-2025-01-14.tar.gz',
        fileSize: 524288, // 512 KB
        status: 'PENDING',
        isEncrypted: false,
        createdAt: '2025-01-14T08:00:00Z',
      },
      {
        id: 'b3',
        fileName: null,
        fileSize: null,
        status: 'FAILED',
        isEncrypted: false,
        createdAt: '2025-01-13T14:00:00Z',
      },
    ];

    it('displays backup rows for each backup', async () => {
      mockBackupsStore.orgBackups = mockBackups;
      const wrapper = mountPage();
      await flushPromises();

      // Exclude header row from count: tbody rows only
      const rows = wrapper.findAll('tbody tr');
      expect(rows).toHaveLength(3);
    });

    it('displays the file name for each backup', async () => {
      mockBackupsStore.orgBackups = mockBackups;
      const wrapper = mountPage();
      await flushPromises();

      expect(wrapper.text()).toContain('backup-2025-01-15.tar.gz');
      expect(wrapper.text()).toContain('backup-2025-01-14.tar.gz');
    });

    it('displays "-" for null file name', async () => {
      mockBackupsStore.orgBackups = [mockBackups[2]];
      const wrapper = mountPage();
      await flushPromises();

      const fileName = wrapper.find('.file-name');
      expect(fileName.text()).toBe('-');
    });

    it('formats file size correctly', async () => {
      mockBackupsStore.orgBackups = mockBackups;
      const wrapper = mountPage();
      await flushPromises();

      expect(wrapper.text()).toContain('1.0 MB');
      expect(wrapper.text()).toContain('512.0 KB');
    });

    it('displays status badges with correct text', async () => {
      mockBackupsStore.orgBackups = mockBackups;
      const wrapper = mountPage();
      await flushPromises();

      const badges = wrapper.findAll('.badge');
      expect(badges[0].text()).toBe('COMPLETED');
      expect(badges[1].text()).toBe('PENDING');
      expect(badges[2].text()).toBe('FAILED');
    });

    it('shows "Yes" for encrypted backups', async () => {
      mockBackupsStore.orgBackups = [mockBackups[0]];
      const wrapper = mountPage();
      await flushPromises();

      expect(wrapper.find('.encrypted-yes').exists()).toBe(true);
      expect(wrapper.find('.encrypted-yes').text()).toContain('Yes');
    });

    it('shows "No" for non-encrypted backups', async () => {
      mockBackupsStore.orgBackups = [mockBackups[1]];
      const wrapper = mountPage();
      await flushPromises();

      expect(wrapper.find('.encrypted-no').exists()).toBe(true);
      expect(wrapper.find('.encrypted-no').text()).toBe('No');
    });

    it('shows download button only for COMPLETED backups', async () => {
      mockBackupsStore.orgBackups = mockBackups;
      const wrapper = mountPage();
      await flushPromises();

      const rows = wrapper.findAll('tbody tr');
      // First row (COMPLETED) should have download button
      expect(rows[0].findAll('.action-btn').length).toBe(2); // download + delete
      // Second row (PENDING) should have only delete
      expect(rows[1].findAll('.action-btn').length).toBe(1);
      // Third row (FAILED) should have only delete
      expect(rows[2].findAll('.action-btn').length).toBe(1);
    });
  });

  // ---- Create Backup ----

  describe('create backup', () => {
    it('opens the create modal when "Create Backup" button is clicked', async () => {
      const wrapper = mountPage();
      await flushPromises();

      await wrapper.find('.btn-primary').trigger('click');

      // Modal content should be visible
      expect(wrapper.find('.create-modal').exists()).toBe(true);
      expect(wrapper.text()).toContain('Create Backup');
    });

    it('creates a backup without encryption when checkbox is unchecked', async () => {
      const wrapper = mountPage();
      await flushPromises();

      // Open modal
      await wrapper.find('.btn-primary').trigger('click');

      // Click "Create Backup" in modal
      const modalButtons = wrapper.findAll('.modal-actions .btn');
      const createBtn = modalButtons.find((b) => b.text() === 'Create Backup');
      await createBtn!.trigger('click');
      await flushPromises();

      expect(mockBackupsStore.createOrgBackup).toHaveBeenCalledWith({
        encrypt: false,
        password: undefined,
      });
      expect(mockToast.success).toHaveBeenCalledWith('Backup created');
    });

    it('shows password validation error for short passwords when encryption is enabled', async () => {
      const wrapper = mountPage();
      await flushPromises();

      // Open modal
      await wrapper.find('.btn-primary').trigger('click');

      // Enable encryption
      const checkbox = wrapper.find('.checkbox');
      await checkbox.setValue(true);

      // Enter a short password
      const passwordInput = wrapper.find('#backup-password');
      await passwordInput.setValue('short');

      // Click create
      const modalButtons = wrapper.findAll('.modal-actions .btn');
      const createBtn = modalButtons.find((b) => b.text() === 'Create Backup');
      await createBtn!.trigger('click');
      await flushPromises();

      expect(wrapper.find('.field-error').text()).toBe('Password must be at least 8 characters');
      expect(mockBackupsStore.createOrgBackup).not.toHaveBeenCalled();
    });

    it('creates an encrypted backup with valid password', async () => {
      const wrapper = mountPage();
      await flushPromises();

      // Open modal
      await wrapper.find('.btn-primary').trigger('click');

      // Enable encryption
      const checkbox = wrapper.find('.checkbox');
      await checkbox.setValue(true);

      // Enter valid password
      const passwordInput = wrapper.find('#backup-password');
      await passwordInput.setValue('validpassword123');

      // Click create
      const modalButtons = wrapper.findAll('.modal-actions .btn');
      const createBtn = modalButtons.find((b) => b.text() === 'Create Backup');
      await createBtn!.trigger('click');
      await flushPromises();

      expect(mockBackupsStore.createOrgBackup).toHaveBeenCalledWith({
        encrypt: true,
        password: 'validpassword123',
      });
      expect(mockToast.success).toHaveBeenCalledWith('Backup created');
    });

    it('shows error toast when backup creation fails', async () => {
      mockBackupsStore.createOrgBackup.mockRejectedValue(new Error('Server error'));
      const wrapper = mountPage();
      await flushPromises();

      // Open modal
      await wrapper.find('.btn-primary').trigger('click');

      // Click create
      const modalButtons = wrapper.findAll('.modal-actions .btn');
      const createBtn = modalButtons.find((b) => b.text() === 'Create Backup');
      await createBtn!.trigger('click');
      await flushPromises();

      expect(mockToast.error).toHaveBeenCalledWith('Failed to create backup');
    });

    it('disables the create button when a backup is being created', async () => {
      mockBackupsStore.creating = true;
      const wrapper = mountPage();
      await flushPromises();

      const btn = wrapper.find('.btn-primary');
      expect(btn.attributes('disabled')).toBeDefined();
      expect(btn.text()).toContain('Creating...');
    });
  });

  // ---- Error Handling ----

  describe('error handling', () => {
    it('calls fetchOrgBackups on mount', async () => {
      mountPage();
      await flushPromises();

      expect(mockBackupsStore.fetchOrgBackups).toHaveBeenCalledTimes(1);
    });

    it('handles fetchOrgBackups failure gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockBackupsStore.fetchOrgBackups.mockRejectedValue(new Error('Network error'));

      const wrapper = mountPage();
      await flushPromises();

      // Should not throw, and page should still render
      expect(wrapper.find('.backups-page').exists()).toBe(true);
      consoleSpy.mockRestore();
    });
  });
});
