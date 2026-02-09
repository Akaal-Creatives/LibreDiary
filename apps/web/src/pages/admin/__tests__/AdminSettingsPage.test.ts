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

const mockAdminService = vi.hoisted(() => ({
  getSystemSettings: vi.fn(),
  updateSystemSettings: vi.fn(),
  testAiConnection: vi.fn(),
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

vi.mock('@/services/admin.service', () => mockAdminService);

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

const sampleSystemSettings = {
  siteName: 'LibreDiary',
  allowSignups: false,
  requireEmailVerification: true,
  sessionMaxAge: 604800000,
  maxOrganisationsPerUser: 0,
  defaultUserLocale: 'en',
  aiEnabled: false,
  openrouterApiKey: '****2345',
  openrouterModel: 'openai/gpt-4o-mini',
  updatedAt: '2025-06-01T00:00:00.000Z',
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

    mockAdminService.getSystemSettings.mockResolvedValue(sampleSystemSettings);
    mockAdminService.updateSystemSettings.mockResolvedValue(sampleSystemSettings);
    mockAdminService.testAiConnection.mockReset();
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

  // ===========================================
  // General Settings Section
  // ===========================================

  describe('General Settings', () => {
    it('displays "General" section heading', async () => {
      const wrapper = mountPage();
      await flushPromises();

      expect(wrapper.text()).toContain('General');
    });

    it('fetches system settings on mount', async () => {
      mountPage();
      await flushPromises();

      expect(mockAdminService.getSystemSettings).toHaveBeenCalledTimes(1);
    });

    it('shows site name input with current value', async () => {
      const wrapper = mountPage();
      await flushPromises();

      const input = wrapper.find('.general-settings input[data-field="siteName"]');
      expect(input.exists()).toBe(true);
      expect((input.element as HTMLInputElement).value).toBe('LibreDiary');
    });

    it('shows allow signups toggle', async () => {
      const wrapper = mountPage();
      await flushPromises();

      const toggle = wrapper.find('.general-settings input[data-field="allowSignups"]');
      expect(toggle.exists()).toBe(true);
    });

    it('shows require email verification toggle', async () => {
      const wrapper = mountPage();
      await flushPromises();

      const toggle = wrapper.find('.general-settings input[data-field="requireEmailVerification"]');
      expect(toggle.exists()).toBe(true);
    });

    it('shows session duration input', async () => {
      const wrapper = mountPage();
      await flushPromises();

      const input = wrapper.find('.general-settings input[data-field="sessionMaxAge"]');
      expect(input.exists()).toBe(true);
    });

    it('shows max organisations per user input', async () => {
      const wrapper = mountPage();
      await flushPromises();

      const input = wrapper.find('.general-settings input[data-field="maxOrganisationsPerUser"]');
      expect(input.exists()).toBe(true);
    });

    it('shows default locale input', async () => {
      const wrapper = mountPage();
      await flushPromises();

      const input = wrapper.find('.general-settings input[data-field="defaultUserLocale"]');
      expect(input.exists()).toBe(true);
    });

    it('shows save button', async () => {
      const wrapper = mountPage();
      await flushPromises();

      const saveBtn = wrapper.find('.general-settings .save-button');
      expect(saveBtn.exists()).toBe(true);
    });

    it('calls updateSystemSettings on save click', async () => {
      const wrapper = mountPage();
      await flushPromises();

      await wrapper.find('.general-settings .save-button').trigger('click');
      await flushPromises();

      expect(mockAdminService.updateSystemSettings).toHaveBeenCalled();
    });

    it('shows success message after save', async () => {
      mockAdminService.updateSystemSettings.mockResolvedValue(sampleSystemSettings);

      const wrapper = mountPage();
      await flushPromises();

      await wrapper.find('.general-settings .save-button').trigger('click');
      await flushPromises();

      expect(wrapper.text()).toContain('Settings saved');
    });

    it('shows error on save failure', async () => {
      mockAdminService.updateSystemSettings.mockRejectedValue(new Error('Save failed'));

      const wrapper = mountPage();
      await flushPromises();

      await wrapper.find('.general-settings .save-button').trigger('click');
      await flushPromises();

      expect(wrapper.text()).toContain('Save failed');
    });

    it('disables save button while saving', async () => {
      mockAdminService.updateSystemSettings.mockReturnValue(new Promise(() => {}));

      const wrapper = mountPage();
      await flushPromises();

      await wrapper.find('.general-settings .save-button').trigger('click');

      const saveBtn = wrapper.find('.general-settings .save-button');
      expect((saveBtn.element as HTMLButtonElement).disabled).toBe(true);
    });

    it('shows loading skeleton while fetching settings', () => {
      mockAdminService.getSystemSettings.mockReturnValue(new Promise(() => {}));

      const wrapper = mountPage();

      expect(wrapper.find('.general-settings .settings-skeleton').exists()).toBe(true);
    });

    it('shows error state if fetch fails', async () => {
      mockAdminService.getSystemSettings.mockRejectedValue(new Error('Network error'));

      const wrapper = mountPage();
      await flushPromises();

      expect(wrapper.find('.general-settings .settings-error').exists()).toBe(true);
    });
  });

  // ===========================================
  // AI Settings Section
  // ===========================================

  describe('AI Settings', () => {
    it('displays "AI Settings" section heading', async () => {
      const wrapper = mountPage();
      await flushPromises();

      expect(wrapper.text()).toContain('AI Settings');
    });

    it('shows AI enabled toggle', async () => {
      const wrapper = mountPage();
      await flushPromises();

      const toggle = wrapper.find('.ai-settings input[data-field="aiEnabled"]');
      expect(toggle.exists()).toBe(true);
    });

    it('shows API key input as password type', async () => {
      const wrapper = mountPage();
      await flushPromises();

      const input = wrapper.find('.ai-settings input[data-field="openrouterApiKey"]');
      expect(input.exists()).toBe(true);
      expect((input.element as HTMLInputElement).type).toBe('password');
    });

    it('toggles API key visibility on button click', async () => {
      const wrapper = mountPage();
      await flushPromises();

      const toggleBtn = wrapper.find('.ai-settings .input-toggle-btn');
      expect(toggleBtn.exists()).toBe(true);

      const input = wrapper.find('.ai-settings input[data-field="openrouterApiKey"]');
      expect((input.element as HTMLInputElement).type).toBe('password');

      await toggleBtn.trigger('click');
      expect((input.element as HTMLInputElement).type).toBe('text');

      await toggleBtn.trigger('click');
      expect((input.element as HTMLInputElement).type).toBe('password');
    });

    it('shows model input with current value', async () => {
      const wrapper = mountPage();
      await flushPromises();

      const input = wrapper.find('.ai-settings input[data-field="openrouterModel"]');
      expect(input.exists()).toBe(true);
      expect((input.element as HTMLInputElement).value).toBe('openai/gpt-4o-mini');
    });

    it('shows save and test connection buttons', async () => {
      const wrapper = mountPage();
      await flushPromises();

      const saveBtn = wrapper.find('.ai-settings .save-button');
      expect(saveBtn.exists()).toBe(true);

      const testBtn = wrapper.find('.ai-settings .test-button');
      expect(testBtn.exists()).toBe(true);
    });

    it('calls updateSystemSettings on AI save', async () => {
      const wrapper = mountPage();
      await flushPromises();

      await wrapper.find('.ai-settings .save-button').trigger('click');
      await flushPromises();

      expect(mockAdminService.updateSystemSettings).toHaveBeenCalled();
    });

    it('calls testAiConnection on test click', async () => {
      mockAdminService.testAiConnection.mockResolvedValue({
        success: true,
        message: 'Connection successful',
        model: 'openai/gpt-4o-mini',
      });

      const wrapper = mountPage();
      await flushPromises();

      await wrapper.find('.ai-settings .test-button').trigger('click');
      await flushPromises();

      expect(mockAdminService.testAiConnection).toHaveBeenCalled();
    });

    it('shows success result after test', async () => {
      mockAdminService.testAiConnection.mockResolvedValue({
        success: true,
        message: 'Connection successful',
        model: 'openai/gpt-4o-mini',
      });

      const wrapper = mountPage();
      await flushPromises();

      await wrapper.find('.ai-settings .test-button').trigger('click');
      await flushPromises();

      const result = wrapper.find('.ai-settings .connection-result');
      expect(result.exists()).toBe(true);
      expect(result.classes()).toContain('success');
      expect(result.text()).toContain('Connection successful');
    });

    it('shows failure result after failed test', async () => {
      mockAdminService.testAiConnection.mockResolvedValue({
        success: false,
        message: 'No API key configured',
      });

      const wrapper = mountPage();
      await flushPromises();

      await wrapper.find('.ai-settings .test-button').trigger('click');
      await flushPromises();

      const result = wrapper.find('.ai-settings .connection-result');
      expect(result.exists()).toBe(true);
      expect(result.classes()).toContain('failure');
      expect(result.text()).toContain('No API key configured');
    });
  });
});
