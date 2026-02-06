<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { versionsService, type PageVersion } from '@/services';
import { useOrganizationsStore } from '@/stores';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';

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
    error.value = 'Failed to load version history';
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
    error.value = 'Failed to restore version';
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
    return `Today at ${date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`;
  } else if (diffDays === 1) {
    return `Yesterday at ${date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`;
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
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
                <h2 class="modal-title">Version History</h2>
                <p class="modal-subtitle">{{ pageTitle }}</p>
              </div>
            </div>
            <button class="close-btn" aria-label="Close" @click="close">
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
            <button class="retry-btn" @click="loadVersions">Try Again</button>
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
            <h3>No versions yet</h3>
            <p>Version snapshots will appear here as you edit this page.</p>
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
                  <span v-if="index === 0">Current</span>
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
    title="Restore Version"
    :message="`Are you sure you want to restore to version ${selectedVersion?.version}? This will replace the current content with the content from this version.`"
    confirm-text="Restore"
    cancel-text="Cancel"
    variant="default"
    :loading="restoring"
    @confirm="restoreVersion"
    @close="showConfirmDialog = false"
  />
</template>

<style scoped>
/* Modal Overlay */
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-4);
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
}

.modal-container {
  width: 100%;
  max-width: 440px;
  max-height: calc(100vh - 2rem);
  overflow: hidden;
  background: var(--color-bg-primary);
  border-radius: var(--radius-xl);
  box-shadow:
    0 25px 50px -12px rgba(0, 0, 0, 0.25),
    0 0 0 1px rgba(0, 0, 0, 0.05);
}

/* Header */
.modal-header {
  display: flex;
  gap: var(--space-3);
  align-items: flex-start;
  justify-content: space-between;
  padding: var(--space-5);
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
  width: 40px;
  height: 40px;
  color: var(--color-accent);
  background: rgba(107, 143, 113, 0.1);
  border-radius: var(--radius-lg);
}

.modal-title {
  margin: 0;
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--color-text-primary);
}

.modal-subtitle {
  margin: var(--space-1) 0 0;
  font-size: var(--text-sm);
  color: var(--color-text-tertiary);
}

.close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  color: var(--color-text-tertiary);
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
}

.close-btn:hover {
  color: var(--color-text-primary);
  background: var(--color-hover);
}

/* Loading Skeleton */
.modal-loading {
  padding: var(--space-4);
}

.skeleton-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.skeleton-item {
  display: flex;
  gap: var(--space-3);
  align-items: center;
  padding: var(--space-3);
  background: var(--color-bg-secondary);
  border-radius: var(--radius-md);
}

.skeleton-badge {
  width: 56px;
  height: 24px;
  background: var(--color-bg-tertiary);
  border-radius: var(--radius-sm);
  animation: skeleton-pulse 1.5s ease-in-out infinite;
}

.skeleton-content {
  flex: 1;
}

.skeleton-title {
  width: 60%;
  height: 16px;
  margin-bottom: var(--space-2);
  background: var(--color-bg-tertiary);
  border-radius: var(--radius-xs);
  animation: skeleton-pulse 1.5s ease-in-out infinite;
  animation-delay: 0.1s;
}

.skeleton-meta {
  width: 40%;
  height: 12px;
  background: var(--color-bg-tertiary);
  border-radius: var(--radius-xs);
  animation: skeleton-pulse 1.5s ease-in-out infinite;
  animation-delay: 0.2s;
}

@keyframes skeleton-pulse {
  0%,
  100% {
    opacity: 0.5;
  }
  50% {
    opacity: 1;
  }
}

/* Error State */
.modal-error {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  align-items: center;
  padding: var(--space-10);
  text-align: center;
}

.error-icon {
  color: var(--color-error);
}

.modal-error p {
  margin: 0;
  color: var(--color-text-secondary);
}

.retry-btn {
  padding: var(--space-2) var(--space-4);
  font-family: inherit;
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--color-accent);
  cursor: pointer;
  background: rgba(107, 143, 113, 0.1);
  border: none;
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
}

.retry-btn:hover {
  background: rgba(107, 143, 113, 0.2);
}

/* Empty State */
.modal-empty {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  align-items: center;
  padding: var(--space-10);
  text-align: center;
}

.empty-icon {
  margin-bottom: var(--space-2);
  color: var(--color-text-tertiary);
  opacity: 0.5;
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
  color: var(--color-text-tertiary);
}

/* Body */
.modal-body {
  max-height: 400px;
  padding: var(--space-4);
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
  padding: var(--space-3);
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  background: var(--color-bg-secondary);
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
}

.version-item:hover {
  background: var(--color-hover);
  border-color: var(--color-border);
}

.version-item:hover .version-action {
  color: var(--color-accent);
  opacity: 1;
}

.version-item.current {
  background: rgba(107, 143, 113, 0.05);
  border-color: rgba(107, 143, 113, 0.2);
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
  background: var(--color-bg-tertiary);
  border-radius: var(--radius-sm);
}

.version-badge.current {
  color: var(--color-accent);
  background: rgba(107, 143, 113, 0.15);
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

/* Transitions */
.modal-enter-active,
.modal-leave-active {
  transition: all 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .modal-container,
.modal-leave-to .modal-container {
  transform: scale(0.95) translateY(10px);
}

.list-enter-active,
.list-leave-active {
  transition: all 0.2s ease;
}

.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

.list-move {
  transition: transform 0.2s ease;
}
</style>
