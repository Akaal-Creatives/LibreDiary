<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { gdprService } from '@/services/gdpr.service';
import type { DataExport, DeletionStatus } from '@/services/gdpr.service';
import { ApiError } from '@/services/api';
import { useToast } from '@/composables/useToast';

const { t } = useI18n();
const toast = useToast();

// Export state
const exports = ref<DataExport[]>([]);
const exportsLoading = ref(true);
const exportRequesting = ref(false);
const downloadingId = ref<string | null>(null);

// Deletion state
const deletionStatus = ref<DeletionStatus>({ pending: false });
const deletionLoading = ref(true);
const cancellingDeletion = ref(false);

// Delete confirmation modal
const showDeleteConfirm = ref(false);
const deleteConfirmText = ref('');
const deletionSubmitting = ref(false);

// Error/success notifications
const error = ref<string | null>(null);
const success = ref<string | null>(null);

const canConfirmDelete = computed(() => deleteConfirmText.value === 'DELETE MY ACCOUNT');

onMounted(() => {
  loadExports();
  loadDeletionStatus();
});

// --- Data Export ---

async function loadExports() {
  exportsLoading.value = true;
  try {
    const response = await gdprService.listExports();
    exports.value = response.exports;
  } catch (e) {
    console.error('Failed to load exports:', e);
  } finally {
    exportsLoading.value = false;
  }
}

async function requestExport() {
  exportRequesting.value = true;
  error.value = null;
  try {
    const response = await gdprService.requestExport();
    exports.value.unshift(response.export);
    toast.success(t('gdpr.exportRequested'));
  } catch (e) {
    if (e instanceof ApiError) {
      if (e.code === 'EXPORT_LIMIT_EXCEEDED') {
        error.value = t('gdpr.exportLimitError');
      } else {
        error.value = e.message;
      }
    } else {
      error.value = 'Failed to request export';
    }
  } finally {
    exportRequesting.value = false;
  }
}

async function downloadExport(exp: DataExport) {
  downloadingId.value = exp.id;
  try {
    const blob = await gdprService.downloadExport(exp.id);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = exp.fileName ?? `data-export-${exp.id}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (e) {
    console.error('Failed to download export:', e);
    toast.error('Failed to download export');
  } finally {
    downloadingId.value = null;
  }
}

function getStatusBadgeClass(status: DataExport['status']): string {
  const classes: Record<DataExport['status'], string> = {
    PENDING: 'badge--pending',
    PROCESSING: 'badge--processing',
    COMPLETED: 'badge--completed',
    FAILED: 'badge--failed',
    EXPIRED: 'badge--expired',
  };
  return classes[status] ?? '';
}

function getStatusLabel(status: DataExport['status']): string {
  const labels: Record<DataExport['status'], string> = {
    PENDING: t('gdpr.exportRequested'),
    PROCESSING: t('gdpr.exportProcessing'),
    COMPLETED: t('gdpr.exportReady'),
    FAILED: t('gdpr.exportFailed'),
    EXPIRED: t('gdpr.exportExpired'),
  };
  return labels[status] ?? status;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatFileSize(bytes: number | null): string {
  if (bytes === null || bytes === 0) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(unitIndex > 0 ? 1 : 0)} ${units[unitIndex]}`;
}

// --- Account Deletion ---

async function loadDeletionStatus() {
  deletionLoading.value = true;
  try {
    deletionStatus.value = await gdprService.getDeletionStatus();
  } catch (e) {
    console.error('Failed to load deletion status:', e);
  } finally {
    deletionLoading.value = false;
  }
}

function openDeleteConfirm() {
  showDeleteConfirm.value = true;
  deleteConfirmText.value = '';
}

function closeDeleteConfirm() {
  showDeleteConfirm.value = false;
  deleteConfirmText.value = '';
}

async function handleDeleteAccount() {
  if (!canConfirmDelete.value) return;

  deletionSubmitting.value = true;
  error.value = null;

  try {
    const response = await gdprService.requestDeletion(deleteConfirmText.value);
    deletionStatus.value = {
      pending: true,
      scheduledDeletionDate: response.scheduledDeletionDate,
      daysRemaining: 30,
    };
    closeDeleteConfirm();
    success.value = response.message;
    setTimeout(() => {
      success.value = null;
    }, 5000);
  } catch (e) {
    if (e instanceof ApiError) {
      if (e.code === 'SOLE_OWNER') {
        error.value = t('gdpr.soleOwnerError');
      } else {
        error.value = e.message;
      }
    } else {
      error.value = 'Failed to request account deletion';
    }
  } finally {
    deletionSubmitting.value = false;
  }
}

async function handleCancelDeletion() {
  cancellingDeletion.value = true;
  error.value = null;

  try {
    await gdprService.cancelDeletion();
    deletionStatus.value = { pending: false };
    toast.success(t('gdpr.cancelDeletionSuccess'));
  } catch (e) {
    if (e instanceof ApiError) {
      error.value = e.message;
    } else {
      error.value = 'Failed to cancel deletion';
    }
  } finally {
    cancellingDeletion.value = false;
  }
}
</script>

<template>
  <div class="settings-page">
    <!-- Page Header -->
    <header class="page-header">
      <div class="header-content">
        <h1 class="page-title">{{ $t('gdpr.title') }}</h1>
        <p class="page-description">{{ $t('gdpr.description') }}</p>
      </div>
    </header>

    <!-- Notifications -->
    <Transition name="slide-fade">
      <div v-if="error" class="notification notification--error">
        <svg class="notification-icon" width="18" height="18" viewBox="0 0 18 18" fill="none">
          <circle cx="9" cy="9" r="8" stroke="currentColor" stroke-width="1.5" />
          <path
            d="M9 5V10M9 12.5V13"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
          />
        </svg>
        <span>{{ error }}</span>
        <button class="notification-close" @click="error = null">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
              d="M3 3L11 11M11 3L3 11"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
            />
          </svg>
        </button>
      </div>
    </Transition>

    <Transition name="slide-fade">
      <div v-if="success" class="notification notification--success">
        <svg class="notification-icon" width="18" height="18" viewBox="0 0 18 18" fill="none">
          <circle cx="9" cy="9" r="8" stroke="currentColor" stroke-width="1.5" />
          <path
            d="M5.5 9L8 11.5L12.5 6.5"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
        <span>{{ success }}</span>
      </div>
    </Transition>

    <!-- Export Your Data Section -->
    <section class="settings-section">
      <div class="section-header">
        <div class="section-icon section-icon--export">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path
              d="M10 3V13M10 13L6 9M10 13L14 9"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
            <path
              d="M3 15V16C3 16.5523 3.44772 17 4 17H16C16.5523 17 17 16.5523 17 16V15"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </div>
        <div class="section-header-text">
          <h2 class="section-title">{{ $t('gdpr.exportData') }}</h2>
          <p class="section-description">{{ $t('gdpr.exportDataDescription') }}</p>
        </div>
      </div>

      <div class="section-content">
        <!-- Request Export Button -->
        <div class="export-actions">
          <button class="btn btn--primary" :disabled="exportRequesting" @click="requestExport">
            <svg
              v-if="exportRequesting"
              class="btn-spinner"
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
                stroke-dashoffset="7"
              />
            </svg>
            <span>{{ $t('gdpr.requestExport') }}</span>
          </button>
        </div>

        <!-- Loading State -->
        <div v-if="exportsLoading" class="loading-state">
          <div class="loading-spinner"></div>
        </div>

        <!-- Empty State -->
        <div v-else-if="exports.length === 0" class="empty-state">
          <svg class="empty-icon" width="40" height="40" viewBox="0 0 40 40" fill="none">
            <rect
              x="8"
              y="6"
              width="24"
              height="28"
              rx="2"
              stroke="currentColor"
              stroke-width="1.5"
            />
            <path
              d="M14 16H26M14 22H22M14 28H18"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
            />
          </svg>
          <p class="empty-text">{{ $t('gdpr.noExports') }}</p>
        </div>

        <!-- Exports List -->
        <div v-else class="exports-list">
          <h3 class="exports-list-title">{{ $t('gdpr.recentExports') }}</h3>
          <div v-for="exp in exports" :key="exp.id" class="export-item">
            <div class="export-info">
              <div class="export-header">
                <span class="status-badge" :class="getStatusBadgeClass(exp.status)">
                  {{ getStatusLabel(exp.status) }}
                </span>
                <span v-if="exp.fileSize" class="export-size">
                  {{ formatFileSize(exp.fileSize) }}
                </span>
              </div>
              <div class="export-date">
                {{ formatDate(exp.requestedAt) }}
              </div>
            </div>
            <button
              v-if="exp.status === 'COMPLETED'"
              class="btn btn--download"
              :disabled="downloadingId === exp.id"
              @click="downloadExport(exp)"
            >
              <svg
                v-if="downloadingId === exp.id"
                class="btn-spinner"
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
                  stroke-dashoffset="7"
                />
              </svg>
              <svg v-else width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M8 2V10M8 10L5 7M8 10L11 7"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                <path
                  d="M2 12V13C2 13.5523 2.44772 14 3 14H13C13.5523 14 14 13.5523 14 13V12"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
              <span>{{ $t('gdpr.download') }}</span>
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- Danger Zone - Delete Account -->
    <section class="danger-zone">
      <div class="danger-header">
        <svg class="danger-icon" width="20" height="20" viewBox="0 0 20 20" fill="none">
          <path
            d="M10 2L18 17H2L10 2Z"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linejoin="round"
          />
          <path
            d="M10 8V11M10 14V14.5"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
          />
        </svg>
        <h2 class="danger-title">{{ $t('settings.dangerZone') }}</h2>
      </div>

      <!-- Deletion Pending State -->
      <div v-if="deletionStatus.pending" class="danger-card danger-card--pending">
        <div class="danger-content">
          <h3 class="danger-action-title">{{ $t('gdpr.deletionPending') }}</h3>
          <p class="danger-action-description">
            {{
              $t('gdpr.deletionScheduled', {
                date: deletionStatus.scheduledDeletionDate
                  ? formatDate(deletionStatus.scheduledDeletionDate)
                  : '',
              })
            }}
          </p>
          <p v-if="deletionStatus.daysRemaining" class="deletion-countdown">
            {{ $t('gdpr.daysRemaining', { count: deletionStatus.daysRemaining }) }}
          </p>
        </div>
        <button
          type="button"
          class="btn btn--cancel-deletion"
          :disabled="cancellingDeletion"
          @click="handleCancelDeletion"
        >
          <svg
            v-if="cancellingDeletion"
            class="btn-spinner"
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
              stroke-dashoffset="7"
            />
          </svg>
          <span>{{ $t('gdpr.cancelDeletion') }}</span>
        </button>
      </div>

      <!-- Normal Delete Card -->
      <div v-else class="danger-card">
        <div class="danger-content">
          <h3 class="danger-action-title">{{ $t('gdpr.deleteAccountTitle') }}</h3>
          <p class="danger-action-description">
            {{ $t('gdpr.deleteAccountDescription') }}
          </p>
        </div>
        <button type="button" class="btn btn--danger" @click="openDeleteConfirm">
          {{ $t('gdpr.deleteAccount') }}
        </button>
      </div>
    </section>

    <!-- Delete Confirmation Modal -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="showDeleteConfirm" class="modal-backdrop" @click.self="closeDeleteConfirm">
          <div class="modal modal--danger">
            <div class="modal-header">
              <div class="modal-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M12 3L21 20H3L12 3Z"
                    stroke="currentColor"
                    stroke-width="1.5"
                    stroke-linejoin="round"
                  />
                  <path
                    d="M12 10V13M12 16V16.5"
                    stroke="currentColor"
                    stroke-width="1.5"
                    stroke-linecap="round"
                  />
                </svg>
              </div>
              <h2 class="modal-title">{{ $t('gdpr.deleteAccount') }}</h2>
            </div>

            <div class="modal-body">
              <p class="modal-text">
                {{ $t('gdpr.deleteAccountWarning') }}
              </p>

              <div class="field">
                <label class="field-label">
                  {{ $t('gdpr.deleteAccountConfirmation') }}
                  <code class="confirm-code">DELETE MY ACCOUNT</code>
                </label>
                <input
                  v-model="deleteConfirmText"
                  type="text"
                  class="field-input"
                  placeholder="DELETE MY ACCOUNT"
                  autocomplete="off"
                />
              </div>
            </div>

            <div class="modal-footer">
              <button
                type="button"
                class="btn btn--ghost"
                :disabled="deletionSubmitting"
                @click="closeDeleteConfirm"
              >
                {{ $t('common.cancel') }}
              </button>
              <button
                type="button"
                class="btn btn--danger"
                :disabled="!canConfirmDelete || deletionSubmitting"
                @click="handleDeleteAccount"
              >
                {{ deletionSubmitting ? $t('common.loading') : $t('gdpr.deleteAccountButton') }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.settings-page {
  max-width: 680px;
  margin: 0 auto;
  padding: var(--space-8) var(--space-4);
}

/* Page Header */
.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-4);
  margin-bottom: var(--space-8);
  padding-bottom: var(--space-6);
  border-bottom: 1px solid var(--color-border);
}

.header-content {
  flex: 1;
}

.page-title {
  margin: 0 0 var(--space-1);
  font-size: var(--text-2xl);
  font-weight: 700;
  color: var(--color-text-primary);
  letter-spacing: -0.02em;
}

.page-description {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--color-text-tertiary);
}

/* Notifications */
.notification {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  margin-bottom: var(--space-4);
  font-size: var(--text-sm);
  border-radius: var(--radius-lg);
  animation: slideIn 0.2s ease-out;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
}

.notification--error {
  color: var(--color-error);
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--color-error) 8%, transparent),
    color-mix(in srgb, var(--color-error) 4%, transparent)
  );
  border: 1px solid color-mix(in srgb, var(--color-error) 20%, transparent);
}

.notification--success {
  color: var(--color-success);
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--color-success) 8%, transparent),
    color-mix(in srgb, var(--color-success) 4%, transparent)
  );
  border: 1px solid color-mix(in srgb, var(--color-success) 20%, transparent);
}

.notification-icon {
  flex-shrink: 0;
}

.notification-close {
  margin-left: auto;
  padding: var(--space-1);
  color: inherit;
  cursor: pointer;
  background: none;
  border: none;
  border-radius: var(--radius-sm);
  opacity: 0.6;
  transition: opacity var(--transition-fast);
}

.notification-close:hover {
  opacity: 1;
}

/* Slide-fade transition */
.slide-fade-enter-active,
.slide-fade-leave-active {
  transition: all 0.2s ease;
}

.slide-fade-enter-from,
.slide-fade-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

/* Settings Sections */
.settings-section {
  margin-bottom: var(--space-6);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  overflow: hidden;
  transition: border-color var(--transition-fast);
}

.settings-section:hover {
  border-color: var(--color-border-strong);
}

.section-header {
  display: flex;
  align-items: flex-start;
  gap: var(--space-4);
  padding: var(--space-5) var(--space-5) var(--space-4);
  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--color-accent) 3%, var(--color-surface)) 0%,
    var(--color-surface) 100%
  );
  border-bottom: 1px solid var(--color-border-subtle);
}

.section-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  color: var(--color-accent);
  background: var(--color-accent-subtle);
  border-radius: var(--radius-md);
}

.section-icon--export {
  color: #3b82f6;
  background: rgba(59, 130, 246, 0.1);
}

.section-header-text {
  flex: 1;
  padding-top: 2px;
}

.section-title {
  margin: 0 0 2px;
  font-size: var(--text-base);
  font-weight: 600;
  color: var(--color-text-primary);
}

.section-description {
  margin: 0;
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
  line-height: 1.5;
}

.section-content {
  padding: var(--space-5);
}

/* Export Actions */
.export-actions {
  margin-bottom: var(--space-5);
}

/* Loading State */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-8) 0;
  color: var(--color-text-tertiary);
}

.loading-spinner {
  width: 24px;
  height: 24px;
  border: 2px solid var(--color-border);
  border-top-color: var(--color-accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Empty State */
.empty-state {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  align-items: center;
  padding: var(--space-8) 0;
  color: var(--color-text-tertiary);
}

.empty-icon {
  opacity: 0.4;
}

.empty-text {
  margin: 0;
  font-size: var(--text-sm);
}

/* Exports List */
.exports-list-title {
  margin: 0 0 var(--space-3);
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-text-primary);
}

.export-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  padding: var(--space-3) var(--space-4);
  background: var(--color-surface-sunken);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  transition: all var(--transition-fast);
}

.export-item:not(:last-child) {
  margin-bottom: var(--space-2);
}

.export-item:hover {
  border-color: var(--color-border-strong);
}

.export-info {
  flex: 1;
  min-width: 0;
}

.export-header {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-bottom: var(--space-1);
}

.export-date {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

.export-size {
  font-size: var(--text-xs);
  color: var(--color-text-secondary);
}

/* Status Badges */
.status-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  font-size: var(--text-xs);
  font-weight: 500;
  border-radius: var(--radius-full);
}

.badge--pending {
  color: #92400e;
  background: #fef3c7;
  border: 1px solid #fcd34d;
}

.badge--processing {
  color: #1e40af;
  background: #eff6ff;
  border: 1px solid #bfdbfe;
}

.badge--completed {
  color: #166534;
  background: #f0fdf4;
  border: 1px solid #86efac;
}

.badge--failed {
  color: #991b1b;
  background: #fef2f2;
  border: 1px solid #fca5a5;
}

.badge--expired {
  color: var(--color-text-tertiary);
  background: var(--color-surface-sunken);
  border: 1px solid var(--color-border);
}

/* Dark mode badge overrides */
[data-theme='dark'] .badge--pending {
  color: #fbbf24;
  background: rgba(251, 191, 36, 0.12);
  border: 1px solid rgba(251, 191, 36, 0.25);
}

[data-theme='dark'] .badge--processing {
  color: #60a5fa;
  background: rgba(96, 165, 250, 0.12);
  border: 1px solid rgba(96, 165, 250, 0.25);
}

[data-theme='dark'] .badge--completed {
  color: #4ade80;
  background: rgba(74, 222, 128, 0.12);
  border: 1px solid rgba(74, 222, 128, 0.25);
}

[data-theme='dark'] .badge--failed {
  color: #f87171;
  background: rgba(248, 113, 113, 0.12);
  border: 1px solid rgba(248, 113, 113, 0.25);
}

[data-theme='dark'] .badge--expired {
  color: var(--color-text-tertiary);
  background: var(--color-surface-elevated);
  border: 1px solid var(--color-border);
}

/* Buttons */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-5);
  font-family: inherit;
  font-size: var(--text-sm);
  font-weight: 500;
  line-height: 1;
  cursor: pointer;
  border: none;
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
}

.btn:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.btn--primary {
  color: white;
  background: var(--color-accent);
  box-shadow:
    0 1px 2px rgba(0, 0, 0, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
}

.btn--primary:hover:not(:disabled) {
  background: var(--color-accent-hover);
  transform: translateY(-1px);
  box-shadow:
    0 2px 4px rgba(0, 0, 0, 0.15),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
}

.btn--primary:active:not(:disabled) {
  transform: translateY(0);
}

.btn--download {
  padding: var(--space-2) var(--space-3);
  color: var(--color-accent);
  background: var(--color-accent-subtle);
  border: 1px solid transparent;
}

.btn--download:hover:not(:disabled) {
  background: color-mix(in srgb, var(--color-accent) 15%, transparent);
}

.btn--ghost {
  color: var(--color-text-secondary);
  background: transparent;
}

.btn--ghost:hover:not(:disabled) {
  color: var(--color-text-primary);
  background: var(--color-hover);
}

.btn--danger {
  color: white;
  background: var(--color-error);
  box-shadow:
    0 1px 2px rgba(0, 0, 0, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
}

.btn--danger:hover:not(:disabled) {
  filter: brightness(1.1);
  transform: translateY(-1px);
  box-shadow:
    0 2px 4px rgba(0, 0, 0, 0.15),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
}

.btn--danger:active:not(:disabled) {
  transform: translateY(0);
}

.btn--cancel-deletion {
  flex-shrink: 0;
  padding: var(--space-2) var(--space-4);
  color: var(--color-accent);
  background: var(--color-accent-subtle);
  border: 1px solid transparent;
}

.btn--cancel-deletion:hover:not(:disabled) {
  background: color-mix(in srgb, var(--color-accent) 15%, transparent);
}

.btn-spinner {
  animation: spin 0.8s linear infinite;
}

/* Danger Zone */
.danger-zone {
  margin-top: var(--space-8);
  padding-top: var(--space-6);
  border-top: 1px dashed var(--color-border);
}

.danger-header {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
}

.danger-icon {
  color: var(--color-error);
}

.danger-title {
  margin: 0;
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-error);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.danger-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  padding: var(--space-4) var(--space-5);
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--color-error) 4%, var(--color-surface)) 0%,
    color-mix(in srgb, var(--color-error) 2%, var(--color-surface)) 100%
  );
  border: 1px solid color-mix(in srgb, var(--color-error) 20%, transparent);
  border-radius: var(--radius-lg);
}

.danger-card--pending {
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--color-error) 6%, var(--color-surface)) 0%,
    color-mix(in srgb, var(--color-error) 3%, var(--color-surface)) 100%
  );
  border: 1px solid color-mix(in srgb, var(--color-error) 30%, transparent);
}

.danger-content {
  flex: 1;
}

.danger-action-title {
  margin: 0 0 var(--space-1);
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--color-text-primary);
}

.danger-action-description {
  margin: 0;
  font-size: var(--text-xs);
  line-height: 1.5;
  color: var(--color-text-secondary);
}

.deletion-countdown {
  margin: var(--space-2) 0 0;
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--color-error);
}

/* Modal */
.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-4);
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
}

.modal {
  width: 100%;
  max-width: 440px;
  background: var(--color-surface);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-xl);
  overflow: hidden;
}

.modal--danger {
  border: 1px solid color-mix(in srgb, var(--color-error) 30%, transparent);
}

.modal-header {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-5);
  background: linear-gradient(
    135deg,
    color-mix(in srgb, var(--color-error) 6%, var(--color-surface)) 0%,
    color-mix(in srgb, var(--color-error) 3%, var(--color-surface)) 100%
  );
  border-bottom: 1px solid var(--color-border);
}

.modal-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  color: var(--color-error);
  background: color-mix(in srgb, var(--color-error) 10%, transparent);
  border-radius: var(--radius-md);
}

.modal-title {
  margin: 0;
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--color-text-primary);
}

.modal-body {
  padding: var(--space-5);
}

.modal-text {
  margin: 0 0 var(--space-5);
  font-size: var(--text-sm);
  line-height: 1.6;
  color: var(--color-text-secondary);
}

.modal-footer {
  display: flex;
  gap: var(--space-3);
  justify-content: flex-end;
  padding: var(--space-4) var(--space-5);
  background: var(--color-surface-sunken);
  border-top: 1px solid var(--color-border);
}

/* Form Fields */
.field {
  margin-bottom: var(--space-5);
}

.field:last-child {
  margin-bottom: 0;
}

.field-label {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-2);
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--color-text-primary);
}

.field-input {
  width: 100%;
  padding: var(--space-3) var(--space-4);
  font-family: inherit;
  font-size: var(--text-sm);
  color: var(--color-text-primary);
  background: var(--color-surface-sunken);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  outline: none;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.04);
  transition: all var(--transition-fast);
}

.field-input::placeholder {
  color: var(--color-text-tertiary);
}

.field-input:hover:not(:disabled) {
  border-color: var(--color-border-strong);
}

.field-input:focus {
  border-color: var(--color-accent);
  box-shadow:
    inset 0 1px 2px rgba(0, 0, 0, 0.04),
    0 0 0 3px var(--color-focus-ring);
}

.confirm-code {
  padding: 2px 6px;
  font-family: var(--font-family-mono);
  font-size: var(--text-xs);
  color: var(--color-error);
  background: color-mix(in srgb, var(--color-error) 10%, transparent);
  border-radius: var(--radius-sm);
}

/* Modal Transitions */
.modal-enter-active,
.modal-leave-active {
  transition: all 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .modal,
.modal-leave-to .modal {
  transform: scale(0.95) translateY(10px);
}

.modal-enter-active .modal,
.modal-leave-active .modal {
  transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}
</style>
