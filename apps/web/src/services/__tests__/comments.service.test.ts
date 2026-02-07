import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockApi } = vi.hoisted(() => ({
  mockApi: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('../api', () => ({
  api: mockApi,
}));

import { commentsService } from '../comments.service';

describe('Comments Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const orgId = 'org-123';
  const pageId = 'page-456';
  const commentId = 'comment-789';

  // ===========================================
  // getComments
  // ===========================================

  describe('getComments', () => {
    const mockComments = [
      { id: 'comment-1', content: 'First comment', pageId },
      { id: 'comment-2', content: 'Second comment', pageId },
    ];

    it('should call GET /organizations/{orgId}/pages/{pageId}/comments without blockId', async () => {
      mockApi.get.mockResolvedValue({ comments: mockComments });

      const result = await commentsService.getComments(orgId, pageId);

      expect(mockApi.get).toHaveBeenCalledWith(`/organizations/${orgId}/pages/${pageId}/comments`);
      expect(result).toEqual(mockComments);
    });

    it('should append ?blockId={blockId} when blockId is provided', async () => {
      mockApi.get.mockResolvedValue({ comments: mockComments });

      const result = await commentsService.getComments(orgId, pageId, 'block-abc');

      expect(mockApi.get).toHaveBeenCalledWith(
        `/organizations/${orgId}/pages/${pageId}/comments?blockId=block-abc`
      );
      expect(result).toEqual(mockComments);
    });

    it('should return response.comments', async () => {
      mockApi.get.mockResolvedValue({ comments: mockComments });

      const result = await commentsService.getComments(orgId, pageId);

      expect(result).toEqual(mockComments);
    });

    it('should return empty array when no comments exist', async () => {
      mockApi.get.mockResolvedValue({ comments: [] });

      const result = await commentsService.getComments(orgId, pageId);

      expect(result).toEqual([]);
    });

    it('should propagate API errors', async () => {
      mockApi.get.mockRejectedValue(new Error('Not found'));

      await expect(commentsService.getComments(orgId, pageId)).rejects.toThrow('Not found');
    });
  });

  // ===========================================
  // getCommentCount
  // ===========================================

  describe('getCommentCount', () => {
    it('should call GET /organizations/{orgId}/pages/{pageId}/comments/count without query params by default', async () => {
      mockApi.get.mockResolvedValue({ count: 7 });

      const result = await commentsService.getCommentCount(orgId, pageId);

      expect(mockApi.get).toHaveBeenCalledWith(
        `/organizations/${orgId}/pages/${pageId}/comments/count`
      );
      expect(result).toBe(7);
    });

    it('should not append unresolvedOnly when false', async () => {
      mockApi.get.mockResolvedValue({ count: 7 });

      await commentsService.getCommentCount(orgId, pageId, false);

      expect(mockApi.get).toHaveBeenCalledWith(
        `/organizations/${orgId}/pages/${pageId}/comments/count`
      );
    });

    it('should append ?unresolvedOnly=true when unresolvedOnly is true', async () => {
      mockApi.get.mockResolvedValue({ count: 3 });

      const result = await commentsService.getCommentCount(orgId, pageId, true);

      expect(mockApi.get).toHaveBeenCalledWith(
        `/organizations/${orgId}/pages/${pageId}/comments/count?unresolvedOnly=true`
      );
      expect(result).toBe(3);
    });

    it('should return zero count', async () => {
      mockApi.get.mockResolvedValue({ count: 0 });

      const result = await commentsService.getCommentCount(orgId, pageId);

      expect(result).toBe(0);
    });

    it('should propagate API errors', async () => {
      mockApi.get.mockRejectedValue(new Error('Server error'));

      await expect(commentsService.getCommentCount(orgId, pageId)).rejects.toThrow('Server error');
    });
  });

  // ===========================================
  // createComment
  // ===========================================

  describe('createComment', () => {
    const mockComment = { id: commentId, content: 'New comment', pageId };

    it('should call POST /organizations/{orgId}/pages/{pageId}/comments with input body', async () => {
      const input = { content: 'New comment' };
      mockApi.post.mockResolvedValue({ comment: mockComment });

      const result = await commentsService.createComment(orgId, pageId, input);

      expect(mockApi.post).toHaveBeenCalledWith(
        `/organizations/${orgId}/pages/${pageId}/comments`,
        input
      );
      expect(result).toEqual(mockComment);
    });

    it('should pass optional parentId and blockId', async () => {
      const input = { content: 'Reply', parentId: 'parent-1', blockId: 'block-2' };
      mockApi.post.mockResolvedValue({ comment: mockComment });

      await commentsService.createComment(orgId, pageId, input);

      expect(mockApi.post).toHaveBeenCalledWith(
        `/organizations/${orgId}/pages/${pageId}/comments`,
        input
      );
    });

    it('should return response.comment', async () => {
      mockApi.post.mockResolvedValue({ comment: mockComment });

      const result = await commentsService.createComment(orgId, pageId, { content: 'Test' });

      expect(result).toEqual(mockComment);
    });

    it('should propagate API errors', async () => {
      mockApi.post.mockRejectedValue(new Error('Bad request'));

      await expect(commentsService.createComment(orgId, pageId, { content: '' })).rejects.toThrow(
        'Bad request'
      );
    });
  });

  // ===========================================
  // updateComment
  // ===========================================

  describe('updateComment', () => {
    const mockComment = { id: commentId, content: 'Updated comment', pageId };

    it('should call PATCH /organizations/{orgId}/pages/{pageId}/comments/{commentId} with input body', async () => {
      const input = { content: 'Updated comment' };
      mockApi.patch.mockResolvedValue({ comment: mockComment });

      const result = await commentsService.updateComment(orgId, pageId, commentId, input);

      expect(mockApi.patch).toHaveBeenCalledWith(
        `/organizations/${orgId}/pages/${pageId}/comments/${commentId}`,
        input
      );
      expect(result).toEqual(mockComment);
    });

    it('should return response.comment', async () => {
      mockApi.patch.mockResolvedValue({ comment: mockComment });

      const result = await commentsService.updateComment(orgId, pageId, commentId, {
        content: 'Changed',
      });

      expect(result).toEqual(mockComment);
    });

    it('should propagate API errors', async () => {
      mockApi.patch.mockRejectedValue(new Error('Forbidden'));

      await expect(
        commentsService.updateComment(orgId, pageId, commentId, { content: 'x' })
      ).rejects.toThrow('Forbidden');
    });
  });

  // ===========================================
  // deleteComment
  // ===========================================

  describe('deleteComment', () => {
    it('should call DELETE /organizations/{orgId}/pages/{pageId}/comments/{commentId}', async () => {
      mockApi.delete.mockResolvedValue(undefined);

      await commentsService.deleteComment(orgId, pageId, commentId);

      expect(mockApi.delete).toHaveBeenCalledWith(
        `/organizations/${orgId}/pages/${pageId}/comments/${commentId}`
      );
    });

    it('should not return a value', async () => {
      mockApi.delete.mockResolvedValue(undefined);

      const result = await commentsService.deleteComment(orgId, pageId, commentId);

      expect(result).toBeUndefined();
    });

    it('should propagate API errors', async () => {
      mockApi.delete.mockRejectedValue(new Error('Not found'));

      await expect(commentsService.deleteComment(orgId, pageId, 'bad-id')).rejects.toThrow(
        'Not found'
      );
    });
  });

  // ===========================================
  // resolveComment
  // ===========================================

  describe('resolveComment', () => {
    const mockComment = { id: commentId, content: 'Resolved', isResolved: true, pageId };

    it('should call POST /organizations/{orgId}/pages/{pageId}/comments/{commentId}/resolve with { resolve: true }', async () => {
      mockApi.post.mockResolvedValue({ comment: mockComment });

      const result = await commentsService.resolveComment(orgId, pageId, commentId, true);

      expect(mockApi.post).toHaveBeenCalledWith(
        `/organizations/${orgId}/pages/${pageId}/comments/${commentId}/resolve`,
        { resolve: true }
      );
      expect(result).toEqual(mockComment);
    });

    it('should call with { resolve: false } to unresolve', async () => {
      const unresolvedComment = { ...mockComment, isResolved: false };
      mockApi.post.mockResolvedValue({ comment: unresolvedComment });

      const result = await commentsService.resolveComment(orgId, pageId, commentId, false);

      expect(mockApi.post).toHaveBeenCalledWith(
        `/organizations/${orgId}/pages/${pageId}/comments/${commentId}/resolve`,
        { resolve: false }
      );
      expect(result).toEqual(unresolvedComment);
    });

    it('should return response.comment', async () => {
      mockApi.post.mockResolvedValue({ comment: mockComment });

      const result = await commentsService.resolveComment(orgId, pageId, commentId, true);

      expect(result).toEqual(mockComment);
    });

    it('should propagate API errors', async () => {
      mockApi.post.mockRejectedValue(new Error('Forbidden'));

      await expect(commentsService.resolveComment(orgId, pageId, commentId, true)).rejects.toThrow(
        'Forbidden'
      );
    });
  });
});
