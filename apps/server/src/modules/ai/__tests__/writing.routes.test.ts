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

// Mock writing service
const { mockWriteText } = vi.hoisted(() => ({
  mockWriteText: vi.fn(),
}));

vi.mock('../writing.service.js', () => ({
  writeText: mockWriteText,
}));

import Fastify from 'fastify';
import writingRoutes from '../writing.routes.js';

describe('Writing Routes', () => {
  let app: ReturnType<typeof Fastify>;

  beforeEach(async () => {
    mockWriteText.mockReset();
    app = Fastify();
    app.decorateRequest('user', null);
    app.decorateRequest('organizationId', null);
    await app.register(writingRoutes, { prefix: '/organizations/:orgId/ai/write' });
    await app.ready();
  });

  afterEach(async () => {
    vi.clearAllMocks();
    await app.close();
  });

  // ===========================================
  // POST / — Write text
  // ===========================================

  describe('POST /organizations/:orgId/ai/write', () => {
    // ===========================================
    // 200 success for each action
    // ===========================================

    it('should return 200 with content for generate action', async () => {
      mockWriteText.mockResolvedValue({ content: 'Generated content' });

      const response = await app.inject({
        method: 'POST',
        url: '/organizations/org-123/ai/write',
        payload: { action: 'generate', text: 'Write about cats' },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.content).toBe('Generated content');
    });

    it('should return 200 with content for expand action', async () => {
      mockWriteText.mockResolvedValue({ content: 'Expanded content' });

      const response = await app.inject({
        method: 'POST',
        url: '/organizations/org-123/ai/write',
        payload: { action: 'expand', text: 'Short text' },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.content).toBe('Expanded content');
    });

    it('should return 200 with content for summarise action', async () => {
      mockWriteText.mockResolvedValue({ content: 'Summary' });

      const response = await app.inject({
        method: 'POST',
        url: '/organizations/org-123/ai/write',
        payload: { action: 'summarise', text: 'Long text here' },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.content).toBe('Summary');
    });

    it('should return 200 with content for improve action', async () => {
      mockWriteText.mockResolvedValue({ content: 'Improved content' });

      const response = await app.inject({
        method: 'POST',
        url: '/organizations/org-123/ai/write',
        payload: { action: 'improve', text: 'Bad grammer text' },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.content).toBe('Improved content');
    });

    // ===========================================
    // orgId passthrough
    // ===========================================

    it('should pass orgId from params to service', async () => {
      mockWriteText.mockResolvedValue({ content: 'Content' });

      await app.inject({
        method: 'POST',
        url: '/organizations/org-456/ai/write',
        payload: { action: 'expand', text: 'Hello' },
      });

      expect(mockWriteText).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: 'org-456',
          action: 'expand',
          text: 'Hello',
        })
      );
    });

    // ===========================================
    // Validation errors (400)
    // ===========================================

    it('should return 400 when text is missing', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/organizations/org-123/ai/write',
        payload: { action: 'expand' },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
    });

    it('should return 400 when text is empty', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/organizations/org-123/ai/write',
        payload: { action: 'expand', text: '' },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 when text exceeds 10000 characters', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/organizations/org-123/ai/write',
        payload: { action: 'expand', text: 'a'.repeat(10001) },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 when action is missing', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/organizations/org-123/ai/write',
        payload: { text: 'Hello' },
      });

      expect(response.statusCode).toBe(400);
    });

    it('should return 400 when action is invalid', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/organizations/org-123/ai/write',
        payload: { action: 'invalid', text: 'Hello' },
      });

      expect(response.statusCode).toBe(400);
    });

    // ===========================================
    // Boundary values
    // ===========================================

    it('should accept text at exactly 10000 characters', async () => {
      mockWriteText.mockResolvedValue({ content: 'Result' });

      const response = await app.inject({
        method: 'POST',
        url: '/organizations/org-123/ai/write',
        payload: { action: 'expand', text: 'a'.repeat(10000) },
      });

      expect(response.statusCode).toBe(200);
    });

    // ===========================================
    // Service errors
    // ===========================================

    it('should return 403 when service throws AI_DISABLED', async () => {
      mockWriteText.mockRejectedValue(new Error('AI_DISABLED'));

      const response = await app.inject({
        method: 'POST',
        url: '/organizations/org-123/ai/write',
        payload: { action: 'expand', text: 'Hello' },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should return 403 when service throws "AI is disabled"', async () => {
      mockWriteText.mockRejectedValue(new Error('AI is disabled'));

      const response = await app.inject({
        method: 'POST',
        url: '/organizations/org-123/ai/write',
        payload: { action: 'expand', text: 'Hello' },
      });

      expect(response.statusCode).toBe(403);
    });

    it('should return 503 when service throws WRITING_FAILED', async () => {
      mockWriteText.mockRejectedValue(new Error('WRITING_FAILED'));

      const response = await app.inject({
        method: 'POST',
        url: '/organizations/org-123/ai/write',
        payload: { action: 'expand', text: 'Hello' },
      });

      expect(response.statusCode).toBe(503);
    });

    it('should return 503 when service throws "No API key configured"', async () => {
      mockWriteText.mockRejectedValue(new Error('No API key configured'));

      const response = await app.inject({
        method: 'POST',
        url: '/organizations/org-123/ai/write',
        payload: { action: 'expand', text: 'Hello' },
      });

      expect(response.statusCode).toBe(503);
    });

    // ===========================================
    // Unmapped errors
    // ===========================================

    it('should return 500 for unmapped errors', async () => {
      mockWriteText.mockRejectedValue(new Error('Something completely unexpected'));

      const response = await app.inject({
        method: 'POST',
        url: '/organizations/org-123/ai/write',
        payload: { action: 'expand', text: 'Hello' },
      });

      expect(response.statusCode).toBe(500);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('INTERNAL_ERROR');
    });

    // ===========================================
    // Audit logging
    // ===========================================

    it('should call logAudit with AI_WRITING, userId, orgId, and metadata on success', async () => {
      mockWriteText.mockResolvedValue({ content: 'Content' });

      await app.inject({
        method: 'POST',
        url: '/organizations/org-123/ai/write',
        payload: { action: 'expand', text: 'Hello' },
      });

      expect(mockLogAudit).toHaveBeenCalledWith({
        action: 'AI_WRITING',
        userId: 'user-123',
        organizationId: 'org-123',
        metadata: { writingAction: 'expand', textLength: 5 },
      });
    });

    it('should not call logAudit when writing fails', async () => {
      mockWriteText.mockRejectedValue(new Error('WRITING_FAILED'));

      await app.inject({
        method: 'POST',
        url: '/organizations/org-123/ai/write',
        payload: { action: 'expand', text: 'Hello' },
      });

      expect(mockLogAudit).not.toHaveBeenCalled();
    });

    // ===========================================
    // Error response body structure
    // ===========================================

    it('should return structured error body for 403 errors', async () => {
      mockWriteText.mockRejectedValue(new Error('AI_DISABLED'));

      const response = await app.inject({
        method: 'POST',
        url: '/organizations/org-123/ai/write',
        payload: { action: 'expand', text: 'Hello' },
      });

      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('AI_DISABLED');
      expect(body.error.message).toBe('AI features are disabled for this organisation');
    });

    it('should return structured error body for 503 errors', async () => {
      mockWriteText.mockRejectedValue(new Error('WRITING_FAILED'));

      const response = await app.inject({
        method: 'POST',
        url: '/organizations/org-123/ai/write',
        payload: { action: 'expand', text: 'Hello' },
      });

      const body = JSON.parse(response.body);
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('WRITING_FAILED');
      expect(body.error.message).toBe('Writing failed. Please try again later.');
    });
  });
});
