import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Organization, OrganizationMember, OrgRole } from '@librediary/shared';
import {
  organizationsService,
  type MemberWithUser,
  type InviteInfo,
  type CreateOrganizationInput,
  type UpdateOrganizationInput,
  type CreateInviteInput,
} from '@/services/organizations.service';
import { useAuthStore } from './auth';

export const useOrganizationsStore = defineStore('organizations', () => {
  const authStore = useAuthStore();

  // State
  const currentMembership = ref<OrganizationMember | null>(null);
  const members = ref<MemberWithUser[]>([]);
  const invites = ref<InviteInfo[]>([]);
  const loading = ref(false);
  const membersLoading = ref(false);
  const invitesLoading = ref(false);

  // Getters
  const currentOrganization = computed(() => authStore.currentOrganization);
  const currentOrganizationId = computed(() => authStore.currentOrganizationId);

  // Use auth store membership for role, with fallback to fetched membership
  const userRole = computed<OrgRole | null>(
    () => authStore.currentUserRole ?? currentMembership.value?.role ?? null
  );
  const isOwner = computed(() => userRole.value === 'OWNER');
  const isAdmin = computed(() => userRole.value === 'ADMIN' || userRole.value === 'OWNER');
  const isMember = computed(() => !!userRole.value);

  const canManageMembers = computed(() => isAdmin.value);
  const canManageSettings = computed(() => isAdmin.value);
  const canManageInvites = computed(() => isAdmin.value);
  const canDeleteOrganization = computed(() => isOwner.value);
  const canConfigureDomainLockdown = computed(() => isOwner.value);
  const canTransferOwnership = computed(() => isOwner.value);

  // Actions

  /**
   * Fetch current organization and membership
   */
  async function fetchOrganization(): Promise<void> {
    if (!currentOrganizationId.value) return;

    loading.value = true;
    try {
      const data = await organizationsService.getOrganization(currentOrganizationId.value);
      currentMembership.value = data.membership;
      // Update organization in auth store if needed
      if (data.organization) {
        const orgs = authStore.organizations;
        const index = orgs.findIndex((o) => o.id === data.organization.id);
        if (index !== -1) {
          orgs[index] = data.organization;
          authStore.setOrganizations([...orgs]);
        }
      }
    } finally {
      loading.value = false;
    }
  }

  /**
   * Create a new organization
   */
  async function createOrganization(input: CreateOrganizationInput): Promise<Organization> {
    loading.value = true;
    try {
      const data = await organizationsService.createOrganization(input);
      // Add to auth store's organizations list
      authStore.setOrganizations([...authStore.organizations, data.organization]);
      // Switch to the new organization
      authStore.setCurrentOrganization(data.organization.id);
      currentMembership.value = data.membership;
      return data.organization;
    } finally {
      loading.value = false;
    }
  }

  /**
   * Update current organization settings
   */
  async function updateOrganization(input: UpdateOrganizationInput): Promise<void> {
    if (!currentOrganizationId.value) return;

    loading.value = true;
    try {
      const data = await organizationsService.updateOrganization(
        currentOrganizationId.value,
        input
      );
      // Update in auth store
      const orgs = authStore.organizations;
      const index = orgs.findIndex((o) => o.id === currentOrganizationId.value);
      if (index !== -1) {
        orgs[index] = data.organization;
        authStore.setOrganizations([...orgs]);
      }
    } finally {
      loading.value = false;
    }
  }

  /**
   * Delete current organization
   */
  async function deleteOrganization(): Promise<void> {
    if (!currentOrganizationId.value) return;

    loading.value = true;
    try {
      await organizationsService.deleteOrganization(currentOrganizationId.value);
      // Remove from auth store
      const orgs = authStore.organizations.filter((o) => o.id !== currentOrganizationId.value);
      authStore.setOrganizations(orgs);
      // Clear current membership
      currentMembership.value = null;
      members.value = [];
      invites.value = [];
    } finally {
      loading.value = false;
    }
  }

  // Member Management

  /**
   * Fetch organization members
   */
  async function fetchMembers(): Promise<void> {
    if (!currentOrganizationId.value) return;

    membersLoading.value = true;
    try {
      const data = await organizationsService.getMembers(currentOrganizationId.value);
      members.value = data.members;
    } finally {
      membersLoading.value = false;
    }
  }

  /**
   * Update a member's role
   */
  async function updateMemberRole(memberId: string, role: OrgRole): Promise<void> {
    if (!currentOrganizationId.value) return;

    membersLoading.value = true;
    try {
      await organizationsService.updateMemberRole(currentOrganizationId.value, memberId, role);
      // Refresh members list
      await fetchMembers();
    } finally {
      membersLoading.value = false;
    }
  }

  /**
   * Remove a member from the organization
   */
  async function removeMember(memberId: string): Promise<void> {
    if (!currentOrganizationId.value) return;

    membersLoading.value = true;
    try {
      await organizationsService.removeMember(currentOrganizationId.value, memberId);
      // Remove from local state
      members.value = members.value.filter((m) => m.id !== memberId);
    } finally {
      membersLoading.value = false;
    }
  }

  /**
   * Leave the current organization
   */
  async function leaveOrganization(): Promise<void> {
    if (!currentOrganizationId.value) return;

    loading.value = true;
    try {
      await organizationsService.leaveOrganization(currentOrganizationId.value);
      // Remove from auth store
      const orgs = authStore.organizations.filter((o) => o.id !== currentOrganizationId.value);
      authStore.setOrganizations(orgs);
      // Clear current state
      currentMembership.value = null;
      members.value = [];
      invites.value = [];
    } finally {
      loading.value = false;
    }
  }

  /**
   * Transfer ownership to another member
   */
  async function transferOwnership(newOwnerId: string): Promise<void> {
    if (!currentOrganizationId.value) return;

    loading.value = true;
    try {
      await organizationsService.transferOwnership(currentOrganizationId.value, newOwnerId);
      // Refresh membership and members
      await Promise.all([fetchOrganization(), fetchMembers()]);
    } finally {
      loading.value = false;
    }
  }

  // Invite Management

  /**
   * Fetch pending invites
   */
  async function fetchInvites(): Promise<void> {
    if (!currentOrganizationId.value) return;

    invitesLoading.value = true;
    try {
      const data = await organizationsService.getInvites(currentOrganizationId.value);
      invites.value = data.invites;
    } finally {
      invitesLoading.value = false;
    }
  }

  /**
   * Create a new invite
   */
  async function createInvite(input: CreateInviteInput): Promise<void> {
    if (!currentOrganizationId.value) return;

    invitesLoading.value = true;
    try {
      const data = await organizationsService.createInvite(currentOrganizationId.value, input);
      invites.value = [data.invite, ...invites.value];
    } finally {
      invitesLoading.value = false;
    }
  }

  /**
   * Cancel an invite
   */
  async function cancelInvite(inviteId: string): Promise<void> {
    if (!currentOrganizationId.value) return;

    invitesLoading.value = true;
    try {
      await organizationsService.cancelInvite(currentOrganizationId.value, inviteId);
      invites.value = invites.value.filter((i) => i.id !== inviteId);
    } finally {
      invitesLoading.value = false;
    }
  }

  /**
   * Resend an invite
   */
  async function resendInvite(inviteId: string): Promise<void> {
    if (!currentOrganizationId.value) return;

    invitesLoading.value = true;
    try {
      const data = await organizationsService.resendInvite(currentOrganizationId.value, inviteId);
      // Update invite in local state
      const index = invites.value.findIndex((i) => i.id === inviteId);
      if (index !== -1) {
        invites.value[index] = data.invite;
      }
    } finally {
      invitesLoading.value = false;
    }
  }

  /**
   * Reset store state (called when switching organizations)
   */
  function reset(): void {
    currentMembership.value = null;
    members.value = [];
    invites.value = [];
  }

  return {
    // State
    currentMembership,
    members,
    invites,
    loading,
    membersLoading,
    invitesLoading,

    // Getters
    currentOrganization,
    currentOrganizationId,
    userRole,
    isOwner,
    isAdmin,
    isMember,
    canManageMembers,
    canManageSettings,
    canManageInvites,
    canDeleteOrganization,
    canConfigureDomainLockdown,
    canTransferOwnership,

    // Actions
    fetchOrganization,
    createOrganization,
    updateOrganization,
    deleteOrganization,
    fetchMembers,
    updateMemberRole,
    removeMember,
    leaveOrganization,
    transferOwnership,
    fetchInvites,
    createInvite,
    cancelInvite,
    resendInvite,
    reset,
  };
});
