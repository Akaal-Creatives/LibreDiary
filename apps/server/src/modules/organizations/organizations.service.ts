import { prisma } from '../../lib/prisma.js';
import { sendInviteEmail } from '../../services/email.service.js';
import { generateInviteToken, expiresIn, isExpired, EXPIRATION } from '../../utils/tokens.js';
import type { Organization, OrganizationMember, OrgRole, User, Invite } from '@prisma/client';
import { canModifyMember, canAssignRole } from './organizations.middleware.js';

// ===========================================
// TYPES
// ===========================================

export interface CreateOrganizationInput {
  name: string;
  slug?: string;
  logoUrl?: string;
  accentColor?: string;
  allowedDomains?: string[];
  aiEnabled?: boolean;
}

export interface UpdateOrganizationInput {
  name?: string;
  slug?: string;
  logoUrl?: string | null;
  accentColor?: string | null;
  allowedDomains?: string[];
  aiEnabled?: boolean;
}

export interface MemberWithUser extends OrganizationMember {
  user: Pick<User, 'id' | 'email' | 'name' | 'avatarUrl'>;
}

export interface InviteWithInviter extends Invite {
  invitedBy: Pick<User, 'id' | 'email' | 'name'>;
}

export interface CreateInviteInput {
  email: string;
  role: OrgRole;
}

// ===========================================
// ORGANIZATION CRUD
// ===========================================

/**
 * Generate a URL-friendly slug from a name
 */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 50);
}

/**
 * Ensure slug is unique by appending a number if necessary
 */
async function ensureUniqueSlug(baseSlug: string, excludeId?: string): Promise<string> {
  const slug = baseSlug || 'org';
  const MAX_ATTEMPTS = 1000;

  for (let counter = 0; counter < MAX_ATTEMPTS; counter++) {
    const candidateSlug = counter === 0 ? slug : `${slug}-${counter}`;
    const existing = await prisma.organization.findFirst({
      where: {
        slug: candidateSlug,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
    });

    if (!existing) {
      return candidateSlug;
    }
  }

  // Fallback: use timestamp to ensure uniqueness
  return `${slug}-${Date.now()}`;
}

/**
 * Create a new organization and add the creator as OWNER
 */
export async function createOrganization(
  userId: string,
  input: CreateOrganizationInput
): Promise<{ organization: Organization; membership: OrganizationMember }> {
  // Generate unique slug
  const baseSlug = input.slug || generateSlug(input.name);
  const slug = await ensureUniqueSlug(baseSlug);

  // Create organization and membership in a transaction
  const result = await prisma.$transaction(async (tx) => {
    const organization = await tx.organization.create({
      data: {
        name: input.name,
        slug,
        logoUrl: input.logoUrl ?? null,
        accentColor: input.accentColor ?? '#6366f1',
        allowedDomains: input.allowedDomains ?? [],
        aiEnabled: input.aiEnabled ?? true,
      },
    });

    const membership = await tx.organizationMember.create({
      data: {
        organizationId: organization.id,
        userId,
        role: 'OWNER',
      },
    });

    return { organization, membership };
  });

  return result;
}

/**
 * Get all organizations a user is a member of
 */
export async function getUserOrganizations(userId: string): Promise<Organization[]> {
  const memberships = await prisma.organizationMember.findMany({
    where: { userId },
    include: {
      organization: true,
    },
  });

  return memberships
    .filter((m) => m.organization && !m.organization.deletedAt)
    .map((m) => m.organization);
}

/**
 * Get organization by ID
 */
export async function getOrganization(orgId: string): Promise<Organization | null> {
  return prisma.organization.findFirst({
    where: {
      id: orgId,
      deletedAt: null,
    },
  });
}

/**
 * Update organization settings
 */
export async function updateOrganization(
  orgId: string,
  input: UpdateOrganizationInput
): Promise<Organization> {
  // If slug is being changed, ensure it's unique
  let slug = input.slug;
  if (slug !== undefined) {
    const baseSlug = generateSlug(slug);
    slug = await ensureUniqueSlug(baseSlug, orgId);
  }

  return prisma.organization.update({
    where: { id: orgId },
    data: {
      ...(input.name !== undefined && { name: input.name }),
      ...(slug !== undefined && { slug }),
      ...(input.logoUrl !== undefined && { logoUrl: input.logoUrl }),
      ...(input.accentColor !== undefined && { accentColor: input.accentColor }),
      ...(input.allowedDomains !== undefined && { allowedDomains: input.allowedDomains }),
      ...(input.aiEnabled !== undefined && { aiEnabled: input.aiEnabled }),
    },
  });
}

/**
 * Soft delete an organization
 */
export async function deleteOrganization(orgId: string): Promise<void> {
  await prisma.organization.update({
    where: { id: orgId },
    data: { deletedAt: new Date() },
  });
}

// ===========================================
// MEMBER MANAGEMENT
// ===========================================

/**
 * Get all members of an organization with user details
 */
export async function getMembers(orgId: string): Promise<MemberWithUser[]> {
  return prisma.organizationMember.findMany({
    where: { organizationId: orgId },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          avatarUrl: true,
        },
      },
    },
    orderBy: [
      { role: 'asc' }, // OWNER first, then ADMIN, then MEMBER
      { createdAt: 'asc' },
    ],
  });
}

/**
 * Get a specific member by ID
 */
export async function getMember(
  orgId: string,
  memberId: string
): Promise<OrganizationMember | null> {
  return prisma.organizationMember.findFirst({
    where: {
      id: memberId,
      organizationId: orgId,
    },
  });
}

/**
 * Update a member's role
 */
export async function updateMemberRole(
  orgId: string,
  memberId: string,
  newRole: OrgRole,
  actorRole: OrgRole
): Promise<OrganizationMember> {
  // Get the target member
  const targetMember = await prisma.organizationMember.findFirst({
    where: {
      id: memberId,
      organizationId: orgId,
    },
  });

  if (!targetMember) {
    throw new Error('MEMBER_NOT_FOUND');
  }

  // Cannot modify the only OWNER
  if (targetMember.role === 'OWNER' && newRole !== 'OWNER') {
    const ownerCount = await prisma.organizationMember.count({
      where: {
        organizationId: orgId,
        role: 'OWNER',
      },
    });
    if (ownerCount <= 1) {
      throw new Error('LAST_OWNER');
    }
  }

  // Check if actor can modify target
  if (!canModifyMember(actorRole, targetMember.role)) {
    throw new Error('CANNOT_MODIFY_HIGHER_ROLE');
  }

  // Check if actor can assign the new role
  if (!canAssignRole(actorRole, newRole)) {
    throw new Error('INSUFFICIENT_ROLE');
  }

  return prisma.organizationMember.update({
    where: { id: memberId },
    data: { role: newRole },
  });
}

/**
 * Remove a member from the organization
 */
export async function removeMember(
  orgId: string,
  memberId: string,
  actorId: string,
  actorRole: OrgRole
): Promise<void> {
  const targetMember = await prisma.organizationMember.findFirst({
    where: {
      id: memberId,
      organizationId: orgId,
    },
  });

  if (!targetMember) {
    throw new Error('MEMBER_NOT_FOUND');
  }

  // Cannot remove yourself via this endpoint (use leaveOrganization instead)
  if (targetMember.userId === actorId) {
    throw new Error('USE_LEAVE_ENDPOINT');
  }

  // Cannot modify the owner
  if (targetMember.role === 'OWNER') {
    throw new Error('CANNOT_MODIFY_OWNER');
  }

  // Check if actor can modify target
  if (!canModifyMember(actorRole, targetMember.role)) {
    throw new Error('CANNOT_MODIFY_HIGHER_ROLE');
  }

  await prisma.organizationMember.delete({
    where: { id: memberId },
  });
}

/**
 * Leave an organization
 */
export async function leaveOrganization(orgId: string, userId: string): Promise<void> {
  const membership = await prisma.organizationMember.findFirst({
    where: {
      organizationId: orgId,
      userId,
    },
  });

  if (!membership) {
    throw new Error('NOT_ORG_MEMBER');
  }

  // Cannot leave if you're the only OWNER
  if (membership.role === 'OWNER') {
    const ownerCount = await prisma.organizationMember.count({
      where: {
        organizationId: orgId,
        role: 'OWNER',
      },
    });
    if (ownerCount <= 1) {
      throw new Error('LAST_OWNER');
    }
  }

  await prisma.organizationMember.delete({
    where: { id: membership.id },
  });
}

/**
 * Transfer ownership to another member
 */
export async function transferOwnership(
  orgId: string,
  newOwnerId: string,
  currentOwnerId: string
): Promise<void> {
  // Get the new owner's membership
  const newOwnerMember = await prisma.organizationMember.findFirst({
    where: {
      organizationId: orgId,
      userId: newOwnerId,
    },
  });

  if (!newOwnerMember) {
    throw new Error('MEMBER_NOT_FOUND');
  }

  // Get current owner's membership
  const currentOwnerMember = await prisma.organizationMember.findFirst({
    where: {
      organizationId: orgId,
      userId: currentOwnerId,
    },
  });

  if (!currentOwnerMember || currentOwnerMember.role !== 'OWNER') {
    throw new Error('UNAUTHORIZED');
  }

  // Transfer ownership in a transaction
  await prisma.$transaction([
    // Make new owner OWNER
    prisma.organizationMember.update({
      where: { id: newOwnerMember.id },
      data: { role: 'OWNER' },
    }),
    // Demote current owner to ADMIN
    prisma.organizationMember.update({
      where: { id: currentOwnerMember.id },
      data: { role: 'ADMIN' },
    }),
  ]);
}

// ===========================================
// INVITE MANAGEMENT
// ===========================================

/**
 * Validate email domain against organization's allowed domains
 */
export function validateEmailDomain(email: string, allowedDomains: string[]): boolean {
  if (!allowedDomains || allowedDomains.length === 0) {
    return true; // No domain restriction
  }

  const emailDomain = email.split('@')[1]?.toLowerCase();
  return allowedDomains.some((domain) => domain.toLowerCase() === emailDomain);
}

/**
 * Create an invite to the organization
 */
export async function createInvite(
  orgId: string,
  input: CreateInviteInput,
  invitedById: string,
  actorRole: OrgRole
): Promise<Invite> {
  const email = input.email.toLowerCase().trim();

  // Get organization to check domain lockdown
  const organization = await prisma.organization.findUnique({
    where: { id: orgId },
  });

  if (!organization) {
    throw new Error('ORG_NOT_FOUND');
  }

  // Validate domain lockdown
  if (!validateEmailDomain(email, organization.allowedDomains)) {
    throw new Error('DOMAIN_NOT_ALLOWED');
  }

  // Check if actor can invite with the requested role
  if (!canAssignRole(actorRole, input.role)) {
    throw new Error('INSUFFICIENT_ROLE');
  }

  // Check if user is already a member
  const existingUser = await prisma.user.findUnique({
    where: { email },
    include: {
      memberships: {
        where: { organizationId: orgId },
      },
    },
  });

  if (existingUser && existingUser.memberships.length > 0) {
    throw new Error('MEMBER_ALREADY_EXISTS');
  }

  // Check for existing pending invite
  const existingInvite = await prisma.invite.findFirst({
    where: {
      email,
      organizationId: orgId,
      acceptedAt: null,
      expiresAt: { gt: new Date() },
    },
  });

  if (existingInvite) {
    throw new Error('INVITE_ALREADY_EXISTS');
  }

  // Get inviter details for email
  const inviter = await prisma.user.findUnique({
    where: { id: invitedById },
  });

  if (!inviter) {
    throw new Error('INVITER_NOT_FOUND');
  }

  // Create invite
  const token = generateInviteToken();
  const invite = await prisma.invite.create({
    data: {
      email,
      token,
      organizationId: orgId,
      role: input.role,
      invitedById,
      expiresAt: expiresIn(EXPIRATION.INVITE),
    },
  });

  // Send invite email
  await sendInviteEmail(email, token, organization.name, inviter.name ?? inviter.email);

  return invite;
}

/**
 * Get all pending invites for an organization
 */
export async function getInvites(orgId: string): Promise<InviteWithInviter[]> {
  return prisma.invite.findMany({
    where: {
      organizationId: orgId,
      acceptedAt: null,
    },
    include: {
      invitedBy: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Get a specific invite by ID
 */
export async function getInvite(
  orgId: string,
  inviteId: string
): Promise<InviteWithInviter | null> {
  return prisma.invite.findFirst({
    where: {
      id: inviteId,
      organizationId: orgId,
    },
    include: {
      invitedBy: {
        select: {
          id: true,
          email: true,
          name: true,
        },
      },
    },
  });
}

/**
 * Cancel (delete) an invite
 */
export async function cancelInvite(orgId: string, inviteId: string): Promise<void> {
  const invite = await prisma.invite.findFirst({
    where: {
      id: inviteId,
      organizationId: orgId,
    },
  });

  if (!invite) {
    throw new Error('INVITE_NOT_FOUND');
  }

  if (invite.acceptedAt) {
    throw new Error('INVITE_ALREADY_ACCEPTED');
  }

  await prisma.invite.delete({
    where: { id: inviteId },
  });
}

/**
 * Resend an invite email
 */
export async function resendInvite(orgId: string, inviteId: string): Promise<Invite> {
  const invite = await prisma.invite.findFirst({
    where: {
      id: inviteId,
      organizationId: orgId,
    },
    include: {
      organization: true,
      invitedBy: true,
    },
  });

  if (!invite) {
    throw new Error('INVITE_NOT_FOUND');
  }

  if (invite.acceptedAt) {
    throw new Error('INVITE_ALREADY_ACCEPTED');
  }

  // Generate new token and extend expiration
  const newToken = generateInviteToken();
  const updatedInvite = await prisma.invite.update({
    where: { id: inviteId },
    data: {
      token: newToken,
      expiresAt: expiresIn(EXPIRATION.INVITE),
    },
  });

  // Resend email
  await sendInviteEmail(
    invite.email,
    newToken,
    invite.organization.name,
    invite.invitedBy.name ?? invite.invitedBy.email
  );

  return updatedInvite;
}

/**
 * Check invite status (pending, expired, accepted)
 */
export function getInviteStatus(invite: Invite): 'PENDING' | 'ACCEPTED' | 'EXPIRED' {
  if (invite.acceptedAt) {
    return 'ACCEPTED';
  }
  if (isExpired(invite.expiresAt)) {
    return 'EXPIRED';
  }
  return 'PENDING';
}
