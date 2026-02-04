import { api } from './api';
import type { Organization, OrganizationMember, OrgRole, User } from '@librediary/shared';

// ===========================================
// TYPES
// ===========================================

export interface CreateOrganizationInput {
  name: string;
  slug?: string;
  logoUrl?: string;
  accentColor?: string;
  allowedDomain?: string;
  aiEnabled?: boolean;
}

export interface UpdateOrganizationInput {
  name?: string;
  slug?: string;
  logoUrl?: string | null;
  accentColor?: string | null;
  allowedDomain?: string | null;
  aiEnabled?: boolean;
}

export interface MemberWithUser extends OrganizationMember {
  user: Pick<User, 'id' | 'email' | 'name' | 'avatarUrl'>;
}

export interface InviteInfo {
  id: string;
  email: string;
  role: OrgRole;
  status: 'PENDING' | 'ACCEPTED' | 'EXPIRED';
  expiresAt: string;
  createdAt: string;
  invitedBy: Pick<User, 'id' | 'email' | 'name'>;
}

export interface CreateInviteInput {
  email: string;
  role: OrgRole;
}

export interface OrganizationWithMembership {
  organization: Organization;
  membership: OrganizationMember;
}

// ===========================================
// SERVICE
// ===========================================

export const organizationsService = {
  // ===========================================
  // ORGANIZATION CRUD
  // ===========================================

  /**
   * Create a new organization
   */
  async createOrganization(input: CreateOrganizationInput): Promise<OrganizationWithMembership> {
    return api.post<OrganizationWithMembership>('/organizations', input);
  },

  /**
   * List user's organizations
   */
  async getOrganizations(): Promise<{ organizations: Organization[] }> {
    return api.get<{ organizations: Organization[] }>('/organizations');
  },

  /**
   * Get organization details with membership
   */
  async getOrganization(orgId: string): Promise<OrganizationWithMembership> {
    return api.get<OrganizationWithMembership>(`/organizations/${orgId}`);
  },

  /**
   * Update organization settings
   */
  async updateOrganization(
    orgId: string,
    input: UpdateOrganizationInput
  ): Promise<{ organization: Organization }> {
    return api.patch<{ organization: Organization }>(`/organizations/${orgId}`, input);
  },

  /**
   * Delete organization
   */
  async deleteOrganization(orgId: string): Promise<{ message: string }> {
    return api.delete<{ message: string }>(`/organizations/${orgId}`);
  },

  // ===========================================
  // MEMBER MANAGEMENT
  // ===========================================

  /**
   * List organization members
   */
  async getMembers(orgId: string): Promise<{ members: MemberWithUser[] }> {
    return api.get<{ members: MemberWithUser[] }>(`/organizations/${orgId}/members`);
  },

  /**
   * Update member role
   */
  async updateMemberRole(
    orgId: string,
    memberId: string,
    role: OrgRole
  ): Promise<{ member: OrganizationMember }> {
    return api.patch<{ member: OrganizationMember }>(
      `/organizations/${orgId}/members/${memberId}`,
      { role }
    );
  },

  /**
   * Remove member from organization
   */
  async removeMember(orgId: string, memberId: string): Promise<{ message: string }> {
    return api.delete<{ message: string }>(`/organizations/${orgId}/members/${memberId}`);
  },

  /**
   * Leave organization
   */
  async leaveOrganization(orgId: string): Promise<{ message: string }> {
    return api.post<{ message: string }>(`/organizations/${orgId}/leave`);
  },

  /**
   * Transfer ownership to another member
   */
  async transferOwnership(orgId: string, newOwnerId: string): Promise<{ message: string }> {
    return api.post<{ message: string }>(`/organizations/${orgId}/transfer-ownership`, {
      newOwnerId,
    });
  },

  // ===========================================
  // INVITE MANAGEMENT
  // ===========================================

  /**
   * Create invite
   */
  async createInvite(orgId: string, input: CreateInviteInput): Promise<{ invite: InviteInfo }> {
    return api.post<{ invite: InviteInfo }>(`/organizations/${orgId}/invites`, input);
  },

  /**
   * List pending invites
   */
  async getInvites(orgId: string): Promise<{ invites: InviteInfo[] }> {
    return api.get<{ invites: InviteInfo[] }>(`/organizations/${orgId}/invites`);
  },

  /**
   * Cancel invite
   */
  async cancelInvite(orgId: string, inviteId: string): Promise<{ message: string }> {
    return api.delete<{ message: string }>(`/organizations/${orgId}/invites/${inviteId}`);
  },

  /**
   * Resend invite email
   */
  async resendInvite(
    orgId: string,
    inviteId: string
  ): Promise<{ invite: InviteInfo; message: string }> {
    return api.post<{ invite: InviteInfo; message: string }>(
      `/organizations/${orgId}/invites/${inviteId}/resend`
    );
  },
};
