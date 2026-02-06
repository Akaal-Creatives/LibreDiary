import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from 'vitest';

// Mock setup using vi.hoisted for proper hoisting
const {
  mockPrisma,
  resetMocks,
  mockUser,
  mockComment,
  mockCommentWithRelations,
  mockMention,
  mockOrgMember,
  mockCreateMentionNotification,
} = vi.hoisted(() => {
  const mockPrismaMention = {
    create: vi.fn(),
    createMany: vi.fn(),
    findMany: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
  };

  const mockPrismaComment = {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
  };

  const mockPrismaUser = {
    findMany: vi.fn(),
    findFirst: vi.fn(),
  };

  const mockPrismaOrganizationMember = {
    findMany: vi.fn(),
  };

  const mockPrisma = {
    mention: mockPrismaMention,
    comment: mockPrismaComment,
    user: mockPrismaUser,
    organizationMember: mockPrismaOrganizationMember,
  };

  const mockCreateMentionNotification = vi.fn().mockResolvedValue({});

  function resetMocks() {
    Object.values(mockPrismaMention).forEach((mock) => mock.mockReset());
    Object.values(mockPrismaComment).forEach((mock) => mock.mockReset());
    Object.values(mockPrismaUser).forEach((mock) => mock.mockReset());
    Object.values(mockPrismaOrganizationMember).forEach((mock) => mock.mockReset());
    mockCreateMentionNotification.mockReset().mockResolvedValue({});
  }

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
    content: 'Hello @john and @jane!',
    createdById: 'user-123',
    createdAt: now,
    updatedAt: now,
  };

  // Comment with relations for createMentions
  const mockCommentWithRelations = {
    ...mockComment,
    page: {
      id: 'page-123',
      title: 'Test Page',
    },
    createdBy: {
      id: 'user-123',
      name: 'Test User',
    },
  };

  const mockMention = {
    id: 'mention-123',
    commentId: 'comment-123',
    userId: 'user-456',
    createdAt: now,
    user: {
      id: 'user-456',
      name: 'John Doe',
      email: 'john@example.com',
      avatarUrl: null,
    },
  };

  const mockOrgMember = {
    id: 'member-123',
    organizationId: 'org-123',
    userId: 'user-456',
    user: {
      id: 'user-456',
      name: 'John Doe',
      email: 'john@example.com',
      avatarUrl: null,
    },
  };

  return {
    mockPrisma,
    resetMocks,
    mockUser,
    mockComment,
    mockCommentWithRelations,
    mockMention,
    mockOrgMember,
    mockCreateMentionNotification,
  };
});

// Mock the prisma module BEFORE importing mentions.service
vi.mock('../../../lib/prisma.js', () => ({
  prisma: mockPrisma,
}));

// Mock the notification service
vi.mock('../../notifications/notifications.service.js', () => ({
  createMentionNotification: mockCreateMentionNotification,
}));

// Import service AFTER mocking
import * as mentionsService from '../mentions.service.js';

describe('Mentions Service', () => {
  beforeEach(() => {
    resetMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  describe('extractMentions', () => {
    it('should extract @mentions from content', () => {
      const content = 'Hello @john and @jane!';
      const result = mentionsService.extractMentions(content);

      expect(result).toEqual(['john', 'jane']);
    });

    it('should return empty array for content without mentions', () => {
      const content = 'Hello world!';
      const result = mentionsService.extractMentions(content);

      expect(result).toEqual([]);
    });

    it('should handle content with only one mention', () => {
      const content = 'Hi @user';
      const result = mentionsService.extractMentions(content);

      expect(result).toEqual(['user']);
    });

    it('should handle duplicate mentions', () => {
      const content = '@john said hi to @jane, and @john replied';
      const result = mentionsService.extractMentions(content);

      expect(result).toEqual(['john', 'jane']); // Should be unique
    });

    it('should handle mentions with numbers and underscores', () => {
      const content = 'Hey @user_123 and @test_user!';
      const result = mentionsService.extractMentions(content);

      expect(result).toEqual(['user_123', 'test_user']);
    });

    it('should not match email addresses as mentions', () => {
      const content = 'Email me at test@example.com';
      const result = mentionsService.extractMentions(content);

      // Should not match email addresses - @ must be at start or after whitespace
      expect(result).toEqual([]);
    });
  });

  describe('createMentions', () => {
    it('should create mentions for a comment', async () => {
      mockPrisma.comment.findFirst.mockResolvedValue(mockCommentWithRelations);
      mockPrisma.mention.createMany.mockResolvedValue({ count: 2 });
      mockPrisma.mention.findMany.mockResolvedValue([mockMention]);

      const result = await mentionsService.createMentions('comment-123', ['user-456', 'user-789']);

      expect(mockPrisma.mention.createMany).toHaveBeenCalledWith({
        data: [
          { commentId: 'comment-123', userId: 'user-456' },
          { commentId: 'comment-123', userId: 'user-789' },
        ],
        skipDuplicates: true,
      });
      expect(result).toBeDefined();
    });

    it('should create notifications for mentioned users excluding self', async () => {
      mockPrisma.comment.findFirst.mockResolvedValue(mockCommentWithRelations);
      mockPrisma.mention.createMany.mockResolvedValue({ count: 1 });
      mockPrisma.mention.findMany.mockResolvedValue([mockMention]);

      await mentionsService.createMentions('comment-123', ['user-456']);

      // Should notify user-456 since they're not the comment author (user-123)
      expect(mockCreateMentionNotification).toHaveBeenCalledWith({
        recipientId: 'user-456',
        actorId: 'user-123',
        actorName: 'Test User',
        pageId: 'page-123',
        pageTitle: 'Test Page',
        commentId: 'comment-123',
      });
    });

    it('should not create notification for self-mentions', async () => {
      mockPrisma.comment.findFirst.mockResolvedValue(mockCommentWithRelations);
      mockPrisma.mention.createMany.mockResolvedValue({ count: 1 });
      mockPrisma.mention.findMany.mockResolvedValue([]);

      // Mentioning the comment author themselves
      await mentionsService.createMentions('comment-123', ['user-123']);

      expect(mockCreateMentionNotification).not.toHaveBeenCalled();
    });

    it('should throw COMMENT_NOT_FOUND for non-existent comment', async () => {
      mockPrisma.comment.findFirst.mockResolvedValue(null);

      await expect(mentionsService.createMentions('nonexistent', ['user-456'])).rejects.toThrow(
        'COMMENT_NOT_FOUND'
      );
    });

    it('should return empty array when no user IDs provided', async () => {
      mockPrisma.comment.findFirst.mockResolvedValue(mockCommentWithRelations);
      mockPrisma.mention.findMany.mockResolvedValue([]);

      const result = await mentionsService.createMentions('comment-123', []);

      expect(mockPrisma.mention.createMany).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });
  });

  describe('getMentionsForComment', () => {
    it('should return mentions for a comment', async () => {
      mockPrisma.mention.findMany.mockResolvedValue([mockMention]);

      const result = await mentionsService.getMentionsForComment('comment-123');

      expect(result).toHaveLength(1);
      expect(result[0].userId).toBe('user-456');
      expect(mockPrisma.mention.findMany).toHaveBeenCalledWith({
        where: { commentId: 'comment-123' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
            },
          },
        },
      });
    });

    it('should return empty array for comment with no mentions', async () => {
      mockPrisma.mention.findMany.mockResolvedValue([]);

      const result = await mentionsService.getMentionsForComment('comment-123');

      expect(result).toEqual([]);
    });
  });

  describe('getMentionsForUser', () => {
    it('should return mentions for a user in an organization', async () => {
      mockPrisma.mention.findMany.mockResolvedValue([
        {
          ...mockMention,
          comment: {
            ...mockComment,
            page: { id: 'page-123', organizationId: 'org-123', title: 'Test Page' },
            createdBy: mockUser,
          },
        },
      ]);

      const result = await mentionsService.getMentionsForUser('user-456', 'org-123');

      expect(result).toHaveLength(1);
      expect(mockPrisma.mention.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-456',
          comment: {
            page: {
              organizationId: 'org-123',
            },
          },
        },
        include: expect.objectContaining({
          comment: expect.any(Object),
        }),
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('searchUsersForMention', () => {
    it('should search organization members by name', async () => {
      mockPrisma.organizationMember.findMany.mockResolvedValue([mockOrgMember]);

      const result = await mentionsService.searchUsersForMention('org-123', 'john');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('user-456');
      expect(result[0].name).toBe('John Doe');
    });

    it('should search organization members by email', async () => {
      mockPrisma.organizationMember.findMany.mockResolvedValue([mockOrgMember]);

      const result = await mentionsService.searchUsersForMention('org-123', 'john@');

      expect(result).toHaveLength(1);
    });

    it('should return empty array when no matches', async () => {
      mockPrisma.organizationMember.findMany.mockResolvedValue([]);

      const result = await mentionsService.searchUsersForMention('org-123', 'nonexistent');

      expect(result).toEqual([]);
    });

    it('should exclude current user when excludeUserId provided', async () => {
      mockPrisma.organizationMember.findMany.mockResolvedValue([mockOrgMember]);

      await mentionsService.searchUsersForMention('org-123', 'john', 'user-123');

      expect(mockPrisma.organizationMember.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: { not: 'user-123' },
          }),
        })
      );
    });

    it('should limit results to 10 users', async () => {
      mockPrisma.organizationMember.findMany.mockResolvedValue([mockOrgMember]);

      await mentionsService.searchUsersForMention('org-123', 'a');

      expect(mockPrisma.organizationMember.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
        })
      );
    });
  });

  describe('resolveUserIdsFromMentions', () => {
    it('should resolve user IDs from mention usernames', async () => {
      mockPrisma.organizationMember.findMany.mockResolvedValue([
        {
          ...mockOrgMember,
          user: { ...mockOrgMember.user, name: 'john' },
        },
      ]);

      const result = await mentionsService.resolveUserIdsFromMentions('org-123', ['john']);

      expect(result).toContain('user-456');
    });

    it('should match by email username part', async () => {
      mockPrisma.organizationMember.findMany.mockResolvedValue([
        {
          ...mockOrgMember,
          user: { ...mockOrgMember.user, email: 'john@example.com' },
        },
      ]);

      const result = await mentionsService.resolveUserIdsFromMentions('org-123', ['john']);

      expect(result).toContain('user-456');
    });

    it('should return empty array for no matches', async () => {
      mockPrisma.organizationMember.findMany.mockResolvedValue([]);

      const result = await mentionsService.resolveUserIdsFromMentions('org-123', ['unknown']);

      expect(result).toEqual([]);
    });
  });
});
