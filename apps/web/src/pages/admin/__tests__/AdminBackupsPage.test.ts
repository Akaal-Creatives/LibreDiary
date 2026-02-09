import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';

const mockBackupsStore = vi.hoisted(() => ({
  settings: null as Record<string, unknown> | null,
  allBackups: [] as Record<string, unknown>[],
  creating: false,
  fetchSettings: vi.fn(),
  fetchAllBackups: vi.fn(),
  createSystemBackup: vi.fn(),
  downloadOrgBackup: vi.fn(),
  deleteOrgBackup: vi.fn(),
}));

const mockToast = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
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
    props: ['open', 'title', 'message', 'confirmText', 'variant'],
    emits: ['confirm', 'close'],
    template: '<div v-if="open" class="confirm-dialog-stub"><slot /></div>',
  },
}));

vi.mock('@/components/ui/BaseModal.vue', () => ({
  default: {
    name: 'BaseModal',
    props: ['open'],
    emits: ['close'],
    template: '<div v-if="open" class="base-modal-stub"><slot /></div>',
  },
}));

import AdminBackupsPage from '../AdminBackupsPage.vue';

const sampleSettings = {
  enabled: true,
  storageType: 'LOCAL' as const,
  schedule: '0 3 * * *',
  retentionDays: 30,
  maxSizeMb: 500,
  pgDumpAvailable: true,
};

const sampleBackups = [
  {
    id: 'backup-1',
    type: 'SYSTEM' as const,
    status: 'COMPLETED' as const,
    organizationId: null,
    fileName: 'system-backup-2024-01-15.tar.gz',
    fileSize: 10485760, // 10 MB
    storagePath: '/backups/system-backup-2024-01-15.tar.gz',
    storageType: 'LOCAL',
    isEncrypted: false,
    errorMessage: null,
    triggeredById: 'user-1',
    startedAt: '2024-01-15T03:00:00Z',
    completedAt: '2024-01-15T03:05:00Z',
    createdAt: '2024-01-15T03:00:00Z',
  },
  {
    id: 'backup-2',
    type: 'ORGANISATION' as const,
    status: 'PENDING' as const,
    organizationId: 'org-1',
    fileName: null,
    fileSize: null,
    storagePath: null,
    storageType: 'LOCAL',
    isEncrypted: true,
    errorMessage: null,
    triggeredById: 'user-2',
    startedAt: null,
    completedAt: null,
    createdAt: '2024-01-16T10:00:00Z',
    organization: { name: 'Acme Corp' },
  },
  {
    id: 'backup-3',
    type: 'SYSTEM' as const,
    status: 'FAILED' as const,
    organizationId: null,
    fileName: null,
    fileSize: null,
    storagePath: null,
    storageType: 'LOCAL',
    isEncrypted: false,
    errorMessage: 'pg_dump not found',
    triggeredById: 'user-1',
    startedAt: '2024-01-17T03:00:00Z',
    completedAt: null,
    createdAt: '2024-01-17T03:00:00Z',
  },
];

function mountPage() {
  return mount(AdminBackupsPage, {
    global: {
      stubs: { Teleport: true },
    },
  });
}

describe('AdminBackupsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setActivePinia(createPinia());

    mockBackupsStore.settings = sampleSettings;
    mockBackupsStore.allBackups = sampleBackups;
    mockBackupsStore.creating = false;
    mockBackupsStore.fetchSettings.mockResolvedValue(undefined);
    mockBackupsStore.fetchAllBackups.mockResolvedValue(undefined);
    mockBackupsStore.createSystemBackup.mockReset();
    mockBackupsStore.downloadOrgBackup.mockReset();
    mockBackupsStore.deleteOrgBackup.mockReset();
  });

  it('renders the page header with title and description', async () => {
    const wrapper = mountPage();
    await flushPromises();

    expect(wrapper.find('.page-title').text()).toBe('Backups');
    expect(wrapper.find('.page-description').text()).toBe('Manage system and organisation backups');
  });

  it('shows loading skeleton rows whilst data is being fetched', () => {
    mockBackupsStore.fetchSettings.mockReturnValue(new Promise(() => {}));
    mockBackupsStore.fetchAllBackups.mockReturnValue(new Promise(() => {}));

    const wrapper = mountPage();

    expect(wrapper.findAll('.skeleton-row').length).toBeGreaterThan(0);
  });

  it('displays backup settings after successful load', async () => {
    const wrapper = mountPage();
    await flushPromises();

    expect(wrapper.text()).toContain('Enabled');
    expect(wrapper.text()).toContain('Local Disk');
    expect(wrapper.text()).toContain('0 3 * * *');
    expect(wrapper.text()).toContain('30d');
    expect(wrapper.text()).toContain('Available');
  });

  it('shows correct storage type label for S3', async () => {
    mockBackupsStore.settings = { ...sampleSettings, storageType: 'S3' as const };

    const wrapper = mountPage();
    await flushPromises();

    expect(wrapper.text()).toContain('S3 Compatible');
  });

  it('shows Disabled when scheduled backups are disabled', async () => {
    mockBackupsStore.settings = { ...sampleSettings, enabled: false };

    const wrapper = mountPage();
    await flushPromises();

    expect(wrapper.text()).toContain('Disabled');
  });

  it('shows Not Found when pg_dump is unavailable', async () => {
    mockBackupsStore.settings = { ...sampleSettings, pgDumpAvailable: false };

    const wrapper = mountPage();
    await flushPromises();

    expect(wrapper.text()).toContain('Not Found');
  });

  it('displays backup rows in the table', async () => {
    const wrapper = mountPage();
    await flushPromises();

    const rows = wrapper.findAll('tbody tr');
    expect(rows).toHaveLength(3);
  });

  it('shows correct type badges for system and org backups', async () => {
    const wrapper = mountPage();
    await flushPromises();

    const typeBadges = wrapper.findAll('.type-badge');
    expect(typeBadges[0].text()).toBe('System');
    expect(typeBadges[0].classes()).toContain('type-system');
    expect(typeBadges[1].text()).toBe('Org');
    expect(typeBadges[1].classes()).toContain('type-org');
  });

  it('shows organisation name when available', async () => {
    const wrapper = mountPage();
    await flushPromises();

    const orgNames = wrapper.findAll('.org-name');
    expect(orgNames[0].text()).toBe('-');
    expect(orgNames[1].text()).toBe('Acme Corp');
  });

  it('shows file name or dash when not available', async () => {
    const wrapper = mountPage();
    await flushPromises();

    const fileNames = wrapper.findAll('.file-name');
    expect(fileNames[0].text()).toBe('system-backup-2024-01-15.tar.gz');
    expect(fileNames[1].text()).toBe('-');
  });

  it('shows encrypted badge for encrypted backups', async () => {
    const wrapper = mountPage();
    await flushPromises();

    const encryptedBadges = wrapper.findAll('.encrypted-badge');
    expect(encryptedBadges).toHaveLength(1); // Only backup-2 is encrypted
  });

  it('formats file size correctly', async () => {
    const wrapper = mountPage();
    await flushPromises();

    const sizeTexts = wrapper.findAll('.size-text');
    expect(sizeTexts[0].text()).toBe('10.0 MB');
    expect(sizeTexts[1].text()).toBe('-'); // null fileSize
  });

  it('shows correct status badges', async () => {
    const wrapper = mountPage();
    await flushPromises();

    const statusBadges = wrapper.findAll('.badge');
    expect(statusBadges[0].text()).toBe('COMPLETED');
    expect(statusBadges[0].classes()).toContain('badge-success');
    expect(statusBadges[1].text()).toBe('PENDING');
    expect(statusBadges[1].classes()).toContain('badge-warning');
    expect(statusBadges[2].text()).toBe('FAILED');
    expect(statusBadges[2].classes()).toContain('badge-error');
  });

  it('shows download button only for completed backups', async () => {
    const wrapper = mountPage();
    await flushPromises();

    const rows = wrapper.findAll('tbody tr');
    // Row 0 is COMPLETED - should have download + delete buttons
    const completedActions = rows[0].findAll('.action-btn');
    expect(completedActions).toHaveLength(2);

    // Row 1 is PENDING - should only have delete button
    const pendingActions = rows[1].findAll('.action-btn');
    expect(pendingActions).toHaveLength(1);
    expect(pendingActions[0].classes()).toContain('danger');
  });

  it('shows empty state when no backups exist', async () => {
    mockBackupsStore.allBackups = [];

    const wrapper = mountPage();
    await flushPromises();

    expect(wrapper.find('.empty-state').exists()).toBe(true);
    expect(wrapper.text()).toContain('No backups yet');
  });

  it('renders Create System Backup button', async () => {
    const wrapper = mountPage();
    await flushPromises();

    const createBtn = wrapper.find('.btn-primary');
    expect(createBtn.exists()).toBe(true);
    expect(createBtn.text()).toContain('Create System Backup');
  });

  it('opens create modal when Create System Backup is clicked', async () => {
    const wrapper = mountPage();
    await flushPromises();

    const createBtn = wrapper.find('.btn-primary');
    await createBtn.trigger('click');

    expect(wrapper.find('.base-modal-stub').exists()).toBe(true);
    expect(wrapper.find('.modal-title').text()).toBe('Create System Backup');
  });

  it('shows password field when encrypt checkbox is ticked', async () => {
    const wrapper = mountPage();
    await flushPromises();

    const createBtn = wrapper.find('.btn-primary');
    await createBtn.trigger('click');

    // Password field should not be visible initially
    expect(wrapper.find('#backup-password').exists()).toBe(false);

    // Tick the encrypt checkbox
    const checkbox = wrapper.find('.checkbox');
    await checkbox.setValue(true);

    expect(wrapper.find('#backup-password').exists()).toBe(true);
  });

  it('shows password error when password is too short', async () => {
    const wrapper = mountPage();
    await flushPromises();

    // Open modal
    await wrapper.find('.btn-primary').trigger('click');

    // Enable encryption
    await wrapper.find('.checkbox').setValue(true);

    // Set short password
    await wrapper.find('#backup-password').setValue('short');

    // Click create
    const createBackupBtn = wrapper.findAll('.btn').find((b) => b.text() === 'Create Backup');
    await createBackupBtn!.trigger('click');

    expect(wrapper.find('.field-error').exists()).toBe(true);
    expect(wrapper.find('.field-error').text()).toBe('Password must be at least 8 characters');
  });

  it('calls createSystemBackup without encryption when checkbox is unchecked', async () => {
    mockBackupsStore.createSystemBackup.mockResolvedValue(undefined);

    const wrapper = mountPage();
    await flushPromises();

    // Open modal
    await wrapper.find('.btn-primary').trigger('click');

    // Click create without encryption
    const createBackupBtn = wrapper.findAll('.btn').find((b) => b.text() === 'Create Backup');
    await createBackupBtn!.trigger('click');
    await flushPromises();

    expect(mockBackupsStore.createSystemBackup).toHaveBeenCalledWith({
      encrypt: false,
      password: undefined,
    });
    expect(mockToast.success).toHaveBeenCalledWith('System backup created');
  });

  it('shows toast on backup creation error', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockBackupsStore.createSystemBackup.mockRejectedValue(new Error('Backup failed'));

    const wrapper = mountPage();
    await flushPromises();

    // Open modal and create
    await wrapper.find('.btn-primary').trigger('click');
    const createBackupBtn = wrapper.findAll('.btn').find((b) => b.text() === 'Create Backup');
    await createBackupBtn!.trigger('click');
    await flushPromises();

    expect(mockToast.error).toHaveBeenCalledWith('Failed to create system backup');
    consoleSpy.mockRestore();
  });

  it('calls fetchSettings and fetchAllBackups on mount', async () => {
    mountPage();
    await flushPromises();

    expect(mockBackupsStore.fetchSettings).toHaveBeenCalledTimes(1);
    expect(mockBackupsStore.fetchAllBackups).toHaveBeenCalledTimes(1);
  });

  it('disables create button when creating is true', async () => {
    mockBackupsStore.creating = true;

    const wrapper = mountPage();
    await flushPromises();

    const createBtn = wrapper.find('.btn-primary');
    expect(createBtn.attributes('disabled')).toBeDefined();
    expect(createBtn.text()).toContain('Creating...');
  });
});
