import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from 'vitest';

// Mock setup using vi.hoisted for proper hoisting
const { mockPrisma, resetMocks, mockComment, mockPage, _mockUser } = vi.hoisted(() => {
  const mockPrismaComment = {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  };

  const mockPrismaPage = {
    findFirst: vi.fn(),
  };

  const mockPrisma = {
    comment: mockPrismaComment,
    page: mockPrismaPage,
  };

  function resetMocks() {
    Object.values(mockPrismaComment).forEach((mock) => mock.mockReset());
    Object.values(mockPrismaPage).forEach((mock) => mock.mockReset());
  }

  const now = new Date();

  const mockUser = {
    id: 'user-123',
    name: 'Test User',
    email: 'test@example.com',
    avatarUrl: null,
  };

  const mockPage = {
    id: 'page-123',
    organizationId: 'org-123',
    title: 'Test Page',
    trashedAt: null,
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
  };

  return { mockPrisma, resetMocks, mockComment, mockPage, _mockUser: mockUser };
});

// Mock the prisma module BEFORE importing comments.service
vi.mock('../../../lib/prisma.js', () => ({
  prisma: mockPrisma,
}));

// Import service AFTER mocking
import * as commentsService from '../comments.service.js';

describe('Comments Service', () => {
  beforeEach(() => {
    resetMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  describe('createComment', () => {
    it('should create a comment on a page', async () => {
      mockPrisma.page.findFirst.mockResolvedValue(mockPage);
      mockPrisma.comment.create.mockResolvedValue(mockComment);

      const result = await commentsService.createComment(
        'org-123',
        'page-123',
        'user-123',
        'Test comment content'
      );

      expect(result.id).toBe('comment-123');
      expect(result.content).toBe('Test comment content');
      expect(mockPrisma.comment.create).toHaveBeenCalledWith({
        data: {
          pageId: 'page-123',
          content: 'Test comment content',
          createdById: 'user-123',
          parentId: undefined,
          blockId: undefined,
        },
        include: expect.objectContaining({
          createdBy: expect.any(Object),
        }),
      });
    });

    it('should create a reply to an existing comment', async () => {
      mockPrisma.page.findFirst.mockResolvedValue(mockPage);
      mockPrisma.comment.findFirst.mockResolvedValue(mockComment);
      mockPrisma.comment.create.mockResolvedValue({
        ...mockComment,
        id: 'comment-456',
        parentId: 'comment-123',
      });

      const result = await commentsService.createComment(
        'org-123',
        'page-123',
        'user-123',
        'Reply content',
        { parentId: 'comment-123' }
      );

      expect(result.parentId).toBe('comment-123');
    });

    it('should create an inline comment with blockId', async () => {
      mockPrisma.page.findFirst.mockResolvedValue(mockPage);
      mockPrisma.comment.create.mockResolvedValue({
        ...mockComment,
        blockId: 'block-abc',
      });

      const result = await commentsService.createComment(
        'org-123',
        'page-123',
        'user-123',
        'Inline comment',
        { blockId: 'block-abc' }
      );

      expect(result.blockId).toBe('block-abc');
    });

    it('should throw PAGE_NOT_FOUND for non-existent page', async () => {
      mockPrisma.page.findFirst.mockResolvedValue(null);

      await expect(
        commentsService.createComment('org-123', 'nonexistent', 'user-123', 'Comment')
      ).rejects.toThrow('PAGE_NOT_FOUND');
    });

    it('should throw PAGE_IN_TRASH for trashed page', async () => {
      mockPrisma.page.findFirst.mockResolvedValue({
        ...mockPage,
        trashedAt: new Date(),
      });

      await expect(
        commentsService.createComment('org-123', 'page-123', 'user-123', 'Comment')
      ).rejects.toThrow('PAGE_IN_TRASH');
    });

    it('should throw PARENT_COMMENT_NOT_FOUND for non-existent parent', async () => {
      mockPrisma.page.findFirst.mockResolvedValue(mockPage);
      mockPrisma.comment.findFirst.mockResolvedValue(null);

      await expect(
        commentsService.createComment('org-123', 'page-123', 'user-123', 'Reply', {
          parentId: 'nonexistent',
        })
      ).rejects.toThrow('PARENT_COMMENT_NOT_FOUND');
    });
  });

  describe('getComments', () => {
    it('should return all comments for a page', async () => {
      mockPrisma.page.findFirst.mockResolvedValue(mockPage);
      mockPrisma.comment.findMany.mockResolvedValue([mockComment]);

      const result = await commentsService.getComments('org-123', 'page-123');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('comment-123');
    });

    it('should return comments with nested replies', async () => {
      const reply = {
        ...mockComment,
        id: 'comment-456',
        parentId: 'comment-123',
        content: 'Reply content',
      };
      mockPrisma.page.findFirst.mockResolvedValue(mockPage);
      mockPrisma.comment.findMany.mockResolvedValue([{ ...mockComment, replies: [reply] }]);

      const result = await commentsService.getComments('org-123', 'page-123');

      expect(result[0].replies).toHaveLength(1);
      expect(result[0].replies[0].id).toBe('comment-456');
    });

    it('should filter comments by blockId', async () => {
      mockPrisma.page.findFirst.mockResolvedValue(mockPage);
      mockPrisma.comment.findMany.mockResolvedValue([{ ...mockComment, blockId: 'block-abc' }]);

      await commentsService.getComments('org-123', 'page-123', 'block-abc');

      expect(mockPrisma.comment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            blockId: 'block-abc',
          }),
        })
      );
    });

    it('should throw PAGE_NOT_FOUND for non-existent page', async () => {
      mockPrisma.page.findFirst.mockResolvedValue(null);

      await expect(commentsService.getComments('org-123', 'nonexistent')).rejects.toThrow(
        'PAGE_NOT_FOUND'
      );
    });
  });

  describe('updateComment', () => {
    it('should update comment content', async () => {
      mockPrisma.comment.findFirst.mockResolvedValue(mockComment);
      mockPrisma.comment.update.mockResolvedValue({
        ...mockComment,
        content: 'Updated content',
      });

      const result = await commentsService.updateComment(
        'comment-123',
        'user-123',
        'Updated content'
      );

      expect(result.content).toBe('Updated content');
      expect(mockPrisma.comment.update).toHaveBeenCalledWith({
        where: { id: 'comment-123' },
        data: { content: 'Updated content' },
        include: expect.any(Object),
      });
    });

    it('should throw COMMENT_NOT_FOUND for non-existent comment', async () => {
      mockPrisma.comment.findFirst.mockResolvedValue(null);

      await expect(
        commentsService.updateComment('nonexistent', 'user-123', 'Updated')
      ).rejects.toThrow('COMMENT_NOT_FOUND');
    });

    it('should throw NOT_COMMENT_AUTHOR if user is not the author', async () => {
      mockPrisma.comment.findFirst.mockResolvedValue({
        ...mockComment,
        createdById: 'other-user',
      });

      await expect(
        commentsService.updateComment('comment-123', 'user-123', 'Updated')
      ).rejects.toThrow('NOT_COMMENT_AUTHOR');
    });
  });

  describe('deleteComment', () => {
    it('should delete a comment', async () => {
      mockPrisma.comment.findFirst.mockResolvedValue(mockComment);
      mockPrisma.comment.delete.mockResolvedValue(mockComment);

      await commentsService.deleteComment('comment-123', 'user-123');

      expect(mockPrisma.comment.delete).toHaveBeenCalledWith({
        where: { id: 'comment-123' },
      });
    });

    it('should throw COMMENT_NOT_FOUND for non-existent comment', async () => {
      mockPrisma.comment.findFirst.mockResolvedValue(null);

      await expect(commentsService.deleteComment('nonexistent', 'user-123')).rejects.toThrow(
        'COMMENT_NOT_FOUND'
      );
    });

    it('should throw NOT_COMMENT_AUTHOR if user is not the author', async () => {
      mockPrisma.comment.findFirst.mockResolvedValue({
        ...mockComment,
        createdById: 'other-user',
      });

      await expect(commentsService.deleteComment('comment-123', 'user-123')).rejects.toThrow(
        'NOT_COMMENT_AUTHOR'
      );
    });
  });

  describe('resolveComment', () => {
    it('should resolve a comment', async () => {
      mockPrisma.comment.findFirst.mockResolvedValue(mockComment);
      mockPrisma.comment.update.mockResolvedValue({
        ...mockComment,
        isResolved: true,
        resolvedAt: new Date(),
        resolvedById: 'user-123',
      });

      const result = await commentsService.resolveComment('comment-123', 'user-123', true);

      expect(result.isResolved).toBe(true);
      expect(result.resolvedById).toBe('user-123');
    });

    it('should unresolve a comment', async () => {
      mockPrisma.comment.findFirst.mockResolvedValue({
        ...mockComment,
        isResolved: true,
        resolvedAt: new Date(),
        resolvedById: 'user-123',
      });
      mockPrisma.comment.update.mockResolvedValue({
        ...mockComment,
        isResolved: false,
        resolvedAt: null,
        resolvedById: null,
      });

      const result = await commentsService.resolveComment('comment-123', 'user-123', false);

      expect(result.isResolved).toBe(false);
      expect(result.resolvedById).toBeNull();
    });

    it('should throw COMMENT_NOT_FOUND for non-existent comment', async () => {
      mockPrisma.comment.findFirst.mockResolvedValue(null);

      await expect(commentsService.resolveComment('nonexistent', 'user-123', true)).rejects.toThrow(
        'COMMENT_NOT_FOUND'
      );
    });

    it('should throw CANNOT_RESOLVE_REPLY for reply comments', async () => {
      mockPrisma.comment.findFirst.mockResolvedValue({
        ...mockComment,
        parentId: 'parent-comment',
      });

      await expect(commentsService.resolveComment('comment-123', 'user-123', true)).rejects.toThrow(
        'CANNOT_RESOLVE_REPLY'
      );
    });
  });

  describe('getCommentCount', () => {
    it('should return count of comments for a page', async () => {
      mockPrisma.comment.count.mockResolvedValue(5);

      const result = await commentsService.getCommentCount('page-123');

      expect(result).toBe(5);
      expect(mockPrisma.comment.count).toHaveBeenCalledWith({
        where: { pageId: 'page-123' },
      });
    });

    it('should return count of unresolved comments', async () => {
      mockPrisma.comment.count.mockResolvedValue(3);

      const result = await commentsService.getCommentCount('page-123', { unresolvedOnly: true });

      expect(result).toBe(3);
      expect(mockPrisma.comment.count).toHaveBeenCalledWith({
        where: {
          pageId: 'page-123',
          isResolved: false,
          parentId: null,
        },
      });
    });
  });
});
