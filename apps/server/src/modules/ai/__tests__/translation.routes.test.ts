import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

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

// Mock audit service
const { mockLogAudit } = vi.hoisted(() => ({
  mockLogAudit: vi.fn(),
}));
vi.mock('../../audit/audit.service.js', () => ({ logAudit: mockLogAudit }));

// Mock translation service
const { mockTranslateText } = vi.hoisted(() => ({
  mockTranslateText: vi.fn(),
}));

vi.mock('../translation.service.js', () => ({
  translateText: mockTranslateText,
}));

import Fastify from 'fastify';
import translationRoutes from '../translation.routes.js';

describe('Translation Routes', () => {
  let app: ReturnType<typeof Fastify>;

  beforeEach(async () => {
    mockTranslateText.mockReset();
    app = Fastify();
    app.decorateRequest('user', null);
    app.decorateRequest('organizationId', null);
    await app.register(translationRoutes, { prefix: '/organizations/:orgId/ai/translate' });
    await app.ready();
  });

  afterEach(async () => {
    vi.clearAllMocks();
    await app.close();
  });

  // ===========================================
  // POST / — Translate text
  // ===========================================

  describe('POST /organizations/:orgId/ai/translate', () => {
    it('should return 200 with translatedText for valid request', async () => {
      mockTranslateText.mockResolvedValue({ translatedText: 'Hola, mundo!' });

      const response = await app.inject({
        method: 'POST',
        url: '/organizations/org-123/ai/translate',
        payload: { text: 'Hello, world!', targetLanguage: 'Spanish' },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.translatedText).toBe('Hola, mundo!');
    });

    it('should pass orgId from params to service', async () => {
      mockTranslateText.mockResolvedValue({ translatedText: 'Bonjour' });

      await app.inject({
        method: 'POST',
        url: '/organizations/org-456/ai/translate',
        payload: { text: 'Hello', targetLanguage: 'French' },
      });

      expect(mockTranslateText).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: 'org-456',
          text: 'Hello',
          targetLanguage: 'French',
        })
      );
    });

    // ===========================================
    // Validation errors (400)
    // ===========================================

    it('should return 400 when text is missing', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/organizations/org-123/ai/translate',
        payload: { targetLanguage: 'Spanish' },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
    });

    it('should return 400 when text is empty', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/organizations/org-123/ai/translate',
        payload: { text: '', targetLanguage: 'Spanish' },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 when text exceeds 10000 characters', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/organizations/org-123/ai/translate',
        payload: { text: 'a'.repeat(10001), targetLanguage: 'Spanish' },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 when targetLanguage is missing', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/organizations/org-123/ai/translate',
        payload: { text: 'Hello' },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 when targetLanguage is not in allowed list', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/organizations/org-123/ai/translate',
        payload: { text: 'Hello', targetLanguage: 'Klingon' },
      });

      expect(response.statusCode).toBe(400);
    });

    // ===========================================
    // Service errors
    // ===========================================

    it('should return 403 when service throws AI_DISABLED', async () => {
      mockTranslateText.mockRejectedValue(new Error('AI_DISABLED'));

      const response = await app.inject({
        method: 'POST',
        url: '/organizations/org-123/ai/translate',
        payload: { text: 'Hello', targetLanguage: 'Spanish' },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should return 403 when service throws "AI is disabled"', async () => {
      mockTranslateText.mockRejectedValue(new Error('AI is disabled'));

      const response = await app.inject({
        method: 'POST',
        url: '/organizations/org-123/ai/translate',
        payload: { text: 'Hello', targetLanguage: 'Spanish' },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should return 503 when service throws TRANSLATION_FAILED', async () => {
      mockTranslateText.mockRejectedValue(new Error('TRANSLATION_FAILED'));

      const response = await app.inject({
        method: 'POST',
        url: '/organizations/org-123/ai/translate',
        payload: { text: 'Hello', targetLanguage: 'Spanish' },
      });

      expect(response.statusCode).toBe(503);
    });

    it('should return 503 when service throws "No API key configured"', async () => {
      mockTranslateText.mockRejectedValue(new Error('No API key configured'));

      const response = await app.inject({
        method: 'POST',
        url: '/organizations/org-123/ai/translate',
        payload: { text: 'Hello', targetLanguage: 'Spanish' },
      });

      expect(response.statusCode).toBe(503);
    });

    // ===========================================
    // Audit logging
    // ===========================================

    it('should call logAudit with correct args on successful translation', async () => {
      mockTranslateText.mockResolvedValue({ translatedText: 'Hola' });

      await app.inject({
        method: 'POST',
        url: '/organizations/org-123/ai/translate',
        payload: { text: 'Hello', targetLanguage: 'Spanish' },
      });

      expect(mockLogAudit).toHaveBeenCalledWith({
        action: 'AI_TRANSLATION',
        userId: 'user-123',
        organizationId: 'org-123',
        metadata: { targetLanguage: 'Spanish', textLength: 5 },
      });
    });

    it('should not call logAudit when translation fails', async () => {
      mockTranslateText.mockRejectedValue(new Error('TRANSLATION_FAILED'));

      await app.inject({
        method: 'POST',
        url: '/organizations/org-123/ai/translate',
        payload: { text: 'Hello', targetLanguage: 'Spanish' },
      });

      expect(mockLogAudit).not.toHaveBeenCalled();
    });

    // ===========================================
    // Error response body structure
    // ===========================================

    it('should return structured error body for 403 errors', async () => {
      mockTranslateText.mockRejectedValue(new Error('AI_DISABLED'));

      const response = await app.inject({
        method: 'POST',
        url: '/organizations/org-123/ai/translate',
        payload: { text: 'Hello', targetLanguage: 'Spanish' },
      });

      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('AI_DISABLED');
      expect(body.error.message).toBe('AI features are disabled for this organisation');
    });

    it('should return structured error body for 503 errors', async () => {
      mockTranslateText.mockRejectedValue(new Error('TRANSLATION_FAILED'));

      const response = await app.inject({
        method: 'POST',
        url: '/organizations/org-123/ai/translate',
        payload: { text: 'Hello', targetLanguage: 'Spanish' },
      });

      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('TRANSLATION_FAILED');
      expect(body.error.message).toBe('Translation failed. Please try again later.');
    });

    // ===========================================
    // Boundary values
    // ===========================================

    it('should accept text at exactly 10000 characters', async () => {
      mockTranslateText.mockResolvedValue({ translatedText: 'translated' });

      const response = await app.inject({
        method: 'POST',
        url: '/organizations/org-123/ai/translate',
        payload: { text: 'a'.repeat(10000), targetLanguage: 'Spanish' },
      });

      expect(response.statusCode).toBe(200);
    });

    // ===========================================
    // Unmapped errors
    // ===========================================

    it('should return 500 for unmapped errors', async () => {
      mockTranslateText.mockRejectedValue(new Error('Something completely unexpected'));

      const response = await app.inject({
        method: 'POST',
        url: '/organizations/org-123/ai/translate',
        payload: { text: 'Hello', targetLanguage: 'Spanish' },
      });

      expect(response.statusCode).toBe(500);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('INTERNAL_ERROR');
    });
  });
});
