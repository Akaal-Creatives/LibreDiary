import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import Fastify from 'fastify';
import type { FastifyInstance } from 'fastify';

// Mock setup using vi.hoisted for proper hoisting
const mockSetupService = vi.hoisted(() => ({
  checkSetupRequired: vi.fn(),
  completeSetup: vi.fn(),
  getSystemSettings: vi.fn(),
}));

vi.mock('../setup.service.js', () => mockSetupService);

// Import routes after mocking
import { setupRoutes } from '../setup.routes.js';

describe('Setup Routes', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    vi.clearAllMocks();

    app = Fastify();
    await app.register(setupRoutes, { prefix: '/setup' });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /setup/status', () => {
    it('should return setup required when no settings exist', async () => {
      mockSetupService.checkSetupRequired.mockResolvedValue({
        required: true,
        reason: 'NO_SETTINGS',
      });

      const response = await app.inject({
        method: 'GET',
        url: '/setup/status',
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({
        success: true,
        data: {
          setupRequired: true,
          reason: 'NO_SETTINGS',
        },
      });
    });

    it('should return setup not required when completed', async () => {
      mockSetupService.checkSetupRequired.mockResolvedValue({
        required: false,
      });
      mockSetupService.getSystemSettings.mockResolvedValue({
        siteName: 'My Site',
      });

      const response = await app.inject({
        method: 'GET',
        url: '/setup/status',
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({
        success: true,
        data: {
          setupRequired: false,
          siteName: 'My Site',
        },
      });
    });
  });

  describe('POST /setup/complete', () => {
    const validBody = {
      admin: {
        email: 'admin@example.com',
        password: 'SecurePass123!',
        name: 'Admin User',
      },
      organization: {
        name: 'My Company',
        slug: 'my-company',
      },
      siteName: 'My LibreDiary',
    };

    it('should return 400 for invalid request body', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/setup/complete',
        payload: {
          admin: { email: 'invalid' }, // Missing required fields
        },
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 for weak password', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/setup/complete',
        payload: {
          ...validBody,
          admin: { ...validBody.admin, password: '123' },
        },
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.success).toBe(false);
    });

    it('should return 400 when setup already completed', async () => {
      mockSetupService.completeSetup.mockRejectedValue(
        new Error('Setup has already been completed')
      );

      const response = await app.inject({
        method: 'POST',
        url: '/setup/complete',
        payload: validBody,
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.success).toBe(false);
      expect(body.error.message).toBe('Setup has already been completed');
    });

    it('should complete setup successfully', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'admin@example.com',
        name: 'Admin User',
        isSuperAdmin: true,
      };
      const mockOrg = {
        id: 'org-123',
        name: 'My Company',
        slug: 'my-company',
      };

      mockSetupService.completeSetup.mockResolvedValue({
        user: mockUser,
        organization: mockOrg,
      });

      const response = await app.inject({
        method: 'POST',
        url: '/setup/complete',
        payload: validBody,
      });

      expect(response.statusCode).toBe(201);
      const body = response.json();
      expect(body.success).toBe(true);
      expect(body.data.user.email).toBe('admin@example.com');
      expect(body.data.user.isSuperAdmin).toBe(true);
      expect(body.data.organization.name).toBe('My Company');
      // Should not expose password hash
      expect(body.data.user.passwordHash).toBeUndefined();
    });

    it('should validate organization slug format', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/setup/complete',
        payload: {
          ...validBody,
          organization: { ...validBody.organization, slug: 'Invalid Slug!' },
        },
      });

      expect(response.statusCode).toBe(400);
      const body = response.json();
      expect(body.success).toBe(false);
    });
  });
});
