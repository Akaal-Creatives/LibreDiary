import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock auth middleware
vi.mock('../../auth/auth.middleware.js', () => ({
  requireAuth: vi.fn(async (request: { user: { id: string; email: string; name: string } }) => {
    request.user = { id: 'user-123', email: 'test@example.com', name: 'Test User' };
  }),
}));

// Mock service
const { mockService, resetMocks } = vi.hoisted(() => {
  const mockService = {
    createToken: vi.fn(),
    listTokens: vi.fn(),
    deleteToken: vi.fn(),
    validateToken: vi.fn(),
    deleteExpiredTokens: vi.fn(),
  };

  function resetMocks() {
    Object.values(mockService).forEach((mock) => mock.mockReset());
  }

  return { mockService, resetMocks };
});

vi.mock('../api-token.service.js', () => mockService);

import Fastify from 'fastify';
import { apiTokenRoutes } from '../api-token.routes.js';

describe('API Token Routes', () => {
  let app: ReturnType<typeof Fastify>;

  beforeEach(async () => {
    resetMocks();
    app = Fastify();
    app.decorateRequest('user', null);
    await app.register(apiTokenRoutes, { prefix: '/api-tokens' });
    await app.ready();
  });

  afterEach(async () => {
    vi.clearAllMocks();
    await app.close();
  });

  // ===========================================
  // POST / — Create token
  // ===========================================

  describe('POST /api-tokens', () => {
    it('should create a token and return 201 with raw token', async () => {
      mockService.createToken.mockResolvedValue({
        rawToken: 'ld_newrawtoken123',
        apiToken: {
          id: 'token-1',
          userId: 'user-123',
          name: 'CI Key',
          tokenPrefix: 'ld_newra',
          lastUsedAt: null,
          expiresAt: null,
          createdAt: new Date().toISOString(),
        },
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api-tokens',
        payload: { name: 'CI Key' },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.token.rawToken).toBe('ld_newrawtoken123');
      expect(body.data.token.name).toBe('CI Key');
      expect(mockService.createToken).toHaveBeenCalledWith('user-123', 'CI Key', undefined);
    });

    it('should create a token with expiry', async () => {
      const expiresAt = '2026-12-31T23:59:59.000Z';
      mockService.createToken.mockResolvedValue({
        rawToken: 'ld_expiringtoken',
        apiToken: {
          id: 'token-2',
          name: 'Expiring Key',
          expiresAt,
        },
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api-tokens',
        payload: { name: 'Expiring Key', expiresAt },
      });

      expect(response.statusCode).toBe(201);
      expect(mockService.createToken).toHaveBeenCalledWith('user-123', 'Expiring Key', expiresAt);
    });

    it('should return 400 for missing name', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api-tokens',
        payload: {},
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for empty name', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api-tokens',
        payload: { name: '' },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  // ===========================================
  // GET / — List tokens
  // ===========================================

  describe('GET /api-tokens', () => {
    it('should return list of tokens', async () => {
      const tokens = [
        { id: 'token-1', name: 'Key 1', tokenPrefix: 'ld_abc12' },
        { id: 'token-2', name: 'Key 2', tokenPrefix: 'ld_def34' },
      ];
      mockService.listTokens.mockResolvedValue(tokens);

      const response = await app.inject({
        method: 'GET',
        url: '/api-tokens',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.tokens).toEqual(tokens);
      expect(mockService.listTokens).toHaveBeenCalledWith('user-123');
    });

    it('should return empty array when no tokens exist', async () => {
      mockService.listTokens.mockResolvedValue([]);

      const response = await app.inject({
        method: 'GET',
        url: '/api-tokens',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.tokens).toEqual([]);
    });
  });

  // ===========================================
  // DELETE /:tokenId — Revoke token
  // ===========================================

  describe('DELETE /api-tokens/:tokenId', () => {
    it('should delete a token and return success', async () => {
      mockService.deleteToken.mockResolvedValue(undefined);

      const response = await app.inject({
        method: 'DELETE',
        url: '/api-tokens/token-1',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(mockService.deleteToken).toHaveBeenCalledWith('token-1', 'user-123');
    });

    it('should return 404 when token not found', async () => {
      mockService.deleteToken.mockRejectedValue(new Error('Token not found'));

      const response = await app.inject({
        method: 'DELETE',
        url: '/api-tokens/token-999',
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('NOT_FOUND');
    });
  });
});
