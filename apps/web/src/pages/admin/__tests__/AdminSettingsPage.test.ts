import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { setActivePinia, createPinia } from 'pinia';

// Hoist mock variables before module imports
const mockRouter = vi.hoisted(() => ({
  push: vi.fn(),
}));

const mockFilesStore = vi.hoisted(() => ({
  storageInfo: null as Record<string, unknown> | null,
  fetchStorageInfo: vi.fn(),
  testConnection: vi.fn(),
}));

const mockBackupsStore = vi.hoisted(() => ({
  settings: null as Record<string, unknown> | null,
  fetchSettings: vi.fn(),
}));

vi.mock('vue-router', () => ({
  useRouter: () => mockRouter,
}));

vi.mock('@/stores/files', () => ({
  useFilesStore: () => mockFilesStore,
}));

vi.mock('@/stores/backups', () => ({
  useBackupsStore: () => mockBackupsStore,
}));

import AdminSettingsPage from '../AdminSettingsPage.vue';

const sampleStorageInfo = {
  type: 'LOCAL',
  totalFiles: 128,
  totalSize: 5368709120, // ~5 GB
};

const sampleBackupSettings = {
  enabled: true,
  storageType: 'LOCAL' as const,
  schedule: '0 3 * * *',
  retentionDays: 30,
  maxSizeMb: 500,
  pgDumpAvailable: true,
};

function mountPage() {
  return mount(AdminSettingsPage, {
    global: {
      stubs: { Teleport: true },
    },
  });
}

describe('AdminSettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setActivePinia(createPinia());

    mockFilesStore.storageInfo = null;
    mockFilesStore.fetchStorageInfo.mockResolvedValue(undefined);
    mockFilesStore.testConnection.mockReset();

    mockBackupsStore.settings = null;
    mockBackupsStore.fetchSettings.mockResolvedValue(undefined);
  });

  it('renders the page header with title and description', () => {
    const wrapper = mountPage();
    expect(wrapper.find('.page-title').text()).toBe('System Settings');
    expect(wrapper.find('.page-description').text()).toBe(
      'Storage configuration and system preferences'
    );
  });

  it('shows loading skeleton whilst storage info is being fetched', () => {
    mockFilesStore.fetchStorageInfo.mockReturnValue(new Promise(() => {}));
    const wrapper = mountPage();

    // Should show skeleton stat items
    expect(wrapper.findAll('.stat-item.skeleton').length).toBeGreaterThan(0);
  });

  it('displays file storage stats after successful load', async () => {
    mockFilesStore.storageInfo = sampleStorageInfo;
    mockFilesStore.fetchStorageInfo.mockResolvedValue(undefined);

    const wrapper = mountPage();
    await flushPromises();

    const statValues = wrapper.findAll('.stat-value');
    // First section: File Storage
    expect(statValues[0].text()).toBe('Local Disk');
    expect(statValues[1].text()).toBe('128');
    expect(statValues[2].text()).toBe('5.0 GB');
  });

  it('displays storage type label correctly for MINIO', async () => {
    mockFilesStore.storageInfo = { type: 'MINIO', totalFiles: 10, totalSize: 1024 };
    mockFilesStore.fetchStorageInfo.mockResolvedValue(undefined);

    const wrapper = mountPage();
    await flushPromises();

    const statValues = wrapper.findAll('.stat-value');
    expect(statValues[0].text()).toBe('MinIO');
  });

  it('displays storage type label correctly for S3', async () => {
    mockFilesStore.storageInfo = { type: 'S3', totalFiles: 50, totalSize: 2048 };
    mockFilesStore.fetchStorageInfo.mockResolvedValue(undefined);

    const wrapper = mountPage();
    await flushPromises();

    const statValues = wrapper.findAll('.stat-value');
    expect(statValues[0].text()).toBe('Amazon S3');
  });

  it('formats small file sizes correctly', async () => {
    mockFilesStore.storageInfo = { type: 'LOCAL', totalFiles: 1, totalSize: 0 };
    mockFilesStore.fetchStorageInfo.mockResolvedValue(undefined);

    const wrapper = mountPage();
    await flushPromises();

    const statValues = wrapper.findAll('.stat-value');
    expect(statValues[2].text()).toBe('0 B');
  });

  it('renders test connection button', async () => {
    mockFilesStore.storageInfo = sampleStorageInfo;
    const wrapper = mountPage();
    await flushPromises();

    const testBtn = wrapper.find('.test-button');
    expect(testBtn.exists()).toBe(true);
    expect(testBtn.text()).toContain('Test Connection');
  });

  it('shows success result after successful connection test', async () => {
    mockFilesStore.storageInfo = sampleStorageInfo;
    mockFilesStore.testConnection.mockResolvedValue({
      success: true,
      message: 'Connection successful',
    });

    const wrapper = mountPage();
    await flushPromises();

    await wrapper.find('.test-button').trigger('click');
    await flushPromises();

    const result = wrapper.find('.connection-result');
    expect(result.exists()).toBe(true);
    expect(result.classes()).toContain('success');
    expect(result.text()).toContain('Connection successful');
  });

  it('shows failure result after failed connection test', async () => {
    mockFilesStore.storageInfo = sampleStorageInfo;
    mockFilesStore.testConnection.mockRejectedValue(new Error('Connection refused'));

    const wrapper = mountPage();
    await flushPromises();

    await wrapper.find('.test-button').trigger('click');
    await flushPromises();

    const result = wrapper.find('.connection-result');
    expect(result.exists()).toBe(true);
    expect(result.classes()).toContain('failure');
    expect(result.text()).toContain('Connection refused');
  });

  it('displays backup settings when available', async () => {
    mockBackupsStore.settings = sampleBackupSettings;

    const wrapper = mountPage();
    await flushPromises();

    expect(wrapper.text()).toContain('Enabled');
    expect(wrapper.text()).toContain('Local Disk');
    expect(wrapper.text()).toContain('0 3 * * *');
  });

  it('shows correct backup storage label for S3', async () => {
    mockBackupsStore.settings = { ...sampleBackupSettings, storageType: 'S3' as const };

    const wrapper = mountPage();
    await flushPromises();

    expect(wrapper.text()).toContain('S3 Compatible');
  });

  it('shows Disabled status when backups are disabled', async () => {
    mockBackupsStore.settings = { ...sampleBackupSettings, enabled: false };

    const wrapper = mountPage();
    await flushPromises();

    expect(wrapper.text()).toContain('Disabled');
  });

  it('navigates to admin-backups when Manage Backups button is clicked', async () => {
    mockBackupsStore.settings = sampleBackupSettings;

    const wrapper = mountPage();
    await flushPromises();

    const manageBtn = wrapper.find('.manage-button');
    expect(manageBtn.exists()).toBe(true);
    await manageBtn.trigger('click');

    expect(mockRouter.push).toHaveBeenCalledWith({ name: 'admin-backups' });
  });

  it('calls fetchStorageInfo and fetchSettings on mount', async () => {
    mountPage();
    await flushPromises();

    expect(mockFilesStore.fetchStorageInfo).toHaveBeenCalledTimes(1);
    expect(mockBackupsStore.fetchSettings).toHaveBeenCalledTimes(1);
  });
});
