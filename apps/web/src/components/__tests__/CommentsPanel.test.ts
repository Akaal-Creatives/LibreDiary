import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import type { Comment } from '@/services/comments.service';

// Hoist mock definitions so they are available before module-level vi.mock calls
const { mockCommentsService } = vi.hoisted(() => ({
  mockCommentsService: {
    getComments: vi.fn(),
    getCommentCount: vi.fn(),
    createComment: vi.fn(),
    updateComment: vi.fn(),
    deleteComment: vi.fn(),
    resolveComment: vi.fn(),
  },
}));

vi.mock('@/services', () => ({
  commentsService: mockCommentsService,
}));

vi.mock('@/stores', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    useOrganizationsStore: () => ({
      currentOrganization: { id: 'org-1' },
    }),
    useAuthStore: () => ({
      user: { id: 'user-1' },
    }),
  };
});

// Stub child components to isolate CommentsPanel under test
vi.mock('@/components/ui/ConfirmDialog.vue', () => ({
  default: {
    name: 'ConfirmDialog',
    template: '<div class="stub-confirm-dialog" />',
    props: ['open', 'title', 'message', 'confirmText', 'cancelText', 'variant'],
    emits: ['confirm', 'close'],
  },
}));

vi.mock('@/components/MentionAutocomplete.vue', () => ({
  default: {
    name: 'MentionAutocomplete',
    template:
      '<textarea class="stub-mention-autocomplete" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
    props: ['modelValue', 'organizationId', 'placeholder', 'rows', 'disabled'],
    emits: ['update:modelValue', 'submit'],
  },
}));

import CommentsPanel from '../CommentsPanel.vue';

// ---------------------------------------------------------------------------
// Test data helpers
// ---------------------------------------------------------------------------

function makeComment(overrides?: Partial<Comment>): Comment {
  return {
    id: 'comment-1',
    pageId: 'page-1',
    parentId: null,
    blockId: null,
    content: 'Hello world',
    isResolved: false,
    resolvedAt: null,
    resolvedById: null,
    createdById: 'user-1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: {
      id: 'user-1',
      name: 'Alice Smith',
      email: 'alice@test.com',
      avatarUrl: null,
    },
    resolvedBy: null,
    replies: [],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Mount helper
// ---------------------------------------------------------------------------

function mountPanel(props: Record<string, unknown> = {}) {
  return mount(CommentsPanel, {
    props: {
      pageId: 'page-1',
      isOpen: false,
      ...props,
    },
    global: {
      stubs: {
        Teleport: true,
        Transition: true,
        TransitionGroup: true,
      },
    },
  });
}

/**
 * Opens the panel by setting isOpen to true, waits for flushPromises so the
 * watcher fires and the service call resolves.
 */
async function openPanel(wrapper: ReturnType<typeof mountPanel>) {
  await wrapper.setProps({ isOpen: true });
  await flushPromises();
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('CommentsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: service resolves with empty array
    mockCommentsService.getComments.mockResolvedValue([]);
  });

  // -------------------------------------------------------------------------
  // 1. Does not render panel when isOpen is false
  // -------------------------------------------------------------------------
  describe('visibility', () => {
    it('should not render the panel content when isOpen is false', () => {
      const wrapper = mountPanel({ isOpen: false });

      // The overlay and panel should not be present (v-if="isOpen")
      expect(wrapper.find('.comments-overlay').exists()).toBe(false);
      expect(wrapper.find('.comments-panel').exists()).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // 2. Shows loading skeleton when comments are loading
  // -------------------------------------------------------------------------
  describe('loading state', () => {
    it('should show three loading skeleton items whilst comments are loading', async () => {
      // Make getComments hang so loading stays true
      mockCommentsService.getComments.mockImplementation(
        () => new Promise(() => {}) // never resolves
      );

      const wrapper = mountPanel();
      await wrapper.setProps({ isOpen: true });
      // Do NOT await flushPromises — we want the loading state

      // Give Vue a tick to process the watcher
      await wrapper.vm.$nextTick();

      const skeletons = wrapper.findAll('.skeleton-comment');
      expect(skeletons).toHaveLength(3);
    });
  });

  // -------------------------------------------------------------------------
  // 3. Shows error state with message when fetch fails
  // -------------------------------------------------------------------------
  describe('error state', () => {
    it('should show error message when fetching comments fails', async () => {
      mockCommentsService.getComments.mockRejectedValue(new Error('Network failure'));

      const wrapper = mountPanel();
      await openPanel(wrapper);

      expect(wrapper.find('.panel-error').exists()).toBe(true);
      expect(wrapper.find('.panel-error').text()).toContain('Failed to load comments');
    });

    // -----------------------------------------------------------------------
    // 4. Shows retry button that reloads comments on click
    // -----------------------------------------------------------------------
    it('should reload comments when retry button is clicked', async () => {
      mockCommentsService.getComments.mockRejectedValueOnce(new Error('fail'));

      const wrapper = mountPanel();
      await openPanel(wrapper);

      expect(wrapper.find('.panel-error').exists()).toBe(true);

      // Now make it succeed
      mockCommentsService.getComments.mockResolvedValue([]);
      await wrapper.find('.retry-btn').trigger('click');
      await flushPromises();

      expect(wrapper.find('.panel-error').exists()).toBe(false);
      expect(mockCommentsService.getComments).toHaveBeenCalledTimes(2);
    });
  });

  // -------------------------------------------------------------------------
  // 5. Shows empty state when no comments exist
  // -------------------------------------------------------------------------
  describe('empty state', () => {
    it('should show "Start the conversation" when there are no comments', async () => {
      mockCommentsService.getComments.mockResolvedValue([]);

      const wrapper = mountPanel();
      await openPanel(wrapper);

      expect(wrapper.find('.panel-empty').exists()).toBe(true);
      expect(wrapper.text()).toContain('Start the conversation');
    });
  });

  // -------------------------------------------------------------------------
  // 6–11. Comments list rendering
  // -------------------------------------------------------------------------
  describe('comments list', () => {
    it('should render comments with author name and content', async () => {
      const comments = [
        makeComment({
          id: 'c1',
          content: 'First comment',
          createdBy: {
            id: 'user-1',
            name: 'Alice Smith',
            email: 'alice@test.com',
            avatarUrl: null,
          },
        }),
        makeComment({
          id: 'c2',
          content: 'Second comment',
          createdBy: { id: 'user-2', name: 'Bob Jones', email: 'bob@test.com', avatarUrl: null },
          createdById: 'user-2',
        }),
      ];
      mockCommentsService.getComments.mockResolvedValue(comments);

      const wrapper = mountPanel();
      await openPanel(wrapper);

      const threads = wrapper.findAll('.comment-thread');
      expect(threads).toHaveLength(2);

      // Check first comment author and content
      expect(threads[0]!.text()).toContain('Alice Smith');
      expect(threads[0]!.text()).toContain('First comment');

      // Check second comment author and content
      expect(threads[1]!.text()).toContain('Bob Jones');
      expect(threads[1]!.text()).toContain('Second comment');
    });

    // -----------------------------------------------------------------------
    // 7. Shows avatar initials when no avatarUrl
    // -----------------------------------------------------------------------
    it('should show avatar initials when no avatarUrl is provided', async () => {
      mockCommentsService.getComments.mockResolvedValue([
        makeComment({
          createdBy: {
            id: 'user-1',
            name: 'Alice Smith',
            email: 'alice@test.com',
            avatarUrl: null,
          },
        }),
      ]);

      const wrapper = mountPanel();
      await openPanel(wrapper);

      const initials = wrapper.find('.avatar-initials');
      expect(initials.exists()).toBe(true);
      expect(initials.text()).toBe('AS');
    });

    it('should show avatar image when avatarUrl is provided', async () => {
      mockCommentsService.getComments.mockResolvedValue([
        makeComment({
          createdBy: {
            id: 'user-1',
            name: 'Alice Smith',
            email: 'alice@test.com',
            avatarUrl: 'https://example.com/avatar.jpg',
          },
        }),
      ]);

      const wrapper = mountPanel();
      await openPanel(wrapper);

      const img = wrapper.find('.comment-avatar img');
      expect(img.exists()).toBe(true);
      expect(img.attributes('src')).toBe('https://example.com/avatar.jpg');
    });

    it('should show "?" initials when author name is null', async () => {
      mockCommentsService.getComments.mockResolvedValue([
        makeComment({
          createdBy: { id: 'user-1', name: null, email: 'alice@test.com', avatarUrl: null },
        }),
      ]);

      const wrapper = mountPanel();
      await openPanel(wrapper);

      expect(wrapper.find('.avatar-initials').text()).toBe('?');
    });

    // -----------------------------------------------------------------------
    // 8. Shows comment count in header
    // -----------------------------------------------------------------------
    it('should show correct comment count in the header subtitle', async () => {
      mockCommentsService.getComments.mockResolvedValue([
        makeComment({ id: 'c1' }),
        makeComment({ id: 'c2' }),
      ]);

      const wrapper = mountPanel();
      await openPanel(wrapper);

      expect(wrapper.find('.panel-subtitle').text()).toContain('2 comments');
    });

    it('should use singular "comment" when there is exactly one comment', async () => {
      mockCommentsService.getComments.mockResolvedValue([makeComment()]);

      const wrapper = mountPanel();
      await openPanel(wrapper);

      expect(wrapper.find('.panel-subtitle').text()).toContain('1 comment');
      // Ensure it does not say "1 comments"
      expect(wrapper.find('.panel-subtitle').text()).not.toContain('1 comments');
    });

    // -----------------------------------------------------------------------
    // 9. Shows unresolved badge count
    // -----------------------------------------------------------------------
    it('should show unresolved badge when there are unresolved top-level comments', async () => {
      mockCommentsService.getComments.mockResolvedValue([
        makeComment({ id: 'c1', isResolved: false }),
        makeComment({ id: 'c2', isResolved: true }),
        makeComment({ id: 'c3', isResolved: false }),
      ]);

      const wrapper = mountPanel();
      await openPanel(wrapper);

      const badge = wrapper.find('.unresolved-badge');
      expect(badge.exists()).toBe(true);
      expect(badge.text()).toContain('2 open');
    });

    it('should not show unresolved badge when all comments are resolved', async () => {
      mockCommentsService.getComments.mockResolvedValue([
        makeComment({ id: 'c1', isResolved: true }),
      ]);

      const wrapper = mountPanel();
      await openPanel(wrapper);

      expect(wrapper.find('.unresolved-badge').exists()).toBe(false);
    });

    // -----------------------------------------------------------------------
    // 10. Shows Reply, Edit, Delete buttons for own comments
    // -----------------------------------------------------------------------
    it("should show Reply, Edit, and Delete action buttons for the current user's comments", async () => {
      // createdById matches the mocked currentUserId ('user-1')
      mockCommentsService.getComments.mockResolvedValue([makeComment({ createdById: 'user-1' })]);

      const wrapper = mountPanel();
      await openPanel(wrapper);

      const actions = wrapper.findAll('.comment-actions .action-btn');
      const actionLabels = actions.map((a) => a.text());

      expect(actionLabels).toContain('Reply');
      expect(actionLabels).toContain('Edit');
      expect(actionLabels).toContain('Delete');
    });

    // -----------------------------------------------------------------------
    // 11. Shows only Reply button for others' comments (no Edit/Delete)
    // -----------------------------------------------------------------------
    it('should show only Reply button for comments authored by other users', async () => {
      mockCommentsService.getComments.mockResolvedValue([
        makeComment({
          createdById: 'user-2',
          createdBy: { id: 'user-2', name: 'Bob Jones', email: 'bob@test.com', avatarUrl: null },
        }),
      ]);

      const wrapper = mountPanel();
      await openPanel(wrapper);

      const actions = wrapper.findAll('.comment-actions .action-btn');
      const actionLabels = actions.map((a) => a.text());

      expect(actionLabels).toContain('Reply');
      expect(actionLabels).not.toContain('Edit');
      expect(actionLabels).not.toContain('Delete');
    });
  });

  // -------------------------------------------------------------------------
  // 12. Calls createComment when submitting a new comment
  // -------------------------------------------------------------------------
  describe('creating comments', () => {
    it('should call createComment when submitting a new comment', async () => {
      mockCommentsService.getComments.mockResolvedValue([]);
      const newComment = makeComment({ id: 'new-1', content: 'A new comment' });
      mockCommentsService.createComment.mockResolvedValue(newComment);

      const wrapper = mountPanel();
      await openPanel(wrapper);

      // Type into the MentionAutocomplete stub
      const textarea = wrapper.find('.new-comment-section .stub-mention-autocomplete');
      await textarea.setValue('A new comment');

      // Click the submit button
      await wrapper.find('.submit-btn').trigger('click');
      await flushPromises();

      expect(mockCommentsService.createComment).toHaveBeenCalledWith('org-1', 'page-1', {
        content: 'A new comment',
      });
    });
  });

  // -------------------------------------------------------------------------
  // 13. Calls resolveComment when resolve button clicked
  // -------------------------------------------------------------------------
  describe('resolving comments', () => {
    it('should call resolveComment with resolve=true when toggling an unresolved comment', async () => {
      const comment = makeComment({ id: 'c1', isResolved: false });
      mockCommentsService.getComments.mockResolvedValue([comment]);
      mockCommentsService.resolveComment.mockResolvedValue({
        ...comment,
        isResolved: true,
      });

      const wrapper = mountPanel();
      await openPanel(wrapper);

      await wrapper.find('.resolve-btn').trigger('click');
      await flushPromises();

      expect(mockCommentsService.resolveComment).toHaveBeenCalledWith(
        'org-1',
        'page-1',
        'c1',
        true
      );
    });

    it('should call resolveComment with resolve=false when toggling a resolved comment', async () => {
      const comment = makeComment({ id: 'c1', isResolved: true });
      mockCommentsService.getComments.mockResolvedValue([comment]);
      mockCommentsService.resolveComment.mockResolvedValue({
        ...comment,
        isResolved: false,
      });

      const wrapper = mountPanel();
      await openPanel(wrapper);

      await wrapper.find('.resolve-btn').trigger('click');
      await flushPromises();

      expect(mockCommentsService.resolveComment).toHaveBeenCalledWith(
        'org-1',
        'page-1',
        'c1',
        false
      );
    });
  });

  // -------------------------------------------------------------------------
  // 14. Shows resolved style on resolved comment thread
  // -------------------------------------------------------------------------
  describe('resolved styling', () => {
    it('should add "resolved" class to resolved comment threads', async () => {
      mockCommentsService.getComments.mockResolvedValue([
        makeComment({ id: 'c1', isResolved: true }),
        makeComment({ id: 'c2', isResolved: false }),
      ]);

      const wrapper = mountPanel();
      await openPanel(wrapper);

      const threads = wrapper.findAll('.comment-thread');
      expect(threads[0]!.classes()).toContain('resolved');
      expect(threads[1]!.classes()).not.toContain('resolved');
    });
  });

  // -------------------------------------------------------------------------
  // 15. Renders close button that emits close when clicked
  // -------------------------------------------------------------------------
  describe('close button', () => {
    it('should emit "close" when the close button is clicked', async () => {
      mockCommentsService.getComments.mockResolvedValue([]);

      const wrapper = mountPanel();
      await openPanel(wrapper);

      await wrapper.find('.close-btn').trigger('click');

      expect(wrapper.emitted('close')).toHaveLength(1);
    });

    it('should emit "close" when clicking the overlay background', async () => {
      mockCommentsService.getComments.mockResolvedValue([]);

      const wrapper = mountPanel();
      await openPanel(wrapper);

      // click.self on .comments-overlay
      await wrapper.find('.comments-overlay').trigger('click');

      expect(wrapper.emitted('close')).toHaveLength(1);
    });
  });

  // -------------------------------------------------------------------------
  // 16. Formats @mentions in content as styled spans
  // -------------------------------------------------------------------------
  describe('mention formatting', () => {
    it('should format @mentions in comment content as styled spans', async () => {
      mockCommentsService.getComments.mockResolvedValue([
        makeComment({ content: 'Hey @alice check this out' }),
      ]);

      const wrapper = mountPanel();
      await openPanel(wrapper);

      const contentEl = wrapper.find('.comment-content');
      expect(contentEl.html()).toContain('<span class="mention">@alice</span>');
    });

    it('should handle multiple @mentions in the same comment', async () => {
      mockCommentsService.getComments.mockResolvedValue([
        makeComment({ content: '@alice and @bob please review' }),
      ]);

      const wrapper = mountPanel();
      await openPanel(wrapper);

      const contentEl = wrapper.find('.comment-content');
      expect(contentEl.html()).toContain('<span class="mention">@alice</span>');
      expect(contentEl.html()).toContain('<span class="mention">@bob</span>');
    });

    it('should not format email-like text as mentions', async () => {
      mockCommentsService.getComments.mockResolvedValue([
        makeComment({ content: 'Send to alice@example.com' }),
      ]);

      const wrapper = mountPanel();
      await openPanel(wrapper);

      const contentEl = wrapper.find('.comment-content');
      // The regex uses a lookbehind for whitespace or start of string, so
      // alice@example should NOT be treated as a mention
      expect(contentEl.html()).not.toContain('<span class="mention">');
    });
  });

  // -------------------------------------------------------------------------
  // Additional: comment-count-change emit
  // -------------------------------------------------------------------------
  describe('comment-count-change emit', () => {
    it('should emit comment-count-change with total count including replies', async () => {
      const parentComment = makeComment({
        id: 'c1',
        replies: [
          makeComment({ id: 'r1', parentId: 'c1' }),
          makeComment({ id: 'r2', parentId: 'c1' }),
        ],
      });
      mockCommentsService.getComments.mockResolvedValue([parentComment]);

      const wrapper = mountPanel();
      await openPanel(wrapper);

      // totalComments = 1 parent + 2 replies = 3
      const emitted = wrapper.emitted('comment-count-change');
      expect(emitted).toBeTruthy();

      // The last emitted value should be 3
      const lastValue = emitted![emitted!.length - 1]![0];
      expect(lastValue).toBe(3);
    });
  });

  // -------------------------------------------------------------------------
  // Additional: totalComments includes replies in count
  // -------------------------------------------------------------------------
  describe('totalComments computed', () => {
    it('should count 0 when there are no comments', async () => {
      mockCommentsService.getComments.mockResolvedValue([]);

      const wrapper = mountPanel();
      await openPanel(wrapper);

      expect(wrapper.find('.panel-subtitle').text()).toContain('0 comments');
    });
  });
});
