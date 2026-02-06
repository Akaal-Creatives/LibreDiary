import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { User, Organization, OrgRole } from '@librediary/shared';
import { authService, type OrgMembership } from '@/services';

export const useAuthStore = defineStore('auth', () => {
  // State
  const user = ref<User | null>(null);
  const organizations = ref<Organization[]>([]);
  const memberships = ref<OrgMembership[]>([]);
  const currentOrganizationId = ref<string | null>(localStorage.getItem('currentOrganizationId'));
  const loading = ref(false);
  const initialized = ref(false);

  // Getters
  const isAuthenticated = computed(() => !!user.value);
  const currentOrganization = computed(() =>
    organizations.value.find((org) => org.id === currentOrganizationId.value)
  );
  const currentMembership = computed(() =>
    memberships.value.find((m) => m.organizationId === currentOrganizationId.value)
  );
  const currentUserRole = computed<OrgRole | null>(() => currentMembership.value?.role ?? null);
  const isSuperAdmin = computed(() => user.value?.isSuperAdmin ?? false);
  const isEmailVerified = computed(() => user.value?.emailVerified ?? false);

  // Helper to get role for any organization
  function getRoleForOrg(orgId: string): OrgRole | null {
    return memberships.value.find((m) => m.organizationId === orgId)?.role ?? null;
  }

  // Actions
  function setUser(newUser: User | null) {
    user.value = newUser;
  }

  function setOrganizations(orgs: Organization[], membershipList?: OrgMembership[]) {
    organizations.value = orgs;
    if (membershipList) {
      memberships.value = membershipList;
    }
    // Auto-select first org if none selected or current org no longer exists
    if (orgs.length > 0) {
      const currentExists = orgs.some((org) => org.id === currentOrganizationId.value);
      if (!currentOrganizationId.value || !currentExists) {
        setCurrentOrganization(orgs[0]!.id);
      }
    }
  }

  function setCurrentOrganization(orgId: string) {
    currentOrganizationId.value = orgId;
    localStorage.setItem('currentOrganizationId', orgId);
  }

  /**
   * Initialize auth state by checking current session
   */
  async function initialize(): Promise<void> {
    if (initialized.value) return;

    loading.value = true;
    try {
      const data = await authService.getCurrentUser();
      user.value = data.user;
      setOrganizations(data.organizations, data.memberships);
    } catch {
      // Not authenticated or session expired
      user.value = null;
      organizations.value = [];
      memberships.value = [];
    } finally {
      loading.value = false;
      initialized.value = true;
    }
  }

  /**
   * Login with email and password
   */
  async function login(email: string, password: string): Promise<void> {
    loading.value = true;
    try {
      const data = await authService.login({ email, password });
      user.value = data.user;
      setOrganizations(data.organizations, data.memberships);
    } finally {
      loading.value = false;
    }
  }

  /**
   * Register with invite token
   */
  async function register(
    email: string,
    password: string,
    inviteToken: string,
    name?: string
  ): Promise<void> {
    loading.value = true;
    try {
      const data = await authService.register({ email, password, inviteToken, name });
      user.value = data.user;
      setOrganizations(data.organizations, data.memberships);
    } finally {
      loading.value = false;
    }
  }

  /**
   * Logout and clear state
   */
  async function logout(): Promise<void> {
    loading.value = true;
    try {
      await authService.logout();
    } catch {
      // Ignore logout errors
    } finally {
      user.value = null;
      organizations.value = [];
      memberships.value = [];
      currentOrganizationId.value = null;
      localStorage.removeItem('currentOrganizationId');
      loading.value = false;
    }
  }

  /**
   * Verify email with token
   */
  async function verifyEmail(token: string): Promise<void> {
    await authService.verifyEmail(token);
    if (user.value) {
      user.value = { ...user.value, emailVerified: true };
    }
  }

  /**
   * Resend verification email
   */
  async function resendVerificationEmail(): Promise<void> {
    await authService.resendVerificationEmail();
  }

  /**
   * Refresh user data
   */
  async function refreshUser(): Promise<void> {
    try {
      const data = await authService.getCurrentUser();
      user.value = data.user;
      setOrganizations(data.organizations, data.memberships);
    } catch {
      // Session may have expired
      user.value = null;
      organizations.value = [];
      memberships.value = [];
    }
  }

  return {
    // State
    user,
    organizations,
    memberships,
    currentOrganizationId,
    loading,
    initialized,
    // Getters
    isAuthenticated,
    currentOrganization,
    currentMembership,
    currentUserRole,
    isSuperAdmin,
    isEmailVerified,
    // Actions
    setUser,
    setOrganizations,
    setCurrentOrganization,
    getRoleForOrg,
    initialize,
    login,
    register,
    logout,
    verifyEmail,
    resendVerificationEmail,
    refreshUser,
  };
});
