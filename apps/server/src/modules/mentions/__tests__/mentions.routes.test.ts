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
const { mockMentionsService, mockMention, resetMocks } = vi.hoisted(() => {
  const mockMentionsService = {
    searchUsersForMention: vi.fn(),
    getMentionsForUser: vi.fn(),
    extractMentions: vi.fn(),
    createMentions: vi.fn(),
    resolveUserIdsFromMentions: vi.fn(),
  };

  const now = new Date();

  const mockUser = {
    id: 'user-456',
    name: 'John Doe',
    email: 'john@example.com',
    avatarUrl: null,
  };

  const mockMention = {
    id: 'mention-123',
    commentId: 'comment-123',
    userId: 'user-456',
    createdAt: now,
    user: mockUser,
    comment: {
      id: 'comment-123',
      pageId: 'page-123',
      content: 'Hey @john!',
      createdById: 'user-123',
      createdAt: now,
      page: {
        id: 'page-123',
        organizationId: 'org-123',
        title: 'Test Page',
      },
      createdBy: {
        id: 'user-123',
        name: 'Test User',
        email: 'test@example.com',
        avatarUrl: null,
      },
    },
  };

  function resetMocks() {
    Object.values(mockMentionsService).forEach((mock) => mock.mockReset());
  }

  return { mockMentionsService, mockMention, resetMocks };
});

// Mock the services
vi.mock('../mentions.service.js', () => mockMentionsService);

// Import after mocking
import Fastify from 'fastify';
import mentionsRoutes from '../mentions.routes.js';

describe('Mentions Routes', () => {
  let app: ReturnType<typeof Fastify>;

  beforeEach(async () => {
    resetMocks();
    app = Fastify();

    // Mock auth decorator (decorators are added by middleware)
    app.decorateRequest('user', null);
    app.decorateRequest('organizationId', null);

    await app.register(mentionsRoutes, { prefix: '/mentions' });
    await app.ready();
  });

  afterEach(async () => {
    vi.clearAllMocks();
    await app.close();
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  describe('GET /mentions/users/search', () => {
    it('should return matching users for autocomplete', async () => {
      mockMentionsService.searchUsersForMention.mockResolvedValue([
        { id: 'user-456', name: 'John Doe', email: 'john@example.com', avatarUrl: null },
      ]);

      const response = await app.inject({
        method: 'GET',
        url: '/mentions/users/search?q=john',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.users).toHaveLength(1);
      expect(body.data.users[0].name).toBe('John Doe');
    });

    it('should exclude current user from results', async () => {
      mockMentionsService.searchUsersForMention.mockResolvedValue([]);

      await app.inject({
        method: 'GET',
        url: '/mentions/users/search?q=test',
      });

      expect(mockMentionsService.searchUsersForMention).toHaveBeenCalledWith(
        'org-123',
        'test',
        'user-123' // Current user excluded
      );
    });

    it('should return empty array when no matches', async () => {
      mockMentionsService.searchUsersForMention.mockResolvedValue([]);

      const response = await app.inject({
        method: 'GET',
        url: '/mentions/users/search?q=nonexistent',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.users).toEqual([]);
    });

    it('should return 400 when query is missing', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/mentions/users/search',
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 when query is too short', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/mentions/users/search?q=a',
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('GET /mentions', () => {
    it('should return mentions for current user', async () => {
      mockMentionsService.getMentionsForUser.mockResolvedValue([mockMention]);

      const response = await app.inject({
        method: 'GET',
        url: '/mentions',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.mentions).toHaveLength(1);
      expect(body.data.mentions[0].id).toBe('mention-123');
    });

    it('should call service with correct parameters', async () => {
      mockMentionsService.getMentionsForUser.mockResolvedValue([]);

      await app.inject({
        method: 'GET',
        url: '/mentions',
      });

      expect(mockMentionsService.getMentionsForUser).toHaveBeenCalledWith('user-123', 'org-123');
    });

    it('should return empty array when no mentions', async () => {
      mockMentionsService.getMentionsForUser.mockResolvedValue([]);

      const response = await app.inject({
        method: 'GET',
        url: '/mentions',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.mentions).toEqual([]);
    });
  });
});
