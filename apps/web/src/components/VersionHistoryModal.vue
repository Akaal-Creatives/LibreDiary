<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { versionsService, type PageVersion } from '@/services';
import { useOrganizationsStore } from '@/stores';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';

const { t } = useI18n();

const props = defineProps<{
  pageId: string;
  pageTitle: string;
  isOpen: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'restored'): void;
}>();

const orgStore = useOrganizationsStore();

// State
const loading = ref(true);
const versions = ref<PageVersion[]>([]);
const restoring = ref(false);
const selectedVersion = ref<PageVersion | null>(null);
const showConfirmDialog = ref(false);
const error = ref<string | null>(null);

const orgId = computed(() => orgStore.currentOrganization?.id);

watch(
  () => props.isOpen,
  (open) => {
    if (open) {
      loadVersions();
    }
  }
);

async function loadVersions() {
  if (!orgId.value) return;

  loading.value = true;
  error.value = null;

  try {
    versions.value = await versionsService.getVersions(orgId.value, props.pageId);
  } catch (e) {
    console.error('Failed to load versions:', e);
    error.value = t('versionHistory.failedToLoad');
  } finally {
    loading.value = false;
  }
}

function selectVersion(version: PageVersion) {
  selectedVersion.value = version;
  showConfirmDialog.value = true;
}

async function restoreVersion() {
  if (!orgId.value || !selectedVersion.value) return;

  restoring.value = true;

  try {
    await versionsService.restoreVersion(orgId.value, props.pageId, selectedVersion.value.id);
    showConfirmDialog.value = false;
    emit('restored');
    close();
  } catch (e) {
    console.error('Failed to restore version:', e);
    error.value = t('versionHistory.failedToRestore');
  } finally {
    restoring.value = false;
  }
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return `${t('time.today')} at ${date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`;
  } else if (diffDays === 1) {
    return `${t('time.yesterday')} at ${date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`;
  } else if (diffDays < 7) {
    return t('time.daysAgo', { count: diffDays });
  } else {
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  }
}

function close() {
  emit('close');
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="isOpen" class="modal-overlay" @click.self="close">
        <div class="modal-container">
          <!-- Header -->
          <header class="modal-header">
            <div class="header-content">
              <div class="header-icon">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <circle cx="10" cy="10" r="7.5" stroke="currentColor" stroke-width="1.5" />
                  <path
                    d="M10 5.5V10L13 12"
                    stroke="currentColor"
                    stroke-width="1.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              </div>
              <div>
                <h2 class="modal-title">{{ $t('versionHistory.title') }}</h2>
                <p class="modal-subtitle">{{ pageTitle }}</p>
              </div>
            </div>
            <button class="close-btn" :aria-label="$t('common.close')" @click="close">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path
                  d="M15 5L5 15M5 5L15 15"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                />
              </svg>
            </button>
          </header>

          <!-- Loading Skeleton -->
          <div v-if="loading" class="modal-loading">
            <div class="skeleton-list">
              <div v-for="i in 4" :key="i" class="skeleton-item">
                <div class="skeleton-badge"></div>
                <div class="skeleton-content">
                  <div class="skeleton-title"></div>
                  <div class="skeleton-meta"></div>
                </div>
              </div>
            </div>
          </div>

          <!-- Error State -->
          <div v-else-if="error" class="modal-error">
            <div class="error-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.5" />
                <path
                  d="M12 8V12"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                />
                <circle cx="12" cy="16" r="1" fill="currentColor" />
              </svg>
            </div>
            <p>{{ error }}</p>
            <button class="retry-btn" @click="loadVersions">{{ $t('common.tryAgain') }}</button>
          </div>

          <!-- Empty State -->
          <div v-else-if="versions.length === 0" class="modal-empty">
            <div class="empty-icon">
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                <circle
                  cx="24"
                  cy="24"
                  r="18"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-dasharray="4 4"
                />
                <path
                  d="M24 14V24L30 28"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </div>
            <h3>{{ $t('versionHistory.noVersions') }}</h3>
            <p>{{ $t('versionHistory.noVersionsDescription') }}</p>
          </div>

          <!-- Version List -->
          <div v-else class="modal-body">
            <TransitionGroup name="list" tag="div" class="version-list">
              <button
                v-for="(version, index) in versions"
                :key="version.id"
                class="version-item"
                :class="{ current: index === 0 }"
                @click="selectVersion(version)"
              >
                <div class="version-badge" :class="{ current: index === 0 }">
                  <span v-if="index === 0">{{ $t('versionHistory.current') }}</span>
                  <span v-else>v{{ version.version }}</span>
                </div>
                <div class="version-content">
                  <span class="version-title">{{ version.title }}</span>
                  <div class="version-meta">
                    <span class="version-author">{{
                      version.createdBy.name || version.createdBy.email
                    }}</span>
                    <span class="version-separator">·</span>
                    <span class="version-date">{{ formatDate(version.createdAt) }}</span>
                  </div>
                </div>
                <div class="version-action">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path
                      d="M6 12L10 8L6 4"
                      stroke="currentColor"
                      stroke-width="1.5"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </svg>
                </div>
              </button>
            </TransitionGroup>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>

  <!-- Restore Confirmation Dialog -->
  <ConfirmDialog
    :open="showConfirmDialog"
    :title="$t('versionHistory.restoreVersion')"
    :message="$t('versionHistory.restoreVersionConfirm', { version: selectedVersion?.version })"
    :confirm-text="$t('common.restore')"
    :cancel-text="$t('common.cancel')"
    variant="default"
    :loading="restoring"
    @confirm="restoreVersion"
    @close="showConfirmDialog = false"
  />
</template>

<style scoped>
/* Modal Overlay — warm-tinted scrim with stronger presence */
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-6);
  background: rgba(44, 47, 44, 0.52);
  backdrop-filter: blur(8px);
}

/* Container — layered shadow for tactile depth */
.modal-container {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 460px;
  max-height: calc(100vh - var(--space-16));
  overflow: hidden;
  background: var(--color-surface);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-2xl);
  box-shadow:
    var(--shadow-xl),
    0 0 0 1px rgba(44, 47, 44, 0.04);
}

/* Header */
.modal-header {
  display: flex;
  gap: var(--space-3);
  align-items: center;
  justify-content: space-between;
  padding: var(--space-5) var(--space-6);
  border-bottom: 1px solid var(--color-border);
}

.header-content {
  display: flex;
  gap: var(--space-3);
  align-items: center;
}

.header-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  color: var(--color-accent);
  background: var(--color-accent-subtle);
  border-radius: var(--radius-lg);
}

.modal-title {
  margin: 0;
  font-size: var(--text-lg);
  font-weight: 600;
  line-height: var(--leading-tight);
  color: var(--color-text-primary);
}

.modal-subtitle {
  margin: 2px 0 0;
  font-size: var(--text-sm);
  color: var(--color-text-tertiary);
}

/* Close button — visible, accessible 44px touch target */
.close-btn {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  padding: 0;
  color: var(--color-text-secondary);
  cursor: pointer;
  background: var(--color-hover);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-md);
  transition:
    color var(--transition-fast),
    background var(--transition-fast),
    border-color var(--transition-fast);
}

.close-btn:hover {
  color: var(--color-text-primary);
  background: var(--color-active);
  border-color: var(--color-border);
}

.close-btn:focus-visible {
  outline: 2px solid var(--color-focus-ring);
  outline-offset: 2px;
}

/* Loading Skeleton */
.modal-loading {
  padding: var(--space-5) var(--space-6);
}

.skeleton-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.skeleton-item {
  display: flex;
  gap: var(--space-3);
  align-items: center;
  padding: var(--space-3) var(--space-4);
  background: var(--color-surface-sunken);
  border-radius: var(--radius-md);
}

.skeleton-badge {
  width: 56px;
  height: 24px;
  background: var(--color-border-subtle);
  border-radius: var(--radius-sm);
  animation: skeleton-pulse 1.8s ease-in-out infinite;
}

.skeleton-content {
  flex: 1;
}

.skeleton-title {
  width: 60%;
  height: 14px;
  margin-bottom: var(--space-2);
  background: var(--color-border-subtle);
  border-radius: var(--radius-sm);
  animation: skeleton-pulse 1.8s ease-in-out infinite;
  animation-delay: 0.15s;
}

.skeleton-meta {
  width: 40%;
  height: 10px;
  background: var(--color-border-subtle);
  border-radius: var(--radius-sm);
  animation: skeleton-pulse 1.8s ease-in-out infinite;
  animation-delay: 0.3s;
}

@keyframes skeleton-pulse {
  0%,
  100% {
    opacity: 0.4;
  }
  50% {
    opacity: 0.8;
  }
}

/* Error State — grounded, clear, actionable */
.modal-error {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  align-items: center;
  padding: var(--space-12) var(--space-8);
  text-align: center;
}

.error-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  color: var(--color-error);
  background: var(--color-error-subtle);
  border-radius: var(--radius-full);
}

.modal-error p {
  margin: 0;
  font-size: var(--text-sm);
  line-height: var(--leading-normal);
  color: var(--color-text-secondary);
}

.retry-btn {
  padding: var(--space-2) var(--space-5);
  font-family: inherit;
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--color-accent);
  cursor: pointer;
  background: var(--color-accent-subtle);
  border: 1px solid var(--color-accent-muted);
  border-radius: var(--radius-md);
  transition:
    background var(--transition-fast),
    border-color var(--transition-fast);
}

.retry-btn:hover {
  background: var(--color-accent-muted);
  border-color: var(--color-accent);
}

.retry-btn:focus-visible {
  outline: 2px solid var(--color-focus-ring);
  outline-offset: 2px;
}

/* Empty State */
.modal-empty {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  align-items: center;
  padding: var(--space-12) var(--space-8);
  text-align: center;
}

.empty-icon {
  margin-bottom: var(--space-2);
  color: var(--color-text-tertiary);
  opacity: 0.4;
}

.modal-empty h3 {
  margin: 0;
  font-size: var(--text-base);
  font-weight: 600;
  color: var(--color-text-primary);
}

.modal-empty p {
  margin: 0;
  font-size: var(--text-sm);
  line-height: var(--leading-normal);
  color: var(--color-text-tertiary);
}

/* Body — scrollable version list */
.modal-body {
  max-height: 400px;
  padding: var(--space-4) var(--space-5);
  overflow-y: auto;
}

/* Version List */
.version-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.version-item {
  display: flex;
  gap: var(--space-3);
  align-items: center;
  width: 100%;
  padding: var(--space-3) var(--space-4);
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  background: var(--color-surface-sunken);
  border: 1px solid transparent;
  border-radius: var(--radius-lg);
  transition:
    background var(--transition-fast),
    border-color var(--transition-fast),
    box-shadow var(--transition-fast);
}

.version-item:hover {
  background: var(--color-surface-hover);
  border-color: var(--color-border);
  box-shadow: var(--shadow-xs);
}

.version-item:hover .version-action {
  color: var(--color-accent);
  opacity: 1;
}

.version-item:focus-visible {
  border-color: var(--color-accent);
  outline: 2px solid var(--color-focus-ring);
  outline-offset: 1px;
}

.version-item.current {
  background: var(--color-accent-subtle);
  border-color: var(--color-accent-muted);
}

.version-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 56px;
  height: 24px;
  padding: 0 var(--space-2);
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--color-text-tertiary);
  background: var(--color-surface);
  border-radius: var(--radius-sm);
}

.version-badge.current {
  color: var(--color-accent);
  background: var(--color-accent-muted);
}

.version-content {
  flex: 1;
  min-width: 0;
}

.version-title {
  display: block;
  overflow: hidden;
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--color-text-primary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.version-meta {
  display: flex;
  gap: var(--space-1);
  align-items: center;
  margin-top: 2px;
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

.version-separator {
  opacity: 0.5;
}

.version-action {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  color: var(--color-text-tertiary);
  opacity: 0;
  transition: all var(--transition-fast);
}

/* Transitions — organic cubic-bezier for natural feel */
.modal-enter-active {
  transition: opacity 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.modal-leave-active {
  transition: opacity 0.15s cubic-bezier(0.4, 0, 0.2, 1);
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active .modal-container {
  transition:
    transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1),
    opacity 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.modal-leave-active .modal-container {
  transition:
    transform 0.15s cubic-bezier(0.4, 0, 0.2, 1),
    opacity 0.15s cubic-bezier(0.4, 0, 0.2, 1);
}

.modal-enter-from .modal-container {
  opacity: 0;
  transform: scale(0.96) translateY(8px);
}

.modal-leave-to .modal-container {
  opacity: 0;
  transform: scale(0.98) translateY(4px);
}

.list-enter-active,
.list-leave-active {
  transition: all var(--transition-base);
}

.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

.list-move {
  transition: transform var(--transition-base);
}
</style>
