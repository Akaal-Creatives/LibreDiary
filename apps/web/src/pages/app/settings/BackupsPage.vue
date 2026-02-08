<script setup lang="ts">
import { ref, onMounted } from 'vue';
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
    await backupsStore.fetchOrgBackups();
  } catch (error) {
    console.error('Failed to load backups:', error);
  } finally {
    loading.value = false;
  }
});

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
    await backupsStore.createOrgBackup({
      encrypt: encryptBackup.value,
      password: encryptBackup.value ? backupPassword.value : undefined,
    });
    toast.success('Backup created');
  } catch (error) {
    console.error('Failed to create backup:', error);
    toast.error('Failed to create backup');
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
    message: 'Are you sure you want to delete this backup? This action cannot be undone.',
    confirmText: 'Delete Backup',
    variant: 'destructive',
    onConfirm: async () => {
      try {
        await backupsStore.deleteOrgBackup(backup.id);
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
  <div class="backups-page">
    <div class="page-header">
      <div class="header-content">
        <h1 class="page-title">Backups</h1>
        <p class="page-description">Create and manage organisation data backups</p>
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
        {{ backupsStore.creating ? 'Creating...' : 'Create Backup' }}
      </button>
    </div>

    <!-- Backups Table -->
    <div class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th>File Name</th>
            <th>Size</th>
            <th>Status</th>
            <th>Encrypted</th>
            <th>Created</th>
            <th class="actions-col">Actions</th>
          </tr>
        </thead>
        <tbody>
          <!-- Loading -->
          <template v-if="loading">
            <tr v-for="i in 3" :key="i" class="skeleton-row">
              <td><div class="skeleton-name"></div></td>
              <td><div class="skeleton-short"></div></td>
              <td><div class="skeleton-badge"></div></td>
              <td><div class="skeleton-short"></div></td>
              <td><div class="skeleton-short"></div></td>
              <td><div class="skeleton-actions"></div></td>
            </tr>
          </template>

          <!-- Empty State -->
          <tr v-else-if="backupsStore.orgBackups.length === 0">
            <td colspan="6" class="empty-cell">
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
                <span>No backups yet. Create your first backup to get started.</span>
              </div>
            </td>
          </tr>

          <!-- Backup Rows -->
          <tr v-for="backup in backupsStore.orgBackups" v-else :key="backup.id">
            <td>
              <span class="file-name">{{ backup.fileName ?? '-' }}</span>
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
              <span v-if="backup.isEncrypted" class="encrypted-yes">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <rect
                    x="2.5"
                    y="6.5"
                    width="9"
                    height="5.5"
                    rx="1"
                    stroke="currentColor"
                    stroke-width="1.2"
                  />
                  <path
                    d="M4.5 6.5V4.5C4.5 3.11929 5.61929 2 7 2C8.38071 2 9.5 3.11929 9.5 4.5V6.5"
                    stroke="currentColor"
                    stroke-width="1.2"
                    stroke-linecap="round"
                  />
                </svg>
                Yes
              </span>
              <span v-else class="encrypted-no">No</span>
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
        <h2 class="modal-title">Create Backup</h2>
        <p class="modal-description">
          Export all pages, databases, and files for this organisation.
        </p>

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
.backups-page {
  max-width: 900px;
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
  font-size: var(--text-2xl);
  font-weight: 700;
  color: var(--color-text-primary);
  margin-bottom: var(--space-1);
}

.page-description {
  font-size: var(--text-sm);
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
  background: var(--color-accent);
  border: none;
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: all 0.15s ease;
  white-space: nowrap;
}

.btn-primary:hover:not(:disabled) {
  background: var(--color-accent-hover);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
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

.file-name {
  font-size: var(--text-sm);
  color: var(--color-text-primary);
  font-family: var(--font-mono, monospace);
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

.encrypted-yes {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
}

.encrypted-no {
  font-size: var(--text-sm);
  color: var(--color-text-tertiary);
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

/* Create Modal */
.create-modal {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.modal-title {
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--color-text-primary);
}

.modal-description {
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  margin-top: calc(-1 * var(--space-2));
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--color-text-primary);
  cursor: pointer;
}

.checkbox {
  width: 16px;
  height: 16px;
  accent-color: var(--color-accent);
}

.field-hint {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

.field-label {
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--color-text-primary);
}

.field-input {
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

.field-input:focus {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px var(--color-accent-subtle, rgba(59, 130, 246, 0.15));
}

.field-error {
  font-size: var(--text-xs);
  color: var(--color-error);
}

.modal-actions {
  display: flex;
  gap: var(--space-3);
  justify-content: flex-end;
  padding-top: var(--space-2);
}

.btn {
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

.modal-actions .btn-secondary {
  color: var(--color-text-secondary);
  background: var(--color-surface-sunken);
  border: 1px solid var(--color-border);
}

.modal-actions .btn-secondary:hover {
  color: var(--color-text-primary);
  background: var(--color-hover);
  border-color: var(--color-border-strong);
}

.modal-actions .btn-primary {
  min-width: 100px;
  padding: var(--space-2) var(--space-5);
  color: var(--color-text-inverse);
  background: var(--color-accent);
}

.modal-actions .btn-primary:hover {
  background: var(--color-accent-hover);
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
  text-align: center;
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
  width: 50px;
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
</style>
