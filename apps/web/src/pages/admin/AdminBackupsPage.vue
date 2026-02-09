<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useBackupsStore } from '@/stores/backups';
import { useToast } from '@/composables';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import BaseModal from '@/components/ui/BaseModal.vue';
import type { Backup } from '@librediary/shared';

const backupsStore = useBackupsStore();
const toast = useToast();

const loading = ref(true);

// Create backup modal
const showCreateModal = ref(false);
const encryptBackup = ref(false);
const backupPassword = ref('');
const passwordError = ref('');

// Confirm dialog
const showConfirmDialog = ref(false);
const confirmDialogConfig = ref({
  title: '',
  message: '',
  confirmText: 'Confirm',
  variant: 'destructive' as 'default' | 'destructive',
  onConfirm: () => {},
});

onMounted(async () => {
  loading.value = true;
  try {
    await Promise.all([backupsStore.fetchSettings(), backupsStore.fetchAllBackups()]);
  } catch (error) {
    console.error('Failed to load backup data:', error);
  } finally {
    loading.value = false;
  }
});

// Computed
const storageTypeLabel = computed(() => {
  switch (backupsStore.settings?.storageType) {
    case 'LOCAL':
      return 'Local Disk';
    case 'S3':
      return 'S3 Compatible';
    default:
      return backupsStore.settings?.storageType ?? 'Unknown';
  }
});

// Actions
function openCreateModal() {
  encryptBackup.value = false;
  backupPassword.value = '';
  passwordError.value = '';
  showCreateModal.value = true;
}

async function handleCreateBackup() {
  if (encryptBackup.value && backupPassword.value.length < 8) {
    passwordError.value = 'Password must be at least 8 characters';
    return;
  }

  showCreateModal.value = false;

  try {
    await backupsStore.createSystemBackup({
      encrypt: encryptBackup.value,
      password: encryptBackup.value ? backupPassword.value : undefined,
    });
    toast.success('System backup created');
  } catch (error) {
    console.error('Failed to create backup:', error);
    toast.error('Failed to create system backup');
  }
}

async function handleDownload(backup: Backup) {
  try {
    const blob = await backupsStore.downloadOrgBackup(backup.id);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = backup.fileName ?? `backup-${backup.id}.tar.gz`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Failed to download backup:', error);
    toast.error('Failed to download backup');
  }
}

function confirmDelete(backup: Backup) {
  confirmDialogConfig.value = {
    title: 'Delete Backup',
    message: `Are you sure you want to delete this ${backup.type === 'SYSTEM' ? 'system' : 'organisation'} backup? This action cannot be undone.`,
    confirmText: 'Delete Backup',
    variant: 'destructive',
    onConfirm: async () => {
      try {
        await backupsStore.deleteOrgBackup(backup.id);
        await backupsStore.fetchAllBackups();
        toast.success('Backup deleted');
      } catch (error) {
        console.error('Failed to delete backup:', error);
        toast.error('Failed to delete backup');
      }
    },
  };
  showConfirmDialog.value = true;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatSize(bytes: number | null): string {
  if (!bytes || bytes === 0) return '-';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function statusClass(status: string): string {
  switch (status) {
    case 'PENDING':
      return 'badge-warning';
    case 'IN_PROGRESS':
      return 'badge-info';
    case 'COMPLETED':
      return 'badge-success';
    case 'FAILED':
      return 'badge-error';
    default:
      return '';
  }
}
</script>

<template>
  <div class="admin-backups">
    <div class="page-header">
      <div class="header-content">
        <h1 class="page-title">Backups</h1>
        <p class="page-description">Manage system and organisation backups</p>
      </div>
      <button class="btn-primary" :disabled="backupsStore.creating" @click="openCreateModal">
        <svg
          v-if="backupsStore.creating"
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
            d="M8 3V13M3 8H13"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
          />
        </svg>
        {{ backupsStore.creating ? 'Creating...' : 'Create System Backup' }}
      </button>
    </div>

    <!-- Settings Section -->
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
          <h2 class="section-title">Backup Settings</h2>
          <p class="section-description">Configuration is managed via environment variables</p>
        </div>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="stats-row">
        <div v-for="i in 5" :key="i" class="stat-item skeleton">
          <div class="skeleton-value"></div>
          <div class="skeleton-label"></div>
        </div>
      </div>

      <!-- Settings Stats -->
      <div v-else-if="backupsStore.settings" class="stats-row">
        <div class="stat-item">
          <span class="stat-value">
            <span
              class="status-dot"
              :class="backupsStore.settings.enabled ? 'dot-success' : 'dot-error'"
            ></span>
            {{ backupsStore.settings.enabled ? 'Enabled' : 'Disabled' }}
          </span>
          <span class="stat-label">Scheduled Backups</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">{{ storageTypeLabel }}</span>
          <span class="stat-label">Storage Type</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">{{ backupsStore.settings.schedule }}</span>
          <span class="stat-label">Schedule (Cron)</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">{{ backupsStore.settings.retentionDays }}d</span>
          <span class="stat-label">Retention</span>
        </div>
        <div class="stat-item">
          <span class="stat-value">
            <span
              class="status-dot"
              :class="backupsStore.settings.pgDumpAvailable ? 'dot-success' : 'dot-error'"
            ></span>
            {{ backupsStore.settings.pgDumpAvailable ? 'Available' : 'Not Found' }}
          </span>
          <span class="stat-label">pg_dump</span>
        </div>
      </div>
    </section>

    <!-- Backups Table -->
    <div class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th>Type</th>
            <th>Organisation</th>
            <th>File Name</th>
            <th>Size</th>
            <th>Status</th>
            <th>Created</th>
            <th class="actions-col">Actions</th>
          </tr>
        </thead>
        <tbody>
          <!-- Loading -->
          <template v-if="loading">
            <tr v-for="i in 5" :key="i" class="skeleton-row">
              <td><div class="skeleton-badge"></div></td>
              <td><div class="skeleton-short"></div></td>
              <td><div class="skeleton-name"></div></td>
              <td><div class="skeleton-short"></div></td>
              <td><div class="skeleton-badge"></div></td>
              <td><div class="skeleton-short"></div></td>
              <td><div class="skeleton-actions"></div></td>
            </tr>
          </template>

          <!-- Empty State -->
          <tr v-else-if="backupsStore.allBackups.length === 0">
            <td colspan="7" class="empty-cell">
              <div class="empty-state">
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                  <path
                    d="M8 14V10C8 7.79086 9.79086 6 12 6H36C38.2091 6 40 7.79086 40 10V14M8 14V38C8 40.2091 9.79086 42 12 42H36C38.2091 42 40 40.2091 40 38V14M8 14H40"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                  <path
                    d="M20 28L22.5 30.5L28 25"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
                <span>No backups yet</span>
              </div>
            </td>
          </tr>

          <!-- Backup Rows -->
          <tr v-for="backup in backupsStore.allBackups" v-else :key="backup.id">
            <td>
              <span
                class="type-badge"
                :class="backup.type === 'SYSTEM' ? 'type-system' : 'type-org'"
              >
                {{ backup.type === 'SYSTEM' ? 'System' : 'Org' }}
              </span>
            </td>
            <td>
              <span class="org-name">
                {{ (backup as any).organization?.name ?? '-' }}
              </span>
            </td>
            <td>
              <span class="file-name">{{ backup.fileName ?? '-' }}</span>
              <span v-if="backup.isEncrypted" class="encrypted-badge" title="Encrypted">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <rect
                    x="2"
                    y="5.5"
                    width="8"
                    height="5"
                    rx="1"
                    stroke="currentColor"
                    stroke-width="1.2"
                  />
                  <path
                    d="M4 5.5V4C4 2.89543 4.89543 2 6 2C7.10457 2 8 2.89543 8 4V5.5"
                    stroke="currentColor"
                    stroke-width="1.2"
                    stroke-linecap="round"
                  />
                </svg>
              </span>
            </td>
            <td>
              <span class="size-text">{{ formatSize(backup.fileSize) }}</span>
            </td>
            <td>
              <span class="badge" :class="statusClass(backup.status)">
                {{ backup.status.replace('_', ' ') }}
              </span>
            </td>
            <td>
              <span class="date-text">{{ formatDate(backup.createdAt) }}</span>
            </td>
            <td>
              <div class="actions">
                <button
                  v-if="backup.status === 'COMPLETED'"
                  class="action-btn"
                  title="Download backup"
                  @click="handleDownload(backup)"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path
                      d="M8 3V10M8 10L5 7M8 10L11 7"
                      stroke="currentColor"
                      stroke-width="1.5"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                    <path
                      d="M3 12H13"
                      stroke="currentColor"
                      stroke-width="1.5"
                      stroke-linecap="round"
                    />
                  </svg>
                </button>
                <button
                  class="action-btn danger"
                  title="Delete backup"
                  @click="confirmDelete(backup)"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path
                      d="M3 5H13"
                      stroke="currentColor"
                      stroke-width="1.5"
                      stroke-linecap="round"
                    />
                    <path
                      d="M6 5V3.5C6 3.22386 6.22386 3 6.5 3H9.5C9.77614 3 10 3.22386 10 3.5V5"
                      stroke="currentColor"
                      stroke-width="1.5"
                    />
                    <path
                      d="M4 5L5 13C5 13.5523 5.44772 14 6 14H10C10.5523 14 11 13.5523 11 13L12 5"
                      stroke="currentColor"
                      stroke-width="1.5"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </svg>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Create Backup Modal -->
    <BaseModal :open="showCreateModal" @close="showCreateModal = false">
      <div class="create-modal">
        <h2 class="modal-title">Create System Backup</h2>
        <p class="modal-description">Create a full database backup using pg_dump.</p>

        <div class="form-field">
          <label class="checkbox-label">
            <input v-model="encryptBackup" type="checkbox" class="checkbox" />
            <span>Encrypt backup</span>
          </label>
          <p class="field-hint">
            Encrypt the backup with AES-256-GCM. You will need the password to restore.
          </p>
        </div>

        <div v-if="encryptBackup" class="form-field">
          <label class="field-label" for="backup-password">Password</label>
          <input
            id="backup-password"
            v-model="backupPassword"
            type="password"
            class="field-input"
            placeholder="Minimum 8 characters"
            autocomplete="new-password"
          />
          <p v-if="passwordError" class="field-error">{{ passwordError }}</p>
        </div>

        <div class="modal-actions">
          <button class="btn btn-secondary" @click="showCreateModal = false">Cancel</button>
          <button class="btn btn-primary" @click="handleCreateBackup">Create Backup</button>
        </div>
      </div>
    </BaseModal>

    <!-- Confirm Dialog -->
    <ConfirmDialog
      :open="showConfirmDialog"
      :title="confirmDialogConfig.title"
      :message="confirmDialogConfig.message"
      :confirm-text="confirmDialogConfig.confirmText"
      :variant="confirmDialogConfig.variant"
      @confirm="confirmDialogConfig.onConfirm"
      @close="showConfirmDialog = false"
    />
  </div>
</template>

<style scoped>
.admin-backups {
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-4);
  margin-bottom: var(--space-6);
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

/* Primary Button */
.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  font-family: inherit;
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--color-text-inverse);
  background: var(--admin-accent);
  border: none;
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}

.btn-primary:hover:not(:disabled) {
  opacity: 0.9;
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Settings Section */
.settings-section {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  padding: var(--space-6);
  margin-bottom: var(--space-6);
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
  grid-template-columns: repeat(5, 1fr);
  gap: var(--space-4);
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
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-base);
  font-weight: 600;
  color: var(--color-text-primary);
}

.stat-label {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
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

/* Table */
.table-container {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  overflow: hidden;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table th,
.data-table td {
  padding: var(--space-3) var(--space-4);
  text-align: left;
  border-bottom: 1px solid var(--color-border-subtle);
}

.data-table th {
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--color-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  background: var(--color-surface-sunken);
}

.data-table tr:last-child td {
  border-bottom: none;
}

.actions-col {
  width: 100px;
  text-align: right !important;
}

/* Type Badge */
.type-badge {
  display: inline-flex;
  padding: 2px 8px;
  font-size: var(--text-xs);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.02em;
  border-radius: var(--radius-sm);
}

.type-system {
  color: var(--admin-accent);
  background: var(--admin-accent-subtle);
}

.type-org {
  color: var(--color-accent);
  background: var(--color-accent-subtle, rgba(59, 130, 246, 0.1));
}

.org-name {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

.file-name {
  font-size: var(--text-sm);
  color: var(--color-text-primary);
  font-family: var(--font-mono, monospace);
}

.encrypted-badge {
  display: inline-flex;
  margin-left: var(--space-1);
  color: var(--color-text-tertiary);
  vertical-align: middle;
}

.size-text {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  font-family: var(--font-mono, monospace);
}

/* Status Badge */
.badge {
  display: inline-flex;
  padding: 2px 8px;
  font-size: var(--text-xs);
  font-weight: 500;
  border-radius: var(--radius-full);
}

.badge-warning {
  color: var(--color-warning);
  background: var(--color-warning-subtle);
}

.badge-info {
  color: var(--color-info, #3b82f6);
  background: var(--color-info-subtle, rgba(59, 130, 246, 0.1));
}

.badge-success {
  color: var(--color-success);
  background: var(--color-success-subtle);
}

.badge-error {
  color: var(--color-error);
  background: var(--color-error-subtle);
}

.date-text {
  font-size: var(--text-sm);
  color: var(--color-text-tertiary);
}

/* Actions */
.actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
}

.action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  color: var(--color-text-secondary);
  cursor: pointer;
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
}

.action-btn:hover {
  color: var(--color-text-primary);
  background: var(--color-hover);
  border-color: var(--color-border-strong);
}

.action-btn.danger:hover {
  color: var(--color-error);
  background: var(--color-error-subtle);
  border-color: var(--color-error);
}

/* Empty State */
.empty-cell {
  padding: var(--space-12) !important;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
  color: var(--color-text-tertiary);
}

/* Skeleton Loading */
.skeleton-row td {
  padding: var(--space-4);
}

.skeleton-badge {
  width: 60px;
  height: 22px;
  background: var(--color-surface-sunken);
  border-radius: var(--radius-full);
  animation: pulse-subtle 1.5s ease-in-out infinite;
}

.skeleton-short {
  width: 60px;
  height: 16px;
  background: var(--color-surface-sunken);
  border-radius: var(--radius-sm);
  animation: pulse-subtle 1.5s ease-in-out infinite;
}

.skeleton-name {
  width: 140px;
  height: 16px;
  background: var(--color-surface-sunken);
  border-radius: var(--radius-sm);
  animation: pulse-subtle 1.5s ease-in-out infinite;
}

.skeleton-actions {
  width: 70px;
  height: 32px;
  margin-left: auto;
  background: var(--color-surface-sunken);
  border-radius: var(--radius-md);
  animation: pulse-subtle 1.5s ease-in-out infinite;
}

/* Spinner */
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

@keyframes pulse-subtle {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

/* Responsive */
@media (max-width: 768px) {
  .stats-row {
    grid-template-columns: repeat(2, 1fr);
  }

  .page-header {
    flex-direction: column;
  }
}
</style>

<!-- Non-scoped styles for teleported modal content -->
<style>
.create-modal {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.create-modal .modal-title {
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--color-text-primary);
}

.create-modal .modal-description {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  margin-top: calc(-1 * var(--space-2));
}

.create-modal .form-field {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.create-modal .checkbox-label {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--color-text-primary);
  cursor: pointer;
}

.create-modal .checkbox {
  width: 16px;
  height: 16px;
  accent-color: var(--admin-accent);
}

.create-modal .field-hint {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

.create-modal .field-label {
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--color-text-primary);
}

.create-modal .field-input {
  width: 100%;
  padding: var(--space-2) var(--space-3);
  font-family: inherit;
  font-size: var(--text-sm);
  color: var(--color-text-primary);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  outline: none;
  transition: all var(--transition-fast);
}

.create-modal .field-input:focus {
  border-color: var(--admin-accent);
  box-shadow: 0 0 0 3px var(--admin-accent-subtle);
}

.create-modal .field-error {
  font-size: var(--text-xs);
  color: var(--color-error);
}

.create-modal .modal-actions {
  display: flex;
  gap: var(--space-3);
  justify-content: flex-end;
  padding-top: var(--space-2);
}

.create-modal .btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  min-width: 100px;
  padding: var(--space-2) var(--space-5);
  font-family: inherit;
  font-size: var(--text-sm);
  font-weight: 500;
  line-height: 1.5;
  cursor: pointer;
  border: none;
  border-radius: var(--radius-lg);
  transition: all 0.15s ease;
}

.create-modal .btn-secondary {
  color: var(--color-text-secondary);
  background: var(--color-surface-sunken);
  border: 1px solid var(--color-border);
}

.create-modal .btn-secondary:hover {
  color: var(--color-text-primary);
  background: var(--color-hover);
  border-color: var(--color-border-strong);
}

.create-modal .btn-primary {
  color: var(--color-text-inverse);
  background: var(--admin-accent);
}

.create-modal .btn-primary:hover {
  opacity: 0.9;
}
</style>
