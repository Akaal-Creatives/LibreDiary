import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from 'vitest';

// Mock services using vi.hoisted
const { mockPermissionsService, _mockPage, mockPermission, resetMocks } = vi.hoisted(() => {
  const mockPermissionsService = {
    checkPageAccess: vi.fn(),
    grantPermission: vi.fn(),
    revokePermission: vi.fn(),
    listPagePermissions: vi.fn(),
    updatePermissionLevel: vi.fn(),
    createShareLink: vi.fn(),
    validateShareToken: vi.fn(),
    deleteShareLink: vi.fn(),
    listShareLinks: vi.fn(),
  };

  const mockPage = {
    id: 'page-123',
    organizationId: 'org-123',
    title: 'Test Page',
  };

  const mockPermission = {
    id: 'perm-123',
    pageId: 'page-123',
    userId: 'user-456',
    level: 'EDIT',
    shareToken: null,
    expiresAt: null,
    grantedById: 'user-123',
    createdAt: new Date(),
    updatedAt: new Date(),
    user: { id: 'user-456', email: 'test@example.com', name: 'Test User' },
  };

  function resetMocks() {
    Object.values(mockPermissionsService).forEach((mock) => mock.mockReset());
  }

  return { mockPermissionsService, _mockPage: mockPage, mockPermission, resetMocks };
});

// Mock the services
vi.mock('../permissions.service.js', () => mockPermissionsService);

vi.mock('../../auth/auth.middleware.js', () => ({
  requireAuth: vi.fn((_req, _reply, done) => done()),
}));

vi.mock('../../organizations/organizations.middleware.js', () => ({
  requireOrgAccess: vi.fn((_req, _reply, done) => done()),
}));

// Import after mocking
import Fastify from 'fastify';
import permissionsRoutes from '../permissions.routes.js';

describe('Permissions Routes', () => {
  let app: ReturnType<typeof Fastify>;

  beforeEach(async () => {
    resetMocks();
    app = Fastify();

    // Decorate with user (simulating auth middleware)
    app.decorateRequest('user', null);
    app.addHook('preHandler', async (request) => {
      request.user = { id: 'user-123', email: 'admin@example.com' };
    });

    await app.register(permissionsRoutes, {
      prefix: '/organizations/:orgId/pages/:pageId/permissions',
    });
    await app.ready();
  });

  afterEach(async () => {
    vi.clearAllMocks();
    await app.close();
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  describe('GET /organizations/:orgId/pages/:pageId/permissions', () => {
    it('should list page permissions', async () => {
      mockPermissionsService.listPagePermissions.mockResolvedValue([mockPermission]);

      const response = await app.inject({
        method: 'GET',
        url: '/organizations/org-123/pages/page-123/permissions',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.permissions).toHaveLength(1);
    });
  });

  describe('POST /organizations/:orgId/pages/:pageId/permissions', () => {
    it('should grant permission to a user', async () => {
      mockPermissionsService.grantPermission.mockResolvedValue(mockPermission);

      const response = await app.inject({
        method: 'POST',
        url: '/organizations/org-123/pages/page-123/permissions',
        payload: {
          userId: 'user-456',
          level: 'EDIT',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.permission.userId).toBe('user-456');
    });

    it('should return 400 for invalid permission level', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/organizations/org-123/pages/page-123/permissions',
        payload: {
          userId: 'user-456',
          level: 'INVALID',
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('PATCH /organizations/:orgId/pages/:pageId/permissions/:permissionId', () => {
    it('should update permission level', async () => {
      mockPermissionsService.updatePermissionLevel.mockResolvedValue({
        ...mockPermission,
        level: 'FULL_ACCESS',
      });

      const response = await app.inject({
        method: 'PATCH',
        url: '/organizations/org-123/pages/page-123/permissions/perm-123',
        payload: {
          level: 'FULL_ACCESS',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.permission.level).toBe('FULL_ACCESS');
    });
  });

  describe('DELETE /organizations/:orgId/pages/:pageId/permissions/:permissionId', () => {
    it('should revoke permission', async () => {
      mockPermissionsService.revokePermission.mockResolvedValue(undefined);

      const response = await app.inject({
        method: 'DELETE',
        url: '/organizations/org-123/pages/page-123/permissions/perm-123',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
    });
  });

  describe('POST /organizations/:orgId/pages/:pageId/permissions/share-link', () => {
    it('should create a share link', async () => {
      mockPermissionsService.createShareLink.mockResolvedValue({
        ...mockPermission,
        userId: null,
        shareToken: 'abc123token',
      });

      const response = await app.inject({
        method: 'POST',
        url: '/organizations/org-123/pages/page-123/permissions/share-link',
        payload: {
          level: 'VIEW',
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.data.shareLink.shareToken).toBe('abc123token');
    });
  });

  describe('GET /organizations/:orgId/pages/:pageId/permissions/share-links', () => {
    it('should list share links', async () => {
      mockPermissionsService.listShareLinks.mockResolvedValue([
        { ...mockPermission, userId: null, shareToken: 'token1' },
      ]);

      const response = await app.inject({
        method: 'GET',
        url: '/organizations/org-123/pages/page-123/permissions/share-links',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.data.shareLinks).toHaveLength(1);
    });
  });
});
