import type { FastifyRequest, FastifyReply } from 'fastify';
import type { Organization, OrganizationMember, OrgRole } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';

// Extend FastifyRequest type for organization context
declare module 'fastify' {
  interface FastifyRequest {
    organization?: Organization;
    membership?: OrganizationMember;
  }
}

// Role hierarchy for comparison
const ROLE_HIERARCHY: Record<OrgRole, number> = {
  MEMBER: 1,
  ADMIN: 2,
  OWNER: 3,
};

/**
 * Get organization ID from route params
 */
function getOrgIdFromParams(request: FastifyRequest): string | undefined {
  const params = request.params as { orgId?: string };
  return params.orgId;
}

/**
 * Middleware that requires organization access
 * Validates that the organization exists (not deleted) and user is a member
 * Attaches organization and membership to request
 */
export async function requireOrgAccess(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  // User must be authenticated (requireAuth should be called before this)
  if (!request.user) {
    return reply.status(401).send({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      },
    });
  }

  const orgId = getOrgIdFromParams(request);
  if (!orgId) {
    return reply.status(400).send({
      success: false,
      error: {
        code: 'INVALID_REQUEST',
        message: 'Organization ID is required',
      },
    });
  }

  // Find organization and membership in a single query
  const organization = await prisma.organization.findFirst({
    where: {
      id: orgId,
      deletedAt: null,
    },
  });

  if (!organization) {
    return reply.status(404).send({
      success: false,
      error: {
        code: 'ORG_NOT_FOUND',
        message: 'Organization not found',
      },
    });
  }

  // Check if user is a member
  const membership = await prisma.organizationMember.findUnique({
    where: {
      organizationId_userId: {
        organizationId: orgId,
        userId: request.user.id,
      },
    },
  });

  if (!membership) {
    return reply.status(403).send({
      success: false,
      error: {
        code: 'NOT_ORG_MEMBER',
        message: 'You are not a member of this organization',
      },
    });
  }

  // Attach to request
  request.organization = organization;
  request.membership = membership;
}

/**
 * Factory function that creates middleware requiring a minimum role
 * Must be used after requireOrgAccess
 */
export function requireOrgRole(
  minRole: OrgRole
): (request: FastifyRequest, reply: FastifyReply) => Promise<void> {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    // Organization access must be validated first
    if (!request.membership) {
      return reply.status(403).send({
        success: false,
        error: {
          code: 'NOT_ORG_MEMBER',
          message: 'You are not a member of this organization',
        },
      });
    }

    const userRoleLevel = ROLE_HIERARCHY[request.membership.role];
    const requiredRoleLevel = ROLE_HIERARCHY[minRole];

    if (userRoleLevel < requiredRoleLevel) {
      return reply.status(403).send({
        success: false,
        error: {
          code: 'INSUFFICIENT_ROLE',
          message: `This action requires ${minRole} role or higher`,
        },
      });
    }
  };
}

/**
 * Helper to check if actor can modify a target member
 * ADMINs cannot modify other ADMINs or OWNERs
 * OWNERs can modify anyone
 */
export function canModifyMember(actorRole: OrgRole, targetRole: OrgRole): boolean {
  const targetLevel = ROLE_HIERARCHY[targetRole];

  // OWNER can modify anyone
  if (actorRole === 'OWNER') {
    return true;
  }

  // ADMIN can only modify MEMBERs
  if (actorRole === 'ADMIN') {
    return targetLevel < ROLE_HIERARCHY.ADMIN;
  }

  // MEMBER cannot modify anyone
  return false;
}

/**
 * Helper to check if actor can assign a specific role
 * ADMINs can only assign MEMBER role
 * OWNERs can assign any role
 */
export function canAssignRole(actorRole: OrgRole, targetRole: OrgRole): boolean {
  // OWNER can assign any role
  if (actorRole === 'OWNER') {
    return true;
  }

  // ADMIN can only assign MEMBER role
  if (actorRole === 'ADMIN') {
    return targetRole === 'MEMBER';
  }

  // MEMBER cannot assign roles
  return false;
}

/**
 * Helper to compare roles
 */
export function compareRoles(role1: OrgRole, role2: OrgRole): number {
  const level1 = ROLE_HIERARCHY[role1];
  const level2 = ROLE_HIERARCHY[role2];
  return level1 - level2;
}
