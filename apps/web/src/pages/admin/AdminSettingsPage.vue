<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useFilesStore } from '@/stores/files';
import { useBackupsStore } from '@/stores/backups';
import {
  getSystemSettings,
  updateSystemSettings,
  type SystemSettings,
} from '@/services/admin.service';

const router = useRouter();
const filesStore = useFilesStore();
const backupsStore = useBackupsStore();

const loading = ref(true);
const testingConnection = ref(false);
const connectionResult = ref<{ success: boolean; message: string } | null>(null);

// General settings state
const settingsLoading = ref(true);
const settingsError = ref<string | null>(null);
const saving = ref(false);
const saveMessage = ref<{ type: 'success' | 'error'; text: string } | null>(null);

const formSiteName = ref('');
const formAllowSignups = ref(false);
const formRequireEmailVerification = ref(true);
const formSessionHours = ref(168);
const formMaxOrgsPerUser = ref(0);
const formDefaultLocale = ref('en');

function populateForm(settings: SystemSettings) {
  formSiteName.value = settings.siteName;
  formAllowSignups.value = settings.allowSignups;
  formRequireEmailVerification.value = settings.requireEmailVerification;
  formSessionHours.value = Math.round(settings.sessionMaxAge / 3600000);
  formMaxOrgsPerUser.value = settings.maxOrganisationsPerUser;
  formDefaultLocale.value = settings.defaultUserLocale;
}

async function loadSettings() {
  settingsLoading.value = true;
  settingsError.value = null;
  try {
    const settings = await getSystemSettings();
    populateForm(settings);
  } catch (error) {
    settingsError.value = error instanceof Error ? error.message : 'Failed to load settings';
  } finally {
    settingsLoading.value = false;
  }
}

async function handleSave() {
  saving.value = true;
  saveMessage.value = null;
  try {
    const settings = await updateSystemSettings({
      siteName: formSiteName.value,
      allowSignups: formAllowSignups.value,
      requireEmailVerification: formRequireEmailVerification.value,
      sessionMaxAge: formSessionHours.value * 3600000,
      maxOrganisationsPerUser: formMaxOrgsPerUser.value,
      defaultUserLocale: formDefaultLocale.value,
    });
    populateForm(settings);
    saveMessage.value = { type: 'success', text: 'Settings saved' };
  } catch (error) {
    saveMessage.value = {
      type: 'error',
      text: error instanceof Error ? error.message : 'Failed to save settings',
    };
  } finally {
    saving.value = false;
  }
}

onMounted(async () => {
  await Promise.all([loadStorageInfo(), backupsStore.fetchSettings(), loadSettings()]);
});

const backupStorageLabel = computed(() => {
  switch (backupsStore.settings?.storageType) {
    case 'LOCAL':
      return 'Local Disk';
    case 'S3':
      return 'S3 Compatible';
    default:
      return backupsStore.settings?.storageType ?? 'Unknown';
  }
});

async function loadStorageInfo() {
  loading.value = true;
  try {
    await filesStore.fetchStorageInfo();
  } catch (error) {
    console.error('Failed to load storage info:', error);
  } finally {
    loading.value = false;
  }
}

async function handleTestConnection() {
  testingConnection.value = true;
  connectionResult.value = null;
  try {
    connectionResult.value = await filesStore.testConnection();
  } catch (error) {
    connectionResult.value = {
      success: false,
      message: error instanceof Error ? error.message : 'Connection test failed',
    };
  } finally {
    testingConnection.value = false;
  }
}

const formattedSize = computed(() => {
  const size = filesStore.storageInfo?.totalSize ?? 0;
  if (size === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(size) / Math.log(1024));
  return `${(size / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
});

const storageTypeLabel = computed(() => {
  const type = filesStore.storageInfo?.type;
  switch (type) {
    case 'LOCAL':
      return 'Local Disk';
    case 'MINIO':
      return 'MinIO';
    case 'S3':
      return 'Amazon S3';
    default:
      return type ?? 'Unknown';
  }
});
</script>

<template>
  <div class="admin-settings">
    <div class="page-header">
      <h1 class="page-title">System Settings</h1>
      <p class="page-description">Storage configuration and system preferences</p>
    </div>

    <!-- General Section -->
    <section class="settings-section general-settings">
      <div class="section-header">
        <div class="section-icon">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path
              d="M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"
              stroke="currentColor"
              stroke-width="1.5"
            />
            <path
              d="M16.17 12.5a1.39 1.39 0 0 0 .28 1.53l.05.05a1.69 1.69 0 1 1-2.38 2.38l-.05-.05a1.39 1.39 0 0 0-1.53-.28 1.39 1.39 0 0 0-.84 1.27v.14a1.69 1.69 0 0 1-3.37 0v-.07A1.39 1.39 0 0 0 7.42 16a1.39 1.39 0 0 0-1.53.28l-.05.05a1.69 1.69 0 1 1-2.38-2.38l.05-.05a1.39 1.39 0 0 0 .28-1.53 1.39 1.39 0 0 0-1.27-.84h-.14a1.69 1.69 0 0 1 0-3.37h.07A1.39 1.39 0 0 0 3.36 7.25a1.39 1.39 0 0 0-.28-1.53l-.05-.05a1.69 1.69 0 1 1 2.38-2.38l.05.05a1.39 1.39 0 0 0 1.53.28h.07a1.39 1.39 0 0 0 .84-1.27v-.14a1.69 1.69 0 0 1 3.37 0v.07a1.39 1.39 0 0 0 .84 1.27 1.39 1.39 0 0 0 1.53-.28l.05-.05a1.69 1.69 0 1 1 2.38 2.38l-.05.05a1.39 1.39 0 0 0-.28 1.53v.07a1.39 1.39 0 0 0 1.27.84h.14a1.69 1.69 0 0 1 0 3.37h-.07a1.39 1.39 0 0 0-1.27.84Z"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </div>
        <div>
          <h2 class="section-title">General</h2>
          <p class="section-description">Platform-wide settings</p>
        </div>
      </div>

      <!-- Loading Skeleton -->
      <div v-if="settingsLoading" class="settings-skeleton">
        <div v-for="i in 4" :key="i" class="form-field-skeleton">
          <div class="skeleton-field-label"></div>
          <div class="skeleton-field-input"></div>
        </div>
      </div>

      <!-- Error State -->
      <div v-else-if="settingsError" class="settings-error">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path
            d="M8 5v3M8 11h.01M14 8A6 6 0 1 1 2 8a6 6 0 0 1 12 0Z"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
        <span>{{ settingsError }}</span>
      </div>

      <!-- Settings Form -->
      <div v-else class="settings-form">
        <div class="form-field">
          <label class="form-label" for="siteName">Site Name</label>
          <input
            id="siteName"
            v-model="formSiteName"
            type="text"
            class="form-input"
            data-field="siteName"
          />
        </div>

        <div class="form-field form-field--toggle">
          <div class="toggle-content">
            <label class="form-label" for="allowSignups">Allow Signups</label>
            <span class="form-hint">Allow new users to register on the platform</span>
          </div>
          <input
            id="allowSignups"
            v-model="formAllowSignups"
            type="checkbox"
            class="form-toggle"
            data-field="allowSignups"
          />
        </div>

        <div class="form-field form-field--toggle">
          <div class="toggle-content">
            <label class="form-label" for="requireEmailVerification"
              >Require Email Verification</label
            >
            <span class="form-hint"
              >Users must verify their email before accessing the platform</span
            >
          </div>
          <input
            id="requireEmailVerification"
            v-model="formRequireEmailVerification"
            type="checkbox"
            class="form-toggle"
            data-field="requireEmailVerification"
          />
        </div>

        <div class="form-field">
          <label class="form-label" for="sessionMaxAge">Session Duration (hours)</label>
          <input
            id="sessionMaxAge"
            v-model.number="formSessionHours"
            type="number"
            class="form-input"
            data-field="sessionMaxAge"
            min="1"
            max="720"
          />
        </div>

        <div class="form-field">
          <label class="form-label" for="maxOrganisationsPerUser">Max Organisations Per User</label>
          <input
            id="maxOrganisationsPerUser"
            v-model.number="formMaxOrgsPerUser"
            type="number"
            class="form-input"
            data-field="maxOrganisationsPerUser"
            min="0"
          />
          <span class="form-hint">0 = unlimited</span>
        </div>

        <div class="form-field">
          <label class="form-label" for="defaultUserLocale">Default Locale</label>
          <input
            id="defaultUserLocale"
            v-model="formDefaultLocale"
            type="text"
            class="form-input"
            data-field="defaultUserLocale"
          />
        </div>

        <div class="form-actions">
          <button class="save-button" :disabled="saving" @click="handleSave">
            <svg
              v-if="saving"
              class="spinner"
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
            >
              <circle
                cx="8"
                cy="8"
                r="6"
                stroke="currentColor"
                stroke-width="2"
                stroke-dasharray="28"
                stroke-dashoffset="8"
                stroke-linecap="round"
              />
            </svg>
            {{ saving ? 'Saving...' : 'Save Settings' }}
          </button>

          <div
            v-if="saveMessage"
            class="save-message"
            :class="saveMessage.type === 'success' ? 'save-success' : 'save-error'"
          >
            <svg
              v-if="saveMessage.type === 'success'"
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
            >
              <path
                d="M3 8L6.5 11.5L13 4.5"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
            <svg v-else width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M4 4L12 12M12 4L4 12"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
              />
            </svg>
            <span>{{ saveMessage.text }}</span>
          </div>
        </div>
      </div>
    </section>

    <!-- Storage Section -->
    <section class="settings-section">
      <div class="section-header">
        <div class="section-icon">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <rect
              x="2"
              y="3"
              width="16"
              height="5"
              rx="1"
              stroke="currentColor"
              stroke-width="1.5"
            />
            <rect
              x="2"
              y="12"
              width="16"
              height="5"
              rx="1"
              stroke="currentColor"
              stroke-width="1.5"
            />
            <circle cx="5" cy="5.5" r="1" fill="currentColor" />
            <circle cx="5" cy="14.5" r="1" fill="currentColor" />
          </svg>
        </div>
        <div>
          <h2 class="section-title">File Storage</h2>
          <p class="section-description">
            Storage provider is configured via environment variables
          </p>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="stats-row">
        <div v-for="i in 3" :key="i" class="stat-item skeleton">
          <div class="skeleton-value"></div>
          <div class="skeleton-label"></div>
        </div>
      </div>

      <!-- Storage Stats -->
      <div v-else-if="filesStore.storageInfo" class="stats-row">
        <div class="stat-item">
          <span class="stat-value">{{ storageTypeLabel }}</span>
          <span class="stat-label">Storage Type</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">{{ filesStore.storageInfo.totalFiles }}</span>
          <span class="stat-label">Total Files</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">{{ formattedSize }}</span>
          <span class="stat-label">Total Size</span>
        </div>
      </div>

      <!-- Connection Test -->
      <div class="connection-test">
        <button class="test-button" :disabled="testingConnection" @click="handleTestConnection">
          <svg
            v-if="testingConnection"
            class="spinner"
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
          >
            <circle
              cx="8"
              cy="8"
              r="6"
              stroke="currentColor"
              stroke-width="2"
              stroke-dasharray="28"
              stroke-dashoffset="8"
              stroke-linecap="round"
            />
          </svg>
          <svg v-else width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M14 8A6 6 0 1 1 2 8a6 6 0 0 1 12 0Z"
              stroke="currentColor"
              stroke-width="1.5"
            />
            <path
              d="M8 5v3l2 1"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          {{ testingConnection ? 'Testing...' : 'Test Connection' }}
        </button>

        <div
          v-if="connectionResult"
          class="connection-result"
          :class="{ success: connectionResult.success, failure: !connectionResult.success }"
        >
          <svg
            v-if="connectionResult.success"
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
          >
            <path
              d="M3 8L6.5 11.5L13 4.5"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          <svg v-else width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M4 4L12 12M12 4L4 12"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
            />
          </svg>
          <span>{{ connectionResult.message }}</span>
        </div>
      </div>
    </section>

    <!-- Backups Section -->
    <section class="settings-section">
      <div class="section-header">
        <div class="section-icon">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path
              d="M4 7V5C4 3.89543 4.89543 3 6 3H14C15.1046 3 16 3.89543 16 5V7M4 7V15C4 16.1046 4.89543 17 6 17H14C15.1046 17 16 16.1046 16 15V7M4 7H16"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <path
              d="M8 12L9.5 13.5L12.5 10.5"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </div>
        <div>
          <h2 class="section-title">Backups</h2>
          <p class="section-description">System and organisation backup configuration</p>
        </div>
      </div>

      <!-- Backup Stats -->
      <div v-if="backupsStore.settings" class="stats-row">
        <div class="stat-item">
          <span class="stat-value backup-status">
            <span
              class="status-dot"
              :class="backupsStore.settings.enabled ? 'dot-success' : 'dot-error'"
            ></span>
            {{ backupsStore.settings.enabled ? 'Enabled' : 'Disabled' }}
          </span>
          <span class="stat-label">Scheduled Backups</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">{{ backupStorageLabel }}</span>
          <span class="stat-label">Storage Type</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">{{ backupsStore.settings.schedule }}</span>
          <span class="stat-label">Schedule</span>
        </div>
      </div>

      <div class="section-footer">
        <button class="manage-button" @click="router.push({ name: 'admin-backups' })">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="M3 8H13M10 5L13 8L10 11"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
          Manage Backups
        </button>
      </div>
    </section>
  </div>
</template>

<style scoped>
.admin-settings {
  max-width: 800px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: var(--space-8);
}

.page-title {
  font-size: var(--text-3xl);
  font-weight: 700;
  color: var(--color-text-primary);
  margin-bottom: var(--space-2);
}

.page-description {
  font-size: var(--text-base);
  color: var(--color-text-secondary);
}

/* Section */
.settings-section {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  padding: var(--space-6);
  margin-bottom: var(--space-6);
}

.settings-section:last-child {
  margin-bottom: 0;
}

.section-header {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  margin-bottom: var(--space-6);
}

.section-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: var(--radius-lg);
  background: var(--admin-accent-subtle);
  color: var(--admin-accent);
  flex-shrink: 0;
}

.section-title {
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--color-text-primary);
  margin-bottom: var(--space-1);
}

.section-description {
  font-size: var(--text-sm);
  color: var(--color-text-tertiary);
}

/* Stats */
.stats-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-4);
  margin-bottom: var(--space-6);
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  padding: var(--space-4);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
}

.stat-value {
  font-size: var(--text-xl);
  font-weight: 600;
  color: var(--color-text-primary);
}

.stat-label {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

/* Connection Test */
.connection-test {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  flex-wrap: wrap;
}

.test-button {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--color-text-primary);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition:
    background 0.15s,
    border-color 0.15s;
}

.test-button:hover:not(:disabled) {
  background: var(--color-surface-hover);
  border-color: var(--color-border-hover);
}

.test-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.connection-result {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  font-size: var(--text-sm);
  border-radius: var(--radius-md);
}

.connection-result.success {
  color: var(--color-success);
  background: var(--color-success-bg, rgba(34, 197, 94, 0.1));
}

.connection-result.failure {
  color: var(--color-error);
  background: var(--color-error-bg, rgba(239, 68, 68, 0.1));
}

/* Skeleton */
.stat-item.skeleton {
  animation: pulse 1.5s ease-in-out infinite;
}

.skeleton-value {
  height: 24px;
  width: 60%;
  background: var(--color-border);
  border-radius: var(--radius-sm);
}

.skeleton-label {
  height: 12px;
  width: 80%;
  background: var(--color-border);
  border-radius: var(--radius-sm);
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

/* Backup Status */
.backup-status {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: var(--radius-full);
  flex-shrink: 0;
}

.dot-success {
  background: var(--color-success);
}

.dot-error {
  background: var(--color-error);
}

/* Section Footer */
.section-footer {
  margin-top: var(--space-4);
}

.manage-button {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  font-family: inherit;
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--admin-accent);
  background: transparent;
  border: 1px solid var(--admin-accent);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition:
    background 0.15s,
    color 0.15s;
}

.manage-button:hover {
  color: var(--color-text-inverse);
  background: var(--admin-accent);
}

/* General Settings Form */
.settings-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.form-field--toggle {
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-3) var(--space-4);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
}

.toggle-content {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.form-label {
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--color-text-primary);
}

.form-hint {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

.form-input {
  padding: var(--space-2) var(--space-3);
  font-family: inherit;
  font-size: var(--text-sm);
  color: var(--color-text-primary);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  outline: none;
  transition: border-color 0.15s;
}

.form-input:focus {
  border-color: var(--admin-accent);
}

.form-toggle {
  width: 36px;
  height: 20px;
  accent-color: var(--admin-accent);
  cursor: pointer;
  flex-shrink: 0;
}

.form-actions {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  padding-top: var(--space-2);
}

.save-button {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-5);
  font-family: inherit;
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--color-text-inverse);
  background: var(--admin-accent);
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: opacity 0.15s;
}

.save-button:hover:not(:disabled) {
  opacity: 0.9;
}

.save-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.save-message {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-sm);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-md);
}

.save-success {
  color: var(--color-success);
  background: var(--color-success-bg, rgba(34, 197, 94, 0.1));
}

.save-error {
  color: var(--color-error);
  background: var(--color-error-bg, rgba(239, 68, 68, 0.1));
}

/* Settings Skeleton */
.settings-skeleton {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
  animation: pulse 1.5s ease-in-out infinite;
}

.form-field-skeleton {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.skeleton-field-label {
  height: 14px;
  width: 30%;
  background: var(--color-border);
  border-radius: var(--radius-sm);
}

.skeleton-field-input {
  height: 36px;
  width: 100%;
  background: var(--color-border);
  border-radius: var(--radius-md);
}

/* Settings Error */
.settings-error {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-4);
  font-size: var(--text-sm);
  color: var(--color-error);
  background: var(--color-error-bg, rgba(239, 68, 68, 0.1));
  border-radius: var(--radius-md);
}
</style>
