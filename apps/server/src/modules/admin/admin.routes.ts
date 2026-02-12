import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../auth/auth.middleware.js';
import { requireSuperAdmin } from './admin.middleware.js';
import * as adminService from './admin.service.js';
import * as filesService from '../files/files.service.js';
import * as aiService from '../ai/ai.service.js';
import { logAudit } from '../audit/audit.service.js';
import { z } from 'zod';

// Query schemas
const paginationSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  search: z.string().optional(),
});

// User update schema
const updateUserSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  isSuperAdmin: z.boolean().optional(),
});

// Org update schema
const updateOrgSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  slug: z.string().min(1).max(50).optional(),
  aiEnabled: z.boolean().optional(),
});

// Settings update schema
const updateSettingsSchema = z
  .object({
    siteName: z.string().min(1).max(255).optional(),
    allowSignups: z.boolean().optional(),
    requireEmailVerification: z.boolean().optional(),
    sessionMaxAge: z.number().int().min(300000).max(2592000000).optional(),
    maxOrganisationsPerUser: z.number().int().min(0).max(1000).optional(),
    defaultUserLocale: z.string().min(2).max(10).optional(),
    aiEnabled: z.boolean().optional(),
    openrouterApiKey: z.string().max(500).nullable().optional(),
    openrouterModel: z.string().min(1).max(200).optional(),
  })
  .strict();

export async function adminRoutes(app: FastifyInstance): Promise<void> {
  // Apply auth and super admin middleware to all routes
  app.addHook('preHandler', requireAuth);
  app.addHook('preHandler', requireSuperAdmin);

  // ============================================
  // STATISTICS
  // ============================================

  app.get('/stats', async (_request, reply) => {
    const stats = await adminService.getStats();
    reply.header('Cache-Control', 'private, max-age=60');
    return reply.send({
      success: true,
      data: { stats },
    });
  });

  app.get('/health', async (_request, reply) => {
    const health = await adminService.getSystemHealth();
    return reply.send({
      success: true,
      data: { health },
    });
  });

  // ============================================
  // USER MANAGEMENT
  // ============================================

  // List all users
  app.get('/users', async (request, reply) => {
    const query = paginationSchema.parse(request.query);

    const result = await adminService.listUsers({
      page: query.page,
      limit: query.limit,
      search: query.search,
    });

    return reply.send({
      success: true,
      data: {
        users: result.items,
        pagination: result.pagination,
      },
    });
  });

  // Get user details
  app.get<{ Params: { userId: string } }>('/users/:userId', async (request, reply) => {
    const { userId } = request.params;

    const user = await adminService.getUserById(userId);

    if (!user) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
        },
      });
    }

    return reply.send({
      success: true,
      data: { user },
    });
  });

  // Update user
  app.patch<{ Params: { userId: string } }>('/users/:userId', async (request, reply) => {
    const { userId } = request.params;
    const data = updateUserSchema.parse(request.body);

    // Prevent removing own super admin status
    if (data.isSuperAdmin === false && userId === request.user?.id) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'CANNOT_REMOVE_OWN_ADMIN',
          message: 'Cannot remove your own super admin status',
        },
      });
    }

    const user = await adminService.updateUser(userId, data);

    if (!user) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
        },
      });
    }

    logAudit({
      action: 'ADMIN_USER_UPDATED',
      userId: request.user?.id,
      resourceType: 'user',
      resourceId: userId,
      metadata: data,
    });

    return reply.send({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          isSuperAdmin: user.isSuperAdmin,
          emailVerified: user.emailVerified,
        },
      },
    });
  });

  // Soft delete user
  app.delete<{ Params: { userId: string } }>('/users/:userId', async (request, reply) => {
    const { userId } = request.params;

    // Prevent deleting self
    if (userId === request.user?.id) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'CANNOT_DELETE_SELF',
          message: 'Cannot delete your own account',
        },
      });
    }

    const user = await adminService.softDeleteUser(userId);

    if (!user) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
        },
      });
    }

    logAudit({
      action: 'ADMIN_USER_DELETED',
      userId: request.user?.id,
      resourceType: 'user',
      resourceId: userId,
    });

    return reply.send({
      success: true,
      data: { message: 'User deleted successfully' },
    });
  });

  // Restore deleted user
  app.post<{ Params: { userId: string } }>('/users/:userId/restore', async (request, reply) => {
    const { userId } = request.params;

    const user = await adminService.restoreUser(userId);

    if (!user) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
        },
      });
    }

    logAudit({
      action: 'ADMIN_USER_RESTORED',
      userId: request.user?.id,
      resourceType: 'user',
      resourceId: userId,
    });

    return reply.send({
      success: true,
      data: { message: 'User restored successfully' },
    });
  });

  // ============================================
  // ORGANIZATION MANAGEMENT
  // ============================================

  // List all organizations
  app.get('/organizations', async (request, reply) => {
    const query = paginationSchema.parse(request.query);

    const result = await adminService.listOrganizations({
      page: query.page,
      limit: query.limit,
      search: query.search,
    });

    return reply.send({
      success: true,
      data: {
        organizations: result.items,
        pagination: result.pagination,
      },
    });
  });

  // Get organization details
  app.get<{ Params: { orgId: string } }>('/organizations/:orgId', async (request, reply) => {
    const { orgId } = request.params;

    const org = await adminService.getOrganizationById(orgId);

    if (!org) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'ORG_NOT_FOUND',
          message: 'Organization not found',
        },
      });
    }

    return reply.send({
      success: true,
      data: { organization: org },
    });
  });

  // Update organization
  app.patch<{ Params: { orgId: string } }>('/organizations/:orgId', async (request, reply) => {
    const { orgId } = request.params;
    const data = updateOrgSchema.parse(request.body);

    const org = await adminService.updateOrganization(orgId, data);

    if (!org) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'ORG_NOT_FOUND',
          message: 'Organization not found',
        },
      });
    }

    logAudit({
      action: 'ADMIN_ORG_UPDATED',
      userId: request.user?.id,
      organizationId: orgId,
      resourceType: 'organization',
      resourceId: orgId,
      metadata: data,
    });

    return reply.send({
      success: true,
      data: {
        organization: {
          id: org.id,
          name: org.name,
          slug: org.slug,
          aiEnabled: org.aiEnabled,
        },
      },
    });
  });

  // Soft delete organization
  app.delete<{ Params: { orgId: string } }>('/organizations/:orgId', async (request, reply) => {
    const { orgId } = request.params;

    const org = await adminService.softDeleteOrganization(orgId);

    if (!org) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'ORG_NOT_FOUND',
          message: 'Organization not found',
        },
      });
    }

    logAudit({
      action: 'ADMIN_ORG_DELETED',
      userId: request.user?.id,
      organizationId: orgId,
      resourceType: 'organization',
      resourceId: orgId,
    });

    return reply.send({
      success: true,
      data: { message: 'Organization deleted successfully' },
    });
  });

  // Restore deleted organization
  app.post<{ Params: { orgId: string } }>(
    '/organizations/:orgId/restore',
    async (request, reply) => {
      const { orgId } = request.params;

      const org = await adminService.restoreOrganization(orgId);

      if (!org) {
        return reply.status(404).send({
          success: false,
          error: {
            code: 'ORG_NOT_FOUND',
            message: 'Organization not found',
          },
        });
      }

      logAudit({
        action: 'ADMIN_ORG_RESTORED',
        userId: request.user?.id,
        organizationId: orgId,
        resourceType: 'organization',
        resourceId: orgId,
      });

      return reply.send({
        success: true,
        data: { message: 'Organization restored successfully' },
      });
    }
  );

  // ============================================
  // SYSTEM SETTINGS
  // ============================================

  // Get system settings
  app.get('/settings', async (_request, reply) => {
    const settings = await adminService.getSettings();

    if (!settings) {
      return reply.status(404).send({
        success: false,
        error: {
          code: 'SETTINGS_NOT_FOUND',
          message: 'System settings not found',
        },
      });
    }

    return reply.send({
      success: true,
      data: { settings },
    });
  });

  // Update system settings
  app.patch('/settings', async (request, reply) => {
    const result = updateSettingsSchema.safeParse(request.body);

    if (!result.success) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: result.error.flatten().fieldErrors,
        },
      });
    }

    const data = result.data;
    const settings = await adminService.updateSettings(data);

    logAudit({
      action: 'ADMIN_SETTINGS_UPDATED',
      userId: request.user?.id,
      resourceType: 'system_settings',
      metadata: data,
    });

    return reply.send({
      success: true,
      data: { settings },
    });
  });

  // ============================================
  // AI
  // ============================================

  // Test AI connection
  app.post('/ai/test', async (request, reply) => {
    const result = await aiService.testConnection();

    logAudit({
      action: 'ADMIN_SETTINGS_UPDATED',
      userId: request.user?.id,
      resourceType: 'system_settings',
      metadata: { subAction: 'AI_TEST_CONNECTION', result: result.success },
    });

    return reply.send({
      success: true,
      data: { result },
    });
  });

  // ============================================
  // STORAGE MANAGEMENT
  // ============================================

  // Get storage info
  app.get('/storage/info', async (_request, reply) => {
    const storage = await filesService.getStorageInfo();
    return reply.send({
      success: true,
      data: { storage },
    });
  });

  // Test storage connection
  app.post('/storage/test', async (_request, reply) => {
    const result = await filesService.testStorageConnection();
    return reply.send({
      success: true,
      data: { result },
    });
  });
}
