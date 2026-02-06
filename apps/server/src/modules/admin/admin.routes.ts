import type { FastifyInstance } from 'fastify';
import { requireAuth } from '../auth/auth.middleware.js';
import { requireSuperAdmin } from './admin.middleware.js';
import * as adminService from './admin.service.js';
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

export async function adminRoutes(app: FastifyInstance): Promise<void> {
  // Apply auth and super admin middleware to all routes
  app.addHook('preHandler', requireAuth);
  app.addHook('preHandler', requireSuperAdmin);

  // ============================================
  // STATISTICS
  // ============================================

  app.get('/stats', async (_request, reply) => {
    const stats = await adminService.getStats();
    return reply.send({
      success: true,
      data: { stats },
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

      return reply.send({
        success: true,
        data: { message: 'Organization restored successfully' },
      });
    }
  );
}
