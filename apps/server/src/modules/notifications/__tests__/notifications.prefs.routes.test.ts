import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from 'vitest';

// Mock auth middleware
vi.mock('../../auth/auth.middleware.js', () => ({
  requireAuth: vi.fn(async (request: { user: { id: string; email: string; name: string } }) => {
    request.user = { id: 'user-123', email: 'test@example.com', name: 'Test User' };
  }),
}));

// Mock services using vi.hoisted
const { mockNotificationPrefsService, resetMocks } = vi.hoisted(() => {
  const mockNotificationPrefsService = {
    getNotificationPreferences: vi.fn(),
    updateNotificationPreferences: vi.fn(),
  };

  function resetMocks() {
    Object.values(mockNotificationPrefsService).forEach((mock) => mock.mockReset());
  }

  return { mockNotificationPrefsService, resetMocks };
});

// Mock the preferences service
vi.mock('../notifications.prefs.service.js', () => mockNotificationPrefsService);

// Import after mocking
import Fastify from 'fastify';
import notificationsRoutes from '../notifications.routes.js';

const defaultPreferences = {
  emailMention: true,
  emailCommentReply: true,
  emailPageShared: true,
  emailCommentResolved: true,
  emailInvitation: true,
};

describe('Notification Preferences Routes', () => {
  let app: ReturnType<typeof Fastify>;

  beforeEach(async () => {
    resetMocks();
    app = Fastify();
    app.decorateRequest('user', null);
    await app.register(notificationsRoutes, { prefix: '/notifications' });
    await app.ready();
  });

  afterEach(async () => {
    vi.clearAllMocks();
    await app.close();
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  describe('GET /notifications/preferences', () => {
    it('should return notification preferences for the authenticated user', async () => {
      mockNotificationPrefsService.getNotificationPreferences.mockResolvedValue(defaultPreferences);

      const response = await app.inject({
        method: 'GET',
        url: '/notifications/preferences',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.preferences).toEqual(defaultPreferences);
      expect(mockNotificationPrefsService.getNotificationPreferences).toHaveBeenCalledWith(
        'user-123'
      );
    });

    it('should return 404 when user not found', async () => {
      mockNotificationPrefsService.getNotificationPreferences.mockRejectedValue(
        new Error('USER_NOT_FOUND')
      );

      const response = await app.inject({
        method: 'GET',
        url: '/notifications/preferences',
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('USER_NOT_FOUND');
    });
  });

  describe('PATCH /notifications/preferences', () => {
    it('should update notification preferences', async () => {
      const updatedPrefs = { ...defaultPreferences, emailMention: false };
      mockNotificationPrefsService.updateNotificationPreferences.mockResolvedValue(updatedPrefs);

      const response = await app.inject({
        method: 'PATCH',
        url: '/notifications/preferences',
        payload: { emailMention: false },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.preferences.emailMention).toBe(false);
      expect(mockNotificationPrefsService.updateNotificationPreferences).toHaveBeenCalledWith(
        'user-123',
        { emailMention: false }
      );
    });

    it('should update multiple preferences at once', async () => {
      const updatedPrefs = {
        ...defaultPreferences,
        emailMention: false,
        emailPageShared: false,
      };
      mockNotificationPrefsService.updateNotificationPreferences.mockResolvedValue(updatedPrefs);

      const response = await app.inject({
        method: 'PATCH',
        url: '/notifications/preferences',
        payload: { emailMention: false, emailPageShared: false },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.preferences.emailMention).toBe(false);
      expect(body.data.preferences.emailPageShared).toBe(false);
    });

    it('should reject invalid preference keys', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/notifications/preferences',
        payload: { invalidKey: true },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject non-boolean preference values', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/notifications/preferences',
        payload: { emailMention: 'yes' },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject empty body', async () => {
      const response = await app.inject({
        method: 'PATCH',
        url: '/notifications/preferences',
        payload: {},
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 404 when user not found', async () => {
      mockNotificationPrefsService.updateNotificationPreferences.mockRejectedValue(
        new Error('USER_NOT_FOUND')
      );

      const response = await app.inject({
        method: 'PATCH',
        url: '/notifications/preferences',
        payload: { emailMention: false },
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('USER_NOT_FOUND');
    });
  });
});
