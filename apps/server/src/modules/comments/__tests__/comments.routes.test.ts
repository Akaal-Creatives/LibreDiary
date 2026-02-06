import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from 'vitest';

// Mock auth middleware
vi.mock('../../auth/auth.middleware.js', () => ({
  requireAuth: vi.fn(async (request: { user: { id: string; email: string; name: string } }) => {
    request.user = { id: 'user-123', email: 'test@example.com', name: 'Test User' };
  }),
}));

vi.mock('../../organizations/organizations.middleware.js', () => ({
  requireOrgAccess: vi.fn(async (request: { organizationId: string }) => {
    request.organizationId = 'org-123';
  }),
}));

// Mock services using vi.hoisted
const { mockCommentsService, mockComment, _mockUser, resetMocks } = vi.hoisted(() => {
  const mockCommentsService = {
    createComment: vi.fn(),
    getComments: vi.fn(),
    updateComment: vi.fn(),
    deleteComment: vi.fn(),
    resolveComment: vi.fn(),
    getCommentCount: vi.fn(),
  };

  const now = new Date();

  const mockUser = {
    id: 'user-123',
    name: 'Test User',
    email: 'test@example.com',
    avatarUrl: null,
  };

  const mockComment = {
    id: 'comment-123',
    pageId: 'page-123',
    parentId: null,
    blockId: null,
    content: 'Test comment content',
    isResolved: false,
    resolvedAt: null,
    resolvedById: null,
    createdById: 'user-123',
    createdAt: now,
    updatedAt: now,
    createdBy: mockUser,
    resolvedBy: null,
    replies: [],
  };

  function resetMocks() {
    Object.values(mockCommentsService).forEach((mock) => mock.mockReset());
  }

  return { mockCommentsService, mockComment, _mockUser: mockUser, resetMocks };
});

// Mock the services
vi.mock('../comments.service.js', () => mockCommentsService);

// Import after mocking
import Fastify from 'fastify';
import commentsRoutes from '../comments.routes.js';

describe('Comments Routes', () => {
  let app: ReturnType<typeof Fastify>;

  beforeEach(async () => {
    resetMocks();
    app = Fastify();

    // Mock auth decorator (decorators are added by middleware)
    app.decorateRequest('user', null);
    app.decorateRequest('organizationId', null);

    await app.register(commentsRoutes, { prefix: '/pages/:pageId/comments' });
    await app.ready();
  });

  afterEach(async () => {
    vi.clearAllMocks();
    await app.close();
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  describe('GET /pages/:pageId/comments', () => {
    it('should return all comments for a page', async () => {
      mockCommentsService.getComments.mockResolvedValue([mockComment]);

      const response = await app.inject({
        method: 'GET',
        url: '/pages/page-123/comments',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.comments).toHaveLength(1);
      expect(body.data.comments[0].id).toBe('comment-123');
    });

    it('should filter comments by blockId', async () => {
      mockCommentsService.getComments.mockResolvedValue([{ ...mockComment, blockId: 'block-abc' }]);

      const response = await app.inject({
        method: 'GET',
        url: '/pages/page-123/comments?blockId=block-abc',
      });

      expect(response.statusCode).toBe(200);
      expect(mockCommentsService.getComments).toHaveBeenCalledWith(
        'org-123',
        'page-123',
        'block-abc'
      );
    });

    it('should return 404 for non-existent page', async () => {
      mockCommentsService.getComments.mockRejectedValue(new Error('PAGE_NOT_FOUND'));

      const response = await app.inject({
        method: 'GET',
        url: '/pages/nonexistent/comments',
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('PAGE_NOT_FOUND');
    });
  });

  describe('POST /pages/:pageId/comments', () => {
    it('should create a new comment', async () => {
      mockCommentsService.createComment.mockResolvedValue(mockComment);

      const response = await app.inject({
        method: 'POST',
        url: '/pages/page-123/comments',
        payload: { content: 'Test comment content' },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.comment.content).toBe('Test comment content');
    });

    it('should create a reply to an existing comment', async () => {
      mockCommentsService.createComment.mockResolvedValue({
        ...mockComment,
        id: 'comment-456',
        parentId: 'comment-123',
      });

      const response = await app.inject({
        method: 'POST',
        url: '/pages/page-123/comments',
        payload: { content: 'Reply content', parentId: 'comment-123' },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.data.comment.parentId).toBe('comment-123');
    });

    it('should create an inline comment with blockId', async () => {
      mockCommentsService.createComment.mockResolvedValue({
        ...mockComment,
        blockId: 'block-abc',
      });

      const response = await app.inject({
        method: 'POST',
        url: '/pages/page-123/comments',
        payload: { content: 'Inline comment', blockId: 'block-abc' },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.data.comment.blockId).toBe('block-abc');
    });

    it('should return 400 for empty content', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/pages/page-123/comments',
        payload: { content: '' },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 404 for non-existent page', async () => {
      mockCommentsService.createComment.mockRejectedValue(new Error('PAGE_NOT_FOUND'));

      const response = await app.inject({
        method: 'POST',
        url: '/pages/nonexistent/comments',
        payload: { content: 'Comment' },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 404 for non-existent parent comment', async () => {
      mockCommentsService.createComment.mockRejectedValue(new Error('PARENT_COMMENT_NOT_FOUND'));

      const response = await app.inject({
        method: 'POST',
        url: '/pages/page-123/comments',
        payload: { content: 'Reply', parentId: 'nonexistent' },
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('PATCH /pages/:pageId/comments/:commentId', () => {
    it('should update comment content', async () => {
      mockCommentsService.updateComment.mockResolvedValue({
        ...mockComment,
        content: 'Updated content',
      });

      const response = await app.inject({
        method: 'PATCH',
        url: '/pages/page-123/comments/comment-123',
        payload: { content: 'Updated content' },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.comment.content).toBe('Updated content');
    });

    it('should return 404 for non-existent comment', async () => {
      mockCommentsService.updateComment.mockRejectedValue(new Error('COMMENT_NOT_FOUND'));

      const response = await app.inject({
        method: 'PATCH',
        url: '/pages/page-123/comments/nonexistent',
        payload: { content: 'Updated' },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 403 if user is not the author', async () => {
      mockCommentsService.updateComment.mockRejectedValue(new Error('NOT_COMMENT_AUTHOR'));

      const response = await app.inject({
        method: 'PATCH',
        url: '/pages/page-123/comments/comment-123',
        payload: { content: 'Updated' },
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe('DELETE /pages/:pageId/comments/:commentId', () => {
    it('should delete a comment', async () => {
      mockCommentsService.deleteComment.mockResolvedValue(undefined);

      const response = await app.inject({
        method: 'DELETE',
        url: '/pages/page-123/comments/comment-123',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
    });

    it('should return 404 for non-existent comment', async () => {
      mockCommentsService.deleteComment.mockRejectedValue(new Error('COMMENT_NOT_FOUND'));

      const response = await app.inject({
        method: 'DELETE',
        url: '/pages/page-123/comments/nonexistent',
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 403 if user is not the author', async () => {
      mockCommentsService.deleteComment.mockRejectedValue(new Error('NOT_COMMENT_AUTHOR'));

      const response = await app.inject({
        method: 'DELETE',
        url: '/pages/page-123/comments/comment-123',
      });

      expect(response.statusCode).toBe(403);
    });
  });

  describe('POST /pages/:pageId/comments/:commentId/resolve', () => {
    it('should resolve a comment', async () => {
      mockCommentsService.resolveComment.mockResolvedValue({
        ...mockComment,
        isResolved: true,
        resolvedAt: new Date(),
        resolvedById: 'user-123',
      });

      const response = await app.inject({
        method: 'POST',
        url: '/pages/page-123/comments/comment-123/resolve',
        payload: { resolve: true },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.comment.isResolved).toBe(true);
    });

    it('should unresolve a comment', async () => {
      mockCommentsService.resolveComment.mockResolvedValue({
        ...mockComment,
        isResolved: false,
        resolvedAt: null,
        resolvedById: null,
      });

      const response = await app.inject({
        method: 'POST',
        url: '/pages/page-123/comments/comment-123/resolve',
        payload: { resolve: false },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.comment.isResolved).toBe(false);
    });

    it('should return 404 for non-existent comment', async () => {
      mockCommentsService.resolveComment.mockRejectedValue(new Error('COMMENT_NOT_FOUND'));

      const response = await app.inject({
        method: 'POST',
        url: '/pages/page-123/comments/nonexistent/resolve',
        payload: { resolve: true },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 400 for reply comments', async () => {
      mockCommentsService.resolveComment.mockRejectedValue(new Error('CANNOT_RESOLVE_REPLY'));

      const response = await app.inject({
        method: 'POST',
        url: '/pages/page-123/comments/reply-comment/resolve',
        payload: { resolve: true },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('GET /pages/:pageId/comments/count', () => {
    it('should return total comment count', async () => {
      mockCommentsService.getCommentCount.mockResolvedValue(5);

      const response = await app.inject({
        method: 'GET',
        url: '/pages/page-123/comments/count',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.count).toBe(5);
    });

    it('should return unresolved comment count', async () => {
      mockCommentsService.getCommentCount.mockResolvedValue(3);

      const response = await app.inject({
        method: 'GET',
        url: '/pages/page-123/comments/count?unresolvedOnly=true',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.count).toBe(3);
      expect(mockCommentsService.getCommentCount).toHaveBeenCalledWith('page-123', {
        unresolvedOnly: true,
      });
    });
  });
});
