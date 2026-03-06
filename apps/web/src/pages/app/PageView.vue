<script setup lang="ts">
import { ref, computed, onMounted, watch, onUnmounted, defineAsyncComponent } from 'vue';
import { usePagesStore, useSyncStore, useAuthStore } from '@/stores';
import { useCollaboration } from '@/composables';
import { TiptapEditor, AiBubbleMenu } from '@/components/editor';
import { useMarkdownExport } from '@/composables';
import { usePagePanels } from '@/composables/usePagePanels';
import { commentsService } from '@/services/comments.service';
import PageBreadcrumbs from '@/components/PageBreadcrumbs.vue';
import EmojiPicker from '@/components/EmojiPicker.vue';
import PageCoverImage from '@/components/PageCoverImage.vue';
import EditorSkeleton from '@/components/skeletons/EditorSkeleton.vue';

// Lazy-load heavy modals — loaded on-demand when opened
const ShareModal = defineAsyncComponent(() => import('@/components/ShareModal.vue'));
const VersionHistoryModal = defineAsyncComponent(
  () => import('@/components/VersionHistoryModal.vue')
);
const CommentsPanel = defineAsyncComponent(() => import('@/components/CommentsPanel.vue'));

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
const {
  showShareModal,
  showVersionHistory,
  showCommentsPanel,
  commentCount,
  closeComments,
  closeVersionHistory,
  closeShare,
  setCommentCount,
  closePanels,
} = usePagePanels();

// Ref to the TiptapEditor component
const editorRef = ref<InstanceType<typeof TiptapEditor> | null>(null);

// Markdown export/import
const { downloadAsMarkdown, importFromFile } = useMarkdownExport(() => editorRef.value?.editor);

// Track if page has been modified
const hasBeenModified = ref(false);

// Track if we've already inserted initial content (to avoid re-inserting on every sync)
const initialContentInserted = ref(false);

// Store the original htmlContent from the API for initial content insertion
// This is separate from pageContent which tracks live editor content
const originalHtmlContent = ref('');

// Debounce timers for saving
let titleSaveTimeout: ReturnType<typeof setTimeout> | null = null;
let contentSaveTimeout: ReturnType<typeof setTimeout> | null = null;

// Collaboration document name (orgId/pageId)
const documentName = computed(() => {
  const orgId = authStore.currentOrganizationId;
  return orgId ? `${orgId}/${props.pageId}` : null;
});

// User info for collaboration cursors
const userName = computed(() => authStore.user?.name || authStore.user?.email || 'Anonymous');
const userColor = computed(() => {
  // Generate a consistent hex colour from user ID
  // y-prosemirror only supports 6-digit hex colours (#RRGGBB)
  if (!authStore.user?.id) return '#6B8F71';
  let hash = 0;
  for (let i = 0; i < authStore.user.id.length; i++) {
    hash = authStore.user.id.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash % 360);
  // Convert HSL (hue, 70% saturation, 50% lightness) to hex
  const s = 0.7,
    l = 0.5;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + hue / 30) % 12;
    const colour = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * colour)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
});

/**
 * Insert initial content into an empty editor after sync.
 * This is needed because when yjsState is null, the Yjs document starts empty,
 * but we have htmlContent saved in the database that should be displayed.
 */
function insertInitialContentIfEmpty() {
  if (initialContentInserted.value) return;

  // Get the editor instance from the ref
  const editorInstance = editorRef.value?.editor;
  if (!editorInstance) return;

  // Check if editor content is empty
  const currentContent = editorInstance.getHTML();
  const isEmpty =
    !currentContent ||
    currentContent === '<p></p>' ||
    currentContent === '<p><br></p>' ||
    currentContent.trim() === '';

  // If editor is empty and we have original htmlContent, insert it
  // We use originalHtmlContent (not pageContent) because pageContent gets overwritten
  // by the editor's onUpdate callback when it initializes with an empty Yjs document
  if (isEmpty && originalHtmlContent.value && originalHtmlContent.value.trim()) {
    editorInstance.commands.setContent(originalHtmlContent.value, { emitUpdate: false });
    initialContentInserted.value = true;
  }
}

// Setup collaboration - pass reactive getters so connection updates when auth/pageId change
const {
  isConnected,
  isSynced,
  connectionError,
  connectedUsers,
  ydoc,
  provider,
  disconnect: disconnectCollaboration,
} = useCollaboration({
  documentName: () => documentName.value,
  enabled: () => !!documentName.value,
  onSynced: () => {
    // Once synced, we can hide the loading state
    if (loading.value) {
      loading.value = false;
    }
    // Try to insert initial content after sync completes
    // Use a small delay to ensure the editor has processed the sync
    setTimeout(insertInitialContentIfEmpty, 150);
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
  (_newId, oldId) => {
    // Flush pending content save — fire-and-forget so we don't block navigation
    if (contentSaveTimeout) {
      clearTimeout(contentSaveTimeout);
      contentSaveTimeout = null;
    }
    if (oldId && hasBeenModified.value && pageContent.value) {
      const content = pageContent.value;
      const hasContent =
        content && content.trim() && content !== '<p></p>' && content !== '<p><br></p>';
      if (hasContent) {
        pagesStore
          .updatePageData(oldId, { htmlContent: content })
          .catch((e) => console.error('Failed to flush content save:', e));
      }
    }
    // Cleanup old page if it was empty — fire-and-forget
    if (oldId) {
      cleanupEmptyPage(oldId).catch(() => {});
    }
    // Disconnect from old collaboration
    disconnectCollaboration();
    // Reset modification tracking and panel state for new page
    hasBeenModified.value = false;
    closePanels();
    loadPage();
  }
);

onUnmounted(async () => {
  // Clear any pending save timeouts
  if (titleSaveTimeout) {
    clearTimeout(titleSaveTimeout);
  }
  if (contentSaveTimeout) {
    clearTimeout(contentSaveTimeout);
  }

  // Flush pending content save before unmounting
  if (hasBeenModified.value && pageContent.value) {
    const content = pageContent.value;
    const hasContent =
      content && content.trim() && content !== '<p></p>' && content !== '<p><br></p>';
    if (hasContent) {
      try {
        await pagesStore.updatePageData(props.pageId, { htmlContent: content });
      } catch (e) {
        console.error('Failed to flush content save on unmount:', e);
      }
    }
  }

  // Cleanup empty page when leaving
  await cleanupEmptyPage(props.pageId);

  // Clear current page so header buttons hide on non-page routes
  pagesStore.setCurrentPage(null);
  closePanels();
});

async function loadPage() {
  loading.value = true;
  error.value = null;
  hasBeenModified.value = false;
  initialContentInserted.value = false; // Reset for new page
  pagesStore.setCurrentPage(props.pageId);

  try {
    const page = await pagesStore.fetchPage(props.pageId);
    pageTitle.value = page.title;
    pageContent.value = page.htmlContent || '';
    // Store original htmlContent separately - this won't be overwritten by editor updates
    originalHtmlContent.value = page.htmlContent || '';

    // Mark as modified if it already has content (existing page)
    if (page.htmlContent && page.htmlContent.trim() && page.htmlContent !== '<p></p>') {
      hasBeenModified.value = true;
    }
    if (page.title && page.title !== 'Untitled') {
      hasBeenModified.value = true;
    }

    // Eagerly fetch comment count so the badge updates without opening the panel
    const orgId = authStore.currentOrganizationId;
    if (orgId) {
      commentsService
        .getCommentCount(orgId, props.pageId)
        .then((count) => setCommentCount(count))
        .catch(() => setCommentCount(0));
    }

    // Expand ancestors in sidebar
    pagesStore.expandToPage(props.pageId);

    // Cached page — show content immediately, no need to wait for collaboration sync
    if (pagesStore.hasPageContent(props.pageId)) {
      loading.value = false;
    } else if (isSynced.value) {
      // First visit but already synced — show content immediately
      loading.value = false;
    } else {
      // First visit — wait for collaboration sync with timeout
      setTimeout(() => {
        if (loading.value) {
          console.warn('Collaboration sync timeout - showing editor anyway');
          loading.value = false;
        }
      }, 5000);
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

  // Save htmlContent via REST API (debounced).
  // In collaborative mode yjsState is the primary save mechanism,
  // but persisting htmlContent ensures content survives WebSocket failures.
  if (hasContent) {
    const opId = `content-${props.pageId}`;
    syncStore.startOperation(opId, 'content');

    if (contentSaveTimeout) {
      clearTimeout(contentSaveTimeout);
    }

    contentSaveTimeout = setTimeout(async () => {
      syncStore.markSaving(opId);
      try {
        await pagesStore.updatePageData(props.pageId, { htmlContent: content });
        syncStore.markSaved(opId);
      } catch (e) {
        console.error('Failed to save content:', e);
        syncStore.markError(opId, 'Failed to save content');
      }
    }, 2000);
  }
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
      <EditorSkeleton />
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
        :org-id="authStore.currentOrganizationId ?? ''"
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
            <!-- E2EE badge -->
            <span
              v-if="authStore.currentOrganization?.isEncrypted"
              class="info-item encrypted-badge"
              title="End-to-end encrypted"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <rect
                  x="2.5"
                  y="5.5"
                  width="7"
                  height="5"
                  rx="1"
                  stroke="currentColor"
                  stroke-width="1"
                />
                <path
                  d="M4 5.5V4a2 2 0 0 1 4 0v1.5"
                  stroke="currentColor"
                  stroke-width="1"
                  stroke-linecap="round"
                />
              </svg>
              Encrypted
            </span>
          </div>
        </div>
        <div class="header-actions">
          <button
            class="action-btn comments-btn"
            :class="{ 'has-comments': commentCount > 0 }"
            title="Comments"
            @click="showCommentsPanel = true"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path
                d="M15.75 9C15.75 12.7279 12.7279 15.75 9 15.75C7.83594 15.75 6.74219 15.4688 5.78125 14.9609L2.25 15.75L3.03906 12.2188C2.53125 11.2578 2.25 10.1641 2.25 9C2.25 5.27208 5.27208 2.25 9 2.25C12.7279 2.25 15.75 5.27208 15.75 9Z"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
            <span v-if="commentCount > 0" class="comment-badge">{{ commentCount }}</span>
          </button>
          <button class="action-btn" title="Version history" @click="showVersionHistory = true">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <circle cx="9" cy="9" r="6.5" stroke="currentColor" stroke-width="1.5" />
              <path
                d="M9 5V9L11.5 10.5"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </button>
          <button
            class="action-btn"
            :title="
              editorRef?.editorMode === 'markdown' ? 'Switch to WYSIWYG' : 'Switch to Markdown'
            "
            @click="editorRef?.toggleEditorMode()"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <rect
                x="2"
                y="3"
                width="14"
                height="12"
                rx="2"
                stroke="currentColor"
                stroke-width="1.5"
              />
              <path
                d="M5 12V6l2.5 3L10 6v6M12.5 9.5L14 8v4"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </button>
          <button
            class="action-btn"
            title="Export as Markdown"
            @click="downloadAsMarkdown(`${pageTitle || 'untitled'}.md`)"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path
                d="M9 2.25v9M5.25 7.5L9 11.25l3.75-3.75M3 12.75v1.5a1.5 1.5 0 001.5 1.5h9a1.5 1.5 0 001.5-1.5v-1.5"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </button>
          <button class="action-btn" title="Import Markdown" @click="importFromFile">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path
                d="M9 11.25v-9M12.75 6L9 2.25 5.25 6M3 12.75v1.5a1.5 1.5 0 001.5 1.5h9a1.5 1.5 0 001.5-1.5v-1.5"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </button>
          <button class="action-btn share-btn" title="Share page" @click="showShareModal = true">
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
        </div>
      </header>

      <!-- Page Body -->
      <div class="page-body">
        <TiptapEditor
          ref="editorRef"
          v-model="pageContent"
          placeholder="Start writing, or press '/' for commands..."
          :collaborative="!!documentName"
          :ydoc="ydoc"
          :provider="provider"
          :provider-synced="isSynced"
          :user-name="userName"
          :user-color="userColor"
          @update:model-value="onContentUpdate"
        />
        <AiBubbleMenu v-if="editorRef?.editor" :editor="editorRef.editor" />
      </div>
    </div>

    <!-- Share Modal -->
    <ShareModal
      :page-id="props.pageId"
      :page-title="pageTitle"
      :is-open="showShareModal"
      @close="closeShare"
      @update="loadPage"
    />

    <!-- Version History Modal -->
    <VersionHistoryModal
      :page-id="props.pageId"
      :page-title="pageTitle"
      :is-open="showVersionHistory"
      @close="closeVersionHistory"
      @restored="loadPage"
    />

    <!-- Comments Panel -->
    <CommentsPanel
      :page-id="props.pageId"
      :is-open="showCommentsPanel"
      @close="closeComments"
      @comment-count-change="(count) => setCommentCount(count)"
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
  padding: var(--space-4);
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

.header-actions {
  display: flex;
  gap: var(--space-2);
  align-items: center;
  align-self: center;
}

.action-btn {
  display: flex;
  gap: var(--space-2);
  align-items: center;
  justify-content: center;
  padding: var(--space-2);
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

.action-btn:hover {
  color: var(--color-accent);
  background: rgba(107, 143, 113, 0.05);
  border-color: var(--color-accent);
}

.action-btn.share-btn {
  padding: var(--space-2) var(--space-3);
}

.action-btn.comments-btn {
  position: relative;
}

.action-btn.comments-btn.has-comments {
  color: var(--color-accent);
}

.comment-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  font-size: 10px;
  font-weight: 600;
  color: white;
  background: var(--color-accent);
  border-radius: 8px;
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

.encrypted-badge {
  display: flex;
  gap: 3px;
  align-items: center;
  color: #7c6bc4;
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

/* Mobile responsive */
@media (max-width: 767px) {
  .page-header {
    flex-wrap: wrap;
  }

  .page-meta {
    flex-basis: calc(100% - 72px);
    min-width: 0;
  }

  .page-title {
    font-size: var(--text-2xl);
  }

  .page-icon {
    font-size: 2rem;
  }

  .header-actions {
    flex-basis: 100%;
    flex-wrap: wrap;
    padding-top: var(--space-2);
  }
}
</style>
