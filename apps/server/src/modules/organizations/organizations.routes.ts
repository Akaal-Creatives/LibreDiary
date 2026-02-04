import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import * as orgService from './organizations.service.js';
import { requireOrgAccess, requireOrgRole } from './organizations.middleware.js';
import { requireAuth } from '../auth/auth.middleware.js';
import type { OrgRole } from '@prisma/client';

// ===========================================
// REQUEST SCHEMAS
// ===========================================

const createOrganizationSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens')
    .optional(),
  logoUrl: z.string().url().optional(),
  accentColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Must be a valid hex color')
    .optional(),
  allowedDomain: z
    .string()
    .regex(/^[a-z0-9.-]+\.[a-z]{2,}$/, 'Must be a valid domain')
    .optional(),
  aiEnabled: z.boolean().optional(),
});

const updateOrganizationSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  slug: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens')
    .optional(),
  logoUrl: z.string().url().nullable().optional(),
  accentColor: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, 'Must be a valid hex color')
    .nullable()
    .optional(),
  allowedDomain: z
    .string()
    .regex(/^[a-z0-9.-]+\.[a-z]{2,}$/, 'Must be a valid domain')
    .nullable()
    .optional(),
  aiEnabled: z.boolean().optional(),
});

const updateMemberRoleSchema = z.object({
  role: z.enum(['OWNER', 'ADMIN', 'MEMBER']),
});

const createInviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(['OWNER', 'ADMIN', 'MEMBER']).default('MEMBER'),
});

const transferOwnershipSchema = z.object({
  newOwnerId: z.string().min(1),
});

// ===========================================
// TYPE DEFINITIONS
// ===========================================

interface OrgParams {
  orgId: string;
}

interface MemberParams extends OrgParams {
  memberId: string;
}

interface InviteParams extends OrgParams {
  inviteId: string;
}

// ===========================================
// ERROR RESPONSE HELPER
// ===========================================

function mapServiceError(error: unknown, reply: FastifyReply): FastifyReply {
  const message = error instanceof Error ? error.message : 'Unknown error';

  const errorMap: Record<string, { status: number; code: string; message: string }> = {
    ORG_NOT_FOUND: { status: 404, code: 'ORG_NOT_FOUND', message: 'Organization not found' },
    NOT_ORG_MEMBER: {
      status: 403,
      code: 'NOT_ORG_MEMBER',
      message: 'You are not a member of this organization',
    },
    INSUFFICIENT_ROLE: {
      status: 403,
      code: 'INSUFFICIENT_ROLE',
      message: 'You do not have permission to perform this action',
    },
    CANNOT_MODIFY_OWNER: {
      status: 403,
      code: 'CANNOT_MODIFY_OWNER',
      message: 'Cannot modify organization owner',
    },
    CANNOT_MODIFY_HIGHER_ROLE: {
      status: 403,
      code: 'CANNOT_MODIFY_HIGHER_ROLE',
      message: 'Cannot modify users with equal or higher role',
    },
    LAST_OWNER: {
      status: 400,
      code: 'LAST_OWNER',
      message: 'Cannot remove or demote the only owner',
    },
    DOMAIN_NOT_ALLOWED: {
      status: 400,
      code: 'DOMAIN_NOT_ALLOWED',
      message: 'Email domain not allowed for this organization',
    },
    INVITE_ALREADY_EXISTS: {
      status: 400,
      code: 'INVITE_ALREADY_EXISTS',
      message: 'An invite has already been sent to this email',
    },
    MEMBER_ALREADY_EXISTS: {
      status: 400,
      code: 'MEMBER_ALREADY_EXISTS',
      message: 'User is already a member of this organization',
    },
    MEMBER_NOT_FOUND: { status: 404, code: 'MEMBER_NOT_FOUND', message: 'Member not found' },
    INVITE_NOT_FOUND: { status: 404, code: 'INVITE_NOT_FOUND', message: 'Invite not found' },
    INVITE_ALREADY_ACCEPTED: {
      status: 400,
      code: 'INVITE_ALREADY_ACCEPTED',
      message: 'Invite has already been accepted',
    },
    USE_LEAVE_ENDPOINT: {
      status: 400,
      code: 'USE_LEAVE_ENDPOINT',
      message: 'Use the leave endpoint to remove yourself',
    },
    INVALID_SLUG: {
      status: 400,
      code: 'INVALID_SLUG',
      message: 'Slug is invalid or already taken',
    },
  };

  const errorInfo = errorMap[message] || {
    status: 500,
    code: 'INTERNAL_ERROR',
    message: 'An unexpected error occurred',
  };

  return reply.status(errorInfo.status).send({
    success: false,
    error: {
      code: errorInfo.code,
      message: errorInfo.message,
    },
  });
}

// ===========================================
// ROUTES
// ===========================================

export async function organizationRoutes(fastify: FastifyInstance): Promise<void> {
  // All routes require authentication
  fastify.addHook('preHandler', requireAuth);

  // ===========================================
  // ORGANIZATION CRUD
  // ===========================================

  /**
   * POST /organizations
   * Create a new organization
   */
  fastify.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = createOrganizationSchema.safeParse(request.body);
    if (!body.success) {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request body',
          details: body.error.flatten().fieldErrors,
        },
      });
    }

    try {
      const result = await orgService.createOrganization(request.user!.id, {
        name: body.data.name,
        slug: body.data.slug,
        logoUrl: body.data.logoUrl,
        accentColor: body.data.accentColor,
        allowedDomain: body.data.allowedDomain,
        aiEnabled: body.data.aiEnabled,
      });

      return reply.status(201).send({
        success: true,
        data: {
          organization: result.organization,
          membership: result.membership,
        },
      });
    } catch (error) {
      return mapServiceError(error, reply);
    }
  });

  /**
   * GET /organizations
   * List user's organizations
   */
  fastify.get('/', async (request: FastifyRequest, _reply: FastifyReply) => {
    const organizations = await orgService.getUserOrganizations(request.user!.id);

    return {
      success: true,
      data: { organizations },
    };
  });

  /**
   * GET /organizations/:orgId
   * Get organization details
   */
  fastify.get<{ Params: OrgParams }>(
    '/:orgId',
    { preHandler: [requireOrgAccess] },
    async (request: FastifyRequest<{ Params: OrgParams }>, _reply: FastifyReply) => {
      return {
        success: true,
        data: {
          organization: request.organization!,
          membership: request.membership!,
        },
      };
    }
  );

  /**
   * PATCH /organizations/:orgId
   * Update organization settings
   */
  fastify.patch<{ Params: OrgParams }>(
    '/:orgId',
    { preHandler: [requireOrgAccess, requireOrgRole('ADMIN')] },
    async (request: FastifyRequest<{ Params: OrgParams }>, reply: FastifyReply) => {
      const body = updateOrganizationSchema.safeParse(request.body);
      if (!body.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request body',
            details: body.error.flatten().fieldErrors,
          },
        });
      }

      // Domain lockdown can only be changed by OWNER
      if (body.data.allowedDomain !== undefined && request.membership!.role !== 'OWNER') {
        return reply.status(403).send({
          success: false,
          error: {
            code: 'INSUFFICIENT_ROLE',
            message: 'Only the owner can configure domain lockdown',
          },
        });
      }

      try {
        const organization = await orgService.updateOrganization(request.params.orgId, body.data);

        return {
          success: true,
          data: { organization },
        };
      } catch (error) {
        return mapServiceError(error, reply);
      }
    }
  );

  /**
   * DELETE /organizations/:orgId
   * Soft delete organization
   */
  fastify.delete<{ Params: OrgParams }>(
    '/:orgId',
    { preHandler: [requireOrgAccess, requireOrgRole('OWNER')] },
    async (request: FastifyRequest<{ Params: OrgParams }>, reply: FastifyReply) => {
      try {
        await orgService.deleteOrganization(request.params.orgId);

        return {
          success: true,
          data: { message: 'Organization deleted successfully' },
        };
      } catch (error) {
        return mapServiceError(error, reply);
      }
    }
  );

  // ===========================================
  // MEMBER MANAGEMENT
  // ===========================================

  /**
   * GET /organizations/:orgId/members
   * List organization members
   */
  fastify.get<{ Params: OrgParams }>(
    '/:orgId/members',
    { preHandler: [requireOrgAccess] },
    async (request: FastifyRequest<{ Params: OrgParams }>, _reply: FastifyReply) => {
      const members = await orgService.getMembers(request.params.orgId);

      return {
        success: true,
        data: { members },
      };
    }
  );

  /**
   * PATCH /organizations/:orgId/members/:memberId
   * Update member role
   */
  fastify.patch<{ Params: MemberParams }>(
    '/:orgId/members/:memberId',
    { preHandler: [requireOrgAccess, requireOrgRole('ADMIN')] },
    async (request: FastifyRequest<{ Params: MemberParams }>, reply: FastifyReply) => {
      const body = updateMemberRoleSchema.safeParse(request.body);
      if (!body.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request body',
            details: body.error.flatten().fieldErrors,
          },
        });
      }

      try {
        const member = await orgService.updateMemberRole(
          request.params.orgId,
          request.params.memberId,
          body.data.role as OrgRole,
          request.membership!.role
        );

        return {
          success: true,
          data: { member },
        };
      } catch (error) {
        return mapServiceError(error, reply);
      }
    }
  );

  /**
   * DELETE /organizations/:orgId/members/:memberId
   * Remove member from organization
   */
  fastify.delete<{ Params: MemberParams }>(
    '/:orgId/members/:memberId',
    { preHandler: [requireOrgAccess, requireOrgRole('ADMIN')] },
    async (request: FastifyRequest<{ Params: MemberParams }>, reply: FastifyReply) => {
      try {
        await orgService.removeMember(
          request.params.orgId,
          request.params.memberId,
          request.user!.id,
          request.membership!.role
        );

        return {
          success: true,
          data: { message: 'Member removed successfully' },
        };
      } catch (error) {
        return mapServiceError(error, reply);
      }
    }
  );

  /**
   * POST /organizations/:orgId/leave
   * Leave organization
   */
  fastify.post<{ Params: OrgParams }>(
    '/:orgId/leave',
    { preHandler: [requireOrgAccess] },
    async (request: FastifyRequest<{ Params: OrgParams }>, reply: FastifyReply) => {
      try {
        await orgService.leaveOrganization(request.params.orgId, request.user!.id);

        return {
          success: true,
          data: { message: 'Left organization successfully' },
        };
      } catch (error) {
        return mapServiceError(error, reply);
      }
    }
  );

  /**
   * POST /organizations/:orgId/transfer-ownership
   * Transfer ownership to another member
   */
  fastify.post<{ Params: OrgParams }>(
    '/:orgId/transfer-ownership',
    { preHandler: [requireOrgAccess, requireOrgRole('OWNER')] },
    async (request: FastifyRequest<{ Params: OrgParams }>, reply: FastifyReply) => {
      const body = transferOwnershipSchema.safeParse(request.body);
      if (!body.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request body',
            details: body.error.flatten().fieldErrors,
          },
        });
      }

      try {
        await orgService.transferOwnership(
          request.params.orgId,
          body.data.newOwnerId,
          request.user!.id
        );

        return {
          success: true,
          data: { message: 'Ownership transferred successfully' },
        };
      } catch (error) {
        return mapServiceError(error, reply);
      }
    }
  );

  // ===========================================
  // INVITE MANAGEMENT
  // ===========================================

  /**
   * POST /organizations/:orgId/invites
   * Create invite
   */
  fastify.post<{ Params: OrgParams }>(
    '/:orgId/invites',
    { preHandler: [requireOrgAccess, requireOrgRole('ADMIN')] },
    async (request: FastifyRequest<{ Params: OrgParams }>, reply: FastifyReply) => {
      const body = createInviteSchema.safeParse(request.body);
      if (!body.success) {
        return reply.status(400).send({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request body',
            details: body.error.flatten().fieldErrors,
          },
        });
      }

      try {
        const invite = await orgService.createInvite(
          request.params.orgId,
          body.data as { email: string; role: OrgRole },
          request.user!.id,
          request.membership!.role
        );

        return reply.status(201).send({
          success: true,
          data: { invite },
        });
      } catch (error) {
        return mapServiceError(error, reply);
      }
    }
  );

  /**
   * GET /organizations/:orgId/invites
   * List pending invites
   */
  fastify.get<{ Params: OrgParams }>(
    '/:orgId/invites',
    { preHandler: [requireOrgAccess, requireOrgRole('ADMIN')] },
    async (request: FastifyRequest<{ Params: OrgParams }>, _reply: FastifyReply) => {
      const invites = await orgService.getInvites(request.params.orgId);

      // Add status to each invite
      const invitesWithStatus = invites.map((invite) => ({
        ...invite,
        status: orgService.getInviteStatus(invite),
      }));

      return {
        success: true,
        data: { invites: invitesWithStatus },
      };
    }
  );

  /**
   * DELETE /organizations/:orgId/invites/:inviteId
   * Cancel invite
   */
  fastify.delete<{ Params: InviteParams }>(
    '/:orgId/invites/:inviteId',
    { preHandler: [requireOrgAccess, requireOrgRole('ADMIN')] },
    async (request: FastifyRequest<{ Params: InviteParams }>, reply: FastifyReply) => {
      try {
        await orgService.cancelInvite(request.params.orgId, request.params.inviteId);

        return {
          success: true,
          data: { message: 'Invite cancelled successfully' },
        };
      } catch (error) {
        return mapServiceError(error, reply);
      }
    }
  );

  /**
   * POST /organizations/:orgId/invites/:inviteId/resend
   * Resend invite email
   */
  fastify.post<{ Params: InviteParams }>(
    '/:orgId/invites/:inviteId/resend',
    { preHandler: [requireOrgAccess, requireOrgRole('ADMIN')] },
    async (request: FastifyRequest<{ Params: InviteParams }>, reply: FastifyReply) => {
      try {
        const invite = await orgService.resendInvite(request.params.orgId, request.params.inviteId);

        return {
          success: true,
          data: {
            invite,
            message: 'Invite resent successfully',
          },
        };
      } catch (error) {
        return mapServiceError(error, reply);
      }
    }
  );
}
