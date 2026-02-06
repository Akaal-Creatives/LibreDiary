<script setup lang="ts">
import { ref, computed, onMounted, watch, onUnmounted } from 'vue';
import { usePagesStore, useSyncStore, useAuthStore } from '@/stores';
import { useCollaboration } from '@/composables';
import { TiptapEditor } from '@/components/editor';
import PageBreadcrumbs from '@/components/PageBreadcrumbs.vue';
import EmojiPicker from '@/components/EmojiPicker.vue';
import ShareModal from '@/components/ShareModal.vue';
import PageCoverImage from '@/components/PageCoverImage.vue';

const pagesStore = usePagesStore();
const syncStore = useSyncStore();
const authStore = useAuthStore();

const props = defineProps<{
  pageId: string;
}>();

const loading = ref(true);
const error = ref<string | null>(null);
const pageTitle = ref('');
const pageContent = ref('');
const showEmojiPicker = ref(false);
const showShareModal = ref(false);

// Track if page has been modified
const hasBeenModified = ref(false);

// Debounce timers for saving title
let titleSaveTimeout: ReturnType<typeof setTimeout> | null = null;

// Collaboration document name (orgId/pageId)
const documentName = computed(() => {
  const orgId = authStore.currentOrganizationId;
  return orgId ? `${orgId}/${props.pageId}` : null;
});

// User info for collaboration cursors
const userName = computed(() => authStore.user?.name || authStore.user?.email || 'Anonymous');
const userColor = computed(() => {
  // Generate a consistent color from user ID
  if (!authStore.user?.id) return '#6B8F71';
  let hash = 0;
  for (let i = 0; i < authStore.user.id.length; i++) {
    hash = authStore.user.id.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash % 360);
  return `hsl(${hue}, 70%, 50%)`;
});

// Setup collaboration
const {
  isConnected,
  isSynced,
  isConnecting,
  connectionError,
  connectedUsers,
  ydoc,
  provider,
  disconnect: disconnectCollaboration,
} = useCollaboration({
  documentName: documentName.value || '',
  enabled: !!documentName.value,
  onSynced: () => {
    // Once synced, we can hide the loading state
    if (loading.value) {
      loading.value = false;
    }
  },
  onAuthenticationFailed: (reason) => {
    error.value = `Collaboration failed: ${reason}`;
    loading.value = false;
  },
});

/**
 * Check if the page is empty (untitled and no content)
 */
function isPageEmpty(): boolean {
  const title = pageTitle.value.trim();
  const content = pageContent.value.trim();

  // Page is empty if title is "Untitled" (or empty) AND content is empty or just whitespace/empty tags
  const isUntitled = !title || title === 'Untitled';
  const hasNoContent = !content || content === '<p></p>' || content === '<p><br></p>';

  return isUntitled && hasNoContent;
}

/**
 * Clean up empty page when navigating away
 */
async function cleanupEmptyPage(pageId: string) {
  // Only delete if the page was never meaningfully modified
  if (!hasBeenModified.value && isPageEmpty()) {
    try {
      await pagesStore.trashPage(pageId);
    } catch (e) {
      // Silently fail - page might already be deleted
      console.debug('Failed to cleanup empty page:', e);
    }
  }
}

onMounted(() => {
  loadPage();
});

watch(
  () => props.pageId,
  async (_newId, oldId) => {
    // Cleanup old page if it was empty
    if (oldId) {
      await cleanupEmptyPage(oldId);
    }
    // Disconnect from old collaboration
    disconnectCollaboration();
    // Reset modification tracking for new page
    hasBeenModified.value = false;
    loadPage();
  }
);

onUnmounted(async () => {
  // Clear any pending save timeouts
  if (titleSaveTimeout) {
    clearTimeout(titleSaveTimeout);
  }

  // Cleanup empty page when leaving
  await cleanupEmptyPage(props.pageId);
});

async function loadPage() {
  loading.value = true;
  error.value = null;
  hasBeenModified.value = false;
  pagesStore.setCurrentPage(props.pageId);

  try {
    const page = await pagesStore.fetchPage(props.pageId);
    pageTitle.value = page.title;
    pageContent.value = page.htmlContent || '';

    // Mark as modified if it already has content (existing page)
    if (page.htmlContent && page.htmlContent.trim() && page.htmlContent !== '<p></p>') {
      hasBeenModified.value = true;
    }
    if (page.title && page.title !== 'Untitled') {
      hasBeenModified.value = true;
    }

    // Expand ancestors in sidebar
    pagesStore.expandToPage(props.pageId);

    // If collaboration is not synced yet, wait for it
    if (!isSynced.value) {
      // Keep loading until synced (the onSynced callback will hide loading)
    } else {
      loading.value = false;
    }
  } catch (e) {
    error.value = 'Failed to load page';
    console.error(e);
    loading.value = false;
  }
}

function updateTitle(event: Event) {
  const target = event.target as HTMLHeadingElement;
  const newTitle = target.textContent?.trim() || 'Untitled';
  pageTitle.value = newTitle;

  // Mark as modified if title changed to something meaningful
  if (newTitle && newTitle !== 'Untitled') {
    hasBeenModified.value = true;
  }

  const opId = `title-${props.pageId}`;
  syncStore.startOperation(opId, 'title');

  // Debounce save
  if (titleSaveTimeout) {
    clearTimeout(titleSaveTimeout);
  }

  titleSaveTimeout = setTimeout(async () => {
    syncStore.markSaving(opId);
    try {
      await pagesStore.updatePageData(props.pageId, { title: newTitle });
      syncStore.markSaved(opId);
    } catch (e) {
      console.error('Failed to save title:', e);
      syncStore.markError(opId, 'Failed to save title');
    }
  }, 500);
}

function onContentUpdate(content: string) {
  pageContent.value = content;

  // Mark as modified if content is meaningful
  const hasContent =
    content && content.trim() && content !== '<p></p>' && content !== '<p><br></p>';
  if (hasContent) {
    hasBeenModified.value = true;
  }

  // In collaborative mode, content is synced via Yjs/Hocuspocus
  // No need to save manually - Hocuspocus handles persistence
}

async function selectIcon(icon: string | null) {
  showEmojiPicker.value = false;
  try {
    await pagesStore.updatePageData(props.pageId, { icon });
  } catch (e) {
    console.error('Failed to save icon:', e);
  }
}

function toggleEmojiPicker() {
  showEmojiPicker.value = !showEmojiPicker.value;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();

  // Less than a minute
  if (diff < 60000) {
    return 'just now';
  }

  // Less than an hour
  if (diff < 3600000) {
    const minutes = Math.floor(diff / 60000);
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  }

  // Less than a day
  if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  }

  // Format as date
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}
</script>

<template>
  <div class="page-view">
    <!-- Breadcrumbs -->
    <div class="page-breadcrumbs">
      <PageBreadcrumbs />
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="page-loading">
      <div class="loading-spinner"></div>
      <span class="loading-text">
        {{ isConnecting ? 'Connecting...' : 'Loading...' }}
      </span>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="page-error">
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none" class="error-icon">
        <circle cx="24" cy="24" r="20" stroke="currentColor" stroke-width="2" />
        <path d="M24 14V26" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
        <circle cx="24" cy="32" r="2" fill="currentColor" />
      </svg>
      <h2 class="error-title">{{ error }}</h2>
      <button class="error-retry" @click="loadPage">Try again</button>
    </div>

    <!-- Page Content -->
    <div v-else class="page-content">
      <!-- Connection Status -->
      <div v-if="connectionError" class="connection-error">
        <span>Connection error: {{ connectionError }}</span>
      </div>

      <!-- Cover Image -->
      <PageCoverImage
        :cover-url="pagesStore.currentPage?.coverUrl ?? null"
        :page-id="props.pageId"
        @update="loadPage"
      />

      <!-- Page Header -->
      <header class="page-header">
        <div class="icon-wrapper">
          <button class="page-icon-btn" title="Change icon" @click="toggleEmojiPicker">
            <span class="page-icon">{{ pagesStore.currentPage?.icon ?? '📄' }}</span>
          </button>
          <div v-if="showEmojiPicker" class="emoji-picker-wrapper">
            <EmojiPicker
              :model-value="pagesStore.currentPage?.icon"
              @update:model-value="selectIcon"
              @close="showEmojiPicker = false"
            />
          </div>
        </div>
        <div class="page-meta">
          <h1 class="page-title" contenteditable="true" spellcheck="false" @blur="updateTitle">
            {{ pageTitle }}
          </h1>
          <div class="page-info">
            <span v-if="pagesStore.currentPage?.updatedAt" class="info-item">
              Edited {{ formatDate(pagesStore.currentPage.updatedAt) }}
            </span>
            <!-- Collaboration status -->
            <span v-if="isConnected" class="info-item collab-status">
              <span class="collab-dot"></span>
              {{ connectedUsers.length }} editing
            </span>
          </div>
        </div>
        <button class="share-btn" title="Share page" @click="showShareModal = true">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <circle cx="14" cy="4" r="2.5" stroke="currentColor" stroke-width="1.5" />
            <circle cx="14" cy="14" r="2.5" stroke="currentColor" stroke-width="1.5" />
            <circle cx="4" cy="9" r="2.5" stroke="currentColor" stroke-width="1.5" />
            <path
              d="M6.5 7.5L11.5 5M6.5 10.5L11.5 13"
              stroke="currentColor"
              stroke-width="1.5"
              stroke-linecap="round"
            />
          </svg>
          <span>Share</span>
        </button>
      </header>

      <!-- Page Body -->
      <div class="page-body">
        <TiptapEditor
          v-model="pageContent"
          placeholder="Start writing, or press '/' for commands..."
          :collaborative="!!documentName"
          :ydoc="ydoc"
          :provider="provider"
          :user-name="userName"
          :user-color="userColor"
          @update:model-value="onContentUpdate"
        />
      </div>
    </div>

    <!-- Share Modal -->
    <ShareModal
      :page-id="props.pageId"
      :page-title="pageTitle"
      :is-open="showShareModal"
      @close="showShareModal = false"
      @update="loadPage"
    />
  </div>
</template>

<style scoped>
.page-view {
  max-width: 800px;
  margin: 0 auto;
  padding: var(--space-4) 0;
}

/* Breadcrumbs */
.page-breadcrumbs {
  margin-bottom: var(--space-4);
  padding: 0 var(--space-4);
}

/* Loading State */
.page-loading {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  align-items: center;
  justify-content: center;
  padding: var(--space-20);
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--color-border);
  border-top-color: var(--color-accent);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.loading-text {
  font-size: var(--text-sm);
  color: var(--color-text-tertiary);
}

/* Error State */
.page-error {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  align-items: center;
  justify-content: center;
  padding: var(--space-20);
  text-align: center;
}

.error-icon {
  color: var(--color-error);
  opacity: 0.5;
}

.error-title {
  margin: 0;
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--color-text-primary);
}

.error-retry {
  padding: var(--space-2) var(--space-4);
  font-family: inherit;
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--color-text-inverse);
  cursor: pointer;
  background: var(--color-accent);
  border: none;
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
}

.error-retry:hover {
  background: var(--color-accent-hover);
}

/* Connection Error */
.connection-error {
  padding: var(--space-3) var(--space-4);
  margin: 0 var(--space-4) var(--space-4);
  font-size: var(--text-sm);
  color: var(--color-warning);
  background: var(--color-warning-subtle);
  border-radius: var(--radius-md);
}

/* Page Header */
.page-header {
  display: flex;
  gap: var(--space-4);
  align-items: flex-start;
  margin-bottom: var(--space-8);
  padding: 0 var(--space-4) var(--space-6);
  border-bottom: 1px solid var(--color-border);
}

.share-btn {
  display: flex;
  gap: var(--space-2);
  align-items: center;
  align-self: center;
  padding: var(--space-2) var(--space-3);
  font-family: inherit;
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--color-text-secondary);
  cursor: pointer;
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
}

.share-btn:hover {
  color: var(--color-accent);
  background: rgba(107, 143, 113, 0.05);
  border-color: var(--color-accent);
}

.icon-wrapper {
  position: relative;
}

.page-icon-btn {
  flex-shrink: 0;
  padding: var(--space-2);
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: var(--radius-lg);
  transition: all var(--transition-fast);
}

.page-icon-btn:hover {
  background: var(--color-hover);
}

.page-icon {
  font-size: 3rem;
  line-height: 1;
}

.emoji-picker-wrapper {
  position: absolute;
  top: 100%;
  left: 0;
  z-index: 100;
  margin-top: var(--space-2);
}

.page-meta {
  flex: 1;
  min-width: 0;
  padding-top: var(--space-2);
}

.page-title {
  margin: 0 0 var(--space-2);
  padding: 0;
  font-size: var(--text-4xl);
  font-weight: 700;
  line-height: 1.2;
  color: var(--color-text-primary);
  letter-spacing: -0.02em;
  border: none;
  outline: none;
}

.page-title:empty::before {
  color: var(--color-text-tertiary);
  content: 'Untitled';
}

.page-title:focus {
  outline: none;
}

.page-info {
  display: flex;
  gap: var(--space-4);
  align-items: center;
}

.info-item {
  font-size: var(--text-sm);
  color: var(--color-text-tertiary);
}

.collab-status {
  display: flex;
  gap: var(--space-1);
  align-items: center;
}

.collab-dot {
  width: 6px;
  height: 6px;
  background: var(--color-success);
  border-radius: 50%;
  animation: pulse 2s infinite;
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

/* Page Body */
.page-body {
  min-height: 400px;
  padding: 0 var(--space-4);
}
</style>
