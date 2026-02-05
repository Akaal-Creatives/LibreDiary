<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores';
import { useOrganizationsStore } from '@/stores/organizations';
import type { OrgRole } from '@librediary/shared';

const router = useRouter();
const authStore = useAuthStore();
const orgsStore = useOrganizationsStore();

const isOpen = ref(false);

const currentOrg = computed(() => authStore.currentOrganization);
const organizations = computed(() => authStore.organizations);

function toggleDropdown() {
  isOpen.value = !isOpen.value;
}

function closeDropdown() {
  isOpen.value = false;
}

function selectOrganization(orgId: string) {
  if (orgId !== authStore.currentOrganizationId) {
    authStore.setCurrentOrganization(orgId);
    orgsStore.reset();
    // Navigate to dashboard
    router.push({ name: 'dashboard' });
  }
  closeDropdown();
}

function navigateToSettings() {
  closeDropdown();
  router.push({ name: 'organization-settings' });
}

function navigateToMembers() {
  closeDropdown();
  router.push({ name: 'organization-members' });
}

function createNewOrganization() {
  closeDropdown();
  router.push({ name: 'create-organization' });
}

function getRoleBadgeClass(role: OrgRole): string {
  const classes: Record<OrgRole, string> = {
    OWNER: 'role-badge--owner',
    ADMIN: 'role-badge--admin',
    MEMBER: 'role-badge--member',
  };
  return classes[role] || 'role-badge--member';
}

function getRoleLabel(role: OrgRole): string {
  const labels: Record<OrgRole, string> = {
    OWNER: 'Owner',
    ADMIN: 'Admin',
    MEMBER: 'Member',
  };
  return labels[role] || 'Member';
}

const currentRole = computed(() => authStore.currentUserRole);
</script>

<template>
  <div class="org-switcher">
    <button class="switcher-button" @click="toggleDropdown">
      <!-- Org Logo or Avatar -->
      <span
        v-if="currentOrg?.logoUrl"
        class="org-logo"
        :style="{ backgroundImage: `url(${currentOrg.logoUrl})` }"
      ></span>
      <span
        v-else
        class="org-avatar"
        :style="{ backgroundColor: currentOrg?.accentColor || 'var(--color-accent)' }"
      >
        {{ currentOrg?.name?.charAt(0).toUpperCase() || '?' }}
      </span>

      <span class="org-info">
        <span class="org-name">{{ currentOrg?.name ?? 'Select Organization' }}</span>
        <span v-if="currentRole" class="role-badge" :class="getRoleBadgeClass(currentRole)">
          {{ getRoleLabel(currentRole) }}
        </span>
      </span>

      <span class="org-chevron" :class="{ open: isOpen }">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path
            d="M3 4.5L6 7.5L9 4.5"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </span>
    </button>

    <!-- Dropdown Menu -->
    <Transition name="dropdown">
      <div v-if="isOpen" class="dropdown-menu">
        <!-- Backdrop for closing -->
        <div class="dropdown-backdrop" @click="closeDropdown"></div>

        <div class="dropdown-content">
          <!-- Current Organization Actions -->
          <div v-if="currentOrg" class="dropdown-section">
            <div class="section-header">
              <span
                v-if="currentOrg.logoUrl"
                class="section-logo"
                :style="{ backgroundImage: `url(${currentOrg.logoUrl})` }"
              ></span>
              <span
                v-else
                class="section-avatar"
                :style="{ backgroundColor: currentOrg.accentColor || 'var(--color-accent)' }"
              >
                {{ currentOrg.name.charAt(0).toUpperCase() }}
              </span>
              <div class="section-info">
                <span class="section-name">{{ currentOrg.name }}</span>
                <span
                  v-if="currentRole"
                  class="role-badge role-badge--sm"
                  :class="getRoleBadgeClass(currentRole)"
                >
                  {{ getRoleLabel(currentRole) }}
                </span>
              </div>
            </div>
            <div class="section-actions">
              <button class="dropdown-item" @click="navigateToSettings">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M6.5 2.5L7.5 1.5H8.5L9.5 2.5L10.5 2V3L11.5 3.5V4.5L12 5.5H13L13.5 6.5V7.5L12.5 8.5L13 9.5V10.5L12 11L11.5 12V13L10.5 13.5H9.5L8.5 14.5H7.5L6.5 13.5H5.5L5 12.5L4 12V11L3 10.5V9.5L3.5 8.5L3 7.5V6.5L4 6L4.5 5V4L5.5 3.5V2.5H6.5Z"
                    stroke="currentColor"
                    stroke-width="1.2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                  <circle cx="8" cy="8" r="2" stroke="currentColor" stroke-width="1.2" />
                </svg>
                <span>Settings</span>
              </button>
              <button class="dropdown-item" @click="navigateToMembers">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <circle cx="6" cy="5" r="2" stroke="currentColor" stroke-width="1.2" />
                  <path
                    d="M2 13C2 10.7909 3.79086 9 6 9C8.20914 9 10 10.7909 10 13"
                    stroke="currentColor"
                    stroke-width="1.2"
                    stroke-linecap="round"
                  />
                  <circle cx="11" cy="5" r="1.5" stroke="currentColor" stroke-width="1.2" />
                  <path
                    d="M14 13C14 11.3431 12.6569 10 11 10"
                    stroke="currentColor"
                    stroke-width="1.2"
                    stroke-linecap="round"
                  />
                </svg>
                <span>Members</span>
              </button>
            </div>
          </div>

          <!-- Organizations List -->
          <div v-if="organizations.length > 1" class="dropdown-section">
            <div class="section-label">Switch Organization</div>
            <button
              v-for="org in organizations"
              :key="org.id"
              class="dropdown-item org-item"
              :class="{ active: org.id === authStore.currentOrganizationId }"
              @click="selectOrganization(org.id)"
            >
              <span
                v-if="org.logoUrl"
                class="org-item-logo"
                :style="{ backgroundImage: `url(${org.logoUrl})` }"
              ></span>
              <span
                v-else
                class="org-item-avatar"
                :style="{ backgroundColor: org.accentColor || 'var(--color-accent)' }"
              >
                {{ org.name.charAt(0).toUpperCase() }}
              </span>
              <span class="org-item-info">
                <span class="org-item-name">{{ org.name }}</span>
                <span
                  v-if="authStore.getRoleForOrg(org.id)"
                  class="role-badge role-badge--xs"
                  :class="getRoleBadgeClass(authStore.getRoleForOrg(org.id)!)"
                >
                  {{ getRoleLabel(authStore.getRoleForOrg(org.id)!) }}
                </span>
              </span>
              <svg
                v-if="org.id === authStore.currentOrganizationId"
                class="check-icon"
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
              >
                <path
                  d="M11.6667 3.5L5.25 9.91667L2.33333 7"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
              </svg>
            </button>
          </div>

          <!-- Create New -->
          <div class="dropdown-section dropdown-section--footer">
            <button class="dropdown-item create-item" @click="createNewOrganization">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M8 3V13M3 8H13"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                />
              </svg>
              <span>Create Organization</span>
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.org-switcher {
  position: relative;
}

.switcher-button {
  display: flex;
  gap: var(--space-2);
  align-items: center;
  width: 100%;
  padding: var(--space-2) var(--space-3);
  font-family: inherit;
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--color-text-primary);
  text-align: left;
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: var(--radius-md);
  transition: background var(--transition-fast);
}

.switcher-button:hover {
  background: var(--color-hover);
}

.org-logo,
.org-avatar {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  font-size: var(--text-sm);
  font-weight: 600;
  color: white;
  border-radius: var(--radius-sm);
}

.org-logo {
  background-size: cover;
  background-position: center;
}

.org-info {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.org-name {
  overflow: hidden;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.org-chevron {
  display: flex;
  align-items: center;
  color: var(--color-text-tertiary);
  transition: transform var(--transition-fast);
}

.org-chevron.open {
  transform: rotate(180deg);
}

/* Role Badges */
.role-badge {
  display: inline-flex;
  align-items: center;
  padding: 1px 6px;
  font-size: 10px;
  font-weight: 600;
  line-height: 1.4;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  border-radius: var(--radius-full);
}

.role-badge--sm {
  padding: 2px 8px;
  font-size: 9px;
}

.role-badge--xs {
  padding: 1px 5px;
  font-size: 8px;
}

.role-badge--owner {
  color: #854d0e;
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
}

.role-badge--admin {
  color: #1e40af;
  background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
}

.role-badge--member {
  color: var(--color-text-secondary);
  background: var(--color-surface-sunken);
}

/* Dark mode adjustments */
[data-theme='dark'] .role-badge--owner {
  color: #fcd34d;
  background: linear-gradient(135deg, rgba(252, 211, 77, 0.15) 0%, rgba(245, 158, 11, 0.2) 100%);
}

[data-theme='dark'] .role-badge--admin {
  color: #93c5fd;
  background: linear-gradient(135deg, rgba(147, 197, 253, 0.15) 0%, rgba(59, 130, 246, 0.2) 100%);
}

[data-theme='dark'] .role-badge--member {
  color: var(--color-text-tertiary);
  background: var(--color-surface-elevated);
}

/* Dropdown */
.dropdown-menu {
  position: absolute;
  top: 100%;
  left: 0;
  z-index: 100;
  width: 280px;
  margin-top: var(--space-1);
}

.dropdown-backdrop {
  position: fixed;
  inset: 0;
  z-index: -1;
}

.dropdown-content {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  overflow: hidden;
}

.dropdown-section {
  padding: var(--space-2);
}

.dropdown-section:not(:last-child) {
  border-bottom: 1px solid var(--color-border);
}

.dropdown-section--footer {
  background: var(--color-surface-sunken);
}

.section-header {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2);
  margin-bottom: var(--space-1);
}

.section-logo,
.section-avatar {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  font-size: var(--text-base);
  font-weight: 600;
  color: white;
  border-radius: var(--radius-md);
}

.section-logo {
  background-size: cover;
  background-position: center;
}

.section-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.section-name {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-text-primary);
}

.section-actions {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.section-label {
  padding: var(--space-1) var(--space-2);
  font-size: var(--text-xs);
  font-weight: 600;
  color: var(--color-text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.dropdown-item {
  display: flex;
  gap: var(--space-3);
  align-items: center;
  width: 100%;
  padding: var(--space-2);
  font-family: inherit;
  font-size: var(--text-sm);
  color: var(--color-text-secondary);
  text-align: left;
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: var(--radius-md);
  transition: all var(--transition-fast);
}

.dropdown-item:hover {
  color: var(--color-text-primary);
  background: var(--color-hover);
}

.dropdown-item.active {
  color: var(--color-accent);
  background: var(--color-accent-subtle);
}

.org-item {
  padding: var(--space-2);
}

.org-item-logo,
.org-item-avatar {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  font-size: var(--text-xs);
  font-weight: 600;
  color: white;
  border-radius: var(--radius-sm);
}

.org-item-logo {
  background-size: cover;
  background-position: center;
}

.org-item-info {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.org-item-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.check-icon {
  flex-shrink: 0;
  color: var(--color-accent);
}

.create-item {
  color: var(--color-accent);
}

.create-item:hover {
  background: var(--color-accent-subtle);
}

/* Transitions */
.dropdown-enter-active,
.dropdown-leave-active {
  transition: all var(--transition-fast);
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
