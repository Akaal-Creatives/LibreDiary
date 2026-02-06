<script setup lang="ts">
import { ref, watch, computed, nextTick } from 'vue';
import { commentsService, type Comment } from '@/services';
import { useOrganizationsStore, useAuthStore } from '@/stores';
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue';
import MentionAutocomplete from '@/components/MentionAutocomplete.vue';

const props = defineProps<{
  pageId: string;
  isOpen: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'comment-count-change', count: number): void;
}>();

const orgStore = useOrganizationsStore();
const authStore = useAuthStore();

// State
const loading = ref(true);
const comments = ref<Comment[]>([]);
const error = ref<string | null>(null);
const newCommentContent = ref('');
const submitting = ref(false);

// Reply state
const replyingTo = ref<string | null>(null);
const replyContent = ref('');

// Edit state
const editingComment = ref<string | null>(null);
const editContent = ref('');

// Delete confirmation
const showDeleteConfirm = ref(false);
const deletingCommentId = ref<string | null>(null);
const deleting = ref(false);

// Input refs
const replyInput = ref<HTMLTextAreaElement | null>(null);
const editInput = ref<HTMLTextAreaElement | null>(null);

const orgId = computed(() => orgStore.currentOrganization?.id);
const currentUserId = computed(() => authStore.user?.id);

const totalComments = computed(() => {
  let count = comments.value.length;
  for (const comment of comments.value) {
    count += comment.replies?.length || 0;
  }
  return count;
});

const unresolvedCount = computed(() => {
  return comments.value.filter((c) => !c.isResolved).length;
});

watch(
  () => props.isOpen,
  (open) => {
    if (open) {
      loadComments();
    }
  }
);

watch(totalComments, (count) => {
  emit('comment-count-change', count);
});

async function loadComments() {
  if (!orgId.value) return;

  loading.value = true;
  error.value = null;

  try {
    comments.value = await commentsService.getComments(orgId.value, props.pageId);
  } catch (e) {
    console.error('Failed to load comments:', e);
    error.value = 'Failed to load comments';
  } finally {
    loading.value = false;
  }
}

async function submitComment() {
  if (!orgId.value || !newCommentContent.value.trim()) return;

  submitting.value = true;

  try {
    const comment = await commentsService.createComment(orgId.value, props.pageId, {
      content: newCommentContent.value.trim(),
    });
    comments.value.unshift(comment);
    newCommentContent.value = '';
  } catch (e) {
    console.error('Failed to create comment:', e);
    error.value = 'Failed to post comment';
  } finally {
    submitting.value = false;
  }
}

async function submitReply(parentId: string) {
  if (!orgId.value || !replyContent.value.trim()) return;

  submitting.value = true;

  try {
    const reply = await commentsService.createComment(orgId.value, props.pageId, {
      content: replyContent.value.trim(),
      parentId,
    });

    // Add reply to parent comment
    const parent = comments.value.find((c) => c.id === parentId);
    if (parent) {
      if (!parent.replies) parent.replies = [];
      parent.replies.push(reply);
    }

    replyContent.value = '';
    replyingTo.value = null;
  } catch (e) {
    console.error('Failed to create reply:', e);
    error.value = 'Failed to post reply';
  } finally {
    submitting.value = false;
  }
}

function startReply(commentId: string) {
  replyingTo.value = commentId;
  replyContent.value = '';
  nextTick(() => replyInput.value?.focus());
}

function cancelReply() {
  replyingTo.value = null;
  replyContent.value = '';
}

function startEdit(comment: Comment) {
  editingComment.value = comment.id;
  editContent.value = comment.content;
  nextTick(() => editInput.value?.focus());
}

function cancelEdit() {
  editingComment.value = null;
  editContent.value = '';
}

async function saveEdit(commentId: string) {
  if (!orgId.value || !editContent.value.trim()) return;

  submitting.value = true;

  try {
    const updated = await commentsService.updateComment(orgId.value, props.pageId, commentId, {
      content: editContent.value.trim(),
    });

    // Update in list
    const index = comments.value.findIndex((c) => c.id === commentId);
    if (index !== -1) {
      comments.value[index] = { ...comments.value[index], ...updated };
    } else {
      // Check in replies
      for (const comment of comments.value) {
        const replyIndex = comment.replies?.findIndex((r) => r.id === commentId);
        if (replyIndex !== undefined && replyIndex !== -1 && comment.replies) {
          comment.replies[replyIndex] = { ...comment.replies[replyIndex], ...updated };
          break;
        }
      }
    }

    editingComment.value = null;
    editContent.value = '';
  } catch (e) {
    console.error('Failed to update comment:', e);
    error.value = 'Failed to update comment';
  } finally {
    submitting.value = false;
  }
}

function confirmDelete(commentId: string) {
  deletingCommentId.value = commentId;
  showDeleteConfirm.value = true;
}

async function deleteComment() {
  if (!orgId.value || !deletingCommentId.value) return;

  deleting.value = true;

  try {
    await commentsService.deleteComment(orgId.value, props.pageId, deletingCommentId.value);

    // Remove from list
    const index = comments.value.findIndex((c) => c.id === deletingCommentId.value);
    if (index !== -1) {
      comments.value.splice(index, 1);
    } else {
      // Check in replies
      for (const comment of comments.value) {
        const replyIndex = comment.replies?.findIndex((r) => r.id === deletingCommentId.value);
        if (replyIndex !== undefined && replyIndex !== -1) {
          comment.replies?.splice(replyIndex, 1);
          break;
        }
      }
    }

    showDeleteConfirm.value = false;
    deletingCommentId.value = null;
  } catch (e) {
    console.error('Failed to delete comment:', e);
    error.value = 'Failed to delete comment';
  } finally {
    deleting.value = false;
  }
}

async function toggleResolve(comment: Comment) {
  if (!orgId.value) return;

  try {
    const updated = await commentsService.resolveComment(
      orgId.value,
      props.pageId,
      comment.id,
      !comment.isResolved
    );

    const index = comments.value.findIndex((c) => c.id === comment.id);
    if (index !== -1) {
      comments.value[index] = { ...comments.value[index], ...updated };
    }
  } catch (e) {
    console.error('Failed to resolve comment:', e);
    error.value = 'Failed to resolve comment';
  }
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

function getInitials(name: string | null): string {
  if (!name) return '?';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function formatContentWithMentions(content: string): string {
  // Replace @mentions with styled spans
  return content.replace(/(?:^|(?<=\s))@([a-zA-Z0-9_]+)/g, '<span class="mention">@$1</span>');
}

function close() {
  emit('close');
}
</script>

<template>
  <Teleport to="body">
    <Transition name="panel">
      <div v-if="isOpen" class="comments-overlay" @click.self="close">
        <aside class="comments-panel">
          <!-- Header -->
          <header class="panel-header">
            <div class="header-content">
              <div class="header-icon">
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path
                    d="M15.75 9C15.75 12.7279 12.7279 15.75 9 15.75C7.83594 15.75 6.74219 15.4688 5.78125 14.9609L2.25 15.75L3.03906 12.2188C2.53125 11.2578 2.25 10.1641 2.25 9C2.25 5.27208 5.27208 2.25 9 2.25C12.7279 2.25 15.75 5.27208 15.75 9Z"
                    stroke="currentColor"
                    stroke-width="1.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              </div>
              <div class="header-text">
                <h2 class="panel-title">Comments</h2>
                <p class="panel-subtitle">
                  {{ totalComments }} {{ totalComments === 1 ? 'comment' : 'comments' }}
                  <span v-if="unresolvedCount > 0" class="unresolved-badge">
                    {{ unresolvedCount }} open
                  </span>
                </p>
              </div>
            </div>
            <button class="close-btn" aria-label="Close" @click="close">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path
                  d="M13.5 4.5L4.5 13.5M4.5 4.5L13.5 13.5"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                />
              </svg>
            </button>
          </header>

          <!-- New Comment Input -->
          <div class="new-comment-section">
            <div class="comment-input-wrapper">
              <MentionAutocomplete
                v-model="newCommentContent"
                :organization-id="orgId || ''"
                placeholder="Add a comment... Use @ to mention"
                :rows="2"
                :disabled="submitting"
                @submit="submitComment"
              />
              <div class="input-actions">
                <span class="input-hint">Use @ to mention · Cmd+Enter to send</span>
                <button
                  class="submit-btn"
                  :disabled="!newCommentContent.trim() || submitting"
                  @click="submitComment"
                >
                  <svg v-if="submitting" class="spinner" width="14" height="14" viewBox="0 0 14 14">
                    <circle
                      cx="7"
                      cy="7"
                      r="5"
                      stroke="currentColor"
                      stroke-width="2"
                      fill="none"
                      stroke-dasharray="20"
                      stroke-linecap="round"
                    />
                  </svg>
                  <svg v-else width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path
                      d="M12.5 7L2 2L4 7M12.5 7L2 12L4 7M12.5 7H4"
                      stroke="currentColor"
                      stroke-width="1.5"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          <!-- Comments List -->
          <div class="panel-body">
            <!-- Loading -->
            <div v-if="loading" class="panel-loading">
              <div v-for="i in 3" :key="i" class="skeleton-comment">
                <div class="skeleton-avatar"></div>
                <div class="skeleton-content">
                  <div class="skeleton-header"></div>
                  <div class="skeleton-text"></div>
                  <div class="skeleton-text short"></div>
                </div>
              </div>
            </div>

            <!-- Error -->
            <div v-else-if="error" class="panel-error">
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
              <p>{{ error }}</p>
              <button class="retry-btn" @click="loadComments">Try Again</button>
            </div>

            <!-- Empty -->
            <div v-else-if="comments.length === 0" class="panel-empty">
              <div class="empty-illustration">
                <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                  <circle
                    cx="32"
                    cy="32"
                    r="24"
                    stroke="currentColor"
                    stroke-width="1.5"
                    opacity="0.3"
                  />
                  <path
                    d="M48 32C48 40.8366 40.8366 48 32 48C28.1797 48 24.6484 46.75 21.8125 44.625L14 48L17.375 40.1875C15.25 37.3516 14 33.8203 14 30C14 21.1634 21.1634 14 30 14"
                    stroke="currentColor"
                    stroke-width="1.5"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    opacity="0.5"
                  />
                  <path
                    d="M44 20L52 20M48 16V24"
                    stroke="currentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    opacity="0.7"
                  />
                </svg>
              </div>
              <h3>Start the conversation</h3>
              <p>Be the first to leave a comment on this page</p>
            </div>

            <!-- Comments -->
            <TransitionGroup v-else name="list" tag="div" class="comments-list">
              <div
                v-for="comment in comments"
                :key="comment.id"
                class="comment-thread"
                :class="{ resolved: comment.isResolved }"
              >
                <!-- Main Comment -->
                <div class="comment">
                  <div
                    class="comment-avatar"
                    :title="comment.createdBy.name || comment.createdBy.email"
                  >
                    <img
                      v-if="comment.createdBy.avatarUrl"
                      :src="comment.createdBy.avatarUrl"
                      :alt="comment.createdBy.name || ''"
                    />
                    <span v-else class="avatar-initials">
                      {{ getInitials(comment.createdBy.name) }}
                    </span>
                  </div>

                  <div class="comment-body">
                    <div class="comment-header">
                      <span class="comment-author">
                        {{ comment.createdBy.name || comment.createdBy.email }}
                      </span>
                      <span class="comment-date">{{ formatDate(comment.createdAt) }}</span>
                      <button
                        v-if="!comment.parentId"
                        class="resolve-btn"
                        :class="{ resolved: comment.isResolved }"
                        :title="comment.isResolved ? 'Reopen thread' : 'Resolve thread'"
                        @click="toggleResolve(comment)"
                      >
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                          <circle cx="7" cy="7" r="5.5" stroke="currentColor" stroke-width="1.2" />
                          <path
                            v-if="comment.isResolved"
                            d="M4.5 7L6.5 9L9.5 5"
                            stroke="currentColor"
                            stroke-width="1.2"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                          />
                        </svg>
                      </button>
                    </div>

                    <!-- Edit Mode -->
                    <div v-if="editingComment === comment.id" class="edit-mode">
                      <textarea
                        ref="editInput"
                        v-model="editContent"
                        class="edit-input"
                        rows="2"
                        :disabled="submitting"
                      />
                      <div class="edit-actions">
                        <button class="cancel-btn" :disabled="submitting" @click="cancelEdit">
                          Cancel
                        </button>
                        <button
                          class="save-btn"
                          :disabled="!editContent.trim() || submitting"
                          @click="saveEdit(comment.id)"
                        >
                          Save
                        </button>
                      </div>
                    </div>

                    <!-- Content -->
                    <!-- eslint-disable-next-line vue/no-v-html -->
                    <p
                      v-else
                      class="comment-content"
                      v-html="formatContentWithMentions(comment.content)"
                    ></p>

                    <!-- Actions -->
                    <div v-if="editingComment !== comment.id" class="comment-actions">
                      <button class="action-btn" @click="startReply(comment.id)">Reply</button>
                      <template v-if="comment.createdById === currentUserId">
                        <button class="action-btn" @click="startEdit(comment)">Edit</button>
                        <button class="action-btn delete" @click="confirmDelete(comment.id)">
                          Delete
                        </button>
                      </template>
                    </div>
                  </div>
                </div>

                <!-- Replies -->
                <div v-if="comment.replies && comment.replies.length > 0" class="replies">
                  <div v-for="reply in comment.replies" :key="reply.id" class="comment reply">
                    <div
                      class="comment-avatar small"
                      :title="reply.createdBy.name || reply.createdBy.email"
                    >
                      <img
                        v-if="reply.createdBy.avatarUrl"
                        :src="reply.createdBy.avatarUrl"
                        :alt="reply.createdBy.name || ''"
                      />
                      <span v-else class="avatar-initials">
                        {{ getInitials(reply.createdBy.name) }}
                      </span>
                    </div>

                    <div class="comment-body">
                      <div class="comment-header">
                        <span class="comment-author">
                          {{ reply.createdBy.name || reply.createdBy.email }}
                        </span>
                        <span class="comment-date">{{ formatDate(reply.createdAt) }}</span>
                      </div>

                      <!-- Edit Mode -->
                      <div v-if="editingComment === reply.id" class="edit-mode">
                        <textarea
                          ref="editInput"
                          v-model="editContent"
                          class="edit-input"
                          rows="2"
                          :disabled="submitting"
                        />
                        <div class="edit-actions">
                          <button class="cancel-btn" :disabled="submitting" @click="cancelEdit">
                            Cancel
                          </button>
                          <button
                            class="save-btn"
                            :disabled="!editContent.trim() || submitting"
                            @click="saveEdit(reply.id)"
                          >
                            Save
                          </button>
                        </div>
                      </div>

                      <!-- eslint-disable-next-line vue/no-v-html -->
                      <p
                        v-else
                        class="comment-content"
                        v-html="formatContentWithMentions(reply.content)"
                      ></p>

                      <div
                        v-if="editingComment !== reply.id && reply.createdById === currentUserId"
                        class="comment-actions"
                      >
                        <button class="action-btn" @click="startEdit(reply)">Edit</button>
                        <button class="action-btn delete" @click="confirmDelete(reply.id)">
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Reply Input -->
                <div v-if="replyingTo === comment.id" class="reply-input-wrapper">
                  <MentionAutocomplete
                    v-model="replyContent"
                    :organization-id="orgId || ''"
                    placeholder="Write a reply... Use @ to mention"
                    :rows="2"
                    :disabled="submitting"
                    @submit="submitReply(comment.id)"
                  />
                  <div class="reply-actions">
                    <button class="cancel-btn" :disabled="submitting" @click="cancelReply">
                      Cancel
                    </button>
                    <button
                      class="submit-reply-btn"
                      :disabled="!replyContent.trim() || submitting"
                      @click="submitReply(comment.id)"
                    >
                      Reply
                    </button>
                  </div>
                </div>
              </div>
            </TransitionGroup>
          </div>
        </aside>
      </div>
    </Transition>
  </Teleport>

  <!-- Delete Confirmation -->
  <ConfirmDialog
    :open="showDeleteConfirm"
    title="Delete Comment"
    message="Are you sure you want to delete this comment? This action cannot be undone."
    confirm-text="Delete"
    cancel-text="Cancel"
    variant="destructive"
    @confirm="deleteComment"
    @close="showDeleteConfirm = false"
  />
</template>

<style scoped>
/* Panel Overlay */
.comments-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  justify-content: flex-end;
  background: rgba(0, 0, 0, 0.2);
  backdrop-filter: blur(2px);
}

.comments-panel {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 420px;
  height: 100vh;
  background: var(--color-bg-primary);
  box-shadow:
    -20px 0 60px -12px rgba(0, 0, 0, 0.15),
    -8px 0 24px -8px rgba(0, 0, 0, 0.1);
}

/* Header */
.panel-header {
  display: flex;
  gap: var(--space-3);
  align-items: flex-start;
  justify-content: space-between;
  padding: var(--space-4) var(--space-5);
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
  background: rgba(124, 154, 140, 0.1);
  border-radius: var(--radius-lg);
}

.panel-title {
  margin: 0;
  font-size: var(--text-base);
  font-weight: 600;
  color: var(--color-text-primary);
  letter-spacing: -0.01em;
}

.panel-subtitle {
  display: flex;
  gap: var(--space-2);
  align-items: center;
  margin: 2px 0 0;
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

.unresolved-badge {
  padding: 1px 6px;
  font-weight: 500;
  color: var(--color-warning);
  background: rgba(234, 179, 8, 0.1);
  border-radius: var(--radius-sm);
}

.close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
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

/* New Comment */
.new-comment-section {
  padding: var(--space-4) var(--space-5);
  border-bottom: 1px solid var(--color-border);
}

.comment-input-wrapper {
  position: relative;
}

.comment-input {
  width: 100%;
  padding: var(--space-3);
  font-family: inherit;
  font-size: var(--text-sm);
  line-height: 1.5;
  color: var(--color-text-primary);
  resize: none;
  background: var(--color-bg-secondary);
  border: 1px solid transparent;
  border-radius: var(--radius-lg);
  transition: all var(--transition-fast);
}

.comment-input::placeholder {
  color: var(--color-text-tertiary);
}

.comment-input:focus {
  background: var(--color-bg-primary);
  border-color: var(--color-accent);
  outline: none;
  box-shadow: 0 0 0 3px rgba(124, 154, 140, 0.1);
}

.input-actions {
  display: flex;
  gap: var(--space-2);
  align-items: center;
  justify-content: space-between;
  margin-top: var(--space-2);
}

.input-hint {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

.submit-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  color: white;
  cursor: pointer;
  background: var(--color-accent);
  border: none;
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
}

.submit-btn:hover:not(:disabled) {
  background: var(--color-accent-hover, #6b8f71);
  transform: translateX(2px);
}

.submit-btn:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.spinner {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Panel Body */
.panel-body {
  flex: 1;
  padding: var(--space-4) var(--space-5);
  overflow-y: auto;
}

/* Loading Skeleton */
.panel-loading {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.skeleton-comment {
  display: flex;
  gap: var(--space-3);
}

.skeleton-avatar {
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  background: var(--color-bg-tertiary);
  border-radius: 50%;
  animation: skeleton-pulse 1.5s ease-in-out infinite;
}

.skeleton-content {
  flex: 1;
}

.skeleton-header {
  width: 40%;
  height: 12px;
  margin-bottom: var(--space-2);
  background: var(--color-bg-tertiary);
  border-radius: var(--radius-xs);
  animation: skeleton-pulse 1.5s ease-in-out infinite;
  animation-delay: 0.1s;
}

.skeleton-text {
  width: 100%;
  height: 10px;
  margin-bottom: var(--space-1);
  background: var(--color-bg-tertiary);
  border-radius: var(--radius-xs);
  animation: skeleton-pulse 1.5s ease-in-out infinite;
  animation-delay: 0.2s;
}

.skeleton-text.short {
  width: 60%;
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

/* Error & Empty States */
.panel-error,
.panel-empty {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  align-items: center;
  padding: var(--space-10);
  text-align: center;
}

.panel-error svg {
  color: var(--color-error);
}

.panel-error p,
.panel-empty p {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--color-text-tertiary);
}

.panel-empty h3 {
  margin: var(--space-2) 0 0;
  font-size: var(--text-base);
  font-weight: 600;
  color: var(--color-text-primary);
}

.empty-illustration {
  color: var(--color-accent);
  opacity: 0.6;
}

.retry-btn {
  margin-top: var(--space-2);
  padding: var(--space-2) var(--space-4);
  font-family: inherit;
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--color-accent);
  cursor: pointer;
  background: rgba(124, 154, 140, 0.1);
  border: none;
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
}

.retry-btn:hover {
  background: rgba(124, 154, 140, 0.2);
}

/* Comments List */
.comments-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

/* Comment Thread */
.comment-thread {
  padding-bottom: var(--space-4);
  border-bottom: 1px solid var(--color-border);
}

.comment-thread:last-child {
  border-bottom: none;
}

.comment-thread.resolved {
  opacity: 0.6;
}

.comment-thread.resolved .comment-content {
  text-decoration: line-through;
  text-decoration-color: var(--color-text-tertiary);
}

/* Comment */
.comment {
  display: flex;
  gap: var(--space-3);
}

.comment-avatar {
  position: relative;
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  overflow: hidden;
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--color-accent);
  background: rgba(124, 154, 140, 0.15);
  border-radius: 50%;
}

.comment-avatar.small {
  width: 26px;
  height: 26px;
  font-size: 10px;
}

.comment-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.comment-body {
  flex: 1;
  min-width: 0;
}

.comment-header {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  align-items: center;
  margin-bottom: 4px;
}

.comment-author {
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--color-text-primary);
}

.comment-date {
  font-size: var(--text-xs);
  color: var(--color-text-tertiary);
}

.resolve-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  margin-left: auto;
  padding: 0;
  color: var(--color-text-tertiary);
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: var(--radius-sm);
  transition: all var(--transition-fast);
}

.resolve-btn:hover {
  color: var(--color-accent);
  background: rgba(124, 154, 140, 0.1);
}

.resolve-btn.resolved {
  color: var(--color-success);
}

.comment-content {
  margin: 0;
  font-size: var(--text-sm);
  line-height: 1.5;
  color: var(--color-text-primary);
  word-break: break-word;
}

.comment-content :deep(.mention) {
  padding: 1px 4px;
  font-weight: 500;
  color: var(--color-accent);
  background: rgba(124, 154, 140, 0.1);
  border-radius: var(--radius-xs);
}

.comment-actions {
  display: flex;
  gap: var(--space-3);
  margin-top: var(--space-2);
}

.action-btn {
  padding: 0;
  font-family: inherit;
  font-size: var(--text-xs);
  font-weight: 500;
  color: var(--color-text-tertiary);
  cursor: pointer;
  background: none;
  border: none;
  transition: color var(--transition-fast);
}

.action-btn:hover {
  color: var(--color-accent);
}

.action-btn.delete:hover {
  color: var(--color-error);
}

/* Replies */
.replies {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  margin-top: var(--space-3);
  margin-left: 44px;
  padding-left: var(--space-3);
  border-left: 2px solid var(--color-border);
}

/* Reply Input */
.reply-input-wrapper {
  margin-top: var(--space-3);
  margin-left: 44px;
}

.reply-input {
  width: 100%;
  padding: var(--space-2) var(--space-3);
  font-family: inherit;
  font-size: var(--text-sm);
  line-height: 1.5;
  color: var(--color-text-primary);
  resize: none;
  background: var(--color-bg-secondary);
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
}

.reply-input:focus {
  background: var(--color-bg-primary);
  border-color: var(--color-accent);
  outline: none;
  box-shadow: 0 0 0 2px rgba(124, 154, 140, 0.1);
}

.reply-actions {
  display: flex;
  gap: var(--space-2);
  justify-content: flex-end;
  margin-top: var(--space-2);
}

.cancel-btn {
  padding: var(--space-1) var(--space-3);
  font-family: inherit;
  font-size: var(--text-xs);
  font-weight: 500;
  color: var(--color-text-secondary);
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: var(--radius-sm);
  transition: all var(--transition-fast);
}

.cancel-btn:hover:not(:disabled) {
  color: var(--color-text-primary);
  background: var(--color-hover);
}

.submit-reply-btn,
.save-btn {
  padding: var(--space-1) var(--space-3);
  font-family: inherit;
  font-size: var(--text-xs);
  font-weight: 500;
  color: white;
  cursor: pointer;
  background: var(--color-accent);
  border: none;
  border-radius: var(--radius-sm);
  transition: all var(--transition-fast);
}

.submit-reply-btn:hover:not(:disabled),
.save-btn:hover:not(:disabled) {
  background: var(--color-accent-hover, #6b8f71);
}

.submit-reply-btn:disabled,
.save-btn:disabled,
.cancel-btn:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

/* Edit Mode */
.edit-mode {
  margin-top: var(--space-1);
}

.edit-input {
  width: 100%;
  padding: var(--space-2);
  font-family: inherit;
  font-size: var(--text-sm);
  line-height: 1.5;
  color: var(--color-text-primary);
  resize: none;
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-accent);
  border-radius: var(--radius-md);
}

.edit-input:focus {
  outline: none;
  box-shadow: 0 0 0 2px rgba(124, 154, 140, 0.1);
}

.edit-actions {
  display: flex;
  gap: var(--space-2);
  justify-content: flex-end;
  margin-top: var(--space-2);
}

/* Transitions */
.panel-enter-active,
.panel-leave-active {
  transition: all 0.25s ease;
}

.panel-enter-from .comments-panel,
.panel-leave-to .comments-panel {
  transform: translateX(100%);
}

.panel-enter-from,
.panel-leave-to {
  opacity: 0;
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
