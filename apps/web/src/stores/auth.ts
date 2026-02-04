import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { User, Organization } from '@librediary/shared';

export const useAuthStore = defineStore('auth', () => {
  // State
  const user = ref<User | null>(null);
  const organizations = ref<Organization[]>([]);
  const currentOrganizationId = ref<string | null>(localStorage.getItem('currentOrganizationId'));
  const loading = ref(false);

  // Getters
  const isAuthenticated = computed(() => !!user.value);
  const currentOrganization = computed(() =>
    organizations.value.find((org) => org.id === currentOrganizationId.value)
  );
  const isSuperAdmin = computed(() => user.value?.isSuperAdmin ?? false);

  // Actions
  function setUser(newUser: User | null) {
    user.value = newUser;
  }

  function setOrganizations(orgs: Organization[]) {
    organizations.value = orgs;
    // Auto-select first org if none selected
    if (!currentOrganizationId.value && orgs.length > 0 && orgs[0]) {
      setCurrentOrganization(orgs[0].id);
    }
  }

  function setCurrentOrganization(orgId: string) {
    currentOrganizationId.value = orgId;
    localStorage.setItem('currentOrganizationId', orgId);
  }

  async function logout() {
    user.value = null;
    organizations.value = [];
    currentOrganizationId.value = null;
    localStorage.removeItem('currentOrganizationId');
  }

  return {
    // State
    user,
    organizations,
    currentOrganizationId,
    loading,
    // Getters
    isAuthenticated,
    currentOrganization,
    isSuperAdmin,
    // Actions
    setUser,
    setOrganizations,
    setCurrentOrganization,
    logout,
  };
});
